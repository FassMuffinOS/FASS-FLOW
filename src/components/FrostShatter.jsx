import { useState } from 'react'
import './FrostShatter.css'

const COLS = 6
const ROWS = 3

function buildShards() {
  return Array.from({ length: COLS * ROWS }, (_, i) => {
    const col = i % COLS
    const row = Math.floor(i / COLS)
    // Push each shard outward from the grid's center — reads as an
    // explosion outward rather than a random scatter.
    const cx = col - (COLS - 1) / 2
    const cy = row - (ROWS - 1) / 2
    const dist = Math.sqrt(cx * cx + cy * cy) || 1
    const dx = (cx / dist) * (60 + Math.random() * 80)
    const dy = (cy / dist) * (60 + Math.random() * 80)
    const rot = (Math.random() - 0.5) * 55
    const delay = Math.random() * 120 + dist * 30
    return { dx, dy, rot, delay }
  })
}

// One-time "ice breaking apart" intro overlay. Covers the hero on first
// paint as a pane of frosted glass, then shatters outward in a staggered
// burst to reveal the headline underneath — the high-impact, unexpected
// reveal moment instead of a plain fade-in. Pure CSS transform/opacity, so
// it's cheap and respects prefers-reduced-motion (shards just fade, no fly-out).
export default function FrostShatter({ active }) {
  // Lazy initial state: React guarantees the initializer runs exactly once
  // per mount, which is the sanctioned place for one-time non-deterministic
  // setup like Math.random() (unlike useMemo, which offers no such guarantee).
  const [shards] = useState(buildShards)

  return (
    <div className={`frost-shatter ${active ? 'is-breaking' : ''}`} aria-hidden="true">
      {shards.map((s, i) => (
        <span
          key={i}
          className="frost-shard"
          style={{
            transitionDelay: `${s.delay}ms`,
            '--dx': `${s.dx}px`,
            '--dy': `${s.dy}px`,
            '--rot': `${s.rot}deg`,
          }}
        />
      ))}
    </div>
  )
}
