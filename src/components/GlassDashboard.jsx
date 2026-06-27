import { useEffect, useRef, useState } from 'react'
import { animate, motion, useInView } from 'framer-motion'
import './GlassDashboard.css'

const STATS = [
  { label: 'Contracts Found', value: 14823, suffix: '' },
  { label: 'Wallet Members', value: 2940, suffix: '' },
  { label: 'Active Campaigns', value: 37, suffix: '' },
  { label: 'Crew Online', value: 412, suffix: '' },
]

// A single animated counter — counts from 0 up to `value` once it scrolls
// into view, using Framer Motion's imperative `animate()` against a plain
// number in local state (no extra DOM nodes needed for the tween).
function Counter({ value, suffix }) {
  const [display, setDisplay] = useState(0)
  const ref = useRef(null)
  const inView = useInView(ref, { once: true, margin: '-10% 0px' })

  useEffect(() => {
    if (!inView) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setDisplay(value)
      return
    }
    const controls = animate(0, value, {
      duration: 1.4,
      ease: [0.16, 1, 0.3, 1],
      onUpdate: (v) => setDisplay(Math.round(v)),
    })
    return () => controls.stop()
  }, [inView, value])

  return (
    <span ref={ref} className="dashboard-stat-value">
      {display.toLocaleString()}{suffix}
    </span>
  )
}

// Floating glassmorphic dashboard panel for the hero — a small "live
// product" proof point sitting alongside the headline, with counters that
// animate up once visible. Framer Motion handles the entrance (fade + rise)
// and the count-up; everything else is plain CSS glass styling.
export default function GlassDashboard({ delay = 0 }) {
  return (
    <motion.div
      className="glass-dashboard"
      initial={{ opacity: 0, y: 28, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.7, delay: delay / 1000, ease: [0.16, 1, 0.3, 1] }}
    >
      <div className="glass-dashboard-header">
        <span className="glass-dashboard-dot" />
        Live platform activity
      </div>
      <div className="glass-dashboard-grid">
        {STATS.map((s) => (
          <div key={s.label} className="glass-dashboard-cell">
            <Counter value={s.value} suffix={s.suffix} />
            <span className="dashboard-stat-label">{s.label}</span>
          </div>
        ))}
      </div>
    </motion.div>
  )
}
