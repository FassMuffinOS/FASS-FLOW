import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Check, Zap } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import Reveal from './Reveal'
import './Pricing.css'

const API_BASE = import.meta.env.VITE_API_URL || ''

// "Lite" is the impulse-buy entry point — same price point as the
// budget govcon-matching tools it competes with directly, but capped on
// purpose: read-only opportunity matches (no saved-search alerts) and 1
// AI synthesis per billing cycle, enforced server-side in /ai/*. It exists
// to catch the same low-intent traffic those tools catch, then upsell into
// Core once someone's actually chasing a bid.
const PLANS = [
  {
    key: 'lite',
    name: 'Lite',
    price: 9.99,
    tagline: 'See what\'s out there',
    color: 'default',
    features: [
      'Matched opportunity feed (read-only)',
      '1 AI scope/bid synthesis per billing cycle',
      'No saved-search alerts',
      'No proposal pipeline or team tools',
      'Upgrade anytime — nothing to migrate',
    ],
    cta: 'Start free trial',
  },
  {
    key: 'starter',
    name: 'Core',
    price: 99,
    tagline: 'Actually chase the bid',
    color: 'default',
    features: [
      'Full Academy access (all courses)',
      'Wardog opportunity alerts (10/mo)',
      'Unlimited AI synthesis (R-E-A-D, FASS FILL, Show Me The Money)',
      'Basic bid templates',
      '1 active proposal',
      'SAM.gov profile auto-fill',
      'Email support',
    ],
    cta: 'Start free trial',
  },
  {
    key: 'pro',
    name: 'Pro',
    price: 200,
    tagline: 'Bid and win',
    color: 'featured',
    badge: 'Most Popular',
    features: [
      'Everything in Core',
      'Unlimited opportunity alerts',
      'Advanced proposal builder + AI assist',
      'Unlimited active proposals',
      'Fill — full form automation',
      'Witness performance tracker',
      'Priority support + live chat',
    ],
    cta: 'Start free trial',
  },
  {
    key: 'team',
    name: 'Team',
    price: 499,
    tagline: 'Scale your pipeline',
    color: 'navy',
    features: [
      'Everything in Pro',
      'Up to 10 team seats',
      'Team proposal collaboration',
      'Custom NAICS + keyword filters',
      'API access',
      'Dedicated account manager',
      'White-label client reports',
    ],
    cta: 'Contact sales',
  },
]

export default function Pricing() {
  const { session } = useAuth()
  const navigate = useNavigate()
  const [checkingOut, setCheckingOut] = useState(null) // plan key in flight, or null
  const [error, setError] = useState('')

  async function handleCta(plan) {
    if (plan.key === 'team') {
      window.location.href = 'mailto:admin@fass.systems?subject=FASS%20Flow%20Team%20plan'
      return
    }
    if (!session?.user) {
      // SignIn always lands on /dashboard after auth (no redirect-back param
      // wired up yet) — come back to /pricing afterward to finish checkout.
      navigate('/signin')
      return
    }
    setError('')
    setCheckingOut(plan.key)
    try {
      const res = await fetch(`${API_BASE}/api/v1/subscriptions/checkout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan: plan.key, user_id: session.user.id, email: session.user.email }),
      })
      const data = await res.json()
      if (data?.url) {
        window.location.href = data.url
        return
      }
      setError('Could not start checkout. Try again in a moment.')
    } catch {
      setError('Could not start checkout. Try again in a moment.')
    } finally {
      setCheckingOut(null)
    }
  }

  return (
    <section className="pricing" id="pricing">
      <div className="container">
        <Reveal as="div" className="pricing-header">
          <span className="section-label">Pricing</span>
          <h2 className="pricing-title">Simple, transparent pricing</h2>
          <p className="pricing-desc">
            Start free for 14 days. No credit card required. Cancel anytime.
          </p>
        </Reveal>

        <div className="pricing-grid pricing-grid-4">
          {PLANS.map((plan, i) => (
            <Reveal
              as="div"
              key={plan.key}
              className={`plan-card plan-${plan.color} ${plan.color === 'featured' ? 'reveal-fade' : ''}`}
              delay={i * 90}
            >
              {plan.badge && (
                <div className="plan-badge">
                  <Zap size={12} />
                  {plan.badge}
                </div>
              )}

              <div className="plan-top">
                <div className="plan-name">{plan.name}</div>
                <div className="plan-tagline">{plan.tagline}</div>
                <div className="plan-price-row">
                  <span className="plan-currency">$</span>
                  <span className="plan-price">{plan.price}</span>
                  <span className="plan-period">/mo</span>
                </div>
              </div>

              <ul className="plan-features">
                {plan.features.map(f => (
                  <li key={f}>
                    <Check size={16} className="check-icon" />
                    {f}
                  </li>
                ))}
              </ul>

              <button
                type="button"
                disabled={checkingOut === plan.key}
                className={`plan-cta ${plan.color === 'featured' ? 'btn-primary' : 'btn-outline plan-cta-outline'}`}
                onClick={() => handleCta(plan)}
              >
                {checkingOut === plan.key ? 'Starting checkout…' : plan.cta}
              </button>
            </Reveal>
          ))}
        </div>

        {error && <p className="pricing-note" style={{ color: 'var(--danger, #c0392b)' }}>{error}</p>}

        <p className="pricing-note">
          All plans include a 14-day free trial. Federal contractor? Ask about our procurement vehicle discounts.
        </p>
      </div>
    </section>
  )
}
