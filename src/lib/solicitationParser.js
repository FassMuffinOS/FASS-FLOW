// ── FASS FILL parsing engine ───────────────────────────────
// Rule-based extraction of compliance-critical facts from pasted
// solicitation text (Section L / Section M / PWS / SOW). No external
// API call — pure heuristics tuned to FAR-style government RFPs/RFQs.

const DOC_KEYWORDS = [
  { key: 'sf1449',          label: 'SF-1449 (Solicitation/Contract/Order Form)', re: /SF[- ]?1449/i },
  { key: 'sf33',            label: 'SF-33 (Solicitation, Offer & Award)',         re: /SF[- ]?33\b/i },
  { key: 'sf18',            label: 'SF-18 (Request for Quotation)',               re: /SF[- ]?18\b/i },
  { key: 'reps_certs',      label: 'Representations & Certifications',            re: /representations?\s+and\s+certifications?|reps?\s*(?:&|and)\s*certs?/i },
  { key: 'past_performance',label: 'Past Performance References',                 re: /past[- ]performance/i },
  { key: 'resumes',         label: 'Key Personnel Resumes',                       re: /resumes?\b|key personnel/i },
  { key: 'technical_approach', label: 'Technical Approach Narrative',             re: /technical approach/i },
  { key: 'management_approach', label: 'Management Approach',                     re: /management approach/i },
  { key: 'staffing_plan',   label: 'Staffing Plan',                               re: /staffing plan/i },
  { key: 'price_proposal',  label: 'Price / Cost Proposal',                       re: /price proposal|cost proposal|pricing schedule|price schedule/i },
  { key: 'quality_control', label: 'Quality Control Plan',                        re: /quality control plan/i },
  { key: 'safety_plan',     label: 'Safety Plan',                                 re: /safety plan/i },
  { key: 'subcontracting_plan', label: 'Subcontracting Plan',                     re: /subcontracting plan/i },
  { key: 'insurance',       label: 'Certificate of Insurance',                    re: /certificate of insurance|insurance certificate/i },
  { key: 'bonding',         label: 'Bonding / Surety Documentation',              re: /bonding|surety/i },
  { key: 'capability_statement', label: 'Capability Statement',                   re: /capability statement/i },
  { key: 'org_chart',       label: 'Organizational Chart',                        re: /organizational chart|org chart/i },
  { key: 'transition_plan', label: 'Transition Plan',                            re: /transition plan/i },
  { key: 'sam_registration',label: 'Active SAM.gov Registration',                 re: /SAM\.gov registration|active registration in SAM/i },
  { key: 'license',         label: 'Business License / Certifications',          re: /business license|professional license/i },
  { key: 'financial_stmt',  label: 'Financial Statements',                        re: /financial statements?|balance sheet/i },
]

function dedupe(arr, keyFn) {
  const seen = new Set()
  return arr.filter(item => {
    const k = keyFn(item)
    if (seen.has(k)) return false
    seen.add(k)
    return true
  })
}

