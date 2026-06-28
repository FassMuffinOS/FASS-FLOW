import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'
import { parseEmailInvite } from '../lib/solicitationParser'
import {
  Mail, Inbox as InboxIcon, Link as LinkIcon, Calendar, Hash, Tag,
  ArrowRight, Users, PauseCircle, CheckCircle2, Sparkles, Copy, KeyRound, Check,
} from 'lucide-react'
import './Inbox.css'

const API_BASE = import.meta.env.VITE_API_URL || ''

// State/local e-procurement portals (eMMA and similarly-shaped marketplaces)
// email a fixed "you're invited to respond" notice instead of posting to a
// public feed like SAM.gov — there's nothing for WARDOG to scrape. This page
// is where those land: paste the forwarded email, the deterministic parser
// in lib/solicitationParser.js pulls the structured fields out, and it joins
// the same downstream flow (Pipeline → R-E-A-D/FASS FILL, Network for
// vendor matching) as anything sourced from WARDOG.
//
// Direct, automatic Gmail polling is real future scope (per-user OAuth,
// token storage, a backend polling job) — intentionally not built in this
// pass. This ships the deterministic parser and the inbox/status workflow
// now; paste-to-ingest works today, automatic pull can be layered on later
// without changing this page's data model.

const STATUS_LABELS = {
  new: 'New',
  in_queue: 'In Queue',
  seeking_vendors: 'Seeking Vendors',
  matched: 'Matched',
  on_hold: 'On Hold',
  closed: 'Closed',
}

const STATUS_FILTERS = ['all', 'new', 'in_queue', 'seeking_vendors', 'matched', 'on_hold', 'closed']

