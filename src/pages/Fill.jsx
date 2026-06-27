import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useTheme } from '../context/ThemeContext'
import { supabase } from '../lib/supabase'
import { logBusinessEvent } from '../lib/businessEvents'
import { parseSolicitation, buildOutline } from '../lib/solicitationParser'
import { aiEnabled, analyzeSolicitation, draftSection, extractFromImages } from '../lib/aiClient'
import {
  ArrowLeft, Sun, Moon, Plus, FileText, CheckSquare, Square,
  Clock, AlertTriangle, Trash2, Save, ChevronRight, Printer,
  X, Edit2, Building2, Award, Calendar, Send, Loader2, ClipboardList,
  HelpCircle, Sparkles, Copy, Check, Camera,
} from 'lucide-react'
import './Fill.css'

const CERT_OPTIONS = [
  'Small Business', 'WOSB', 'EDWOSB', 'SDVOSB', 'VOSB', '8(a)', 'HUBZone', 'MBE/DBE',
]

function uid() {
  return Math.random().toString(36).slice(2, 10)
}

// A realistic Section L/M excerpt so a first-time user can see the tool work
// before they ever touch a real solicitation.
const SAMPLE_TEXT = `SECTION L — INSTRUCTIONS, CONDITIONS, AND NOTICES TO OFFERORS

Solicitation No. SSA-BAL-2026-0142
Janitorial and Custodial Services — Social Security Administration, Baltimore Field Office

Proposals are due no later than July 15, 2026, 2:00 PM EST. Submission shall be made via SAM.gov electronic submission. Late proposals will not be considered.

Offerors shall submit a proposal not to exceed 20 pages, excluding resumes and attachments. All pages shall be single-spaced, 12-point Times New Roman font, with 1-inch margins.

The proposal shall be organized into the following volumes:
Volume I – Technical Approach (10 pages)
Volume II – Management Approach (5 pages)
Volume III – Price Proposal (no page limit)

Offerors shall include the following with their submission:
- Representations and Certifications
- Past Performance references (minimum of three)
- Resumes for all key personnel
- Certificate of Insurance
- Quality Control Plan
- Staffing Plan

SECTION M — EVALUATION FACTORS FOR AWARD

The Government will evaluate proposals based on the following factors:
Technical Approach – 40%
Past Performance – 30%
Price – 20%
Management Approach – 10%`

const KNOWN_DOC_HINTS = [
  'Representations & Certifications', 'Past Performance', 'Resumes / Key Personnel',
  'Technical Approach', 'Price Proposal', 'Quality Control Plan', 'Staffing Plan',
  'Certificate of Insurance', 'Subcontracting Plan',
]

// How much did we actually find? Shown plainly so trust is earned, not assumed.
function parseConfidence(parsed) {
  const checks = [
    !!parsed.dueDate, !!parsed.pageLimit, !!parsed.submissionMethod,
    !!(parsed.format?.font || parsed.format?.spacing), !!parsed.volumes?.length,
    !!parsed.requiredDocs?.length, !!parsed.evalCriteria?.length,
  ]
  const detected = checks.filter(Boolean).length
  return { detected, total: checks.length }
}

function ConfidenceChip({ parsed }) {
  const { detected, total } = parseConfidence(parsed)
  const level = detected >= 5 ? 'strong' : detected >= 3 ? 'partial' : 'low'
  const text = level === 'strong' ? 'Strong parse' : level === 'partial' ? 'Partial parse — review below' : 'Light parse — paste more text'
  return <span className={`fl-confidence fl-conf-${level}`}>{detected}/{total} fields detected · {text}</span>
}

// ── Submission snapshot card ───────────────────────────────
function SnapshotCard({ parsed }) {
  const days = parsed.dueDate ? Math.ceil((new Date(parsed.dueDate) - new Date()) / 86400000) : null
  return (
    <div className="fl-snapshot">
      <div className="fl-snap-item">
        <Calendar size={15} />
        <div>
          <span className="fl-snap-label">Due</span>
          <span className="fl-snap-val">
            {parsed.dueDate ? parsed.dueDate : 'Not detected'}
            {parsed.dueTime ? ` @ ${parsed.dueTime}` : ''}
          </span>
        </div>
        {days !== null && !Number.isNaN(days) && (
          <span className={`fl-snap-days ${days <= 5 ? 'urgent' : days <= 14 ? 'soon' : 'ok'}`}>{days}d</span>
        )}
      </div>
      <div className="fl-snap-item">
        <Send size={15} />
        <div>
          <span className="fl-snap-label">Submit via</span>
          <span className="fl-snap-val">{parsed.submissionMethod || 'Not detected — check Section L'}</span>
        </div>
      </div>
      <div className="fl-snap-item">
        <FileText size={15} />
        <div>
          <span className="fl-snap-label">Page limit</span>
          <span className="fl-snap-val">{parsed.pageLimit ? `${parsed.pageLimit} pages` : 'Not detected'}</span>
        </div>
      </div>
      <div className="fl-snap-item">
        <ClipboardList size={15} />
        <div>
          <span className="fl-snap-label">Format</span>
          <span className="fl-snap-val">
            {[parsed.format?.font, parsed.format?.fontSize, parsed.format?.spacing, parsed.format?.margin]
              .filter(Boolean).join(', ') || 'Not detected'}
          </span>
        </div>
      </div>
    </div>
  )
}

