import { useMemo, useRef, useState, useEffect } from 'react'
import { useLocation, Link } from 'react-router-dom'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Highlight from '@tiptap/extension-highlight'
import {
  ListTree, Check, MessageSquare, Download, Type, Ruler, FileText, AlertTriangle,
  ShieldCheck, CheckCircle2, Circle, Building2, ChevronDown, X, Library, Trash2, Plus, BookmarkPlus,
  Sparkles, Loader2,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { getBusinessProfile } from '../lib/businessProfile'
import { draftSection, aiEnabled } from '../lib/aiClient'
import { parseSolicitation, buildOutline } from '../lib/solicitationParser'
import { assembleProposal, assembledToHtml } from '../lib/assembleProposal'
import { buildComplianceMatrix } from '../lib/complianceMatrix'
import { buildDocxBlob } from '../lib/exportDocx'
import { listReuseBlocks, createReuseBlock, markReuseBlockUsed, deleteReuseBlock, guessCategory } from '../lib/reuseLibrary'
import { ensureDoc, listComments, addComment as apiAddComment, deleteComment as apiDeleteComment, resolveComment as apiResolveComment, listSectionState, setSectionApproved, listMyDocs, saveDocContent } from '../lib/proposalReview'
import { getCreditBalance } from '../lib/credits'
import { buildTemplateDoc } from '../lib/proposalTemplates'
import useSeo from '../hooks/useSeo'
import './ProposalEditor.css'

// A realistic Section L/M excerpt so the editor renders something real on
// first open — same first-run philosophy as FASS FILL's SAMPLE_TEXT. A real
// document arrives via location.state.parsed (from the compliance matrix).
const SAMPLE = `SECTION L — INSTRUCTIONS TO OFFERORS
Solicitation No. SSA-BAL-2026-0142 — Janitorial and Custodial Services, SSA Baltimore Field Office
Proposals are due no later than July 15, 2026, 2:00 PM EST via SAM.gov electronic submission.
Proposals shall not exceed 20 pages, single-spaced, 12-point Times New Roman, with 1-inch margins.
The proposal shall be organized into the following volumes:
Volume I – Technical Approach (10 pages)
Volume II – Management Approach (5 pages)
Volume III – Price Proposal (no page limit)
Offerors shall include: Representations and Certifications, Past Performance references,
Resumes for key personnel, Certificate of Insurance, Quality Control Plan, Staffing Plan.
SECTION M — EVALUATION FACTORS
Technical Approach 40%, Past Performance 30%, Price 20%, Management Approach 10%.`

export default function ProposalEditor() {
  useSeo({ title: 'Proposal Editor', description: 'Review and finalize your generated proposal.', path: '/proposal-editor' })
  const location = useLocation()
  const { session } = useAuth()
  const userId = session?.user?.id

  // Ways in: an industry template (from the gallery or a saved template-based
  // doc reopened via proposal_id), a real parsed solicitation (FASS FILL), or
  // the built-in sample. A saved template doc is rebuilt from its proposal_id
  // so its structure/TOC are correct even after a reload.
  const stateProposalId = location.state?.proposalId || ''
  const templateDoc = location.state?.template
    || (stateProposalId.startsWith('template-') ? buildTemplateDoc(stateProposalId.replace('template-', '')) : null)
  const { parsed, outline, baseTitle } = useMemo(() => {
    if (templateDoc) return { parsed: null, outline: null, baseTitle: templateDoc.title }
    const p = location.state?.parsed || parseSolicitation(SAMPLE)
    const o = location.state?.outline || buildOutline(p)
    const t = location.state?.title || 'Janitorial & Custodial Services — SSA Baltimore'
    return { parsed: p, outline: o, baseTitle: t }
  }, [location.state]) // eslint-disable-line

  // AI drafts replace the placeholder scaffolds per section; the assembler
  // already merges a drafts map, so re-assembling swaps placeholder → AI prose.
  const [drafts, setDrafts] = useState({})        // sectionId -> html
  const [citations, setCitations] = useState({})  // sectionId -> grounded passages
  const [draftingId, setDraftingId] = useState(null)
  const [draftError, setDraftError] = useState(null)
  const [credits, setCredits] = useState(null)    // AI-credit balance (null = unknown)
  const [showRefill, setShowRefill] = useState(false)
  const [savedContent, setSavedContent] = useState(null) // persisted editor JSON
  const [saveStatus, setSaveStatus] = useState('')        // '' | 'saving' | 'saved'
  const [myDocs, setMyDocs] = useState([])                // saved drafts for the switcher
  const [switchOpen, setSwitchOpen] = useState(false)

  // Load the user's saved drafts for the solicitation switcher.
  useEffect(() => {
    if (!userId) return
    let cancelled = false
    listMyDocs(userId).then(d => { if (!cancelled) setMyDocs(d) })
    return () => { cancelled = true }
  }, [userId])

  // Load the AI-credit balance so the editor can show it + gate drafting.
  useEffect(() => {
    if (!userId) return
    let cancelled = false
    getCreditBalance(userId).then(b => { if (!cancelled && b !== null) setCredits(b) })
    return () => { cancelled = true }
  }, [userId])

  const doc = useMemo(() => {
    const base = templateDoc || assembleProposal(parsed, outline, { title: baseTitle })
    // Merge AI drafts by section id — uniform for template and parsed docs.
    if (!Object.keys(drafts).length) return base
    return { ...base, sections: base.sections.map(s => (drafts[s.id] ? { ...s, html: drafts[s.id], source: 'ai' } : s)) }
  }, [templateDoc, parsed, outline, baseTitle, drafts])

  const editorWrapRef = useRef(null)
  const [approved, setApproved] = useState(() => new Set())
  const [activeSec, setActiveSec] = useState(null)
  const [comments, setComments] = useState({}) // sectionId -> [text]
  const [commentDraft, setCommentDraft] = useState('')
  const [railTab, setRailTab] = useState('review') // 'review' | 'compliance'
  const [profile, setProfile] = useState(null)
  const [insertOpen, setInsertOpen] = useState(false)
  const [preflightOpen, setPreflightOpen] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [libraryBlocks, setLibraryBlocks] = useState([])
  const [librarySaving, setLibrarySaving] = useState(null)
  const [documentId, setDocumentId] = useState(null)

  // Load the company reuse library once.
  useEffect(() => {
    if (!userId) return
    let cancelled = false
    listReuseBlocks(userId).then(b => { if (!cancelled) setLibraryBlocks(b) })
    return () => { cancelled = true }
  }, [userId])

  // Ensure a persisted document for this proposal, then hydrate the review
  // loop (comments keyed by section heading + approved sections) from it.
  // All of this degrades gracefully if the backend/migration isn't there:
  // ensureDoc returns null, documentId stays null, and the editor behaves
  // exactly like the old local-only version.
  useEffect(() => {
    if (!userId) return
    let cancelled = false
    const proposalId = location.state?.proposalId || 'sample'
    ensureDoc(userId, { proposalId, title: baseTitle }).then(async d => {
      if (cancelled || !d?.id) return
      setDocumentId(d.id)
      if (d.content) setSavedContent(d.content)  // restore the persisted draft body
      const [serverComments, states] = await Promise.all([
        listComments(userId, d.id),
        listSectionState(userId, d.id),
      ])
      if (cancelled) return
      // Comments → keyed by section heading.
      const byHeading = {}
      for (const c of serverComments) {
        (byHeading[c.section_key] = byHeading[c.section_key] || []).push(c)
      }
      setComments(byHeading)
      // Approvals → resolve persisted headings back to current section ids.
      const approvedHeadings = new Set(states.filter(s => s.approved).map(s => s.section_key))
      const ids = doc.sections.filter(s => approvedHeadings.has(s.heading)).map(s => s.id)
      setApproved(new Set(ids))
    })
    return () => { cancelled = true }
  }, [userId, baseTitle, location.state])

  // Pull the shared business profile so the user can drop their own
  // UEI / CAGE / set-aside / signer info into the draft instead of retyping.
  useEffect(() => {
    if (!session?.user?.id) return
    let cancelled = false
    getBusinessProfile(session.user.id).then(p => { if (!cancelled) setProfile(p) })
    return () => { cancelled = true }
  }, [session?.user?.id])

  // Only offer fields that actually have a value.
  const insertFields = useMemo(() => {
    if (!profile) return []
    const f = []
    const push = (label, value) => { if (value && String(value).trim()) f.push({ label, value: String(value).trim() }) }
    push('Company name', profile.company_name)
    push('UEI (SAM.gov)', profile.sam_uei)
    push('CAGE code', profile.cage_code)
    push('NAICS codes', (profile.naics_codes || []).join(', '))
    push('Set-aside status', (profile.certifications || []).join(', '))
    push('Authorized signer', [profile.signer_name, profile.signer_title].filter(Boolean).join(', '))
    push('Signer email', profile.signer_email)
    push('Signer phone', profile.signer_phone)
    return f
  }, [profile])

  // Live compliance matrix — recomputes when a section is approved.
  const matrix = useMemo(
    () => buildComplianceMatrix(parsed, doc, { approved }),
    [parsed, doc, approved]
  )

  const editor = useEditor({
    extensions: [StarterKit, Highlight.configure({ multicolor: false })],
    content: assembledToHtml(doc),
    editable: true,
  })

  // Set the editor content: prefer a persisted draft body on (re)load; once
  // the user starts AI-drafting (drafts populated), reflect the assembled doc.
  useEffect(() => {
    if (!editor) return
    if (savedContent && Object.keys(drafts).length === 0) {
      editor.commands.setContent(savedContent)
    } else {
      editor.commands.setContent(assembledToHtml(doc))
    }
  }, [editor, doc, savedContent])

  async function saveDraft() {
    if (!editor || !documentId) return
    setSaveStatus('saving')
    const ok = await saveDocContent(userId, documentId, {
      content: editor.getJSON(),
      title: doc.title,
      format: doc.format,
    })
    setSaveStatus(ok ? 'saved' : '')
    if (ok) {
      setSavedContent(editor.getJSON())
      listMyDocs(userId).then(setMyDocs)
      setTimeout(() => setSaveStatus(''), 2000)
    }
  }

  // Scroll the editor to the Nth section heading (index-based, robust to
  // TipTap not preserving custom heading attributes).
  function scrollToSection(index, id) {
    setActiveSec(id)
    const el = editorWrapRef.current?.querySelectorAll('.ProseMirror h2')?.[index]
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  function scrollToSectionById(id) {
    const idx = doc.sections.findIndex(s => s.id === id)
    if (idx >= 0) scrollToSection(idx, id)
  }

  function statusIcon(status) {
    if (status === 'addressed') return <CheckCircle2 size={15} />
    if (status === 'missing' || status === 'over') return <AlertTriangle size={15} />
    return <Circle size={15} />
  }

  function insertValue(value) {
    editor?.chain().focus().insertContent(value).run()
    setInsertOpen(false)
  }

  // Real AI drafting — replaces a section's placeholder with prose grounded
  // in the user's own past performance (draftSection's RAG). The returned
  // grounded_in passages become the section's source citations.
  // Returns true on success, false on any failure (so draftAll can stop).
  async function draftWithAI(section, guidance = '') {
    if (!aiEnabled()) return false
    setDraftingId(section.id)
    setDraftError(null)
    try {
      const res = await draftSection({
        sectionName: section.heading,
        sectionDescription: guidance, // reviewer notes steer the re-draft
        solicitationSummary: baseTitle,
        profile,
        pastPerformance: profile?.past_performance || [],
        userId, // metered: each draft costs 1 AI credit
      })
      if (res?.draft) {
        const html = res.draft.split(/\n{2,}/).map(p => `<p>${p.replace(/\n/g, '<br>')}</p>`).join('')
        setDrafts(prev => ({ ...prev, [section.id]: html }))
        setCitations(prev => ({ ...prev, [section.id]: res.grounded_in || [] }))
      }
      if (typeof res?.remaining_credits === 'number') setCredits(res.remaining_credits)
      return true
    } catch (e) {
      // 402 from the backend surfaces as an "out of credits" message → refill.
      if (/credit/i.test(e.message || '')) {
        setCredits(0)
        setShowRefill(true)
      } else {
        setDraftError(e.message || 'Draft failed — the backend may not have an AI provider key configured.')
      }
      return false
    } finally {
      setDraftingId(null)
    }
  }

  async function draftAll() {
    if (credits !== null && credits <= 0) { setShowRefill(true); return }
    for (const s of doc.sections) {
      if (!drafts[s.id]) {
        const ok = await draftWithAI(s)   // sequential — don't hammer the LLM
        if (!ok) break                    // stop on first failure (e.g. out of credits)
      }
    }
  }

  // Pull the current text of one section out of the editor (everything from
  // its heading up to the next heading) — used to save it to the library.
  function sectionText(heading) {
    const json = editor?.getJSON()
    if (!json?.content) return ''
    const txt = n => (n.content || []).map(c => c.text || '').join('')
    let collecting = false
    const parts = []
    for (const n of json.content) {
      if (n.type === 'heading') {
        if (collecting) break
        if (txt(n).trim() === heading.trim()) { collecting = true }
      } else if (collecting && n.type === 'paragraph') {
        parts.push(txt(n))
      }
    }
    return parts.join('\n\n').trim()
  }

  async function saveToLibrary(section) {
    const body = sectionText(section.heading)
    if (!body || !userId) return
    setLibrarySaving(section.id)
    const r = await createReuseBlock(userId, {
      title: section.heading,
      body,
      category: guessCategory(section.heading),
      source: 'manual',
    })
    if (r.ok && r.block) setLibraryBlocks(prev => [r.block, ...prev])
    setLibrarySaving(null)
  }

  function insertBlock(block) {
    // Preserve paragraph breaks when dropping a saved block in.
    const html = block.body.split(/\n{2,}/).map(p => `<p>${p.replace(/\n/g, '<br>')}</p>`).join('')
    editor?.chain().focus().insertContent(html).run()
    if (userId) markReuseBlockUsed(userId, block.id)
  }

  async function removeBlock(id) {
    if (!userId) return
    const ok = await deleteReuseBlock(userId, id)
    if (ok) setLibraryBlocks(prev => prev.filter(b => b.id !== id))
  }

  // Library blocks that match a section's category — the inline suggestion.
  function suggestionsFor(heading) {
    const cat = guessCategory(heading)
    return libraryBlocks.filter(b => b.category === cat).slice(0, 3)
  }

  async function downloadDocx() {
    if (!editor) return
    setExporting(true)
    try {
      const blob = await buildDocxBlob(editor.getJSON(), doc, { companyName: profile?.company_name })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${(doc.title || 'Proposal').replace(/[^\w\s-]/g, '').trim()}.docx`
      document.body.appendChild(a)
      a.click()
      a.remove()
      setTimeout(() => URL.revokeObjectURL(url), 1000)
      setPreflightOpen(false)
    } catch (e) {
      console.error('docx export failed', e)
    } finally {
      setExporting(false)
    }
  }

  function toggleApprove(section) {
    const willApprove = !approved.has(section.id)
    setApproved(prev => {
      const next = new Set(prev)
      if (willApprove) next.add(section.id); else next.delete(section.id)
      return next
    })
    if (documentId) setSectionApproved(userId, documentId, section.heading, willApprove)
  }

  async function addComment(section) {
    const text = commentDraft.trim()
    if (!text) return
    setCommentDraft('')
    const key = section.heading
    if (documentId) {
      const saved = await apiAddComment(userId, documentId, key, text)
      if (saved) {
        setComments(prev => ({ ...prev, [key]: [...(prev[key] || []), saved] }))
        return
      }
    }
    // Offline / pre-migration fallback: keep it local so the UX still works.
    const local = { id: 'local-' + Date.now(), body: text }
    setComments(prev => ({ ...prev, [key]: [...(prev[key] || []), local] }))
  }

  function removeComment(section, commentId) {
    const key = section.heading
    setComments(prev => ({ ...prev, [key]: (prev[key] || []).filter(c => c.id !== commentId) }))
    if (documentId && !String(commentId).startsWith('local-')) apiDeleteComment(userId, commentId)
  }

  function toggleResolve(section, comment) {
    const key = section.heading
    const next = comment.status === 'resolved' ? 'open' : 'resolved'
    setComments(prev => ({
      ...prev,
      [key]: (prev[key] || []).map(c => c.id === comment.id ? { ...c, status: next } : c),
    }))
    if (documentId && !String(comment.id).startsWith('local-')) apiResolveComment(userId, comment.id, next)
  }

  // "Re-draft from notes" — feed a section's open comments into the AI as
  // guidance so the regenerated draft actually addresses the feedback.
  function redraftFromNotes(section) {
    const open = (comments[section.heading] || []).filter(c => c.status !== 'resolved')
    if (!open.length) return
    draftWithAI(section, 'Revise to address this reviewer feedback: ' + open.map(c => c.body).join('; '))
  }

  const total = doc.sections.length
  const reviewedCount = approved.size
  const pct = total ? Math.round((reviewedCount / total) * 100) : 0
  const overLimitVolumes = doc.sections.filter(s => s.pageLimit && s.pageEstimate > s.pageLimit)

  const fmt = doc.format
  const fmtChips = [
    fmt.font && { icon: Type, text: fmt.font + (fmt.fontSize ? ` · ${fmt.fontSize}` : '') },
    fmt.margin && { icon: Ruler, text: fmt.margin },
    fmt.pageLimit && { icon: FileText, text: `${fmt.pageLimit}-page limit` },
  ].filter(Boolean)

  return (
    <div className="pe">
      {/* Header */}
      <header className="pe-head">
        <div className="pe-head-main">
          <div className="pe-eyebrow-row">
            <span className="fx-eyebrow">Proposal Editor</span>
            {myDocs.length > 0 && (
              <div className="pe-switch">
                <button className="pe-switch-btn" onClick={() => setSwitchOpen(o => !o)}>
                  Switch solicitation <ChevronDown size={13} />
                </button>
                {switchOpen && (
                  <div className="pe-switch-menu" onMouseLeave={() => setSwitchOpen(false)}>
                    {myDocs.map(d => (
                      <button
                        key={d.id}
                        className="pe-switch-item"
                        onClick={() => { setSwitchOpen(false); navigate('/proposal-editor', { state: { proposalId: d.proposal_id, title: d.title } }) }}
                      >
                        <span className="pe-switch-title">{d.title || d.proposal_id}</span>
                        <span className="pe-switch-meta">{new Date(d.updated_at).toLocaleDateString()}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
          <h1>{doc.title}</h1>
          <div className="pe-chips">
            {fmtChips.map((c, i) => {
              const Icon = c.icon
              return <span className="pe-chip" key={i}><Icon size={13} /> {c.text}</span>
            })}
            {doc.dueDate && <span className="pe-chip pe-chip-due">Due {doc.dueDate}</span>}
          </div>
        </div>
        <div className="pe-head-actions">
          <span className="pe-progress" title={`${reviewedCount} of ${total} sections reviewed`}>
            <span className="pe-progress-track"><span className="pe-progress-fill" style={{ width: `${pct}%` }} /></span>
            {reviewedCount}/{total} reviewed
          </span>

          {aiEnabled() && credits !== null && (
            <span className={`pe-credits ${credits <= 0 ? 'is-empty' : ''}`} title="AI credits — each draft costs 1">
              <Sparkles size={12} /> {credits} {credits === 1 ? 'credit' : 'credits'}
            </span>
          )}
          {aiEnabled() && (
            <button className="fx-btn fx-btn-ghost" onClick={draftAll} disabled={draftingId !== null} title="Draft every section from your past performance">
              {draftingId !== null ? <Loader2 size={15} className="pe-spin" /> : <Sparkles size={15} />} Draft all with AI
            </button>
          )}

          {/* Insert business info — drop your own UEI/CAGE/signer at the cursor */}
          <div className="pe-insert">
            <button className="fx-btn fx-btn-ghost" onClick={() => setInsertOpen(o => !o)} aria-expanded={insertOpen}>
              <Building2 size={15} /> Insert business info <ChevronDown size={13} />
            </button>
            {insertOpen && (
              <div className="pe-insert-menu" onMouseLeave={() => setInsertOpen(false)}>
                {insertFields.length === 0 ? (
                  <Link to="/passport" className="pe-insert-empty">Set up your Passport to insert UEI, CAGE, signer…</Link>
                ) : insertFields.map(f => (
                  <button key={f.label} className="pe-insert-item" onClick={() => insertValue(f.value)}>
                    <span className="pe-insert-label">{f.label}</span>
                    <span className="pe-insert-val">{f.value}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <button className="fx-btn fx-btn-ghost" onClick={saveDraft} disabled={saveStatus === 'saving' || !documentId}>
            <Check size={15} /> {saveStatus === 'saving' ? 'Saving…' : saveStatus === 'saved' ? 'Saved' : 'Save draft'}
          </button>

          <button className="fx-btn fx-btn-primary" onClick={() => setPreflightOpen(true)}>
            <Download size={15} /> Export .docx
          </button>
        </div>
      </header>

      {overLimitVolumes.length > 0 && (
        <div className="pe-warn">
          <AlertTriangle size={15} />
          {overLimitVolumes.map(v => `“${v.heading}” is ~${v.pageEstimate}pg over its ${v.pageLimit}pg limit`).join(' · ')}
        </div>
      )}

      <div className="pe-body">
        {/* TOC */}
        <aside className="pe-toc">
          <div className="pe-rail-head"><ListTree size={15} /> Contents</div>
          <nav>
            {doc.toc.map((t, i) => (
              <button
                key={t.id}
                className={`pe-toc-item ${activeSec === t.id ? 'is-active' : ''}`}
                onClick={() => scrollToSection(i, t.id)}
              >
                {approved.has(t.id) && <Check size={12} className="pe-toc-check" />}
                {t.label}
              </button>
            ))}
          </nav>
        </aside>

        {/* Document */}
        <main className="pe-doc" ref={editorWrapRef}>
          <EditorContent editor={editor} className="pe-editor" />
        </main>

        {/* Right rail — Review | Compliance */}
        <aside className="pe-review">
          <div className="pe-rail-tabs">
            <button className={railTab === 'review' ? 'is-active' : ''} onClick={() => setRailTab('review')}>
              <MessageSquare size={14} /> Review
            </button>
            <button className={railTab === 'compliance' ? 'is-active' : ''} onClick={() => setRailTab('compliance')}>
              <ShieldCheck size={14} /> Compliance
            </button>
            <button className={railTab === 'library' ? 'is-active' : ''} onClick={() => setRailTab('library')}>
              <Library size={14} /> Library
            </button>
          </div>

          {railTab === 'compliance' ? (
            <div className="pe-compliance">
              <div className="pe-comp-summary">
                <div className="pe-comp-score">{matrix.summary.ready}/{matrix.summary.total} requirements ready</div>
                <span className="pe-progress-track"><span className="pe-progress-fill" style={{ width: `${matrix.summary.pct}%` }} /></span>
                {matrix.summary.missing > 0 && (
                  <p className="pe-comp-flag"><AlertTriangle size={13} /> {matrix.summary.missing} scored/required item{matrix.summary.missing > 1 ? 's have' : ' has'} no section yet</p>
                )}
              </div>
              <div className="pe-comp-list">
                {matrix.items.map(it => (
                  <button
                    key={it.id}
                    className={`pe-comp-row st-${it.status}`}
                    onClick={() => it.sectionId && scrollToSectionById(it.sectionId)}
                    disabled={!it.sectionId}
                  >
                    <span className="pe-comp-ic">{statusIcon(it.status)}</span>
                    <span className="pe-comp-body">
                      <span className="pe-comp-kind">{it.kind}</span>
                      <span className="pe-comp-label">{it.label}</span>
                      {it.note && <span className="pe-comp-note">{it.note}</span>}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          ) : railTab === 'library' ? (
            <div className="pe-library">
              <p className="pe-review-sub">Your company's reusable “gold standard” content. Save a section from any proposal, then drop it into the next one. Insert places it at the cursor.</p>
              {libraryBlocks.length === 0 ? (
                <div className="pe-lib-empty">
                  <Library size={20} />
                  <p>Nothing saved yet. Open a section under <strong>Review</strong> and hit <strong>Save to library</strong> — it'll be one click to reuse on your next bid.</p>
                </div>
              ) : (
                <div className="pe-lib-list">
                  {libraryBlocks.map(b => (
                    <div className="pe-lib-card" key={b.id}>
                      <div className="pe-lib-head">
                        <span className="fx-pill is-accent">{(b.category || 'other').replace(/_/g, ' ')}</span>
                        <button className="pe-lib-del" onClick={() => removeBlock(b.id)} aria-label="Delete"><Trash2 size={13} /></button>
                      </div>
                      <div className="pe-lib-title">{b.title}</div>
                      <p className="pe-lib-snip">{b.body.slice(0, 140)}{b.body.length > 140 ? '…' : ''}</p>
                      <button className="fx-btn fx-btn-ghost pe-lib-insert" onClick={() => insertBlock(b)}>
                        <Plus size={13} /> Insert at cursor
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
          <>
          <p className="pe-review-sub">Highlighted spans in the draft are placeholders to confirm or replace. Approve each section as you finish it.</p>
          <div className="pe-review-list">
            {doc.sections.map((s, i) => {
              const isApproved = approved.has(s.id)
              return (
                <div key={s.id} className={`pe-review-card ${activeSec === s.id ? 'is-active' : ''} ${isApproved ? 'is-approved' : ''}`}>
                  <button className="pe-review-title" onClick={() => scrollToSection(i, s.id)}>
                    {isApproved ? <Check size={13} /> : <span className="pe-dot" />}
                    {s.heading}
                  </button>
                  {activeSec === s.id && (
                    <div className="pe-review-detail">
                      <button className="fx-btn fx-btn-ghost pe-approve" onClick={() => toggleApprove(s)}>
                        {isApproved ? 'Approved ✓' : 'Approve section'}
                      </button>

                      {/* Real AI drafting — grounded in the user's past performance */}
                      {aiEnabled() && (
                        <button className="pe-aidraft" onClick={() => draftWithAI(s)} disabled={draftingId === s.id}>
                          {draftingId === s.id ? <Loader2 size={13} className="pe-spin" /> : <Sparkles size={13} />}
                          {drafts[s.id] ? 'Re-draft with AI' : 'Draft with AI'}
                        </button>
                      )}
                      {citations[s.id]?.length > 0 && (
                        <div className="pe-cites">
                          <span className="pe-cites-head"><Sparkles size={11} /> Grounded in your past performance</span>
                          {citations[s.id].map((g, ci) => (<p className="pe-cite" key={ci}>{g.text}</p>))}
                        </div>
                      )}
                      {draftError && draftingId === null && <p className="pe-draft-err">{draftError}</p>}

                      {/* Reuse Engine: suggestions from the library + save this section */}
                      {suggestionsFor(s.heading).length > 0 && (
                        <div className="pe-sugg">
                          <span className="pe-sugg-head"><Library size={12} /> From your library</span>
                          {suggestionsFor(s.heading).map(b => (
                            <button key={b.id} className="pe-sugg-item" onClick={() => insertBlock(b)} title="Insert at cursor">
                              <span className="pe-sugg-title">{b.title}</span>
                              <Plus size={13} />
                            </button>
                          ))}
                        </div>
                      )}
                      <button className="pe-save-lib" onClick={() => saveToLibrary(s)} disabled={librarySaving === s.id}>
                        <BookmarkPlus size={13} /> {librarySaving === s.id ? 'Saving…' : 'Save to library'}
                      </button>
                      {(comments[s.heading] || []).map(c => (
                        <div className={`pe-comment ${c.status === 'resolved' ? 'is-resolved' : ''}`} key={c.id}>
                          <button className="pe-comment-resolve" onClick={() => toggleResolve(s, c)} title={c.status === 'resolved' ? 'Reopen' : 'Resolve'}><Check size={11} /></button>
                          <span>{c.body}</span>
                          <button className="pe-comment-del" onClick={() => removeComment(s, c.id)} aria-label="Delete note"><X size={11} /></button>
                        </div>
                      ))}
                      {aiEnabled() && (comments[s.heading] || []).some(c => c.status !== 'resolved') && (
                        <button className="pe-aidraft pe-redraft" onClick={() => redraftFromNotes(s)} disabled={draftingId === s.id}>
                          {draftingId === s.id ? <Loader2 size={13} className="pe-spin" /> : <Sparkles size={13} />} Re-draft from notes
                        </button>
                      )}
                      <div className="pe-comment-add">
                        <input
                          value={commentDraft}
                          onChange={e => setCommentDraft(e.target.value)}
                          onKeyDown={e => { if (e.key === 'Enter') addComment(s) }}
                          placeholder="Add a note…"
                        />
                        <button className="fx-btn fx-btn-primary" onClick={() => addComment(s)}>Add</button>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
          </>
          )}
        </aside>
      </div>

      {showRefill && (
        <div className="pe-modal-scrim" onClick={() => setShowRefill(false)}>
          <div className="pe-modal" onClick={e => e.stopPropagation()}>
            <button className="pe-modal-close" onClick={() => setShowRefill(false)} aria-label="Close"><X size={16} /></button>
            <h2 className="pe-modal-title">You're out of AI credits</h2>
            <p className="pe-modal-sub">Each AI draft (and re-draft) uses one credit. Your work so far is saved — top up to keep drafting.</p>
            <div className="pe-check ok" style={{ marginTop: 16 }}>
              <Sparkles size={16} />
              <span>Refills are honor-system during beta: send a tip on the Support page, email <strong>admin@fass.systems</strong>, and we'll top up your balance.</span>
            </div>
            <div className="pe-modal-actions" style={{ marginTop: 18 }}>
              <button className="fx-btn fx-btn-ghost" onClick={() => setShowRefill(false)}>Not now</button>
              <Link className="fx-btn fx-btn-primary" to="/support" style={{ textDecoration: 'none' }}>Get more credits</Link>
            </div>
          </div>
        </div>
      )}

      {preflightOpen && (() => {
        const totalPages = doc.sections.reduce((a, s) => a + (s.pageEstimate || 0), 0)
        const unapproved = total - reviewedCount
        const checks = [
          {
            ok: !!(fmt.font && fmt.margin),
            label: fmt.font || fmt.margin
              ? `Format applied: ${[fmt.font, fmt.fontSize, fmt.margin].filter(Boolean).join(', ')}`
              : 'No agency format detected — Times New Roman, 12pt, 1-inch defaults applied',
          },
          {
            ok: !fmt.pageLimit || totalPages <= fmt.pageLimit,
            label: fmt.pageLimit
              ? `Page estimate ~${totalPages} of ${fmt.pageLimit} allowed`
              : `Page estimate ~${totalPages} (no limit specified)`,
          },
          {
            ok: matrix.summary.missing === 0,
            label: matrix.summary.missing === 0
              ? `All ${matrix.summary.total} scored/required items have a section`
              : `${matrix.summary.missing} scored/required item${matrix.summary.missing > 1 ? 's have' : ' has'} no section`,
          },
          {
            ok: unapproved === 0,
            label: unapproved === 0 ? 'Every section reviewed & approved' : `${unapproved} section${unapproved > 1 ? 's' : ''} not yet approved`,
          },
        ]
        const blockers = checks.filter(c => !c.ok).length
        return (
          <div className="pe-modal-scrim" onClick={() => setPreflightOpen(false)}>
            <div className="pe-modal" onClick={e => e.stopPropagation()}>
              <button className="pe-modal-close" onClick={() => setPreflightOpen(false)} aria-label="Close"><X size={16} /></button>
              <h2 className="pe-modal-title">Pre-flight check</h2>
              <p className="pe-modal-sub">Confirm the proposal is submission-ready before you export.</p>
              <div className="pe-modal-checks">
                {checks.map((c, i) => (
                  <div className={`pe-check ${c.ok ? 'ok' : 'warn'}`} key={i}>
                    {c.ok ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
                    <span>{c.label}</span>
                  </div>
                ))}
              </div>
              {blockers > 0 && (
                <p className="pe-modal-note">{blockers} item{blockers > 1 ? 's' : ''} need attention — you can still export, but review {blockers > 1 ? 'them' : 'it'} first if this is your final submission.</p>
              )}
              <div className="pe-modal-actions">
                <button className="fx-btn fx-btn-ghost" onClick={() => setPreflightOpen(false)}>Cancel</button>
                <button className="fx-btn fx-btn-primary" onClick={downloadDocx} disabled={exporting}>
                  <Download size={15} /> {exporting ? 'Generating…' : 'Download .docx'}
                </button>
              </div>
            </div>
          </div>
        )
      })()}
    </div>
  )
}
