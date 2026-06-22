import { ArrowRight } from 'lucide-react'
import './Hero.css'

const PILLARS = [
  { label: 'Registration', sub: 'SAM + eMMA readiness' },
  { label: 'Opportunity\nIntelligence', sub: 'Find qualified contracts' },
  { label: 'Bid Assembly', sub: 'R-E-A-D workflow' },
  { label: 'Execution\nSupport', sub: 'Prepare to perform' },
]

export default function Hero() {
  return (
    <section className="hero">
      <div className="container hero-inner">

        <h1 className="hero-headline">
          Government contracts are worth millions.<br />
          <span className="headline-accent">FASS helps service businesses compete for them.</span>
        </h1>

        <p className="hero-subhead">
          Build your contracting foundation. Find qualified opportunities.<br />
          Make disciplined bid decisions. Prepare to perform.
        </p>

        <div className="hero-actions">
          <a href="/masterclass" className="btn-primary hero-cta">
            Join the Masterclass — $350
            <ArrowRight size={18} />
          </a>
          <a href="#how-it-works" className="hero-secondary-cta">
            See FASS Flow
          </a>
        </div>

        <p className="hero-bd-note">
          BD Partner support available for qualified businesses
        </p>

        <div className="hero-pillars">
          {PILLARS.map(p => (
            <div className="pillar" key={p.label}>
              <span className="pillar-label">{p.label}</span>
              <span className="pillar-sub">{p.sub}</span>
            </div>
          ))}
        </div>

      </div>

      <div className="hero-bg-orb orb-1" />
      <div className="hero-bg-orb orb-2" />
    </section>
  )
}
