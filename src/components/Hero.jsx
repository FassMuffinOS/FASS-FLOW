import { ArrowRight } from 'lucide-react'
import Reveal from './Reveal'
import NetworkMesh from './NetworkMesh'
import './Hero.css'

export default function Hero() {
  return (
    <section className="hero">
      <div className="hero-mesh-wrap" aria-hidden="true">
        <NetworkMesh />
      </div>

      <div className="container hero-inner">

        <Reveal as="p" className="hero-eyebrow" delay={0}>
          The operating system for government contracting
        </Reveal>

        <Reveal as="h1" className="hero-headline" delay={90}>
          Find the work. Win the bid.<br />
          <span className="headline-accent">Get it done.</span>
        </Reveal>

        <Reveal as="p" className="hero-subhead" delay={180}>
          Live opportunities, a government-ready business profile, disciplined bidding, pricing,
          proposal support, and execution tools for service businesses.
        </Reveal>

        <Reveal className="hero-actions" delay={270}>
          <a href="/masterclass" className="btn-primary hero-cta">
            <span className="hero-cta-shine" aria-hidden="true" />
            Join the Masterclass — $350
            <ArrowRight size={18} />
          </a>
          <a href="#how-it-works" className="hero-secondary-cta">
            See the platform
          </a>
        </Reveal>

        <Reveal as="p" className="hero-trust" delay={360}>
          Live SAM.gov data · AI-native bid tools · Built for small, veteran &amp; disadvantaged businesses
        </Reveal>

      </div>

      <div className="hero-bg-orb orb-1" />
      <div className="hero-bg-orb orb-2" />
      <div className="hero-grid-overlay" aria-hidden="true" />
    </section>
  )
}
