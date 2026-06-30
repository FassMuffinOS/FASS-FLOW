import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Check, Zap, Lock } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import Reveal from './Reveal'
import useSeo from '../hooks/useSeo'
import { apiFetch } from '../lib/apiClient'
import './Pricing.css'

// Offer architecture: one platform, three lanes — Win Work (GovCon),
// Execute Work (field/job tools), Grow Customers (Wallet/loyalty). Wallet
// is deliberately surfaced here instead of buried in its own page — it's
// what makes Pro's $200/mo read as cheap once someone sees gift cards,
// campaigns, and push messaging are already in the price.
//
// "Free" replaces the old paid "Lite" tier — no Stripe checkout at all,
// profiles.plan already defaults to 'free' in the schema, and quota.py
// gates the 1-AI-synthesis-per-cycle cap on plan === 'free' directly.
// "starter"/"pro"/"team" keys are unchanged from the previous tiers, so
// existing Stripe price IDs and webhook plan-mapping keep working as-is.
const PLANS = [
  {
    key: 'free',
    name: 'Free',
    price: 0,
    tagline: 'Get started',
    color: 'default',
    features: [
      'Business profile',
      '1 Wallet card',
      'Basic customer capture',
      'Limited Academy preview',
      '1 AI scope/bid synthesis per billing cycle',
    ],
    cta: 'Get started free',
  },
  {
    key: 'starter',
    name: 'Core',
    price: 99,
    annualPrice: 986.04,
    tagline: 'Start winning work',
    color: 'default',
    features: [
      'Wardog opportunity alerts',
      'Pipeline tracking',
      'Basic proposal tools',
      '3 Wallet campaigns / mo',
      'Basic Witness performance tracking',
      'Full Academy access',
    ],
    cta: 'Start free trial',
    foundersNote: 'Founding price — locked for life',
  },
  {
    key: 'pro',
    name: 'Pro',
    price: 200,
    annualPrice: 1992,
    tagline: 'Run the full business',
    color: 'featured',
    badge: 'Most Popular',
    features: [
      'Everything in Core',
      'Procure',
      'Fill — full form automation',
      'Foreman — execution documentation, RFIs, pay apps',
      'Unlimited Wallet campaigns',
      'Gift cards',
      'Push messages',
      'AI proposal support',
    ],
    cta: 'Start free trial',
    foundersNote: 'Founding price — locked for life',
  },
  {
    key: 'team',
    name: 'Team',
    price: 499,
    annualPrice: 4970.04,
    tagline: 'Scale operations',
    color: 'navy',
    features: [
      'Everything in Pro',
      'Multi-user / crew & staff access',
      'Cohort & team management',
      'Advanced reporting',
      'Stripe Connect payouts',
      'Priority support',
    ],
    cta: 'Contact sales',
  },
  {
    key: 'enterprise',
    name: 'Enterprise',
    price: 1500,
    annualPrice: 14940,
    tagline: 'Win with intelligence',
    color: 'enterprise',
    badge: 'WARDOG Intel',
    features: [
      'Everything in Team',
      'WARDOG Intel — incumbent & award-history intelligence',
      'Who held it, what they were paid, who else bids it',
      'AI forecast: re-compete odds, likely price band, entry strategy',
      'Dedicated onboarding',
      'Priority roadmap input',
    ],
    cta: 'Start free trial',
  },
]

export default function Pricing() {
  useSeo({
    title: 'Pricing',
    description: "FASS Flow pricing — beta founding members lock in today's price for as long as they stay subscribed.",
    path: '/pricing',
    markdownUrl: '/llms/pricing.md',
  })
  const { session } = useAuth()
  const navigate = useNavigate()
  const [checkingOut, setCheckingOut] = useState(null) // plan key in flight, or null
  const [error, setError] = useState('')
  const [annual, setAnnual] = useState(false) // false = monthly, true = annual (17% off)

  async function handleCta(plan) {
    if (plan.key === 'team') {
      window.location.href = 'mailto:admin@fass.systems?subject=FASS%20Flow%20Team%20plan'
      return
    }
    if (plan.key === 'free') {
      // No Stripe checkout for Free — profiles.plan already defaults to
      // 'free' server-side, so this is just account creation/sign-in.
      navigate(session?.user ? '/dashboard' : '/signin')
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
      const res = await apiFetch('/api/v1/subscriptions/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          plan: plan.key,
          user_id: session.user.id,
          email: session.user.email,
          billing_interval: annual ? 'year' : 'month',
        }),
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
            Start free, no credit card required. Every paid plan also includes a 14-day trial — cancel anytime.
          </p>
        </Reveal>

        <Reveal as="div" className="founders-banner" delay={40}>
          <Lock size={15} />
          We're in beta. The first businesses to sign up on a paid plan lock in today's price for as long as
          they stay subscribed — even after we raise it.
        </Reveal>

        <Reveal as="div" className="billing-toggle" delay={60}>
          <button
            type="button"
            className={`billing-toggle-opt ${!annual ? 'is-active' : ''}`}
            onClick={() => setAnnual(false)}
          >
            Monthly
          </button>
          <button
            type="button"
            className={`billing-toggle-opt ${annual ? 'is-active' : ''}`}
            onClick={() => setAnnual(true)}
          >
            Annual <span className="billing-toggle-save">Save 17%</span>
          </button>
        </Reveal>

        <div className="pricing-grid pricing-grid-5">
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
                  {plan.price === 0 ? (
                    <span className="plan-price">Free</span>
                  ) : annual && plan.annualPrice ? (
                    <>
                      <span className="plan-currency">$</span>
                      <span className="plan-price">
                        {plan.annualPrice % 1 === 0 ? plan.annualPrice : plan.annualPrice.toFixed(2)}
                      </span>
                      <span className="plan-period">/yr</span>
                    </>
                  ) : (
                    <>
                      <span className="plan-currency">$</span>
                      <span className="plan-price">{plan.price}</span>
                      <span className="plan-period">/mo</span>
                    </>
                  )}
                </div>
                {annual && plan.annualPrice && (
                  <div className="plan-annual-note">
                    vs. ${(plan.price * 12).toLocaleString()}/yr billed monthly
                  </div>
                )}
                {plan.foundersNote && (
                  <div className="plan-founders-note">
                    <Lock size={11} />
                    {plan.foundersNote}
                  </div>
                )}
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
          Paid plans include a 14-day free trial. Federal contractor? Ask about our procurement vehicle discounts.
        </p>
      </div>
    </section>
  )
}
