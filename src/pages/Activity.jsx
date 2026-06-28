import { useState, useEffect } from 'react'
import { Activity as ActivityIcon, Loader } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { fetchBusinessEvents, CATEGORIES } from '../lib/businessEvents'
import './Activity.css'

const CATEGORY_LABEL = Object.fromEntries(CATEGORIES.map(c => [c.key, c.label]))

// The "Activity" tab in the new persistent bottom nav. Reuses the existing
// business_events table/helper (fetchBusinessEvents, already powering the
// Dashboard's Business Health widget) rather than a new backend endpoint —
// every module already writes a row here whenever the user does something
// that matters, so this page just renders that same stream chronologically
// instead of rolling it up into a score.
export default function Activity() {
  const { session } = useAuth()
  const userId = session?.user?.id
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!userId) { setLoading(false); return }
    let cancelled = false
    fetchBusinessEvents(userId, 100).then(data => {
      if (!cancelled) { setEvents(data); setLoading(false) }
    })
    return () => { cancelled = true }
  }, [userId])

  return (
    <div className="act">
      <div className="act-wrap">
        <h1 className="act-title"><ActivityIcon size={22} /> Activity</h1>
        <p className="act-sub">Everything that's happened across your account, most recent first.</p>

        {loading ? (
          <div className="act-state"><Loader className="act-spin" size={18} /> Loading…</div>
        ) : events.length === 0 ? (
          <div className="act-state">Nothing yet — activity shows up here as you use FASS Flow.</div>
        ) : (
          <ul className="act-list">
            {events.map((e, i) => (
              <li key={i} className="act-row">
                <span className="act-dot" />
                <div className="act-body">
                  <p className="act-label">{e.label || actionToText(e.action)}</p>
                  <p className="act-meta">
                    {CATEGORY_LABEL[e.category] || e.category} · {timeAgo(e.created_at)}
                  </p>
                </div>
                {e.points > 0 && <span className="act-points">+{e.points}</span>}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}

function actionToText(action) {
  if (!action) return 'Activity'
  return action.replace(/_/g, ' ').replace(/^\w/, c => c.toUpperCase())
}

function timeAgo(iso) {
  if (!iso) return ''
  const diffMs = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diffMs / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 30) return `${days}d ago`
  return new Date(iso).toLocaleDateString()
}
