import { useMemo, useRef, useState, useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Highlight from '@tiptap/extension-highlight'
import {
  ListTree, Check, MessageSquare, Download, Type, Ruler, FileText, AlertTriangle,
} from 'lucide-react'
import { parseSolicitation, buildOutline } from '../lib/solicitationParser'
import { assembleProposal, assembledToHtml } from '../lib/assembleProposal'
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

  // Assemble once: real parsed solicitation if passed in, else the sample.
  const doc = useMemo(() => {
    const parsed = location.state?.parsed || parseSolicitation(SAMPLE)
    const outline = location.state?.outline || buildOutline(parsed)
    const title = location.state?.title || 'Janitorial & Custodial Services — SSA Baltimore'
    return assembleProposal(parsed, outline, { title })
  }, [location.state])

  const editorWrapRef = useRef(null)
  const [approved, setApproved] = useState(() => new Set())
  const [activeSec, setActiveSec] = useState(null)
  const [comments, setComments] = useState({}) // sectionId -> [text]
  const [commentDraft, setCommentDraft] = useState('')

  const editor = useEditor({
    extensions: [StarterKit, Highlight.configure({ multicolor: false })],
    content: assembledToHtml(doc),
    editable: true,
  })

  // Reset content if the assembled doc changes (new solicitation).
  useEffect(() => {
    if (editor) editor.commands.setContent(assembledToHtml(doc))
  }, [editor, doc])

  // Scroll the editor to the Nth section heading (index-based, robust to
  // TipTap not preserving custom heading attributes).
  function scrollToSection(index, id) {
    setActiveSec(id)
    const el = editorWrapRef.current?.querySelectorAll('.ProseMirror h2')?.[index]
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  function toggleApprove(id) {
    setApproved(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  function addComment(id) {
    const text = commentDraft.trim()
    if (!text) return
    setComments(prev => ({ ...prev, [id]: [...(prev[id] || []), text] }))
    setCommentDraft('')
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
          <span className="fx-eyebrow">Proposal Editor</span>
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
          <button className="fx-btn fx-btn-ghost" disabled title="Compliant .docx export — Phase 3">
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

        {/* Review rail */}
        <aside className="pe-review">
          <div className="pe-rail-head"><MessageSquare size={15} /> Needs your review</div>
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
                      <button className="fx-btn fx-btn-ghost pe-approve" onClick={() => toggleApprove(s.id)}>
                        {isApproved ? 'Approved ✓' : 'Approve section'}
                      </button>
                      {(comments[s.id] || []).map((c, ci) => (
                        <p className="pe-comment" key={ci}>{c}</p>
                      ))}
                      <div className="pe-comment-add">
                        <input
                          value={commentDraft}
                          onChange={e => setCommentDraft(e.target.value)}
                          onKeyDown={e => { if (e.key === 'Enter') addComment(s.id) }}
                          placeholder="Add a note…"
                        />
                        <button className="fx-btn fx-btn-primary" onClick={() => addComment(s.id)}>Add</button>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </aside>
      </div>
    </div>
  )
}
