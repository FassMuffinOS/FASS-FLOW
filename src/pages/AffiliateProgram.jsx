import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Megaphone, ArrowRight, Check, Copy, Link2, Loader2 } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { setPostAuthRedirect } from '../lib/postAuthRedirect'
import './AffiliateProgram.css'

const API_BASE = import.meta.env.VITE_API_URL || ''

const WHY = [
  { title: '30% commission', body: 'On every plan signup and FASS Wallet unlock that comes through your link — not a one-time bonus, an ongoing share of what they pay.' },
  { title: 'No application, no minimum followers', body: 'Sign in, get your link, start sharing. There\'s no approval gate slowing you down.' },
  { title: 'Your own link + dashboard', body: 'Track clicks, signups, and what you\'ve earned in real time, plus a content calendar with post ideas so you always know what to share next.' },
  { title: 'Paid out by the founder', body: 'Payouts are logged and paid directly — every conversion and payment shows up in your dashboard so there\'s nothing to chase.' },
]

// Public pitch + self-serve join page. Logged-out visitors get the pitch
// and a "sign in to get your link" CTA (SignIn.jsx has no redirect-param
// support, so we just send them to /signin and they come back to
// /affiliates afterward — same pattern as every other public sales page
// in this app, e.g. BDPartner.jsx). Logged-in visitors can join on the
// spot and immediately see their code/link, no separate step.
export default function AffiliateProgram() {
  const { session } = useAuth()
  const navigate = useNavigate()
  const userId = session?.user?.id

  const [affiliate, setAffiliate] = useState(null)
  const [loading, setLoading] = useState(false)
  const [joining, setJoining] = useState(false)
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)

  const loadMe = useCallback(async () => {
    if (!userId || !API_BASE) return
    setLoading(true)
    try {
      const res = await fetch(`${API_BASE}/api/v1/affiliates/me?user_id=${userId}`)
      if (res.ok) setAffiliate((await res.json()).affiliate)
    } catch (err) {
      console.error('AffiliateProgram: failed to load affiliate', err)
    } finally {
      setLoading(false)
    }
  }, [userId])

  useEffect(() => {
    let cancelled = false
    async function run() {
      if (cancelled) return
      await loadMe()
    }
    run()
    return () => { cancelled = true }
  }, [loadMe])

  async function join() {
    if (!userId) return
    setJoining(true)
    setError('')
    try {
      const res = await fetch(`${API_BASE}/api/v1/affiliates/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.detail || `Request failed (${res.status})`)
      setAffiliate(data.affiliate)
    } catch (err) {
      setError(err.message || 'Could not create your affiliate link, try again')
    } finally {
      setJoining(false)
    }
  }

  const link = affiliate ? `${window.location.origin}/?ref=${affiliate.code}` : ''

  function copyLink() {
    if (!link) return
    navigator.clipboard.writeText(link).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 1800)
    })
  }

  return (
    <div className="afp">
      <section className="afp-hero">
        <div className="container afp-hero-inner">
          <span className="afp-label"><Megaphone size={14} /> Creator Affiliate Program</span>
          <h1 className="afp-headline">Earn 30% promoting FASS Flow + FASS Wallet</h1>
          <p className="afp-subhead">
            Get a referral link, share it with your audience, and earn a 30% commission on every plan
            signup and Wallet unlock it brings in. No application, no follower minimum.
          </p>

          {!session && (
            <button
              className="btn-primary afp-cta"
              onClick={() => { setPostAuthRedirect('/affiliates/dashboard'); navigate('/signin') }}
            >
              Sign up to get your link <ArrowRight size={18} />
            </button>
          )}

          {session && !affiliate && !loading && (
            <button className="btn-primary afp-cta" onClick={join} disabled={joining}>
              {joining ? <Loader2 size={16} className="spin" /> : <Link2 size={16} />}
              {joining ? 'Creating your link…' : 'Get my affiliate link'}
            </button>
          )}

          {loading && <p className="afp-hero-note">Checking your account…</p>}
          {error && <p className="afp-error">{error}</p>}

          {affiliate && (
            <div className="afp-link-box">
              <span className="afp-link-label">Your link</span>
              <div className="afp-link-row">
                <input readOnly value={link} onClick={e => e.target.select()} />
                <button className="btn-outline afp-copy-btn" onClick={copyLink}>
                  <Copy size={14} /> {copied ? 'Copied' : 'Copy'}
                </button>
              </div>
              <button className="btn-primary afp-dash-link" onClick={() => navigate('/affiliates/dashboard')}>
                Go to your affiliate dashboard <ArrowRight size={16} />
              </button>
            </div>
          )}
        </div>
      </section>

      <section className="afp-why">
        <div className="container">
          <h2 className="afp-section-title">How it works</h2>
          <div className="afp-why-grid">
            {WHY.map(item => (
              <div className="afp-card" key={item.title}>
                <div className="afp-card-icon"><Check size={16} /></div>
                <div>
                  <h3 className="afp-card-title">{item.title}</h3>
                  <p className="afp-card-body">{item.body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="afp-legal-band">
        <div className="container">
          <p className="afp-legal">
            Commission is calculated on the actual amount paid through your link, recorded automatically
            for plan signups and Wallet unlocks, and paid out by the founder. FASS Technologies LLC ·
            admin@fass.systems
          </p>
        </div>
      </section>
    </div>
  )
}
