import { ArrowRight } from 'lucide-react'
import './Hero.css'

export default function Hero() {
  return (
    <section className="hero">
      <div className="container hero-inner">

        <p className="hero-eyebrow">The operating system for government contracting</p>

        <h1 className="hero-headline">
          Find the work. Win the bid.<br />
          <span className="headline-accent">Get it done.</span>
        </h1>

        <p className="hero-subhead">
          Live opportunities, a government-ready business profile, disciplined bidding, pricing,
          proposal support, and execution tools for service businesses.
        </p>

        <div className="hero-actions">
          <a href="/masterclass" className="btn-primary hero-cta">
            Join the Masterclass — $350
            <ArrowRight size={18} />
          </a>
          <a href="#how-it-works" className="hero-secondary-cta">
            See the platform
          </a>
        </div>

        <p className="hero-trust">
          Live SAM.gov data · AI-native bid tools · Built for small, veteran &amp; disadvantaged businesses
        </p>

      </div>

      <div className="hero-bg-orb orb-1" />
      <div className="hero-bg-orb orb-2" />
    </section>
  )
}
