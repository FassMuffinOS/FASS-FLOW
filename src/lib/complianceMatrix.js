// ── Live compliance matrix ─────────────────────────────────
// Cross-references everything parseSolicitation() shredded out of the
// solicitation (required volumes, required documents, Section M evaluation
// factors, and format/page-limit rules) against the proposal the user is
// actually building (assembled sections + which they've approved).
//
// The high-value move is the EVALUATION-FACTOR check: Section M lists what
// the Government scores you on. If a factor has no matching section in the
// draft, that's a disqualification-grade gap — surfaced here in red, live.
//
// No AI, no API: pure heuristic matching, recomputed on every keystroke.

const STOP = new Set(['the', 'and', 'for', 'plan', 'approach', 'volume', 'proposal', 'references', 'reference', 'statement', 'cost', 'price'])

// Significant keywords from a label, for overlap matching.
function keywords(label) {
  return (label || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 3 && !STOP.has(w))
}

// Does an assembled section's heading correspond to this requirement label?
function matchSection(label, sections) {
  const want = keywords(label)
  if (!want.length) return null
  let best = null
  let bestScore = 0
  for (const s of sections) {
    const have = new Set(keywords(s.heading))
    const score = want.filter(w => have.has(w)).length
    if (score > bestScore) { bestScore = score; best = s }
  }
  return bestScore > 0 ? best : null
}

// parsed: parseSolicitation() output
// doc:    assembleProposal() output (has .sections, .format)
// state:  { approved: Set<sectionId>, text: string (live editor text) }
export function buildComplianceMatrix(parsed, doc, state = {}) {
  parsed = parsed || {} // template docs have no parsed solicitation
  const approved = state.approved || new Set()
  const sections = doc.sections || []
  const items = []

  const statusForSection = (sec) => {
    if (!sec) return 'missing'
    return approved.has(sec.id) ? 'addressed' : 'drafted'
  }

  // Required volumes ----------------------------------------------------
  ;(parsed.volumes || []).forEach(v => {
    const label = `Volume ${v.id} — ${v.name}`
    const sec = matchSection(v.name, sections)
    items.push({
      id: `vol-${v.id}`,
      kind: 'Volume',
      label,
      status: statusForSection(sec),
      sectionId: sec?.id || null,
    })
  })

  // Evaluation factors (Section M) — the ones you're scored on ----------
  ;(parsed.evalCriteria || []).forEach((e, i) => {
    const sec = matchSection(e.name, sections)
    items.push({
      id: `eval-${i}`,
      kind: 'Scored factor',
      label: `${e.name} · ${e.weight}${e.unit === '%' ? '%' : ' pts'}`,
      status: statusForSection(sec),
      sectionId: sec?.id || null,
      weight: e.weight,
      note: sec ? null : 'No section addresses this scored factor',
    })
  })

  // Required documents --------------------------------------------------
  ;(parsed.requiredDocs || []).forEach(d => {
    const sec = matchSection(d.label, sections)
    items.push({
      id: `doc-${d.key}`,
      kind: 'Required doc',
      label: d.label,
      status: statusForSection(sec),
      sectionId: sec?.id || null,
    })
  })

  // Format / page-limit rules ------------------------------------------
  const fmt = doc.format || {}
  const fmtChecks = [
    { id: 'fmt-font', label: `Font: ${fmt.font || 'not specified'}`, ok: !!fmt.font },
    { id: 'fmt-margin', label: `Margins: ${fmt.margin || 'not specified'}`, ok: !!fmt.margin },
    { id: 'fmt-pagelimit', label: fmt.pageLimit ? `Page limit: ${fmt.pageLimit}` : 'Page limit: not specified', ok: !!fmt.pageLimit },
  ]
  fmtChecks.forEach(c => items.push({
    id: c.id, kind: 'Format', label: c.label,
    status: c.ok ? 'addressed' : 'unknown', sectionId: null,
  }))

  // Per-volume page overflow (a real rejection cause) -------------------
  sections.filter(s => s.pageLimit && s.pageEstimate > s.pageLimit).forEach(s => {
    items.push({
      id: `over-${s.id}`,
      kind: 'Format',
      label: `“${s.heading}” ~${s.pageEstimate}pg / ${s.pageLimit}pg limit`,
      status: 'over',
      sectionId: s.id,
      note: 'Over the page limit',
    })
  })

  const counts = items.reduce((a, it) => { a[it.status] = (a[it.status] || 0) + 1; return a }, {})
  const required = items.filter(i => i.kind !== 'Format')
  const ready = required.filter(i => i.status === 'addressed').length

  return {
    items,
    summary: {
      total: required.length,
      ready,
      missing: items.filter(i => i.status === 'missing').length,
      over: counts.over || 0,
      pct: required.length ? Math.round((ready / required.length) * 100) : 0,
    },
  }
}