// ── Evaluation criteria bars ────────────────────────────────
function EvalCriteria({ criteria }) {
  if (!criteria?.length) return null
  const max = Math.max(...criteria.map(c => c.weight))
  return (
    <div className="fl-eval">
      <h4 className="fl-block-title">Evaluation Weighting <span className="fl-block-sub">— where to spend your effort</span></h4>
      {criteria.map((c, i) => (
        <div key={i} className="fl-eval-row">
          <span className="fl-eval-name">{c.name}</span>
          <div className="fl-eval-bar-track">
            <div className="fl-eval-bar-fill" style={{ width: `${(c.weight / max) * 100}%` }} />
          </div>
          <span className="fl-eval-weight">{c.weight}{c.unit}</span>
        </div>
      ))}
    </div>
  )
}

// ── Outline / compliance checklist item ─────────────────────
function OutlineRow({ item, onToggle, onNote, onDelete, onDraft, drafting, draft }) {
  const [copied, setCopied] = useState(false)
  function copyDraft() {
    navigator.clipboard?.writeText(draft.draft)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }
  return (
    <div className={`fl-out-row ${item.done ? 'done' : ''}`}>
      <button className="fl-out-check" onClick={() => onToggle(item.id)}>
        {item.done ? <CheckSquare size={17} /> : <Square size={17} />}
      </button>
      <div className="fl-out-body">
        <div className="fl-out-top">
          <span className="fl-out-label">{item.label}</span>
          {item.pageLimit && <span className="fl-out-pages">{item.pageLimit}p limit</span>}
          <span className={`fl-out-type fl-type-${item.type}`}>{item.type}</span>
          {aiEnabled() && item.type !== 'document' && (
            <button className="fl-out-ai-btn" onClick={() => onDraft(item)} disabled={drafting} title="Draft this section with AI, grounded in your past performance">
              {drafting ? <Loader2 size={12} className="spin" /> : <Sparkles size={12} />} Draft with AI
            </button>
          )}
        </div>
        <input
          className="fl-out-note"
          placeholder="Notes — who's writing this, status, blockers…"
          value={item.notes || ''}
          onChange={e => onNote(item.id, e.target.value)}
        />
        {draft && (
          <div className="fl-out-draft">
            {draft.error ? (
              <p className="fl-out-draft-error">{draft.error}</p>
            ) : (
              <>
                <p className="fl-out-draft-text">{draft.draft}</p>
                <div className="fl-out-draft-meta">
                  <span>via {draft.provider}{draft.grounded_in?.length ? ` · grounded in ${draft.grounded_in.length} past performance item(s)` : ' · no matching past performance found — draft says so'}</span>
                  <div className="fl-out-draft-actions">
                    <button onClick={copyDraft}>{copied ? <Check size={12} /> : <Copy size={12} />} {copied ? 'Copied' : 'Copy'}</button>
                    <button onClick={() => onNote(item.id, draft.draft)}>Use as notes</button>
                  </div>
                </div>
              </>
            )}
          </div>
        )}
      </div>
      <button className="fl-out-del" onClick={() => onDelete(item.id)} title="Remove">
        <Trash2 size={13} />
      </button>
    </div>
  )
}

