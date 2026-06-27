import { useEffect, useRef } from 'react'
import './FassCursor.css'

// A branded custom cursor for the public marketing pages. Lives inside Hero
// (always-mounted on the landing route) but renders fixed/full-viewport, so
// it tracks the pointer across Hero, HomeBand, HowItWorks, Nav and Footer —
// anywhere on the landing page — without following the user into the signed
// in app (Hero never mounts there).
//
// Character comes from three things instead of a flat 1:1 dot:
//   1. A lagging core (lerped toward the raw pointer — gives weight/inertia)
//   2. A trailing chain of 5 fading hex-nodes (echoes the Business Core
//      hexagon motif from the hero) that cascade-follow the core
//   3. A hover state that swells the hex ring + brightens on any
//      link/button/interactive node, and a quick ripple pulse on click
//
// Pure rAF + refs — no per-frame React state — so it stays smooth.
export default function FassCursor() {
  const coreRef = useRef(null)
  const ringRef = useRef(null)
  const trailRefs = useRef([])
  const rippleLayerRef = useRef(null)

  useEffect(() => {
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const isCoarsePointer = window.matchMedia('(pointer: coarse)').matches
    if (reduceMotion || isCoarsePointer) return // touch devices / reduced motion: native cursor only

    document.body.classList.add('fass-cursor-active')

    const TRAIL_LEN = 5
    const pos = { x: window.innerWidth / 2, y: window.innerHeight / 2 }
    const core = { x: pos.x, y: pos.y }
    const trail = Array.from({ length: TRAIL_LEN }, () => ({ x: pos.x, y: pos.y }))
    let hovering = false
    let down = false
    let raf

    function onMove(e) {
      pos.x = e.clientX
      pos.y = e.clientY
    }

    function spawnPulse(className) {
      const layer = rippleLayerRef.current
      if (!layer) return
      const r = document.createElement('span')
      r.className = className
      r.style.left = `${core.x}px`
      r.style.top = `${core.y}px`
      layer.appendChild(r)
      r.addEventListener('animationend', () => r.remove())
    }

    function onOver(e) {
      const interactive = e.target.closest(
        'a, button, [role="button"], .hexagon, .hero-cta, .hero-secondary-cta, input, textarea, select, .business-core-node'
      )
      const wasHovering = hovering
      hovering = !!interactive
      ringRef.current?.classList.toggle('fc-hover', hovering)
      // Fire the amber "lock-on" pulse only on the transition into hover,
      // not on every mouseover bubble inside the same target.
      if (hovering && !wasHovering) spawnPulse('fc-pulse-hover')
    }

    function onDown() {
      down = true
      coreRef.current?.classList.add('fc-down')
      spawnPulse('fc-ripple')
    }
    function onUp() {
      down = false
      coreRef.current?.classList.remove('fc-down')
    }

    function onLeaveWindow() {
      ringRef.current?.classList.add('fc-hidden')
    }
    function onEnterWindow() {
      ringRef.current?.classList.remove('fc-hidden')
    }

    window.addEventListener('mousemove', onMove, { passive: true })
    window.addEventListener('mouseover', onOver, { passive: true })
    window.addEventListener('mousedown', onDown)
    window.addEventListener('mouseup', onUp)
    window.addEventListener('mouseout', onLeaveWindow)
    window.addEventListener('mouseenter', onEnterWindow)

    function tick() {
      // Core lags the raw pointer for weight; faster when hovering (snappier
      // "lock on" feel), slower at rest (drifty, deliberate).
      const lag = hovering ? 0.32 : down ? 0.4 : 0.16
      core.x += (pos.x - core.x) * lag
      core.y += (pos.y - core.y) * lag

      if (coreRef.current) {
        coreRef.current.style.transform = `translate3d(${core.x}px, ${core.y}px, 0) translate(-50%, -50%)`
      }
      if (ringRef.current) {
        const scale = hovering ? 1.9 : down ? 0.75 : 1
        ringRef.current.style.transform = `translate3d(${core.x}px, ${core.y}px, 0) translate(-50%, -50%) scale(${scale})`
      }

      // Cascade: each trail node lerps toward the previous node (or the
      // core for the first one), each a touch slower than the last —
      // produces a settling, elastic chain rather than a stiff line.
      let prevX = core.x
      let prevY = core.y
      trail.forEach((node, i) => {
        const nodeLag = 0.22 - i * 0.025
        node.x += (prevX - node.x) * nodeLag
        node.y += (prevY - node.y) * nodeLag
        const el = trailRefs.current[i]
        if (el) {
          el.style.transform = `translate3d(${node.x}px, ${node.y}px, 0) translate(-50%, -50%)`
        }
        prevX = node.x
        prevY = node.y
      })

      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)

    return () => {
      cancelAnimationFrame(raf)
      document.body.classList.remove('fass-cursor-active')
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseover', onOver)
      window.removeEventListener('mousedown', onDown)
      window.removeEventListener('mouseup', onUp)
      window.removeEventListener('mouseout', onLeaveWindow)
      window.removeEventListener('mouseenter', onEnterWindow)
    }
  }, [])

  return (
    <div className="fass-cursor-layer" aria-hidden="true">
      <div className="fc-ripple-layer" ref={rippleLayerRef} />
      {Array.from({ length: 5 }).map((_, i) => (
        <span
          key={i}
          className="fc-trail-node"
          style={{ '--i': i }}
          ref={(el) => { trailRefs.current[i] = el }}
        />
      ))}
      <span className="fc-ring" ref={ringRef}>
        <svg viewBox="0 0 40 40" className="fc-hex">
          <polygon points="20,2 35.3,11 35.3,29 20,38 4.7,29 4.7,11" />
        </svg>
      </span>
      <span className="fc-core" ref={coreRef} />
    </div>
  )
}
