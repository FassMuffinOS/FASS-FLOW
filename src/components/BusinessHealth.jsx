import { useState, useEffect } from 'react'
import { Activity, TrendingUp, TrendingDown } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { fetchBusinessEvents, computeBusinessHealth } from '../lib/businessEvents'
import './BusinessHealth.css'

// Business Health — the single score that's meant to answer "is what I'm
// doing in FASS Flow actually moving my business forward?" Reads from the
// shared business_events log (every module writes to it as real actions
// happen) so this stays accurate without a separate tracking system.
export default function BusinessHealth() {
  const { session } = useAuth()
  const [loading, setLoading] = useState(true)
  const [health, setHealth] = useState({ total: 0, perCategory: [], deltaToday: 0 })

  useEffect(() => {
    if (!session?.user?.id) return
    let cancelled = false
    async function load() {
      const events = await fetchBusinessEvents(session.user.id)
      if (!cancelled) setHealth(computeBusinessHealth(events))
      setLoading(false)
    }
    load()
    return () => { cancelled = true }
  }, [session?.user?.id])

  if (loading) return null

  const { total, perCategory, deltaToday } = health
  const circumference = 2 * Math.PI * 42
  const dashoffset = circumference - (total / 100) * circumference

  return (
    <div className="bh-card">
      <div className="bh-head">
        <Activity size={16} />
        <span>Business Health</span>
      </div>
      <div className="bh-body">
        <div className="bh-ring-wrap">
          <svg viewBox="0 0 100 100" className="bh-ring">
            <circle cx="50" cy="50" r="42" className="bh-ring-bg" />
            <circle
              cx="50" cy="50" r="42"
              className="bh-ring-fg"
              strokeDasharray={circumference}
              strokeDashoffset={dashoffset}
            />
          </svg>
          <div className="bh-ring-center">
            <span className="bh-ring-score">{total}</span>
            <span className="bh-ring-pct">%</span>
          </div>
        </div>
        <div className="bh-detail">
          <div className="bh-delta">
            {deltaToday > 0 ? (
              <span className="bh-delta-up"><TrendingUp size={13} /> +{deltaToday} today</span>
            ) : deltaToday < 0 ? (
              <span className="bh-delta-down"><TrendingDown size={13} /> {deltaToday} today</span>
            ) : (
              <span className="bh-delta-flat">No change yet today</span>
            )}
          </div>
          <div className="bh-categories">
            {perCategory.map(c => (
              <div className="bh-cat-row" key={c.key}>
                <span className="bh-cat-label">{c.label}</span>
                <div className="bh-cat-bar">
                  <div className="bh-cat-bar-fill" style={{ width: `${(c.share / 20) * 100}%` }} />
                </div>
                <span className="bh-cat-score">{c.share}/20</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
