import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useTheme } from '../context/ThemeContext'
import { supabase } from '../lib/supabase'
import {
  LayoutGrid, List, Sun, Moon, ArrowLeft,
  ChevronUp, ChevronDown, ExternalLink,
  CheckCircle, AlertCircle, Clock,
  Trophy, Ban, Search, RefreshCw,
  History, Pencil, Check, X as XIcon, MessageSquarePlus
} from 'lucide-react'
import './Pipeline.css'

// ── Stage config ──────────────────────────────────────────
const STAGES = [
  { id: 'flagged',   label: 'Flagged',   color: 'stage-flagged',   icon: Clock,        desc: 'From WARDOG, not yet scored' },
  { id: 'scored',    label: 'Scored',    color: 'stage-scored',    icon: AlertCircle,  desc: 'R-E-A-D complete, decision made' },
  { id: 'pursuing',  label: 'Pursuing',  color: 'stage-pursuing',  icon: CheckCircle,  desc: 'Building the proposal' },
  { id: 'submitted', label: 'Submitted', color: 'stage-submitted', icon: ExternalLink, desc: 'Bid submitted, awaiting decision' },
  { id: 'awarded',   label: 'Awarded',   color: 'stage-awarded',   icon: Trophy,       desc: 'Contract won' },
  { id: 'passed',    label: 'Passed',    color: 'stage-passed',    icon: Ban,          desc: 'Decided not to bid' },
]

const STAGE_MAP = Object.fromEntries(STAGES.map(s => [s.id, s]))

function scoreVariant(score) {
  if (score == null) return 'score-null'
  if (score >= 4.5) return 'score-go'
  if (score >= 3.0) return 'score-maybe'
  return 'score-no'
}

function ScorePill({ score }) {
  if (score == null) return <span className="pl-score pl-score-null">—</span>
  return (
    <span className={`pl-score ${scoreVariant(score)}`}>
      {Number(score).toFixed(1)}
    </span>
  )
}

function StageBadge({ stageId }) {
  const s = STAGE_MAP[stageId]
  if (!s) return null
  return <span className={`pl-stage-badge ${s.color}`}>{s.label}</span>
}

function formatDate(str) {
  if (!str) return '—'
  return new Date(str).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function daysLeft(str) {
  if (!str) return null
  return Math.ceil((new Date(str) - new Date()) / 86400000)
}

function formatMoney(v) {
  if (v == null || v === '' || isNaN(Number(v))) return null
  return Number(v).toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })
}

function sumValue(records) {
  return records.reduce((acc, r) => acc + (Number(r.estimated_value) || 0), 0)
}

// Turn a stored timestamp into "for <input type=date>" (yyyy-mm-dd)
function toDateInput(str) {
  if (!str) return ''
  const d = new Date(str)
  if (isNaN(d)) return ''
  return d.toISOString().slice(0, 10)
}

