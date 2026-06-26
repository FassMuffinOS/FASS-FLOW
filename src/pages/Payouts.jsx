import { useState, useEffect, useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Landmark, Loader, ExternalLink, CheckCircle2, Clock, AlertCircle } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import './Payouts.css'

const API_BASE = import.meta.env.VITE_API_URL || ''

// Stripe Connect onboarding — the prerequisite for a business to ever
// receive and cash out its own money directly, instead of every payment
// (today: gift cards) pooling into FASS Flow's single master Stripe
// account. This page just gets a business linked + verified with Stripe;
// it doesn't change where any existing checkout's money goes yet, that's
// a deliberate later step once onboarding itself is proven out.
export default function Payouts() {
  const { session } = useAuth()
  const [searchParams] = useSearchParams()
  const justReturned = searchParams.get('return') === '1'
  const wasRefresh = searchParams.get('refresh') === '1'

  const [status, setStatus] = useState(null)
  const [loading, setLoading] = useState(true)
  const [starting, setStarting] = useState(false)
  const [error, setError] = useState(null)

  const loadStatus = useCallback(async () => {
    if (!session?.user || !API_BASE) { setLoading(false); return }
    try {
      const res = await fetch(`${API_BASE}/api/v1/connect/status?user_id=${session.user.id}`)
      if (res.ok) setStatus(await res.json())
    } finally {
      setLoading(false)
    }
  }, [session])

  useEffect(() => { loadStatus() }, [loadStatus])

  async function startOnboarding() {
    if (!session?.user || !API_BASE) return
    setStarting(true)
    setError(null)
    try {
      const res = await fetch(`${API_BASE}/api/v1/connect/start?user_id=${session.user.id}`, { method: 'POST' })
      if (res.ok) {
        const data = await res.json()
        window.location.href = data.url
      } else {
        const data = await res.json().catch(() => null)
        setError(data?.detail || 'Could not start onboarding — try again.')
        setStarting(false)
      }
    } catch {
      setError('Something went wrong starting onboarding.')
      setStarting(false)
    }
  }

  if (loading) return <div className="po"><Loader className="po-spin" size={18} /> Loading…</div>

  return (
    <div className="po">
      <div className="po-container">
        <div className="po-head">
          <Landmark size={22} className="po-head-icon" />
          <div>
            <h1>Payouts</h1>
            <p>Link your own Stripe account so money from gift card sales (and future paid features) goes straight to your bank — not through a shared platform account.</p>
          </div>
        </div>

        {justReturned && !status?.payouts_enabled && (
          <p className="po-note po-note-info"><Clock size={14} /> We're confirming your details with Stripe — this can take a minute. Refresh this page shortly.</p>
        )}
        {wasRefresh && (
          <p className="po-note po-note-warn"><AlertCircle size={14} /> That onboarding link expired or was left incomplete — click below to pick back up where you left off.</p>
        )}
        {error && <p className="po-note po-note-error"><AlertCircle size={14} /> {error}</p>}

        <div className="po-card">
          {status?.payouts_enabled ? (
            <>
              <div className="po-status po-status-good">
                <CheckCircle2 size={20} /> Payouts are active
              </div>
              <p className="po-note">Your Stripe account is verified and ready to receive money directly.</p>
            </>
          ) : status?.connected ? (
            <>
              <div className="po-status po-status-pending">
                <Clock size={20} /> Onboarding in progress
              </div>
              <p className="po-note">You've started linking a Stripe account, but it's not fully verified yet — finish or resume the setup below.</p>
              <button type="button" className="btn-primary po-btn" onClick={startOnboarding} disabled={starting}>
                {starting ? 'Opening Stripe…' : 'Resume setup'} <ExternalLink size={14} />
              </button>
            </>
          ) : (
            <>
              <div className="po-status po-status-none">
                Not set up yet
              </div>
              <p className="po-note">Takes a few minutes — Stripe will ask for basic business and bank details, hosted entirely on their secure form.</p>
              <button type="button" className="btn-primary po-btn" onClick={startOnboarding} disabled={starting}>
                {starting ? 'Opening Stripe…' : 'Set up payouts'} <ExternalLink size={14} />
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
