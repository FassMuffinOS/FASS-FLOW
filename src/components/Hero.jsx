import { useEffect, useRef, useState } from 'react'
import { ArrowRight } from 'lucide-react'
import Reveal from './Reveal'
import NetworkMesh from './NetworkMesh'
import FrostShatter from './FrostShatter'
import './Hero.css'

const LINE_1 = ['Find', 'the', 'work.', 'Win', 'the', 'bid.']
const LINE_2 = ['Get', 'it', 'done.']

export default function Hero() {
  const [intro, setIntro] = useState(false)
  const ctaRef = useRef(null)

  // Gate the headline/ice-shatter choreography behind a short timeout so it
  // reads as a deliberate reveal on load rather than a scroll-triggered fade.
  useEffect(() => {
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const t = setTimeout(() => setIntro(true), reduceMotion ? 0 : 120)
    return () => clearTimeout(t)
  }, [])

  // Magnetic CTA — the button leans toward the cursor within a small radius,
  // snapping back on leave. Cheap (no deps), but it's the kind of detail
  // that makes a hover feel alive instead of static.
  useEffect(() => {
    const el = ctaRef.current
    if (!el || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    function onMove(e) {
      const rect = el.getBoundingClientRect()
      const relX = e.clientX - (rect.left + rect.width / 2)
      const relY = e.clientY - (rect.top + rect.height / 2)
      el.style.transform = `translate(${relX * 0.18}px, ${relY * 0.28 - 2}px) scale(1.015)`
    }
    function onLeave() {
      el.style.transform = ''
    }

    el.addEventListener('mousemove', onMove)
    el.addEventListener('mouseleave', onLeave)
    return () => {
      el.removeEventListener('mousemove', onMove)
      el.removeEventListener('mouseleave', onLeave)
    }
  }, [])

  return (
    <section className="hero">
      <div className="hero-mesh-wrap" aria-hidden="true">
        <NetworkMesh />
      </div>

      <FrostShatter active={intro} />

      <div className="container hero-inner">

        <p className={`hero-eyebrow ${intro ? 'word-in' : ''}`}>
          The operating system for government contracting
        </p>

        <h1 className="hero-headline" aria-label="Find the work. Win the bid. Get it done.">
          <span className="headline-line" aria-hidden="true">
            {LINE_1.map((word, i) => (
              <span
                key={i}
                className={`headline-word ${intro ? 'word-in' : ''}`}
                style={{ transitionDelay: `${i * 45}ms` }}
              >
                {word}&nbsp;
              </span>
            ))}
          </span>
          <br aria-hidden="true" />
          <span className="headline-line headline-accent" aria-hidden="true">
            {LINE_2.map((word, i) => (
              <span
                key={i}
                className={`headline-word ${intro ? 'word-in' : ''}`}
                style={{ transitionDelay: `${(LINE_1.length + i) * 45}ms` }}
              >
                {word}&nbsp;
              </span>
            ))}
          </span>
        </h1>

        <Reveal as="p" className="hero-subhead" delay={1080}>
          Live opportunities, a government-ready business profile, disciplined bidding, pricing,
          proposal support, and execution tools for service businesses.
        </Reveal>

        <Reveal className="hero-actions" delay={1180}>
          <a href="/masterclass" className="btn-primary hero-cta" ref={ctaRef}>
            <span className="hero-cta-shine" aria-hidden="true" />
            Join the Masterclass — $350
            <ArrowRight size={18} />
          </a>
          <a href="#how-it-works" className="hero-secondary-cta">
            See the platform
          </a>
        </Reveal>

        <Reveal as="p" className="hero-trust" delay={1280}>
          Live SAM.gov data · AI-native bid tools · Built for small, veteran &amp; disadvantaged businesses
        </Reveal>

      </div>

      <div className="hero-bg-orb orb-1" />
      <div className="hero-bg-orb orb-2" />
      <div className="hero-grid-overlay" aria-hidden="true" />
    </section>
  )
}
