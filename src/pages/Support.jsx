import { Heart, DollarSign, FileSearch, ArrowRight } from 'lucide-react'
import './Support.css'

const TIP_OPTIONS = [
  {
    name: 'Cash App',
    handle: '$fassmuffinos',
    href: 'https://cash.app/$fassmuffinos',
  },
  {
    name: 'Venmo',
    handle: '@munchiesgourmets',
    href: 'https://venmo.com/munchiesgourmets',
  },
]

export default function Support() {
  return (
    <div className="sup">
      <section className="sup-hero">
        <div className="container sup-hero-inner">
          <Heart size={28} className="sup-hero-icon" />
          <h1>Support FASS Flow</h1>
          <p>
            FASS Flow is a small team building tools to get more small businesses into government contracting.
            If this has helped your business and you want to chip in, here's how — no pressure, ever.
          </p>
        </div>
      </section>

      <section className="sup-section">
        <div className="container">
          <h2 className="sup-section-title">Send a tip directly</h2>
          <p className="sup-section-sub">
            Goes straight to the team — no processing fees, no middleman.
          </p>
          <div className="sup-tip-grid">
            {TIP_OPTIONS.map(opt => (
              <a key={opt.name} href={opt.href} target="_blank" rel="noreferrer" className="sup-tip-card">
                <span className="sup-tip-name">{opt.name}</span>
                <span className="sup-tip-handle">{opt.handle}</span>
                <span className="sup-tip-go">
                  Open {opt.name} <ArrowRight size={14} />
                </span>
              </a>
            ))}
          </div>
        </div>
      </section>

      <section className="sup-section sup-section-alt">
        <div className="container">
          <div className="sup-offer-card">
            <FileSearch size={22} className="sup-offer-icon" />
            <div className="sup-offer-body">
              <span className="sup-offer-badge">Pay-per-solicitation</span>
              <h2 className="sup-section-title sup-offer-title">Want a second set of eyes on one solicitation?</h2>
              <p>
                If you don't want a subscription or the full Masterclass, we'll review a single solicitation
                with you directly — scope, eligibility, evaluation criteria, and a straight answer on
                bid/no-bid — for a flat <strong>$10 per solicitation</strong>.
              </p>
              <div className="sup-offer-promo">
                <DollarSign size={16} />
                <span><strong>First month special:</strong> get $10 back on your first solicitation review. Your first one is effectively on us.</span>
              </div>
              <a href="mailto:admin@fass.systems?subject=Solicitation Review Request" className="btn-primary sup-offer-cta">
                Request a review — admin@fass.systems
              </a>
            </div>
          </div>
        </div>
      </section>

      <section className="sup-section">
        <div className="container sup-bottom">
          <p>
            Prefer to support us by using the product? The best way is still the
            {' '}<a href="/masterclass">Masterclass</a>{' '} or the self-paced ebook — every purchase funds
            the next feature.
          </p>
        </div>
      </section>
    </div>
  )
}
