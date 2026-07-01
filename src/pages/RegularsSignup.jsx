import { useState, useEffect } from 'react'
import { Check, Lock, Wallet, Gift, Stamp, Megaphone } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { listRegularsPrices, regularsSignup } from '../lib/regularsClient'
import useSeo from '../hooks/useSeo'
import ScrollBlastHero from '../components/ScrollBlastHero'
import './RegularsSignup.css'

const PLAN_FEATURES = {
  starter: [
    'Branded Apple Wallet loyalty pass',
    '1 active rewards (punch-card) program',
    '3 campaign broadcasts / month',
  ],
  pro: [
    'Everything in Starter',
    'Prepaid gift cards',
    'Unlimited campaign broadcasts',
    'SMS messaging (Comms Hub)',
    'Multiple rewards programs',
  ],
}

function money(cents) {
  if (cents == null) return '—'
  const dollars = cents / 100
  return dollars % 1 === 0 ? `$${dollars}` : `$${dollars.toFixed(2)}`
}

export default function RegularsSignup() {
  useSeo({
    title: 'Regulars — Turn customers into regulars',
    description: 'Apple Wallet loyalty passes, gift cards, and campaign broadcasts for local businesses. No app download required. Starting at $39/mo.',
    path: '/regulars',
  })

  const [prices, setPrices] = useState({})
  const [annual, setAnnual] = useState(false)
  const [plan, setPlan] = useState('starter')
  const [form, setForm] = useState({ businessName: '', email: '', password: '' })
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    listRegularsPrices().then(({ plans }) => { if (!cancelled) setPrices(plans || {}) })
    return () => { cancelled = true }
  }, [])

  function update(field, value) {
    setForm(f => ({ ...f, [field]: value }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (submitting) return
    setError('')
    if (!form.businessName.trim()) return setError('Tell us your business name.')
    if (!form.email.trim() || !form.email.includes('@')) return setError('Enter a valid email.')
    if (!form.password || form.password.length < 8) return setError('Password must be at least 8 characters.')

    setSubmitting(true)
    try {
      const data = await regularsSignup({
        email: form.email.trim().toLowerCase(),
        password: form.password,
        businessName: form.businessName.trim(),
        plan,
        billingInterval: annual ? 'annual' : 'monthly',
      })

      // Establish a real client-side session the same way SignIn.jsx does,
      // so the post-checkout redirect back into the app already has one.
      await supabase.auth.signInWithPassword({
        email: form.email.trim().toLowerCase(),
        password: form.password,
      })

      if (data.checkout_url) {
        window.location.href = data.checkout_url
        return
      }
      setError('Account created, but checkout could not start — try again from your dashboard.')
    } catch (err) {
      setError(err.message || 'Something went wrong — try again.')
    } finally {
      setSubmitting(false)
    }
  }

  const planPrice = prices[plan] || {}
  const intervalData = annual ? planPrice.annual : planPrice.monthly

  return (
    <>
      <ScrollBlastHero />
      <div className="rg">
      <div className="rg-inner">
        <div className="rg-pitch">
          <span className="rg-eyebrow">By Fass.Systems</span>
          <h1 className="rg-title">Regulars</h1>
          <p className="rg-tagline">Most customers never come back — and you have no way to reach them.</p>
          <p className="rg-desc">
            One tap adds your loyalty pass to their Apple Wallet — no app to
            download, no card to lose, no email they'll ignore.
          </p>

          <ul className="rg-features">
            <li><Wallet size={16} /> No app download — it's already in their pocket</li>
            <li><Stamp size={16} /> Paper punch cards get lost. This one can't.</li>
            <li><Gift size={16} /> Turn a slow Tuesday into cash in the bank</li>
            <li><Megaphone size={16} /> Fill empty seats with one tap, not a $500 ad</li>
          </ul>

          <div className="rg-toggle">
            <button type="button" className={`rg-toggle-opt ${!annual ? 'is-active' : ''}`} onClick={() => setAnnual(false)}>Monthly</button>
            <button type="button" className={`rg-toggle-opt ${annual ? 'is-active' : ''}`} onClick={() => setAnnual(true)}>
              Annual <span className="rg-toggle-save">Save 17%</span>
            </button>
          </div>

          <div className="rg-plans">
            {['starter', 'pro'].map(p => {
              const pd = prices[p] || {}
              const interval = annual ? pd.annual : pd.monthly
              return (
                <button
                  type="button"
                  key={p}
                  className={`rg-plan-card ${plan === p ? 'is-selected' : ''}`}
                  onClick={() => setPlan(p)}
                >
                  <div className="rg-plan-name">{p === 'starter' ? 'Starter' : 'Pro'}</div>
                  <div className="rg-plan-price">
                    {money(interval?.amount_cents)}<span className="rg-plan-period">{annual ? '/yr' : '/mo'}</span>
                  </div>
                  <ul className="rg-plan-features">
                    {PLAN_FEATURES[p].map(f => <li key={f}><Check size={13} /> {f}</li>)}
                  </ul>
                </button>
              )
            })}
          </div>
        </div>

        <form className="rg-form" onSubmit={handleSubmit}>
          <h2 className="rg-form-title">Get started</h2>
          <p className="rg-form-sub">
            {plan === 'starter' ? 'Starter' : 'Pro'} — {money(intervalData?.amount_cents)}{annual ? '/yr' : '/mo'}, 14-day free trial
          </p>

          <label className="rg-label">Business name</label>
          <input
            className="rg-input"
            value={form.businessName}
            onChange={e => update('businessName', e.target.value)}
            placeholder="Corner Coffee Co."
            required
          />

          <label className="rg-label">Email</label>
          <input
            type="email"
            className="rg-input"
            value={form.email}
            onChange={e => update('email', e.target.value)}
            placeholder="you@example.com"
            required
          />

          <label className="rg-label">Password</label>
          <input
            type="password"
            className="rg-input"
            value={form.password}
            onChange={e => update('password', e.target.value)}
            placeholder="At least 8 characters"
            required
          />

          {error && <p className="rg-error">{error}</p>}

          <button type="submit" className="rg-submit" disabled={submitting}>
            {submitting ? 'Setting up your account…' : 'Start free trial'}
          </button>

          <p className="rg-fineprint"><Lock size={11} /> 14-day free trial, cancel anytime. Card required to start.</p>
        </form>
      </div>
      </div>
    </>
  )
}
