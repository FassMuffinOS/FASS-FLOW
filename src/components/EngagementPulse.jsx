import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Heart, Activity } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { fetchBusinessEvents } from '../lib/businessEvents'
import './EngagementPulse.css'

const API_BASE = import.meta.env.VITE_API_URL || ''
const STALE_DAYS = 30
const TREND_DAYS = 14

// High-level "is the business alive right now" view, the two pieces the
// existing Dashboard widgets don't cover: how the *customer* relationships
// (Wallet/Rewards cards) are trending, and how much you've actually used
// the platform day over day. FunnelTracker already owns the bid pipeline +
// dollars-won North Star, and BusinessHealth already owns the 0-100 score —
// this widget deliberately reuses their existing data sources (campaigns/
// mine's customer list, business_events) instead of standing up anything
// new, so it's pure aggregation, not a second tracking system.
export default function EngagementPulse() {
  const { session } = useAuth()
  const navigate = useNavigate()
  const userId = session?.user?.id
  const [loading, setLoading] = useState(true)
  const [pulse, setPulse] = useState(null) // null = no Wallet customers yet / not loaded; else { total, active, stale }
  const [trend, setTrend] = useState([])

  const loadCustomers = useCallback(async () => {
    if (!userId || !API_BASE) return
    try {
      const res = await fetch(`${API_BASE}/api/v1/campaigns/mine?user_id=${userId}`)
      if (res.ok) {
        const data = await res.json()
        const customers = data.customers || []
        // Date.now() is read here, inside the effect callback, rather than
        // during render — computing "is this customer stale" needs a
        // current timestamp, but that read can't happen in the render path
        // itself (react-hooks/purity flags Date.now in render as an impure
        // call, since it'd make render output depend on wall-clock time).
        const now = Date.now()
        const active = customers.filter(c => c.updated_at && now - new Date(c.updated_at).getTime() < STALE_DAYS * 86400000).length
        setPulse({ total: customers.length, active, stale: customers.length - active })
      }
    } catch (err) {
      console.error('EngagementPulse: failed to load customers', err)
    }
  }, [userId])

  const loadTrend = useCallback(async () => {
    if (!userId) return
    try {
      const events = await fetchBusinessEvents(userId)
      const days = []
      for (let i = TREND_DAYS - 1; i >= 0; i--) {
        const d = new Date()
        d.setHours(0, 0, 0, 0)
        d.setDate(d.getDate() - i)
        days.push({ date: d, count: 0 })
      }
      events.forEach(e => {
        const t = new Date(e.created_at).getTime()
        const day = days.find(d => t >= d.date.getTime() && t < d.date.getTime() + 86400000)
        if (day) day.count += 1
      })
      setTrend(days)
    } catch (err) {
      console.error('EngagementPulse: failed to load activity trend', err)
    }
  }, [userId])

  useEffect(() => {
    let cancelled = false
    async function loadAll() {
      await Promise.all([loadCustomers(), loadTrend()])
      if (!cancelled) setLoading(false)
    }
    loadAll()
    return () => { cancelled = true }
  }, [loadCustomers, loadTrend])

  if (loading) return null
  // Nothing to show yet — no Wallet customers and no logged activity. Let
  // the rest of the Dashboard (GetStarted, etc.) carry the empty state.
  if ((!pulse || pulse.total === 0) && trend.every(d => d.count === 0)) return null

  const maxCount = Math.max(1, ...trend.map(d => d.count))
  const totalThisWeek = trend.slice(-7).reduce((sum, d) => sum + d.count, 0)
  const totalPrevWeek = trend.slice(0, 7).reduce((sum, d) => sum + d.count, 0)

  return (
    <div className="ep-card">
      <div className="ep-head">
        <Heart size={16} />
        <span>Engagement Pulse</span>
      </div>

      <div className="ep-grid">
        {pulse && pulse.total > 0 && (
          <div className="ep-kpis" onClick={() => navigate('/campaigns')}>
            <div className="ep-kpi">
              <span className="ep-kpi-value">{pulse.active}</span>
              <span className="ep-kpi-label">Active customers</span>
              <span className="ep-kpi-sub">touched in the last {STALE_DAYS} days</span>
            </div>
            <div className="ep-kpi">
              <span className={`ep-kpi-value ${pulse.stale > 0 ? 'ep-kpi-warn' : ''}`}>{pulse.stale}</span>
              <span className="ep-kpi-label">Going quiet</span>
              <span className="ep-kpi-sub">no activity in {STALE_DAYS}+ days — worth a nudge</span>
            </div>
          </div>
        )}

        <div className="ep-trend">
          <div className="ep-trend-head">
            <Activity size={13} />
            <span>Your activity, last {TREND_DAYS} days</span>
            <span className={`ep-trend-delta ${totalThisWeek >= totalPrevWeek ? 'ep-trend-up' : 'ep-trend-down'}`}>
              {totalThisWeek >= totalPrevWeek ? '+' : ''}{totalThisWeek - totalPrevWeek} vs. prior week
            </span>
          </div>
          <div className="ep-bars">
            {trend.map((d, i) => (
              <div key={i} className="ep-bar-col" title={`${d.date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}: ${d.count} action${d.count === 1 ? '' : 's'}`}>
                <div className="ep-bar-track">
                  <div className="ep-bar-fill" style={{ height: `${Math.max(4, Math.round((d.count / maxCount) * 100))}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
