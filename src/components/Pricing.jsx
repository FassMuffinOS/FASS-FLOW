import { Check, Zap } from 'lucide-react'
import './Pricing.css'

const PLANS = [
  {
    name: 'Starter',
    price: 99,
    tagline: 'Learn and explore',
    color: 'default',
    features: [
      'Full Academy access (all courses)',
      'Wardog opportunity alerts (10/mo)',
      'Basic bid templates',
      '1 active proposal',
      'SAM.gov profile auto-fill',
      'Email support',
    ],
    cta: 'Start free trial',
    priceId: 'price_starter',
  },
  {
    name: 'Pro',
    price: 200,
    tagline: 'Bid and win',
    color: 'featured',
    badge: 'Most Popular',
    features: [
      'Everything in Starter',
      'Unlimited opportunity alerts',
      'Advanced proposal builder + AI assist',
      'Unlimited active proposals',
      'Fill — full form automation',
      'Witness performance tracker',
      'Priority support + live chat',
    ],
    cta: 'Start free trial',
    priceId: 'price_pro',
  },
  {
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
    priceId: 'price_team',
  },
]

export default function Pricing() {
  return (
    <section className="pricing" id="pricing">
      <div className="container">
        <div className="pricing-header">
          <span className="section-label">Pricing</span>
          <h2 className="pricing-title">Simple, transparent pricing</h2>
          <p className="pricing-desc">
            Start free for 14 days. No credit card required. Cancel anytime.
          </p>
        </div>

        <div className="pricing-grid">
          {PLANS.map(plan => (
            <div
              key={plan.name}
              className={`plan-card plan-${plan.color}`}
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

              <a
                href="/signup"
                className={`plan-cta ${plan.color === 'featured' ? 'btn-primary' : 'btn-outline plan-cta-outline'}`}
              >
                {plan.cta}
              </a>
            </div>
          ))}
        </div>

        <p className="pricing-note">
          All plans include a 14-day free trial. Federal contractor? Ask about our procurement vehicle discounts.
        </p>
      </div>
    </section>
  )
}