function relativeTime(str) {
  const d = new Date(str)
  const diff = (Date.now() - d) / 1000
  if (diff < 60) return 'just now'
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

// Human-readable line for one activity event
function describeEvent(ev) {
  switch (ev.event_type) {
    case 'created':      return 'Created this pipeline record'
    case 'stage_change': return `Moved stage from ${STAGE_MAP[ev.old_value]?.label || ev.old_value || '—'} to ${STAGE_MAP[ev.new_value]?.label || ev.new_value || '—'}`
    case 'value_change': return `Changed bid value from ${formatMoney(ev.old_value) || '—'} to ${formatMoney(ev.new_value) || '—'}`
    case 'date_change':  return `Changed due date from ${ev.old_value ? formatDate(ev.old_value) : '—'} to ${ev.new_value ? formatDate(ev.new_value) : '—'}`
    case 'note':         return ev.note
    default:             return `${ev.field || 'field'} changed`
  }
}

// ── Kanban Card ───────────────────────────────────────────
function KanbanCard({ record, hasDraft, onDragStart, onClick }) {
  const days = daysLeft(record.due_date)

  return (
    <div
      className="kn-card"
      draggable
      onDragStart={e => onDragStart(e, record.id)}
      onClick={() => onClick(record)}
    >
      <div className="kn-card-top">
        <ScorePill score={record.read_score} />
        {days !== null && (
          <span className={`kn-due ${days <= 5 ? 'due-urgent' : days <= 14 ? 'due-soon' : 'due-ok'}`}>
            {days <= 0 ? 'Closed' : `${days}d`}
          </span>
        )}
      </div>
      <h4 className="kn-card-title">{record.title}</h4>
      {record.agency && <p className="kn-card-agency">{record.agency}</p>}
      {formatMoney(record.estimated_value) && (
        <div className="kn-card-value">{formatMoney(record.estimated_value)}</div>
      )}
      <div className="kn-card-foot">
        <span className="kn-card-date">{formatDate(record.due_date)}</span>
        {record.naics_code && <span className="kn-card-naics">NAICS {record.naics_code}</span>}
      </div>
      {hasDraft && <span className="kn-fill-badge">Draft in FASS FILL</span>}
      <div className="kn-card-links">
        {record.stage === 'flagged' && (
          <a
            className="kn-score-now"
            onClick={e => e.stopPropagation()}
            href={`/read?title=${encodeURIComponent(record.title)}&agency=${encodeURIComponent(record.agency || '')}&naics=${encodeURIComponent(record.naics_code || '')}&due=${encodeURIComponent(record.due_date || '')}&proposalId=${record.id}`}
          >
            Score with R-E-A-D →
          </a>
        )}
        <a
          className="kn-score-now"
          onClick={e => e.stopPropagation()}
          href={`/fill?proposalId=${record.id}${hasDraft ? '' : `&new=1&title=${encodeURIComponent(record.title)}&agency=${encodeURIComponent(record.agency || '')}`}`}
        >
          {hasDraft ? 'Continue in FASS FILL →' : 'Open in FASS FILL →'}
        </a>
        {['pursuing', 'submitted', 'awarded'].includes(record.stage) && (
          <a
            className="kn-score-now"
            onClick={e => e.stopPropagation()}
            href={`/money?proposalId=${record.id}`}
          >
            Run the numbers →
          </a>
        )}
        {['pursuing', 'submitted', 'awarded'].includes(record.stage) && (
          <a
            className="kn-score-now"
            onClick={e => e.stopPropagation()}
            href={`/estimator?proposalId=${record.id}`}
          >
            Build an estimate →
          </a>
        )}
      </div>
    </div>
  )
}

// ── Kanban Column ─────────────────────────────────────────
function KanbanColumn({ stage, records, fillDocByProposal, onDragStart, onDrop, onDragOver, onCardClick }) {
  const Icon = stage.icon
  return (
    <div
      className={`kn-col`}
      onDragOver={onDragOver}
      onDrop={e => onDrop(e, stage.id)}
    >
      <div className={`kn-col-header ${stage.color}`}>
        <div className="kn-col-title">
          <Icon size={14} />
          <span>{stage.label}</span>
        </div>
        <span className="kn-col-count">{records.length}</span>
      </div>
      {sumValue(records) > 0 && (
        <div className="kn-col-value">{formatMoney(sumValue(records))}</div>
      )}
      <div className="kn-col-body">
        {records.map(r => (
          <KanbanCard
            key={r.id}
            record={r}
            hasDraft={!!fillDocByProposal[r.id]}
            onDragStart={onDragStart}
            onClick={onCardClick}
          />
        ))}
        {records.length === 0 && (
          <div className="kn-empty">Drop here</div>
        )}
      </div>
    </div>
  )
}

// ── List Row ──────────────────────────────────────────────
function ListRow({ record, onStageChange, onClick }) {
  const days = daysLeft(record.due_date)
  return (
    <tr className="lv-row" onClick={() => onClick(record)}>
      <td className="lv-title-cell">
        <span className="lv-title">{record.title}</span>
        {record.agency && <span className="lv-agency">{record.agency}</span>}
      </td>
      <td><ScorePill score={record.read_score} /></td>
      <td><StageBadge stageId={record.stage} /></td>
      <td>
        <span className={`lv-due ${days === null ? '' : days <= 5 ? 'due-urgent' : days <= 14 ? 'due-soon' : 'due-ok'}`}>
          {record.due_date ? (days <= 0 ? 'Closed' : `${days}d — ${formatDate(record.due_date)}`) : '—'}
        </span>
      </td>
      <td className="lv-naics">{record.naics_code || '—'}</td>
      <td className="lv-date">{formatDate(record.created_at)}</td>
      <td className="lv-actions" onClick={e => e.stopPropagation()}>
        <select
          className="lv-stage-select"
          value={record.stage}
          onChange={e => onStageChange(record.id, e.target.value)}
        >
          {STAGES.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
        </select>
      </td>
    </tr>
  )
}

// ── Inline editable field ─────────────────────────────────
function EditableField({ label, value, type, display, onSave }) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value ?? '')

  useEffect(() => { setDraft(value ?? '') }, [value])

  function commit() {
    setEditing(false)
    const normalized = draft === '' ? null : draft
    if (String(normalized ?? '') !== String(value ?? '')) onSave(normalized)
  }

  return (
    <div className="modal-field">
      <span className="modal-field-label">{label}</span>
      {editing ? (
        <div className="modal-field-edit">
          <input
            autoFocus
            type={type}
            value={draft}
            onChange={e => setDraft(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') setEditing(false) }}
          />
          <button className="modal-field-ok" onClick={commit}><Check size={14} /></button>
          <button className="modal-field-cancel" onClick={() => setEditing(false)}><XIcon size={14} /></button>
        </div>
      ) : (
        <button className="modal-field-value" onClick={() => setEditing(true)}>
          <span>{display ?? '—'}</span>
          <Pencil size={12} className="modal-field-pencil" />
        </button>
      )}
    </div>
  )
}

// ── Activity timeline + notes feed ────────────────────────
function ActivityFeed({ events, loading, onAddNote }) {
  const [draft, setDraft] = useState('')

  function submit() {
    const text = draft.trim()
    if (!text) return
    onAddNote(text)
    setDraft('')
  }

  return (
    <div className="modal-activity">
      <p className="modal-section-label"><History size={13} /> Activity & Notes</p>

      <div className="modal-note-composer">
        <textarea
          className="modal-note-input"
          placeholder="Add a note — a call, a decision, a follow-up…"
          value={draft}
          onChange={e => setDraft(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) submit() }}
        />
        <button className="modal-note-add" onClick={submit} disabled={!draft.trim()}>
          <MessageSquarePlus size={14} /> Add note
        </button>
      </div>

      {loading ? (
        <div className="modal-activity-loading"><RefreshCw size={14} className="spin" /> Loading history…</div>
      ) : events.length === 0 ? (
        <p className="modal-activity-empty">No activity recorded yet. Stage moves, value/date edits, and notes will all show up here.</p>
      ) : (
        <ul className="modal-timeline">
          {events.map(ev => (
            <li key={ev.id} className={`modal-tl-item tl-${ev.event_type}`}>
              <span className="modal-tl-dot" />
              <div className="modal-tl-body">
                <p className="modal-tl-text">{describeEvent(ev)}</p>
                <p className="modal-tl-meta">
                  {ev.actor_email || 'someone'} · {relativeTime(ev.created_at)}
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

// ── Detail Modal ──────────────────────────────────────────
function RecordModal({ record, onClose, onStageChange, events, loadingEvents, onAddNote, onEditField }) {
  if (!record) return null
  const ws = record.read_worksheet || {}
  const answers = ws.answers || {}
  const notes = ws.notes || {}
  const LABELS = {
    sam_active:'SAM.gov active', naics_match:'NAICS match', setaside_qual:'Set-aside qual',
    licenses:'Licenses & certs', past_perf:'Past performance', mandatory_met:'Mandatory reqs met',
    staff:'Staff available', equipment:'Equipment', bandwidth:'Bandwidth',
    response_time:'Response time', start_date:'Start date', period:'Period of performance',
    cost_known:'Cost known', margin:'Margin 12%+', risk:'Cost risk acceptable',
    references:'References', personnel:'Key personnel', approach:'Technical approach',
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <span className="modal-label">Pipeline Record</span>
            <h2 className="modal-title">{record.title}</h2>
          </div>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        <div className="modal-meta">
          <ScorePill score={record.read_score} />
          <StageBadge stageId={record.stage} />
          {record.agency && <span className="modal-agency">{record.agency}</span>}
          {formatMoney(record.estimated_value) && (
            <span className="modal-value-tag">{formatMoney(record.estimated_value)}</span>
          )}
        </div>

        <div className="modal-stage-change">
          <label>Move stage</label>
          <select
            value={record.stage}
            onChange={e => onStageChange(record.id, e.target.value)}
          >
            {STAGES.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
          </select>
        </div>

        {/* Editable tracked fields */}
        <div className="modal-fields">
          <EditableField
            label="Bid value"
            type="number"
            value={record.estimated_value ?? ''}
            display={formatMoney(record.estimated_value)}
            onSave={v => onEditField('estimated_value', v)}
          />
          <EditableField
            label="Due date"
            type="date"
            value={toDateInput(record.due_date)}
            display={record.due_date ? formatDate(record.due_date) : null}
            onSave={v => onEditField('due_date', v)}
          />
        </div>

        {Object.keys(answers).length > 0 && (
          <div className="modal-worksheet">
            <p className="modal-section-label">R-E-A-D Answers</p>
            <div className="modal-answers">
              {Object.entries(answers).map(([k, v]) => (
                <div key={k} className={`modal-answer modal-answer-${v}`}>
                  <span className="modal-answer-label">{LABELS[k] || k}</span>
                  <span className="modal-answer-val">{v}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {Object.keys(notes).filter(k => notes[k]).length > 0 && (
          <div className="modal-notes">
            <p className="modal-section-label">Section Notes</p>
            {Object.entries(notes).filter(([, v]) => v).map(([k, v]) => (
              <div key={k} className="modal-note">
                <span className="modal-note-key">{k}</span>
                <p className="modal-note-text">{v}</p>
              </div>
            ))}
          </div>
        )}

        <ActivityFeed events={events} loading={loadingEvents} onAddNote={onAddNote} />
      </div>
    </div>
  )
}

// ── Main Pipeline Page ────────────────────────────────────
export default function Pipeline() {
  const { session, signOut } = useAuth()
  const { theme, toggle: toggleTheme } = useTheme()
  const navigate = useNavigate()

  const [records, setRecords] = useState([])
  // proposal_id -> fass_fill_documents.id, so Pipeline cards can show
  // whether FASS FILL work already exists for that opportunity instead
  // of leaving the two tools' records invisible to each other.
  const [fillDocByProposal, setFillDocByProposal] = useState({})
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState(() => localStorage.getItem('fass-pipeline-view') || 'kanban')
  const [search, setSearch] = useState('')
  const [sortKey, setSortKey] = useState('created_at')
  const [sortDir, setSortDir] = useState('desc')
  const [selected, setSelected] = useState(null)
  const [events, setEvents] = useState([])
  const [loadingEvents, setLoadingEvents] = useState(false)
  const dragId = useRef(null)

  const actorEmail = session?.user?.email || null

  useEffect(() => { loadRecords() }, [])

  // Load the activity history whenever a record's detail modal opens.
  useEffect(() => {
    if (!selected) { setEvents([]); return }
    loadEvents(selected.id)
  }, [selected?.id])

  async function loadEvents(proposalId) {
    setLoadingEvents(true)
    const { data } = await supabase
      .from('proposal_events')
      .select('*')
      .eq('proposal_id', proposalId)
      .order('created_at', { ascending: false })
    setEvents(data || [])
    setLoadingEvents(false)
  }

  // Append an audit row. Best-effort: a logging failure must never block
  // the underlying edit the user actually cares about.
  async function logEvent(proposalId, eventType, fields = {}) {
    const row = {
      proposal_id: proposalId,
      user_id: session.user.id,
      actor_email: actorEmail,
      event_type: eventType,
      ...fields,
    }
    const { data, error } = await supabase
      .from('proposal_events')
      .insert(row)
      .select()
      .single()
    if (!error && data && selected?.id === proposalId) {
      setEvents(prev => [data, ...prev])
    }
  }

  async function loadRecords() {
    setLoading(true)
    const [{ data }, { data: fillDocs }] = await Promise.all([
      supabase
        .from('proposals')
        .select('*')
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false }),
      supabase
        .from('fass_fill_documents')
        .select('id, proposal_id')
        .eq('user_id', session.user.id)
        .not('proposal_id', 'is', null),
    ])
    setRecords(data || [])
    setFillDocByProposal(Object.fromEntries((fillDocs || []).map(d => [d.proposal_id, d.id])))
    setLoading(false)
  }

  async function updateStage(id, stage) {
    const prevStage = records.find(r => r.id === id)?.stage
    if (prevStage === stage) return
    setRecords(prev => prev.map(r => r.id === id ? { ...r, stage } : r))
    if (selected?.id === id) setSelected(prev => ({ ...prev, stage }))
    await supabase.from('proposals').update({ stage }).eq('id', id)
    await logEvent(id, 'stage_change', { field: 'stage', old_value: prevStage, new_value: stage })
  }

  // Edit a tracked field (bid value or due date) with an audit trail.
  async function updateField(id, field, value) {
    const current = records.find(r => r.id === id)
    const oldValue = current?.[field] ?? null
    const newValue = value === '' ? null : value
    if (String(oldValue ?? '') === String(newValue ?? '')) return

    setRecords(prev => prev.map(r => r.id === id ? { ...r, [field]: newValue } : r))
    if (selected?.id === id) setSelected(prev => ({ ...prev, [field]: newValue }))
    await supabase.from('proposals').update({ [field]: newValue }).eq('id', id)

    const eventType = field === 'estimated_value' ? 'value_change'
      : field === 'due_date' ? 'date_change' : 'field_change'
    await logEvent(id, eventType, {
      field,
      old_value: oldValue == null ? null : String(oldValue),
      new_value: newValue == null ? null : String(newValue),
    })
  }

  async function addNote(id, text) {
    await logEvent(id, 'note', { note: text })
  }

  function switchView(v) {
    setView(v)
    localStorage.setItem('fass-pipeline-view', v)
  }

  // Drag and drop
  function onDragStart(e, id) { dragId.current = id }
  function onDragOver(e) { e.preventDefault() }
  function onDrop(e, stage) {
    e.preventDefault()
    if (dragId.current) updateStage(dragId.current, stage)
    dragId.current = null
  }

  // Sorting
  function handleSort(key) {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortKey(key); setSortDir('asc') }
  }

  const filtered = records.filter(r =>
    !search || r.title?.toLowerCase().includes(search.toLowerCase()) ||
    r.agency?.toLowerCase().includes(search.toLowerCase())
  )

  const sorted = [...filtered].sort((a, b) => {
    const av = a[sortKey] ?? '', bv = b[sortKey] ?? ''
    return sortDir === 'asc' ? (av > bv ? 1 : -1) : (av < bv ? 1 : -1)
  })

  const byStage = Object.fromEntries(STAGES.map(s => [s.id, sorted.filter(r => r.stage === s.id)]))

  // "Open" = still in motion (not yet awarded or passed).
  const openValue = sumValue(sorted.filter(r => !['awarded', 'passed'].includes(r.stage)))

  function SortIcon({ k }) {
    if (sortKey !== k) return null
    return sortDir === 'asc' ? <ChevronUp size={12} /> : <ChevronDown size={12} />
  }

  const isDark = theme === 'dark'

  return (
    <div className="pl">
      {/* Header */}
      <header className="pl-header">
        <div className="pl-header-inner">
          <button className="pl-back" onClick={() => navigate('/dashboard')}>
            <ArrowLeft size={15} /> Dashboard
          </button>

          <div className="pl-header-center">
            <span className="pl-logo-icon">⬡</span>
            <span className="pl-logo-text">FASS <strong>Pipeline</strong></span>
          </div>

          <div className="pl-header-right">
            <button className="pl-awarded-link" onClick={() => navigate('/awarded')} title="Awarded contracts">
              <Trophy size={14} /> Awarded
            </button>

            {/* View toggle */}
            <div className="pl-view-toggle">
              <button
                className={`pl-toggle-btn ${view === 'kanban' ? 'active' : ''}`}
                onClick={() => switchView('kanban')}
                title="Kanban view"
              >
                <LayoutGrid size={15} />
              </button>
              <button
                className={`pl-toggle-btn ${view === 'list' ? 'active' : ''}`}
                onClick={() => switchView('list')}
                title="List view"
              >
                <List size={15} />
              </button>
            </div>

            {/* Theme toggle */}
            <button className="pl-theme-btn" onClick={toggleTheme} title={isDark ? 'Light mode' : 'Dark mode'}>
              {isDark ? <Sun size={16} /> : <Moon size={16} />}
            </button>

            <button className="pl-refresh" onClick={loadRecords} title="Refresh">
              <RefreshCw size={15} className={loading ? 'spin' : ''} />
            </button>

            <button className="pl-signout" onClick={() => { signOut(); navigate('/') }}>Sign out</button>
          </div>
        </div>
      </header>

      {/* Sub-header: search + stats */}
      <div className="pl-subheader">
        <div className="pl-subheader-inner">
          <div className="pl-search-wrap">
            <Search size={14} className="pl-search-icon" />
            <input
              className="pl-search"
              placeholder="Search opportunities…"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <div className="pl-stats">
            {openValue > 0 && (
              <div className="pl-stat pl-stat-value">
                <span className="pl-stat-label">Open value</span>
                <span className="pl-stat-count pl-stat-money">{formatMoney(openValue)}</span>
              </div>
            )}
            {STAGES.map(s => (
              <div key={s.id} className="pl-stat">
                <span className={`pl-stat-dot ${s.color}`} />
                <span className="pl-stat-label">{s.label}</span>
                <span className="pl-stat-count">{byStage[s.id]?.length ?? 0}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="pl-content">
        {loading ? (
          <div className="pl-loading">
            <RefreshCw size={20} className="spin" />
            <span>Loading pipeline…</span>
          </div>
        ) : records.length === 0 ? (
          <div className="pl-empty">
            <p>No pipeline records yet.</p>
            <p>Score an opportunity with R-E-A-D, or just hit "Save interest" on a WARDOG card to flag it here without scoring it yet.</p>
            <button className="btn-primary" style={{ marginTop: 20 }} onClick={() => navigate('/wardog')}>
              Go to WARDOG →
            </button>
          </div>
        ) : view === 'kanban' ? (
          <div className="kn-board">
            {STAGES.map(stage => (
              <KanbanColumn
                key={stage.id}
                stage={stage}
                records={byStage[stage.id] || []}
                fillDocByProposal={fillDocByProposal}
                onDragStart={onDragStart}
                onDrop={onDrop}
                onDragOver={onDragOver}
                onCardClick={setSelected}
              />
            ))}
          </div>
        ) : (
          <div className="lv-wrap">
            <table className="lv-table">
              <thead>
                <tr>
                  <th className="lv-th" onClick={() => handleSort('title')}>
                    Opportunity <SortIcon k="title" />
                  </th>
                  <th className="lv-th" onClick={() => handleSort('read_score')}>
                    Score <SortIcon k="read_score" />
                  </th>
                  <th className="lv-th" onClick={() => handleSort('stage')}>
                    Stage <SortIcon k="stage" />
                  </th>
                  <th className="lv-th" onClick={() => handleSort('due_date')}>
                    Due Date <SortIcon k="due_date" />
                  </th>
                  <th className="lv-th">NAICS</th>
                  <th className="lv-th" onClick={() => handleSort('created_at')}>
                    Added <SortIcon k="created_at" />
                  </th>
                  <th className="lv-th">Move Stage</th>
                </tr>
              </thead>
              <tbody>
                {sorted.map(r => (
                  <ListRow
                    key={r.id}
                    record={r}
                    onStageChange={updateStage}
                    onClick={setSelected}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Detail modal */}
      {selected && (
        <RecordModal
          record={selected}
          onClose={() => setSelected(null)}
          onStageChange={(id, stage) => { updateStage(id, stage) }}
          events={events}
          loadingEvents={loadingEvents}
          onAddNote={text => addNote(selected.id, text)}
          onEditField={(field, value) => updateField(selected.id, field, value)}
        />
      )}
    </div>
  )
}
