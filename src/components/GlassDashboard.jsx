import { motion } from 'framer-motion'
import { Lock, MessageCircle, Compass } from 'lucide-react'
import './GlassDashboard.css'

// What founding members actually get — real commitments we can keep, not
// fabricated "live" traffic numbers. Replaces the old animated-counter
// stats block (14,823 contracts found, etc.) which had no data behind it.
const PERKS = [
  { icon: Lock, label: 'Founding price locked for life' },
  { icon: MessageCircle, label: 'Direct line to the founder' },
  { icon: Compass, label: 'Help shape what we build next' },
]

// Floating glassmorphic panel for the hero — now a beta/founding-member
// callout instead of a live-activity dashboard. Framer Motion handles the
// entrance (fade + rise); everything else is plain CSS glass styling.
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
        Now in beta — founding members wanted
      </div>
      <div className="glass-dashboard-grid">
        {PERKS.map((p) => (
          <div key={p.label} className="glass-dashboard-cell">
            <p.icon size={18} className="dashboard-perk-icon" />
            <span className="dashboard-stat-label">{p.label}</span>
          </div>
        ))}
      </div>
    </motion.div>
  )
}