// ── Saved document card ──────────────────────────────────────
function DocCard({ doc, onOpen, onDelete }) {
  const total = doc.outline?.length || 0
  const done = doc.outline?.filter(i => i.done).length || 0
  const pct = total ? Math.round((done / total) * 100) : 0
  return (
    <div className="fl-doc-card" onClick={() => onOpen(doc)}>
      <div className="fl-doc-top">
        <FileText size={16} />
        <button className="fl-doc-del" onClick={e => { e.stopPropagation(); onDelete(doc.id) }}><Trash2 size={13} /></button>
      </div>
      <h4 className="fl-doc-title">{doc.title}</h4>
      {doc.agency && <p className="fl-doc-agency">{doc.agency}</p>}
      <div className="fl-doc-progress">
        <div className="fl-doc-bar"><div className="fl-doc-fill" style={{ width: `${pct}%` }} /></div>
        <span>{done}/{total} complete</span>
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════════
export default function Fill() {
  const { session, signOut } = useAuth()
  const { theme, toggle: toggleTheme } = useTheme()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const isDark = theme === 'dark'

  const [topTab, setTopTab] = useState('matrix') // matrix | capability
  const [docs, setDocs] = useState([])
  const [loading, setLoading] = useState(true)
  const [mode, setMode] = useState('list') // list | input | results
  const [activeDoc, setActiveDoc] = useState(null)
  const [saving, setSaving] = useState(false)
  const [incomingSource, setIncomingSource] = useState('')
  const [extracting, setExtracting] = useState(false)
  const [extractError, setExtractError] = useState('')

  const [form, setForm] = useState({ title: '', agency: '', solicitation_number: '', raw_input: '' })

  const [profile, setProfile] = useState(null)
  const [profileEditing, setProfileEditing] = useState(false)
  const [profileSaving, setProfileSaving] = useState(false)

  const [aiAnalysis, setAiAnalysis] = useState(null)
  const [aiLoading, setAiLoading] = useState(false)
  const [aiError, setAiError] = useState('')
  const [drafts, setDrafts] = useState({})
  const [draftingId, setDraftingId] = useState(null)

  useEffect(() => { loadDocs(); loadProfile() }, [])

  // Shared join key with the proposals table — carried in from WARDOG's
  // "Save interest"/"Send to FASS FILL", R-E-A-D's "Continue to FASS
  // FILL", or Pipeline's "Open in FASS FILL". When set, saving here
  // attaches this doc to that existing proposal row instead of leaving
  // FASS FILL as a disconnected, second copy of the same opportunity.
  const [linkedProposalId, setLinkedProposalId] = useState(searchParams.get('proposalId') || null)

  // Continuity from WARDOG: a SAM.gov card or an Other Sources link can
  // hand off straight into a new solicitation here, with whatever it
  // already knows (title/agency/notice id) prefilled, or just a tag
  // saying which outside portal the user is about to paste from.
  useEffect(() => {
    if (!searchParams.get('new')) return
    setForm({
      title: searchParams.get('title') || '',
      agency: searchParams.get('agency') || '',
      solicitation_number: searchParams.get('solnum') || '',
      raw_input: '',
    })
    setIncomingSource(searchParams.get('source') || '')
    setActiveDoc(null)
    setMode('input')
  }, []) // eslint-disable-line

  // Arriving with only a proposalId (e.g. Pipeline's "Open in FASS FILL"
  // on a card that already has a draft) — open the existing doc for that
  // proposal instead of starting a blank one.
  useEffect(() => {
    const pid = searchParams.get('proposalId')
    if (!pid || searchParams.get('new')) return
    ;(async () => {
      const { data } = await supabase
        .from('fass_fill_documents')
        .select('*')
        .eq('proposal_id', pid)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()
      if (data) openDoc(data)
    })()
  }, []) // eslint-disable-line

  async function loadDocs() {
    setLoading(true)
    const { data } = await supabase
      .from('fass_fill_documents')
      .select('*')
      .eq('user_id', session.user.id)
      .order('created_at', { ascending: false })
    setDocs(data || [])
    setLoading(false)
  }

  async function loadProfile() {
    const { data } = await supabase.from('profiles').select('*').eq('id', session.user.id).single()
    setProfile(data || {})
  }

  function startNew() {
    setForm({ title: '', agency: '', solicitation_number: '', raw_input: '' })
    setActiveDoc(null)
    setMode('input')
  }

  function openDoc(doc) {
    setActiveDoc(doc)
    setMode('results')
    setAiAnalysis(null)
    setAiError('')
    setDrafts({})
  }

  async function deleteDoc(id) {
    setDocs(prev => prev.filter(d => d.id !== id))
    await supabase.from('fass_fill_documents').delete().eq('id', id)
  }

  function loadSample() {
    setForm({
      title: 'Janitorial and Custodial Services — SSA Baltimore',
      agency: 'Social Security Administration',
      solicitation_number: 'SSA-BAL-2026-0142',
      raw_input: SAMPLE_TEXT,
    })
  }

  // Screenshot continuity: for sources behind a login (FedConnect, Unison,
  // DIBBS) there's nothing to fetch server-side, but the user is already
  // looking at the page — a screenshot transcribed by the vision model
  // lands in the exact same textarea a paste would, then flows through
  // the same regex parser untouched.
  async function handleScreenshotUpload(e) {
    const files = e.target.files
    if (!files || !files.length) return
    setExtracting(true)
    setExtractError('')
    try {
      const result = await extractFromImages(files)
      setForm(prev => ({
        ...prev,
        raw_input: prev.raw_input.trim()
          ? `${prev.raw_input}\n\n--- from screenshot ---\n${result.raw_text}`
          : result.raw_text,
      }))
    } catch (err) {
      setExtractError(err.message || 'Could not read the screenshot — try pasting the text manually instead.')
    } finally {
      setExtracting(false)
      e.target.value = '' // allow re-selecting the same file(s)
    }
  }

  function runParse() {
    if (!form.raw_input.trim()) return
    const parsed = parseSolicitation(form.raw_input)
    const outline = buildOutline(parsed)
    const doc = {
      title: form.title || 'Untitled Solicitation',
      agency: form.agency || null,
      solicitation_number: form.solicitation_number || null,
      raw_input: form.raw_input,
      parsed,
      outline,
    }
    setActiveDoc(doc)
    setMode('results')
    setAiAnalysis(null)
    setAiError('')
    setDrafts({})
  }

  async function runDeepAnalysis() {
    setAiLoading(true)
    setAiError('')
    try {
      const result = await analyzeSolicitation(activeDoc.raw_input, activeDoc.parsed)
      setAiAnalysis(result)
    } catch (e) {
      setAiError(e.message || 'AI analysis failed — backend may not have a provider key configured.')
    } finally {
      setAiLoading(false)
    }
  }

  async function draftOutlineItem(item) {
    setDraftingId(item.id)
    try {
      const result = await draftSection({
        sectionName: item.label,
        sectionDescription: item.notes,
        solicitationSummary: aiAnalysis?.fields?.plain_summary || activeDoc.title,
        profile,
        pastPerformance: profile?.past_performance || [],
      })
      setDrafts(prev => ({ ...prev, [item.id]: result }))
    } catch (e) {
      setDrafts(prev => ({ ...prev, [item.id]: { error: e.message || 'Draft failed' } }))
    } finally {
      setDraftingId(null)
    }
  }

  async function saveDoc() {
    setSaving(true)

    // If this doc isn't linked to a Pipeline proposal yet, create one now
    // (or reuse the row already flagged/scored elsewhere) so the work
    // happening in FASS FILL actually shows up as a Pipeline card instead
    // of living only in this page.
    let proposalId = linkedProposalId
    if (!proposalId) {
      const { data: proposal } = await supabase.from('proposals').insert({
        user_id: session.user.id,
        title: activeDoc.title,
        agency: activeDoc.agency || null,
        stage: 'pursuing',
        status: 'pursuing',
        // Carry the actual pasted solicitation text onto the proposal row —
        // this is what R-E-A-D's AI synthesis reads if someone scores this
        // same opportunity there instead of starting from WARDOG.
        description: activeDoc.raw_input || null,
      }).select().single()
      if (proposal) {
        proposalId = proposal.id
        setLinkedProposalId(proposal.id)
        logBusinessEvent(session.user.id, 'documentation', 'proposal_drafted', 3, `Drafted "${activeDoc.title}"`)
      }
    }

    if (activeDoc.id) {
      await supabase.from('fass_fill_documents').update({
        title: activeDoc.title, agency: activeDoc.agency, solicitation_number: activeDoc.solicitation_number,
        raw_input: activeDoc.raw_input, parsed: activeDoc.parsed, outline: activeDoc.outline,
        proposal_id: proposalId || null,
        updated_at: new Date().toISOString(),
      }).eq('id', activeDoc.id)
    } else {
      const { data } = await supabase.from('fass_fill_documents').insert({
        user_id: session.user.id, title: activeDoc.title, agency: activeDoc.agency,
        solicitation_number: activeDoc.solicitation_number, raw_input: activeDoc.raw_input,
        parsed: activeDoc.parsed, outline: activeDoc.outline,
        proposal_id: proposalId || null,
      }).select().single()
      if (data) {
        setActiveDoc(data)
        logBusinessEvent(session.user.id, 'documentation', 'fill_document_created', 5, `Built compliance matrix for "${activeDoc.title}"`)
      }
    }
    await loadDocs()
    setSaving(false)
  }

  function toggleOutlineItem(id) {
    setActiveDoc(prev => ({ ...prev, outline: prev.outline.map(i => i.id === id ? { ...i, done: !i.done } : i) }))
  }
  function noteOutlineItem(id, notes) {
    setActiveDoc(prev => ({ ...prev, outline: prev.outline.map(i => i.id === id ? { ...i, notes } : i) }))
  }
  function deleteOutlineItem(id) {
    setActiveDoc(prev => ({ ...prev, outline: prev.outline.filter(i => i.id !== id) }))
  }
  function addOutlineItem() {
    setActiveDoc(prev => ({
      ...prev,
      outline: [...prev.outline, { id: uid(), label: 'New item', type: 'section', pageLimit: null, done: false, notes: '' }],
    }))
  }

  // ── Capability statement ────────────────────────────────
  async function saveProfile() {
    setProfileSaving(true)
    await supabase.from('profiles').update({
      company_name: profile.company_name, full_name: profile.full_name, sam_uei: profile.sam_uei,
      phone: profile.phone, website: profile.website, address: profile.address,
      cage_code: profile.cage_code, naics_codes: profile.naics_codes, year_established: profile.year_established,
      employee_count: profile.employee_count, certifications: profile.certifications,
      core_competencies: profile.core_competencies, differentiators: profile.differentiators,
      past_performance: profile.past_performance, updated_at: new Date().toISOString(),
    }).eq('id', session.user.id)
    setProfileSaving(false)
    setProfileEditing(false)
  }

  function toggleCert(cert) {
    setProfile(prev => {
      const list = prev.certifications || []
      return { ...prev, certifications: list.includes(cert) ? list.filter(c => c !== cert) : [...list, cert] }
    })
  }

  function updatePastPerf(idx, field, value) {
    setProfile(prev => {
      const list = [...(prev.past_performance || [])]
      list[idx] = { ...list[idx], [field]: value }
      return { ...prev, past_performance: list }
    })
  }
  function addPastPerf() {
    setProfile(prev => ({ ...prev, past_performance: [...(prev.past_performance || []), { client: '', contract: '', value: '', period: '', description: '' }] }))
  }
  function removePastPerf(idx) {
    setProfile(prev => ({ ...prev, past_performance: (prev.past_performance || []).filter((_, i) => i !== idx) }))
  }

  function printCapability() {
    window.print()
  }

  const naicsStr = (profile?.naics_codes || []).join(', ')

  return (
    <div className="fl">
      {/* Header */}
      <header className="fl-header">
        <div className="fl-header-inner">
          <button className="fl-back" onClick={() => navigate('/dashboard')}>
            <ArrowLeft size={15} /> Dashboard
          </button>
          <div className="fl-header-center">
            <span className="fl-logo-icon">⬡</span>
            <span className="fl-logo-text">FASS <strong>FILL</strong></span>
          </div>
          <div className="fl-header-right">
            <button className="fl-theme-btn" onClick={toggleTheme} title={isDark ? 'Light mode' : 'Dark mode'}>
              {isDark ? <Sun size={16} /> : <Moon size={16} />}
            </button>
            <button className="fl-signout" onClick={() => { signOut(); navigate('/') }}>Sign out</button>
          </div>
        </div>
      </header>

      {/* Top tabs */}
      <div className="fl-toptabs-wrap">
        <div className="fl-toptabs">
          <button className={`fl-toptab ${topTab === 'matrix' ? 'active' : ''}`} onClick={() => setTopTab('matrix')}>
            <ClipboardList size={14} /> Compliance &amp; Outline
          </button>
          <button className={`fl-toptab ${topTab === 'capability' ? 'active' : ''}`} onClick={() => setTopTab('capability')}>
            <Award size={14} /> Capability Statement
          </button>
        </div>
      </div>

      <main className="fl-content">
        {/* ══════════ COMPLIANCE & OUTLINE TAB ══════════ */}
        {topTab === 'matrix' && (
          <>
            {mode === 'list' && (
              <div className="fl-list-view">
                <div className="fl-list-head">
                  <div>
                    <h2>Solicitations</h2>
                    <p>Paste the requirements from any government solicitation and FASS FILL builds your compliance checklist automatically — no missed page limits, no missed deadlines.</p>
                  </div>
                  <button className="btn-primary" onClick={startNew}><Plus size={16} /> New Solicitation</button>
                </div>

                {loading ? (
                  <div className="fl-loading"><Loader2 size={18} className="spin" /> Loading…</div>
                ) : docs.length === 0 ? (
                  <div className="fl-onboard">
                    <div className="fl-onboard-steps">
                      <div className="fl-onboard-step">
                        <span className="fl-onboard-num">1</span>
                        <div>
                          <h4>Copy the requirements</h4>
                          <p>Open the solicitation PDF on SAM.gov (or wherever it was posted) and copy the section that tells you how to submit — usually called "Section L" or "Instructions to Offerors." Section M ("Evaluation Factors") is a bonus if you have it.</p>
                        </div>
                      </div>
                      <div className="fl-onboard-step">
                        <span className="fl-onboard-num">2</span>
                        <div>
                          <h4>Paste it in</h4>
                          <p>Drop the text into FASS FILL. It reads page limits, formatting rules, deadlines, required documents, and scoring weight — automatically.</p>
                        </div>
                      </div>
                      <div className="fl-onboard-step">
                        <span className="fl-onboard-num">3</span>
                        <div>
                          <h4>Work the checklist</h4>
                          <p>Check items off as you build your proposal. Nothing gets forgotten, nothing gets you disqualified for a technicality.</p>
                        </div>
                      </div>
                    </div>
                    <div className="fl-onboard-actions">
                      <button className="btn-primary" onClick={startNew}>Parse your first solicitation →</button>
                      <button className="fl-sample-link" onClick={() => { startNew(); loadSample() }}>
                        <Sparkles size={13} /> Or see it work with a sample first
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="fl-doc-grid">
                    {docs.map(d => <DocCard key={d.id} doc={d} onOpen={openDoc} onDelete={deleteDoc} />)}
                  </div>
                )}
              </div>
            )}

            {mode === 'input' && (
              <div className="fl-input-view">
                <button className="fl-sub-back" onClick={() => setMode('list')}><ArrowLeft size={13} /> Back</button>
                <h2>New Solicitation</h2>
                {incomingSource && (
                  <div className="fl-source-banner">
                    <ClipboardList size={14} /> Continuing from <strong>{incomingSource}</strong> — paste the solicitation text you copied there into the box below. Same compliance matrix either way.
                  </div>
                )}
                <p className="fl-input-sub">
                  Paste <strong>Section L</strong> (Instructions to Offerors), <strong>Section M</strong> (Evaluation Criteria), or the full <strong>PWS/SOW</strong> (the work statement). The more text, the better the matrix.
                </p>
                <details className="fl-jargon">
                  <summary><HelpCircle size={13} /> Not sure what that means or where to find it?</summary>
                  <div className="fl-jargon-body">
                    <p><strong>Where to find it:</strong> open the solicitation listing on SAM.gov (or wherever it was posted) and open the attached RFP/RFQ PDF. The submission instructions are usually a labeled section near the front or back.</p>
                    <p><strong>Section L</strong> = "Instructions to Offerors" — tells you how to submit, page limits, formatting, and deadline.</p>
                    <p><strong>Section M</strong> = "Evaluation Factors" — tells you how the agency scores proposals and what matters most.</p>
                    <p><strong>PWS / SOW</strong> = "Performance Work Statement" / "Statement of Work" — describes the actual work to be done.</p>
                    <p>Don't have all three? Paste whatever you have — partial text still works, just with fewer detected fields.</p>
                  </div>
                </details>

                <div className="fl-input-grid">
                  <input className="fl-input" placeholder="Title (e.g. Janitorial Services — SSA Woodlawn)" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} />
                  <input className="fl-input" placeholder="Agency" value={form.agency} onChange={e => setForm({ ...form, agency: e.target.value })} />
                  <input className="fl-input" placeholder="Solicitation #" value={form.solicitation_number} onChange={e => setForm({ ...form, solicitation_number: e.target.value })} />
                </div>

                {aiEnabled() && (
                  <div className="fl-screenshot-row">
                    <label className={`fl-screenshot-btn ${extracting ? 'disabled' : ''}`}>
                      {extracting ? <Loader2 size={13} className="spin" /> : <Camera size={13} />}
                      {extracting ? 'Reading screenshot…' : 'Or upload a screenshot instead'}
                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        disabled={extracting}
                        onChange={handleScreenshotUpload}
                      />
                    </label>
                    <span className="fl-screenshot-hint">For portals you can't copy text from — FedConnect, Unison, DIBBS, anything behind a login.</span>
                  </div>
                )}
                {extractError && (
                  <div className="fl-warn"><AlertTriangle size={14} /><span>{extractError}</span></div>
                )}

                <textarea
                  className="fl-textarea"
                  placeholder="Paste solicitation text here…"
                  value={form.raw_input}
                  onChange={e => setForm({ ...form, raw_input: e.target.value })}
                  rows={16}
                />

                <div className="fl-input-actions">
                  <button className="btn-primary" disabled={!form.raw_input.trim()} onClick={runParse}>
                    Parse Solicitation <ChevronRight size={16} />
                  </button>
                  {!form.raw_input.trim() && (
                    <button className="fl-sample-link" onClick={loadSample}>
                      <Sparkles size={13} /> Try it with a sample solicitation
                    </button>
                  )}
                </div>
              </div>
            )}

            {mode === 'results' && activeDoc && (
              <div className="fl-results-view">
                <div className="fl-results-head">
                  <button className="fl-sub-back" onClick={() => setMode('list')}><ArrowLeft size={13} /> Back</button>
                  <div className="fl-results-titles">
                    <input
                      className="fl-results-title-input"
                      value={activeDoc.title}
                      onChange={e => setActiveDoc({ ...activeDoc, title: e.target.value })}
                    />
                    {activeDoc.agency && <span className="fl-results-agency">{activeDoc.agency}</span>}
                  </div>
                  <button className="btn-primary fl-save-btn" onClick={saveDoc} disabled={saving}>
                    {saving ? <Loader2 size={14} className="spin" /> : <Save size={14} />} Save
                  </button>
                </div>

                <SnapshotCard parsed={activeDoc.parsed} />

                <ConfidenceChip parsed={activeDoc.parsed} />

                {parseConfidence(activeDoc.parsed).detected < 5 && (
                  <div className="fl-warn">
                    <AlertTriangle size={14} />
                    <span>Some fields weren't detected — double-check Section L manually before you submit. Paste more of the original text (especially the submission instructions) to improve detection.</span>
                  </div>
                )}

                {aiEnabled() && (
                  <div className="fl-ai-panel">
                    {!aiAnalysis && !aiLoading && (
                      <button className="btn-outline fl-ai-trigger" onClick={runDeepAnalysis}>
                        <Sparkles size={14} /> Run Deep AI Analysis
                      </button>
                    )}
                    {aiLoading && (
                      <div className="fl-ai-loading"><Loader2 size={14} className="spin" /> Reading the solicitation for risks, ambiguities, and a plain-English summary…</div>
                    )}
                    {aiError && <div className="fl-warn"><AlertTriangle size={14} /><span>{aiError}</span></div>}
                    {aiAnalysis && (
                      <div className="fl-ai-result">
                        <div className="fl-ai-result-head">
                          <span className="fl-ai-badge"><Sparkles size={12} /> AI analysis via {aiAnalysis.provider}</span>
                          <button className="fl-ai-rerun" onClick={runDeepAnalysis}>Re-run</button>
                        </div>
                        {aiAnalysis.fields?.plain_summary && (
                          <p className="fl-ai-summary">{aiAnalysis.fields.plain_summary}</p>
                        )}
                        {aiAnalysis.fields?.risk_flags?.length > 0 && (
                          <div className="fl-ai-block">
                            <h5>Risks a first-time bidder would likely miss</h5>
                            <ul>{aiAnalysis.fields.risk_flags.map((r, i) => <li key={i}>{r}</li>)}</ul>
                          </div>
                        )}
                        {aiAnalysis.fields?.ambiguities?.length > 0 && (
                          <div className="fl-ai-block">
                            <h5>Worth a question to the contracting officer</h5>
                            <ul>{aiAnalysis.fields.ambiguities.map((a, i) => <li key={i}>{a}</li>)}</ul>
                          </div>
                        )}
                        {!aiAnalysis.fields?.risk_flags?.length && !aiAnalysis.fields?.ambiguities?.length && (
                          <p className="fl-ai-clean">No major risks or ambiguities flagged.</p>
                        )}
                      </div>
                    )}
                  </div>
                )}

                <EvalCriteria criteria={activeDoc.parsed.evalCriteria} />

                <div className="fl-outline-section">
                  <div className="fl-outline-head">
                    <h4 className="fl-block-title">Compliance Checklist <span className="fl-block-sub">— check off as you build</span></h4>
                    <button className="fl-add-item" onClick={addOutlineItem}><Plus size={13} /> Add item</button>
                  </div>
                  <div className="fl-outline-list">
                    {activeDoc.outline.map(item => (
                      <OutlineRow
                        key={item.id} item={item} onToggle={toggleOutlineItem} onNote={noteOutlineItem} onDelete={deleteOutlineItem}
                        onDraft={draftOutlineItem} drafting={draftingId === item.id} draft={drafts[item.id]}
                      />
                    ))}
                  </div>
                </div>
              </div>
            )}
          </>
        )}

        {/* ══════════ CAPABILITY STATEMENT TAB ══════════ */}
        {topTab === 'capability' && profile && (
          <div className="fl-cap-view">
            <div className="fl-cap-toolbar">
              <h2>Capability Statement</h2>
              <div className="fl-cap-actions">
                {profileEditing ? (
                  <button className="btn-primary" onClick={saveProfile} disabled={profileSaving}>
                    {profileSaving ? <Loader2 size={14} className="spin" /> : <Save size={14} />} Save
                  </button>
                ) : (
                  <button className="btn-outline" onClick={() => setProfileEditing(true)}><Edit2 size={14} /> Edit</button>
                )}
                <button className="btn-outline" onClick={printCapability}><Printer size={14} /> Print / Save PDF</button>
              </div>
            </div>

            {profileEditing ? (
              <div className="fl-cap-form">
                <div className="fl-cap-form-grid">
                  <label>Company name<input value={profile.company_name || ''} onChange={e => setProfile({ ...profile, company_name: e.target.value })} /></label>
                  <label>Point of contact<input value={profile.full_name || ''} onChange={e => setProfile({ ...profile, full_name: e.target.value })} /></label>
                  <label>SAM UEI<input value={profile.sam_uei || ''} onChange={e => setProfile({ ...profile, sam_uei: e.target.value })} /></label>
                  <label>CAGE code<input value={profile.cage_code || ''} onChange={e => setProfile({ ...profile, cage_code: e.target.value })} /></label>
                  <label>Phone<input value={profile.phone || ''} onChange={e => setProfile({ ...profile, phone: e.target.value })} /></label>
                  <label>Website<input value={profile.website || ''} onChange={e => setProfile({ ...profile, website: e.target.value })} /></label>
                  <label>Address<input value={profile.address || ''} onChange={e => setProfile({ ...profile, address: e.target.value })} /></label>
                  <label>Year established<input value={profile.year_established || ''} onChange={e => setProfile({ ...profile, year_established: e.target.value })} /></label>
                  <label>Employees<input value={profile.employee_count || ''} onChange={e => setProfile({ ...profile, employee_count: e.target.value })} /></label>
                  <label>NAICS codes (comma separated)
                    <input value={naicsStr} onChange={e => setProfile({ ...profile, naics_codes: e.target.value.split(',').map(s => s.trim()).filter(Boolean) })} />
                  </label>
                </div>

                <div className="fl-cap-certs">
                  <span className="fl-cap-label">Certifications</span>
                  <div className="fl-cap-cert-chips">
                    {CERT_OPTIONS.map(c => (
                      <button key={c} className={`fl-cert-chip ${(profile.certifications || []).includes(c) ? 'active' : ''}`} onClick={() => toggleCert(c)}>
                        {c}
                      </button>
                    ))}
                  </div>
                </div>

                <label className="fl-cap-textarea-label">Core competencies
                  <textarea rows={3} value={profile.core_competencies || ''} onChange={e => setProfile({ ...profile, core_competencies: e.target.value })} placeholder="e.g. Janitorial & facilities maintenance, event staffing, food service support…" />
                </label>
                <label className="fl-cap-textarea-label">Differentiators
                  <textarea rows={3} value={profile.differentiators || ''} onChange={e => setProfile({ ...profile, differentiators: e.target.value })} placeholder="What makes you different from every other bidder?" />
                </label>

                <div className="fl-pp-section">
                  <div className="fl-pp-head">
                    <span className="fl-cap-label">Past Performance</span>
                    <button className="fl-add-item" onClick={addPastPerf}><Plus size={13} /> Add</button>
                  </div>
                  {(profile.past_performance || []).map((pp, i) => (
                    <div key={i} className="fl-pp-row">
                      <input placeholder="Client / Agency" value={pp.client} onChange={e => updatePastPerf(i, 'client', e.target.value)} />
                      <input placeholder="Contract title" value={pp.contract} onChange={e => updatePastPerf(i, 'contract', e.target.value)} />
                      <input placeholder="Value (e.g. $250K)" value={pp.value} onChange={e => updatePastPerf(i, 'value', e.target.value)} />
                      <input placeholder="Period (e.g. 2022–2024)" value={pp.period} onChange={e => updatePastPerf(i, 'period', e.target.value)} />
                      <input placeholder="Brief description" value={pp.description} onChange={e => updatePastPerf(i, 'description', e.target.value)} />
                      <button className="fl-out-del" onClick={() => removePastPerf(i)}><Trash2 size={13} /></button>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div id="fl-print-area" className="fl-cap-preview">
                <div className="fl-cap-preview-head">
                  <h1>{profile.company_name || 'Your Company Name'}</h1>
                  <p className="fl-cap-tagline">{profile.core_competencies?.split('.')[0] || 'Capability Statement'}</p>
                </div>
                <div className="fl-cap-preview-grid">
                  <div>
                    <h3>Company Data</h3>
                    <ul>
                      {profile.sam_uei && <li><strong>UEI:</strong> {profile.sam_uei}</li>}
                      {profile.cage_code && <li><strong>CAGE:</strong> {profile.cage_code}</li>}
                      {naicsStr && <li><strong>NAICS:</strong> {naicsStr}</li>}
                      {profile.year_established && <li><strong>Established:</strong> {profile.year_established}</li>}
                      {profile.employee_count && <li><strong>Employees:</strong> {profile.employee_count}</li>}
                    </ul>
                  </div>
                  <div>
                    <h3>Contact</h3>
                    <ul>
                      {profile.full_name && <li>{profile.full_name}</li>}
                      {profile.phone && <li>{profile.phone}</li>}
                      {profile.website && <li>{profile.website}</li>}
                      {profile.address && <li>{profile.address}</li>}
                    </ul>
                  </div>
                </div>

                {profile.core_competencies && (
                  <div className="fl-cap-block">
                    <h3>Core Competencies</h3>
                    <p>{profile.core_competencies}</p>
                  </div>
                )}
                {profile.differentiators && (
                  <div className="fl-cap-block">
                    <h3>Differentiators</h3>
                    <p>{profile.differentiators}</p>
                  </div>
                )}
                {(profile.certifications || []).length > 0 && (
                  <div className="fl-cap-block">
                    <h3>Certifications</h3>
                    <div className="fl-cap-cert-list">
                      {profile.certifications.map(c => <span key={c} className="fl-cap-cert-pill">{c}</span>)}
                    </div>
                  </div>
                )}
                {(profile.past_performance || []).length > 0 && (
                  <div className="fl-cap-block">
                    <h3>Past Performance</h3>
                    {profile.past_performance.map((pp, i) => (
                      <div key={i} className="fl-cap-pp-item">
                        <strong>{pp.contract}</strong> — {pp.client} {pp.value && `· ${pp.value}`} {pp.period && `· ${pp.period}`}
                        {pp.description && <p>{pp.description}</p>}
                      </div>
                    ))}
                  </div>
                )}
                {!profile.company_name && (
                  <div className="fl-cap-empty-hint">
                    <Building2 size={20} />
                    <p>Fill in your company info to generate a one-page capability statement worth handing to a contracting officer.</p>
                    <button className="btn-primary" onClick={() => setProfileEditing(true)}><Edit2 size={14} /> Add Company Info</button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  )
}