export default function Inbox() {
  const { session } = useAuth()
  const navigate = useNavigate()
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')
  const [pasteText, setPasteText] = useState('')
  const [preview, setPreview] = useState(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [busyId, setBusyId] = useState(null)
  const [captureKey, setCaptureKey] = useState('')
  const [keyCopied, setKeyCopied] = useState(false)

  useEffect(() => { loadItems() }, [])

  // Fetch (or create) this user's capture key for the Chrome extension.
  useEffect(() => {
    if (!session?.user?.id) return
    fetch(`${API_BASE}/api/v1/ingest/key?user_id=${session.user.id}`)
      .then(r => (r.ok ? r.json() : null))
      .then(d => { if (d?.key) setCaptureKey(d.key) })
      .catch(() => {})
  }, [session?.user?.id])

  function copyKey() {
    if (!captureKey) return
    navigator.clipboard?.writeText(captureKey).then(() => {
      setKeyCopied(true)
      setTimeout(() => setKeyCopied(false), 1800)
    })
  }

  async function loadItems() {
    setLoading(true)
    const { data } = await supabase
      .from('solicitation_inbox')
      .select('*')
      .eq('user_id', session.user.id)
      .order('created_at', { ascending: false })
    setItems(data || [])
    setLoading(false)
  }

  function handlePasteChange(value) {
    setPasteText(value)
    setError('')
    if (!value.trim()) {
      setPreview(null)
      return
    }
    setPreview(parseEmailInvite(value))
  }

  async function addToInbox() {
    if (!preview) return
    setSaving(true)
    setError('')
    const { data, error: insertError } = await supabase
      .from('solicitation_inbox')
      .insert({
        user_id: session.user.id,
        source_portal: preview.sourcePortal,
        rfx_name: preview.rfxName || 'Untitled solicitation',
        bpm_id: preview.bpmId,
        main_commodity: preview.mainCommodity,
        lot_number: preview.lotNumber,
        round_number: preview.roundNumber,
        end_date: parseLooseDate(preview.endDate),
        requester: preview.requester,
        supplier_name: preview.supplierName,
        link: preview.link,
        raw_snippet: preview.rawSnippet,
      })
      .select()
      .single()
    setSaving(false)
    if (insertError) {
      setError(insertError.message)
      return
    }
    setItems(prev => [data, ...prev])
    setPasteText('')
    setPreview(null)
  }

  async function updateStatus(id, status) {
    setItems(prev => prev.map(i => i.id === id ? { ...i, status } : i))
    await supabase.from('solicitation_inbox').update({ status, updated_at: new Date().toISOString() }).eq('id', id)
  }

  // Mirrors the exact proposal shape WARDOG/FASS FILL already insert, so
  // anything sent to Pipeline from here drops into the same downstream
  // R-E-A-D/FASS FILL/Network flow with no special-casing.
  async function sendToPipeline(item) {
    setBusyId(item.id)
    setError('')
    const { data: proposal, error: insertError } = await supabase
      .from('proposals')
      .insert({
        user_id: session.user.id,
        title: item.rfx_name,
        agency: item.requester || item.source_portal,
        // Enter the Pipeline at the same stage WARDOG uses ('flagged' =
        // "not yet scored") rather than jumping to 'pursuing'. This is what
        // makes the R-E-A-D button appear on the card so the solicitation can
        // actually be scored/processed, instead of skipping straight to
        // "building the proposal" with no on-ramp. Mirrors Wardog.jsx exactly.
        stage: 'flagged',
        status: 'draft',
        due_date: item.end_date,
        description: item.raw_snippet || null,
      })
      .select()
      .single()

    if (insertError) {
      setError(insertError.message)
      setBusyId(null)
      return
    }

    await supabase
      .from('solicitation_inbox')
      .update({ status: 'in_queue', proposal_id: proposal.id, updated_at: new Date().toISOString() })
      .eq('id', item.id)

    setItems(prev => prev.map(i => i.id === item.id ? { ...i, status: 'in_queue', proposal_id: proposal.id } : i))
    setBusyId(null)
  }

  const filtered = useMemo(
    () => filter === 'all' ? items : items.filter(i => i.status === filter),
    [items, filter]
  )

  const counts = useMemo(() => {
    const c = { all: items.length }
    STATUS_FILTERS.slice(1).forEach(s => { c[s] = items.filter(i => i.status === s).length })
    return c
  }, [items])

  if (loading) return <div className="ibx-loading">Loading your inbox…</div>

  return (
    <div className="ibx">
      <div className="ibx-header">
        <div>
          <h1><InboxIcon size={22} /> Solicitation Inbox</h1>
          <p>
            Paste a forwarded "you're invited to respond" email from eMMA or a similar portal — we'll
            pull out the details and queue it up the same way WARDOG does.
          </p>
        </div>
      </div>

      <div className="ibx-paste-card">
        <div className="ibx-paste-header">
          <Mail size={16} />
          <span>Paste a solicitation invitation email</span>
        </div>
        <textarea
          className="ibx-paste-textarea"
          rows={6}
          placeholder="Paste the full text of the email here, including the RFx name, BPM ID, dates, and link…"
          value={pasteText}
          onChange={e => handlePasteChange(e.target.value)}
        />
        {preview && (
          <div className={`ibx-preview ${preview.isRecognized ? '' : 'ibx-preview-unrecognized'}`}>
            {preview.isRecognized ? (
              <>
                <div className="ibx-preview-row"><Sparkles size={13} /> Recognized as <strong>{preview.sourcePortal}</strong></div>
                <div className="ibx-preview-grid">
                  <div><Tag size={12} /> {preview.rfxName || '—'}</div>
                  <div><Hash size={12} /> BPM {preview.bpmId || '—'}</div>
                  <div><Calendar size={12} /> Due {preview.endDate || '—'}</div>
                  {preview.link && <div><LinkIcon size={12} /> Link detected</div>}
                </div>
              </>
            ) : (
              <span>Couldn't recognize a known portal format — it'll still be saved with whatever was pasted, and a link if one was found.</span>
            )}
          </div>
        )}
        {error && <p className="ibx-error">{error}</p>}
        <button
          type="button"
          className="btn-primary ibx-add-btn"
          onClick={addToInbox}
          disabled={!preview || saving}
        >
          {saving ? 'Adding…' : 'Add to inbox'}
        </button>
      </div>

      <div className="ibx-capture-card">
        <div className="ibx-capture-head">
          <KeyRound size={16} />
          <span>Auto-capture from your portal</span>
        </div>
        <p className="ibx-capture-sub">
          Install the FASS Flow Chrome extension, paste this key into its settings once, then click
          “Capture this page” on any open solicitation. It pulls the real document into your pipeline —
          matched by BPM ID — so R-E-A-D and FASS FILL work from the actual bid, not just the email.
        </p>
        <div className="ibx-key-row">
          <code className="ibx-key">{captureKey || 'Generating your key…'}</code>
          <button type="button" className="ibx-key-copy" onClick={copyKey} disabled={!captureKey}>
            {keyCopied ? <><Check size={13} /> Copied</> : <><Copy size={13} /> Copy</>}
          </button>
        </div>
        <p className="ibx-capture-note">
          The extension lives in the <code>capture-extension/</code> folder — load it unpacked via
          chrome://extensions → Developer mode → Load unpacked. Keep this key private; it writes to your account.
        </p>
      </div>

      <div className="ibx-filters">
        {STATUS_FILTERS.map(s => (
          <button
            key={s}
            type="button"
            className={`ibx-filter-chip ${filter === s ? 'ibx-filter-active' : ''}`}
            onClick={() => setFilter(s)}
          >
            {s === 'all' ? 'All' : STATUS_LABELS[s]} <span className="ibx-filter-count">{counts[s] ?? 0}</span>
          </button>
        ))}
      </div>

      {filtered.length === 0 && (
        <p className="ibx-empty">Nothing here yet — paste an invitation email above to get started.</p>
      )}

      <div className="ibx-list">
        {filtered.map(item => (
          <div key={item.id} className="ibx-card">
            <div className="ibx-card-top">
              <div>
                <span className="ibx-portal-badge">{item.source_portal}</span>
                <h3 className="ibx-card-title">{item.rfx_name}</h3>
              </div>
              {item.link && (
                <a href={item.link} target="_blank" rel="noreferrer" className="ibx-card-link">
                  Open <ArrowRight size={13} />
                </a>
              )}
            </div>

            <div className="ibx-card-meta">
              {item.bpm_id && <span><Hash size={12} /> BPM {item.bpm_id}</span>}
              {item.main_commodity && <span><Tag size={12} /> {item.main_commodity}</span>}
              {item.lot_number && <span>Lot #{item.lot_number}</span>}
              {item.round_number && <span>Round #{item.round_number}</span>}
              {item.end_date && <span><Calendar size={12} /> Due {new Date(item.end_date).toLocaleString()}</span>}
              {item.requester && <span>Req: {item.requester}</span>}
            </div>

            <div className="ibx-status-row">
              {STATUS_FILTERS.slice(1).map(s => (
                <button
                  key={s}
                  type="button"
                  className={`ibx-status-chip ${item.status === s ? 'ibx-status-active' : ''}`}
                  onClick={() => updateStatus(item.id, s)}
                >
                  {STATUS_LABELS[s]}
                </button>
              ))}
            </div>

            <div className="ibx-card-actions">
              {item.proposal_id ? (
                <button type="button" className="btn-outline ibx-action-btn" onClick={() => navigate('/pipeline')}>
                  <CheckCircle2 size={13} /> In Pipeline
                </button>
              ) : (
                <button
                  type="button"
                  className="btn-outline ibx-action-btn"
                  onClick={() => sendToPipeline(item)}
                  disabled={busyId === item.id}
                >
                  <ArrowRight size={13} /> {busyId === item.id ? 'Sending…' : 'Send to Pipeline'}
                </button>
              )}
              <button
                type="button"
                className="btn-outline ibx-action-btn"
                onClick={() => { updateStatus(item.id, 'seeking_vendors'); navigate('/network') }}
              >
                <Users size={13} /> Find vendors
              </button>
              {item.status !== 'on_hold' ? (
                <button type="button" className="ibx-hold-btn" onClick={() => updateStatus(item.id, 'on_hold')}>
                  <PauseCircle size={13} /> Hold
                </button>
              ) : (
                <button type="button" className="ibx-hold-btn" onClick={() => updateStatus(item.id, 'new')}>
                  Resume
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function parseLooseDate(value) {
  if (!value) return null
  const d = new Date(value)
  return isNaN(d.getTime()) ? null : d.toISOString()
}
