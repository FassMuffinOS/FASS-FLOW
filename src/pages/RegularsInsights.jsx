import { useState, useEffect, useCallback } from 'react'
import { Sparkles, Loader, TrendingUp, TrendingDown, Users, Moon, Ghost, RefreshCw } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import './RegularsInsights.css'

const API_BASE = import.meta.env.VITE_API_URL || ''

// Regulars' Insights tab — "what's working, what's not, what should I do
// next" in one place. Pulls real per-campaign send/redeem numbers and a
// customer activity breakdown from GET /campaigns/insights, plus one
// AI-generated suggestion paragraph grounded in that same data (never
// invented). Nothing here is computed client-side beyond display formatting
// — the backend is the source of truth so this always matches Campaigns.
export default function RegularsInsights() {
  const { session } = useAuth()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const load = useCallback(async (isRefresh = false) => {
    if (!session?.user || !API_BASE) { setLoading(false); return }
    if (isRefresh) setRefreshing(true)
    try {
      const res = await fetch(`${API_BASE}/api/v1/campaigns/insights?user_id=${session.user.id}`)
      if (res.ok) setData(await res.json())
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [session])

  useEffect(() => { load() }, [load])

  if (loading) return <div className="ri"><Loader className="ri-spin" size={18} /> Loading…</div>

  const campaigns = data?.campaigns || []
  const segments = data?.segments || { total_customers: 0, active: 0, going_quiet: 0, lapsed: 0 }
  const hasCampaigns = campaigns.length > 0
  const best = hasCampaigns ? campaigns.reduce((a, b) => (b.redemption_rate > (a?.redemption_rate ?? -1) ? b : a), null) : null
  const worst = campaigns.length > 1 ? campaigns.reduce((a, b) => (b.redemption_rate < a.redemption_rate ? b : a)) : null

  return (
    <div className="ri">
      <div className="ri-container">
        <div className="ri-head">
          <Sparkles size={22} className="ri-head-icon" />
          <div>
            <h1>Insights</h1>
            <p>What's working, what's not, and what to try next — grounded in your own numbers.</p>
          </div>
          <button type="button" className="ri-refresh" onClick={() => load(true)} disabled={refreshing} title="Refresh">
            <RefreshCw size={14} className={refreshing ? 'ri-spin' : ''} />
          </button>
        </div>

        <div className="ri-card ri-ai-card">
          <div className="ri-card-head"><Sparkles size={14} /> Suggestion</div>
          {data?.ai_suggestion ? (
            <p className="ri-ai-text">{data.ai_suggestion}</p>
          ) : (
            <p className="ri-note">
              {data?.ai_error
                ? "AI suggestions aren't configured yet — everything else on this page still works."
                : 'Not enough activity yet to generate a suggestion. Send your first campaign and check back.'}
            </p>
          )}
        </div>

        <div className="ri-card">
          <div className="ri-card-head"><Users size={14} /> Customer activity</div>
          <div className="ri-segments">
            <div className="ri-segment">
              <span className="ri-segment-num">{segments.total_customers}</span>
              <span className="ri-segment-label">Total</span>
            </div>
            <div className="ri-segment ri-segment-active">
              <span className="ri-segment-num">{segments.active}</span>
              <span className="ri-segment-label">Active <span className="ri-segment-sub">(14d)</span></span>
            </div>
            <div className="ri-segment ri-segment-quiet">
              <span className="ri-segment-num">{segments.going_quiet}</span>
              <span className="ri-segment-label"><Moon size={11} /> Going quiet <span className="ri-segment-sub">(14–30d)</span></span>
            </div>
            <div className="ri-segment ri-segment-lapsed">
              <span className="ri-segment-num">{segments.lapsed}</span>
              <span className="ri-segment-label"><Ghost size={11} /> Lapsed <span className="ri-segment-sub">(30d+)</span></span>
            </div>
          </div>
          {segments.going_quiet > 0 && (
            <p className="ri-note ri-note-tip">
              {segments.going_quiet} customer{segments.going_quiet === 1 ? '' : 's'} going quiet — a targeted win-back offer from the Campaigns tab reaches them directly.
            </p>
          )}
        </div>

        <div className="ri-card">
          <div className="ri-card-head">Campaign performance</div>
          {!hasCampaigns ? (
            <p className="ri-note">No campaigns sent yet — send your first offer from the Campaigns tab and it'll show up here with a redemption rate.</p>
          ) : (
            <div className="ri-campaigns">
              <div className="ri-campaign-row ri-campaign-head">
                <span>Offer</span>
                <span>Sent</span>
                <span>Redeemed</span>
                <span>Rate</span>
              </div>
              {campaigns.map(c => (
                <div className="ri-campaign-row" key={c.id}>
                  <span className="ri-campaign-message">
                    {c.message}
                    {best && c.id === best.id && <span className="ri-badge ri-badge-best"><TrendingUp size={10} /> Best</span>}
                    {worst && c.id === worst.id && <span className="ri-badge ri-badge-worst"><TrendingDown size={10} /> Worst</span>}
                  </span>
                  <span>{c.sent_count}</span>
                  <span>{c.redeemed_count}</span>
                  <span className="ri-campaign-rate">{c.redemption_rate}%</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
