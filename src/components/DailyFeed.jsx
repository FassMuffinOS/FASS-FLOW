import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Sparkles, ArrowRight, CheckCircle2 } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { fetchDailyFeed, fetchDailyBrief } from '../lib/dailyFeed'
import './DailyFeed.css'

function greeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 18) return 'Good afternoon'
  return 'Good evening'
}

// The Dashboard's daily action list — "what does FASS want me to
// accomplish today?" instead of "which tool do I open?" Pulls live from
// dailyFeed.js (proposals, milestones, campaigns, WARDOG, Masterclass) so
// it's always a real read of account state, never a separate thing to keep
// in sync. The AI brief loads after the list so the list never waits on it.
export default function DailyFeed() {
  const { session } = useAuth()
  const navigate = useNavigate()
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [brief, setBrief] = useState(null)
  const [briefLoading, setBriefLoading] = useState(false)

  const firstName = (session?.user?.user_metadata?.full_name || '').split(' ')[0] || ''

  useEffect(() => {
    if (!session?.user?.id) return
    let cancelled = false
    async function load() {
      const feed = await fetchDailyFeed(session.user.id)
      if (cancelled) return
      setItems(feed)
      setLoading(false)
      if (feed.length > 0) {
        setBriefLoading(true)
        const b = await fetchDailyBrief(session.user.id, feed)
        if (!cancelled) { setBrief(b); setBriefLoading(false) }
      }
    }
    load()
    return () => { cancelled = true }
  }, [session?.user?.id])

  if (loading) return null

  return (
    <div className="df-card">
      <h2 className="df-greeting">
        {greeting()}{firstName ? `, ${firstName}` : ''}.{' '}
        {items.length > 0
          ? `You have ${items.length} item${items.length === 1 ? '' : 's'} that can grow your business today.`
          : "You're all caught up — nothing urgent needs you right now."}
      </h2>

      {(briefLoading || brief) && (
        <div className="df-brief">
          <Sparkles size={14} />
          <p>{briefLoading ? 'Thinking through today…' : brief}</p>
        </div>
      )}

      {items.length === 0 ? (
        <div className="df-empty">
          <CheckCircle2 size={18} />
          <span>No deadlines, matches, or expiring offers right now — good time to work a Masterclass mission or browse WARDOG.</span>
        </div>
      ) : (
        <ul className="df-list">
          {items.map(item => (
            <li key={item.id}>
              <button className="df-item" onClick={() => navigate(item.href)}>
                <span className="df-item-emoji">{item.emoji}</span>
                <span className="df-item-text">{item.text}</span>
                <ArrowRight size={14} className="df-item-arrow" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
