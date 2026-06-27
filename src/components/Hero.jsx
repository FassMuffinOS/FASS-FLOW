import { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { ArrowRight } from 'lucide-react'
import Reveal from './Reveal'
import BusinessCore3D from './BusinessCore3D'
import FrostShatter from './FrostShatter'
import GlassDashboard from './GlassDashboard'
import FassCursor from './FassCursor'
import './Hero.css'

const LINE_1 = ['Find', 'the', 'work.', 'Win', 'the', 'bid.']
const LINE_2 = ['Get', 'it', 'done.']

// Spring-physics word reveal for the headline — each word is its own
// motion.span with a slight stagger, so the line settles in with a little
// overshoot instead of a flat ease curve. Falls back to an instant, static
// render under prefers-reduced-motion (handled by Framer Motion's built-in
// reduced-motion support via the `transition` duration collapsing isn't
// automatic, so we just skip the animated props entirely below).
function HeadlineWord({ word, delay, accent }) {
  const reduceMotion = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
  if (reduceMotion) {
    return <span className={accent ? 'headline-word-accent' : undefined}>{word}&nbsp;</span>
  }
  return (
    <motion.span
      className={accent ? 'headline-word-accent' : undefined}
      style={{ display: 'inline-block' }}
      initial={{ opacity: 0, y: 26, filter: 'blur(10px)' }}
      animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
      transition={{ type: 'spring', stiffness: 220, damping: 18, mass: 0.7, delay: delay / 1000 }}
    >
      {word}&nbsp;
    </motion.span>
  )
}

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
      <FassCursor />
      <div className="hero-mesh-wrap" aria-hidden="true">
        <BusinessCore3D />
      </div>

      <FrostShatter active={intro} />

      <div className="container hero-inner">

        <p className={`hero-eyebrow ${intro ? 'word-in' : ''}`}>
          The operating system for government contracting
        </p>

        <h1 className="hero-headline" aria-label="Find the work. Win the bid. Get it done.">
          <span className="headline-line" aria-hidden="true">
            {LINE_1.map((word, i) => (
              <HeadlineWord key={i} word={word} delay={120 + i * 45} />
            ))}
          </span>
          <br aria-hidden="true" />
          <span className="headline-line headline-accent" aria-hidden="true">
            {LINE_2.map((word, i) => (
              <HeadlineWord key={i} word={word} delay={120 + (LINE_1.length + i) * 45} accent />
            ))}
          </span>
        </h1>

        <Reveal as="p" className="hero-subhead" delay={1080}>
          Win government work, execute the job, and grow repeat customers — from one operating
          system built for service businesses.
        </Reveal>

        <Reveal className="hero-actions" delay={1180}>
          <a href="/signin" className="btn-primary hero-cta" ref={ctaRef}>
            <span className="hero-cta-shine" aria-hidden="true" />
            Get Started Free
            <ArrowRight size={18} />
          </a>
          <a href="/masterclass" className="hero-secondary-cta">
            Join the Masterclass — $350
          </a>
        </Reveal>

        <Reveal as="p" className="hero-trust" delay={1280}>
          Live SAM.gov data · AI-native bid tools · Built for small, veteran &amp; disadvantaged businesses
        </Reveal>

        <GlassDashboard delay={1420} />

      </div>

      <div className="hero-bg-orb orb-1" />
      <div className="hero-bg-orb orb-2" />
      <div className="hero-grid-overlay" aria-hidden="true" />
    </section>
  )
}
