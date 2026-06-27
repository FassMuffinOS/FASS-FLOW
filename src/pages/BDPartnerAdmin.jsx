import { useState, useEffect, useCallback } from 'react'
import { Handshake, Loader2, RefreshCw, UserPlus, Radar, ClipboardCheck, FileText, Phone, StickyNote, Trophy } from 'lucide-react'
import './BDPartnerAdmin.css'

const API_BASE = import.meta.env.VITE_API_URL || ''

const TYPE_META = {
  alert: { icon: Radar, label: 'Opportunity alert' },
  review: { icon: ClipboardCheck, label: 'Bid/no-bid review' },
  draft: { icon: FileText, label: 'Proposal drafting' },
  call: { icon: Phone, label: 'Strategy call' },
  note: { icon: StickyNote, label: 'Note' },
  milestone: { icon: Trophy, label: 'Milestone' },
}

function timeAgo(iso) {
  const diffMs = Date.now() - new Date(iso).getTime()
  const days = Math.floor(diffMs / 86400000)
  if (days < 1) return 'today'
  if (days === 1) return 'yesterday'
  return `${days}d ago`
}

// Founder-side console for the $500/mo BD Partner service. This is the
// "I can manage multiple clients" view: every active/paused/ended client
// in one list, pick one to see + add to their activity log, and activate
// a brand-new client by user_id. Each client's own /bd-partner route
// (BDPartnerRoute -> BDPartnerDashboard) only ever queries by their own
// session user_id, so nothing here is reachable or visible from their
// side — this page is the only place that sees the full roster.
//
// Gated the same way /admin already is: a shared secret typed in once
// and remembered in sessionStorage under the same key, so switching
// between /admin and /admin/bd-partner doesn't re-prompt.
export default function BDPartnerAdmin() {
  const [secret, setSecret] = useState(sessionStorage.getItem('fass_admin_secret') || '')
  const [clients, setClients] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [selected, setSelected] = useState(null)
  const [activity, setActivity] = useState([])
  const [activityLoading, setActivityLoading] = useState(false)

  const [newUserId, setNewUserId] = useState('')
  const [newNote, setNewNote] = useState('')
  const [activating, setActivating] = useState(false)

  const [logType, setLogType] = useState('review')
  const [logTitle, setLogTitle] = useState('')
  const [logDetail, setLogDetail] = useState('')
  const [logging, setLogging] = useState(false)

  function rememberSecret(v) {
    setSecret(v)
    sessionStorage.setItem('fass_admin_secret', v)
  }

  const loadClients = useCallback(async () => {
    if (!secret) return
    setLoading(true)
    setError('')
    try {
      const res = await fetch(`${API_BASE}/api/v1/bd-partner/clients`, {
        headers: { 'X-Admin-Secret': secret },
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.detail || `Request failed (${res.status})`)
      setClients(data.clients || [])
    } catch (err) {
      setError(err.message || 'Failed to load clients')
    } finally {
      setLoading(false)
    }
  }, [secret])

  useEffect(() => {
    let cancelled = false
    async function run() {
      if (cancelled) return
      await loadClients()
    }
    run()
    return () => { cancelled = true }
  }, [loadClients])

  async function loadActivity(userId) {
    setActivityLoading(true)
    try {
      const res = await fetch(`${API_BASE}/api/v1/bd-partner/activity?user_id=${userId}`)
      const data = await res.json().catch(() => ({}))
      setActivity(data.activity || [])
    } catch (err) {
      console.error('BDPartnerAdmin: failed to load activity', err)
    } finally {
      setActivityLoading(false)
    }
  }

  function selectClient(client) {
    setSelected(client)
    setLogTitle('')
    setLogDetail('')
    loadActivity(client.user_id)
  }

  async function activateClient(e) {
    e.preventDefault()
    if (!newUserId.trim()) return
    setActivating(true)
    setError('')
    try {
      const res = await fetch(`${API_BASE}/api/v1/bd-partner/clients`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Admin-Secret': secret },
        body: JSON.stringify({ user_id: newUserId.trim(), status: 'active', plan_note: newNote }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.detail || `Request failed (${res.status})`)
      setNewUserId('')
      setNewNote('')
      await loadClients()
    } catch (err) {
      setError(err.message || 'Failed to activate client')
    } finally {
      setActivating(false)
    }
  }

  async function changeStatus(client, status) {
    setError('')
    try {
      const res = await fetch(`${API_BASE}/api/v1/bd-partner/clients`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Admin-Secret': secret },
        body: JSON.stringify({ user_id: client.user_id, status, plan_note: client.plan_note || '' }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.detail || `Request failed (${res.status})`)
      await loadClients()
      if (selected?.user_id === client.user_id) setSelected({ ...selected, status })
    } catch (err) {
      setError(err.message || 'Failed to update status')
    }
  }

  async function logActivity(e) {
    e.preventDefault()
    if (!selected || !logTitle.trim()) return
    setLogging(true)
    setError('')
    try {
      const res = await fetch(`${API_BASE}/api/v1/bd-partner/activity`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Admin-Secret': secret },
        body: JSON.stringify({ user_id: selected.user_id, type: logType, title: logTitle.trim(), detail: logDetail.trim() }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.detail || `Request failed (${res.status})`)
      setLogTitle('')
      setLogDetail('')
      await loadActivity(selected.user_id)
    } catch (err) {
      setError(err.message || 'Failed to log activity')
    } finally {
      setLogging(false)
    }
  }

  return (
    <div className="bda-page">
      <div className="bda-header">
        <Handshake size={18} />
        <h1>BD Partner — Client Console</h1>
        <button className="bda-refresh" onClick={loadClients} title="Reload"><RefreshCw size={15} /></button>
      </div>
      <p className="bda-sub">
        Manage every BD Partner client from one place. Clients only ever see their own dashboard
        (their own activity log, gated by their own login) — this roster and the activity you log
        here are not reachable from their side.
      </p>

      <div className="bda-field bda-secret">
        <label>Admin secret</label>
        <input
          type="password"
          value={secret}
          onChange={e => rememberSecret(e.target.value)}
          placeholder="paste your ADMIN_SECRET"
        />
      </div>

      {error && <p className="bda-error">{error}</p>}

      <div className="bda-layout">
        <div className="bda-roster">
          <div className="bda-roster-head">Clients{clients.length > 0 ? ` (${clients.length})` : ''}</div>

          {loading && <div className="bda-loading"><Loader2 size={15} className="spin" /> Loading…</div>}
          {!loading && clients.length === 0 && <div className="bda-empty">No clients yet — activate one below.</div>}

          {clients.map(c => (
            <div
              key={c.user_id}
              className={`bda-client-row ${selected?.user_id === c.user_id ? 'bda-client-active' : ''}`}
              onClick={() => selectClient(c)}
            >
              <div className="bda-client-top">
                <span className="bda-client-name">{c.company_name || c.full_name || c.user_id}</span>
                <span className={`bda-status bda-status-${c.status}`}>{c.status}</span>
              </div>
              <div className="bda-client-meta">
                ${c.monthly_fee}/mo · since {new Date(c.started_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
              </div>
            </div>
          ))}

          <form className="bda-activate" onSubmit={activateClient}>
            <div className="bda-roster-head">Activate a client</div>
            <input
              placeholder="user_id (uuid, from profiles)"
              value={newUserId}
              onChange={e => setNewUserId(e.target.value)}
            />
            <input
              placeholder="Plan note (optional)"
              value={newNote}
              onChange={e => setNewNote(e.target.value)}
            />
            <button type="submit" className="btn-primary bda-activate-btn" disabled={activating || !secret || !newUserId.trim()}>
              {activating ? <Loader2 size={14} className="spin" /> : <UserPlus size={14} />}
              {activating ? 'Activating…' : 'Activate'}
            </button>
          </form>
        </div>

        <div className="bda-detail">
          {!selected && <div className="bda-detail-empty">Select a client to view and log activity.</div>}

          {selected && (
            <>
              <div className="bda-detail-head">
                <div>
                  <div className="bda-detail-name">{selected.company_name || selected.full_name || selected.user_id}</div>
                  <div className="bda-detail-id">{selected.user_id}</div>
                </div>
                <div className="bda-status-actions">
                  {['active', 'paused', 'ended'].map(s => (
                    <button
                      key={s}
                      className={`bda-status-btn ${selected.status === s ? 'bda-status-btn-on' : ''}`}
                      onClick={() => changeStatus(selected, s)}
                      disabled={selected.status === s}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>

              <form className="bda-log-form" onSubmit={logActivity}>
                <select value={logType} onChange={e => setLogType(e.target.value)}>
                  {Object.entries(TYPE_META).map(([key, meta]) => (
                    <option key={key} value={key}>{meta.label}</option>
                  ))}
                </select>
                <input
                  placeholder="Title — e.g. 'Reviewed SAM.gov opp #4471'"
                  value={logTitle}
                  onChange={e => setLogTitle(e.target.value)}
                />
                <input
                  placeholder="Detail (optional)"
                  value={logDetail}
                  onChange={e => setLogDetail(e.target.value)}
                />
                <button type="submit" className="btn-primary" disabled={logging || !logTitle.trim()}>
                  {logging ? <Loader2 size={14} className="spin" /> : 'Log'}
                </button>
              </form>

              <div className="bda-timeline-head">Activity log</div>
              {activityLoading && <div className="bda-loading"><Loader2 size={15} className="spin" /> Loading…</div>}
              {!activityLoading && activity.length === 0 && <div className="bda-empty">Nothing logged yet.</div>}
              <div className="bda-timeline">
                {activity.map(a => {
                  const meta = TYPE_META[a.type] || TYPE_META.note
                  const Icon = meta.icon
                  return (
                    <div key={a.id} className="bda-entry">
                      <div className="bda-entry-icon"><Icon size={14} /></div>
                      <div className="bda-entry-body">
                        <div className="bda-entry-top">
                          <span className="bda-entry-title">{a.title}</span>
                          <span className="bda-entry-time">{timeAgo(a.created_at)}</span>
                        </div>
                        <span className="bda-entry-type">{meta.label}</span>
                        {a.detail && <p className="bda-entry-detail">{a.detail}</p>}
                      </div>
                    </div>
                  )
                })}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
