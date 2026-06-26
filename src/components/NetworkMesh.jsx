import { useEffect, useRef } from 'react'

// Canvas-based "live data network" background for the hero — glowing nodes
// drifting slowly, with connecting lines fading in/out as they pass near each
// other. Stands in for a literal background video (no video asset, no extra
// dependency) while reading as "live opportunities flowing through the
// platform," matching the SAM.gov / procurement-feed framing of the copy.
//
// Respects prefers-reduced-motion (renders one static frame, no animation
// loop) and pauses entirely when the tab isn't visible to avoid burning CPU
// in a background tab.
export default function NetworkMesh({ nodeCount = 46, className = '' }) {
  const canvasRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches

    let width = 0
    let height = 0
    let dpr = Math.min(window.devicePixelRatio || 1, 2)
    let nodes = []
    let rafId = null
    let running = true

    function resize() {
      const rect = canvas.parentElement.getBoundingClientRect()
      width = rect.width
      height = rect.height
      dpr = Math.min(window.devicePixelRatio || 1, 2)
      canvas.width = width * dpr
      canvas.height = height * dpr
      canvas.style.width = `${width}px`
      canvas.style.height = `${height}px`
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }

    function makeNodes() {
      const count = window.innerWidth < 640 ? Math.round(nodeCount * 0.55) : nodeCount
      nodes = Array.from({ length: count }, () => ({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.18,
        vy: (Math.random() - 0.5) * 0.18,
        r: Math.random() * 1.6 + 0.8,
        pulse: Math.random() * Math.PI * 2,
      }))
    }

    function step() {
      ctx.clearRect(0, 0, width, height)

      // Connection lines — only between nearby nodes, alpha falls off with distance.
      const linkDist = Math.min(width, height) * 0.16
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const a = nodes[i], b = nodes[j]
          const dx = a.x - b.x, dy = a.y - b.y
          const dist = Math.sqrt(dx * dx + dy * dy)
          if (dist < linkDist) {
            const alpha = (1 - dist / linkDist) * 0.16
            ctx.strokeStyle = `rgba(94, 234, 197, ${alpha})`
            ctx.lineWidth = 1
            ctx.beginPath()
            ctx.moveTo(a.x, a.y)
            ctx.lineTo(b.x, b.y)
            ctx.stroke()
          }
        }
      }

      // Nodes — soft glow dot with a slow opacity pulse.
      for (const n of nodes) {
        n.pulse += 0.012
        const glow = 0.55 + Math.sin(n.pulse) * 0.35
        ctx.beginPath()
        ctx.fillStyle = `rgba(94, 234, 197, ${0.5 * glow})`
        ctx.arc(n.x, n.y, n.r * 2.4, 0, Math.PI * 2)
        ctx.fill()
        ctx.beginPath()
        ctx.fillStyle = `rgba(255, 255, 255, ${0.7 * glow})`
        ctx.arc(n.x, n.y, n.r * 0.7, 0, Math.PI * 2)
        ctx.fill()

        if (!reduceMotion) {
          n.x += n.vx
          n.y += n.vy
          if (n.x < -20) n.x = width + 20
          if (n.x > width + 20) n.x = -20
          if (n.y < -20) n.y = height + 20
          if (n.y > height + 20) n.y = -20
        }
      }

      if (!reduceMotion && running) rafId = requestAnimationFrame(step)
    }

    function handleVisibility() {
      running = document.visibilityState === 'visible'
      if (running && !reduceMotion && rafId === null) {
        rafId = requestAnimationFrame(step)
      }
    }

    resize()
    makeNodes()
    step()

    window.addEventListener('resize', resize)
    document.addEventListener('visibilitychange', handleVisibility)

    return () => {
      running = false
      if (rafId) cancelAnimationFrame(rafId)
      window.removeEventListener('resize', resize)
      document.removeEventListener('visibilitychange', handleVisibility)
    }
  }, [nodeCount])

  return (
    <canvas
      ref={canvasRef}
      className={`network-mesh-canvas ${className}`.trim()}
      aria-hidden="true"
    />
  )
}
