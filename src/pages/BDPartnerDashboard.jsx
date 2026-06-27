import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Handshake, Radar, ClipboardCheck, FileText, Phone, StickyNote, Trophy, Loader } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import './BDPartnerDashboard.css'

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
  if (days < 30) return `${days}d ago`
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

// What an active BD Partner client sees instead of the sales pitch they
// already paid past — see App.jsx's BDPartnerRoute for the gating logic.
// This is the actual "tools and logs" surface: a real timeline of work
// done on their behalf (alerts surfaced, bids reviewed, proposals drafted,
// calls, milestones), plus one-click jumps into the live tools (WARDOG,
// R-E-A-D, Pipeline) that BD Partner work runs through. Activity rows are
// written by hand via the admin-secret-gated /bd-partner/activity
// endpoint — this is a white-glove service, not an automated one, so the
// log is the proof of the work actually happening every month.
export default function BDPartnerDashboard() {
  const { session } = useAuth()
  const navigate = useNavigate()
  const userId = session?.user?.id
  const [loading, setLoading] = useState(true)
  const [client, setClient] = useState(null)
  const [activity, setActivity] = useState([])

  const loadActivity = useCallback(async () => {
    if (!userId || !API_BASE) return
    try {
      const res = await fetch(`${API_BASE}/api/v1/bd-partner/activity?user_id=${userId}`)
      if (res.ok) setActivity((await res.json()).activity || [])
    } catch (err) {
      console.error('BDPartnerDashboard: failed to load activity', err)
    }
  }, [userId])

  const loadStatus = useCallback(async () => {
    if (!userId || !API_BASE) return
    try {
      const res = await fetch(`${API_BASE}/api/v1/bd-partner/status?user_id=${userId}`)
      if (res.ok) setClient((await res.json()).client)
    } catch (err) {
      console.error('BDPartnerDashboard: failed to load status', err)
    }
  }, [userId])

  useEffect(() => {
    let cancelled = false
    async function loadAll() {
      await Promise.all([loadStatus(), loadActivity()])
      if (!cancelled) setLoading(false)
    }
    loadAll()
    return () => { cancelled = true }
  }, [loadStatus, loadActivity])

  const thisMonthCount = activity.filter(a => {
    const d = new Date(a.created_at)
    const now = new Date()
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
  }).length

  if (loading) {
    return (
      <div className="bdp-page">
        <div className="bdp-loading"><Loader size={20} className="bdp-spin" /> Loading your BD Partner dashboard…</div>
      </div>
    )
  }

  return (
    <div className="bdp-page">
      <div className="bdp-head">
        <h1><Handshake size={20} /> BD Partner</h1>
        <span className="bdp-status-badge">
          Active since {client?.started_at ? new Date(client.started_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) : '—'}
        </span>
      </div>
      <p className="bdp-sub">Your monthly business-development partnership — every alert, review, and draft logged here as it happens, not just at renewal.</p>

      <div className="bdp-quicklinks">
        <button className="bdp-quicklink" onClick={() => navigate('/wardog')}>
          <Radar size={16} /> WARDOG alerts
        </button>
        <button className="bdp-quicklink" onClick={() => navigate('/read')}>
          <ClipboardCheck size={16} /> Bid/no-bid (R-E-A-D)
        </button>
        <button className="bdp-quicklink" onClick={() => navigate('/pipeline')}>
          <FileText size={16} /> Pipeline
        </button>
      </div>

      <div className="bdp-stat-row">
        <div className="bdp-stat">
          <span className="bdp-stat-value">{thisMonthCount}</span>
          <span className="bdp-stat-label">logged this month</span>
        </div>
        <div className="bdp-stat">
          <span className="bdp-stat-value">{activity.filter(a => a.type === 'review').length}</span>
          <span className="bdp-stat-label">bid/no-bid reviews total</span>
        </div>
        <div className="bdp-stat">
          <span className="bdp-stat-value">{activity.filter(a => a.type === 'draft').length}</span>
          <span className="bdp-stat-label">proposals drafted</span>
        </div>
      </div>

      <div className="bdp-timeline-head">Activity log</div>
      {activity.length === 0 && (
        <div className="bdp-empty">Nothing logged yet — your first WARDOG alert review or strategy call will show up here.</div>
      )}
      <div className="bdp-timeline">
        {activity.map(a => {
          const meta = TYPE_META[a.type] || TYPE_META.note
          const Icon = meta.icon
          return (
            <div key={a.id} className="bdp-entry">
              <div className="bdp-entry-icon"><Icon size={15} /></div>
              <div className="bdp-entry-body">
                <div className="bdp-entry-top">
                  <span className="bdp-entry-title">{a.title}</span>
                  <span className="bdp-entry-time">{timeAgo(a.created_at)}</span>
                </div>
                <span className="bdp-entry-type">{meta.label}</span>
                {a.detail && <p className="bdp-entry-detail">{a.detail}</p>}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