export function parseSolicitation(text) {
  const t = text || ''

  // ── Overall page limit ──────────────────────────────
  const pageLimitMatch =
    t.match(/(?:shall not exceed|not to exceed|limited to|no more than|maximum of)\s*(\d{1,3})\s*(?:single[- ]spaced\s*)?pages?/i) ||
    t.match(/(\d{1,3})[- ]page limit/i) ||
    t.match(/page limit(?:ation)?\s*(?:of|is|:)?\s*(\d{1,3})/i)
  const pageLimit = pageLimitMatch ? parseInt(pageLimitMatch[1], 10) : null

  // Per-volume page limits e.g. "Volume I – Technical Approach (15 pages)"
  const volumePageLimits = [...t.matchAll(/Volume\s+([IVX\d]+)[\s\S]{0,80}?\((\d{1,3})\s*pages?\)/gi)]
    .map(m => ({ volume: m[1], pages: parseInt(m[2], 10) }))

  // ── Format requirements ─────────────────────────────
  const fontMatch = t.match(/(Times New Roman|Arial|Calibri|Courier New)/i)
  const sizeMatch = t.match(/(\d{1,2})[- ]point/i)
  const marginMatch = t.match(/(one[- ]inch|1[- ]inch|1["”]?)\s*margins?/i)
  const spacingMatch = t.match(/(single|double|1\.5)[- ]spaced?/i)

  // ── Due date / time ──────────────────────────────────
  const dueDateMatch = t.match(
    /(?:due (?:no later than|by)|deadline(?:\s+is)?|proposals?\s+(?:are|is)\s+due)[^\n.]{0,60}?((?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},?\s*\d{4}|\d{1,2}\/\d{1,2}\/\d{2,4})/i
  )
  const timeMatch = t.match(/(\d{1,2}:\d{2}\s*(?:AM|PM)?\s*(?:EST|EDT|ET|CST|CDT|PST|PDT)?)/i)

  // ── Submission method ───────────────────────────────
  let submissionMethod = null
  if (/sam\.gov/i.test(t)) submissionMethod = 'SAM.gov electronic submission'
  else if (/email|e-mail/i.test(t) && /submit/i.test(t)) submissionMethod = 'Email submission'
  else if (/hand[- ]deliver/i.test(t)) submissionMethod = 'Hand delivery'
  else if (/electronic\s+(?:portal|submission)/i.test(t)) submissionMethod = 'Electronic portal submission'

  // ── Volumes / Sections ───────────────────────────────
  const volumeRaw = [...t.matchAll(/Volume\s+([IVX\d]+)\s*[-–:]?\s*([A-Za-z][A-Za-z\s&/]{2,50})/gi)]
    .map(m => ({ id: m[1].toUpperCase(), name: m[2].trim().replace(/\s+/g, ' ') }))
  const volumes = dedupe(volumeRaw, v => v.id)

  // ── Required documents ───────────────────────────────
  const requiredDocs = DOC_KEYWORDS.filter(d => d.re.test(t)).map(d => ({ key: d.key, label: d.label }))

  // ── Evaluation criteria & weighting ─────────────────
  const evalRaw = [...t.matchAll(/([A-Z][A-Za-z\s/&-]{2,40}?)\s*[-–:(]\s*(\d{1,3})\s*(%|points?)/g)]
    .map(m => ({ name: m[1].trim(), weight: parseInt(m[2], 10), unit: m[3][0] === '%' ? '%' : 'pts' }))
    .filter(e => e.name.length > 2 && e.weight > 0 && e.weight <= 100 && !/page|volume/i.test(e.name))
  const evalCriteria = dedupe(evalRaw, e => e.name.toLowerCase())

  return {
    pageLimit,
    volumePageLimits,
    format: {
      font: fontMatch?.[1] || null,
      fontSize: sizeMatch?.[1] ? `${sizeMatch[1]}-point` : null,
      margin: marginMatch ? '1-inch margins' : null,
      spacing: spacingMatch?.[1] ? `${spacingMatch[1]}-spaced` : null,
    },
    dueDate: dueDateMatch?.[1] || null,
    dueTime: timeMatch?.[1] || null,
    submissionMethod,
    volumes,
    requiredDocs,
    evalCriteria,
    parsedAt: new Date().toISOString(),
  }
}

// ── Build a checklist outline from parsed results ──────────
const DEFAULT_OUTLINE = [
  { label: 'Cover Letter / Transmittal', type: 'section' },
  { label: 'Technical Approach', type: 'section' },
  { label: 'Management Approach', type: 'section' },
  { label: 'Past Performance References', type: 'section' },
  { label: 'Price / Cost Proposal', type: 'section' },
  { label: 'Representations & Certifications', type: 'document' },
]

export function buildOutline(parsed) {
  const items = []
  let n = 0

  if (parsed.volumes?.length) {
    parsed.volumes.forEach(v => {
      const limit = parsed.volumePageLimits?.find(p => p.volume === v.id)
      items.push({
        id: `vol-${n++}`,
        label: `Volume ${v.id} — ${v.name}`,
        type: 'volume',
        pageLimit: limit?.pages || null,
        done: false,
        notes: '',
      })
    })
  } else {
    DEFAULT_OUTLINE.forEach(d => items.push({ id: `def-${n++}`, ...d, pageLimit: null, done: false, notes: '' }))
  }

  parsed.requiredDocs?.forEach(d => {
    if (items.some(i => i.label.toLowerCase().includes(d.label.toLowerCase().split(' ')[0].toLowerCase()))) return
    items.push({ id: `doc-${n++}`, label: d.label, type: 'document', pageLimit: null, done: false, notes: '' })
  })

  return items
}

export const KNOWN_DOC_KEYWORDS = DOC_KEYWORDS

// ── Email invitation parser (Inbox) ─────────────────────────
// State/local e-procurement portals (Maryland's eMMA, and similarly
// structured marketplaces) send a "you're invited to respond" email with a
// fixed label: value layout rather than a full RFP body. This is a separate,
// much simpler deterministic parser tuned to that structure — same
// zero-API-cost philosophy as parseSolicitation above, just for a different
// document shape. Add new portals here as label variants, not as a rewrite.
const EMAIL_FIELD_PATTERNS = {
  rfxName: /RFx name:\s*([^\n]+)/i,
  bpmId: /BPM ID:\s*([^\n]+)/i,
  mainCommodity: /Main commodity:\s*([^\n]+)/i,
  lotNumber: /Lot #:\s*([^\n]+)/i,
  roundNumber: /Round #:\s*([^\n]+)/i,
  endDate: /End date:\s*([^\n]+)/i,
  requester: /Requester:\s*([^\n]+)/i,
  supplierName: /Supplier name:\s*([^\n]+)/i,
}

function detectPortal(t) {
  if (/emma|eMaryland Marketplace/i.test(t)) return 'eMMA'
  if (/bidnet/i.test(t)) return 'BidNet'
  if (/instantmarkets/i.test(t)) return 'InstantMarkets'
  return 'Email'
}

export function parseEmailInvite(text) {
  const t = text || ''
  const get = (re) => {
    const m = t.match(re)
    return m ? m[1].trim() : null
  }

  const linkMatch = t.match(/https?:\/\/[^\s)]+/i)

  const fields = {}
  for (const [key, re] of Object.entries(EMAIL_FIELD_PATTERNS)) {
    fields[key] = get(re)
  }

  const isRecognized = Boolean(fields.rfxName || fields.bpmId)

  return {
    isRecognized,
    sourcePortal: detectPortal(t),
    rfxName: fields.rfxName,
    bpmId: fields.bpmId,
    mainCommodity: fields.mainCommodity,
    lotNumber: fields.lotNumber,
    roundNumber: fields.roundNumber,
    endDate: fields.endDate,
    requester: fields.requester,
    supplierName: fields.supplierName,
    link: linkMatch ? linkMatch[0] : null,
    rawSnippet: t.slice(0, 2000),
  }
}
