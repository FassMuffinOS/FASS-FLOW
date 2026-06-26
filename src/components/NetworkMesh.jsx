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
    let comets = []
    let frame = 0
    let nextCometAt = 180 + Math.random() * 240
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
            const alpha = (1 - dist / linkDist) * 0.18
            ctx.strokeStyle = `rgba(176, 224, 255, ${alpha})`
            ctx.lineWidth = 1
            ctx.beginPath()
            ctx.moveTo(a.x, a.y)
            ctx.lineTo(b.x, b.y)
            ctx.stroke()
          }
        }
      }

      // Nodes — icy glow dot with a slow opacity pulse.
      for (const n of nodes) {
        n.pulse += 0.012
        const glow = 0.55 + Math.sin(n.pulse) * 0.35
        ctx.beginPath()
        ctx.fillStyle = `rgba(176, 224, 255, ${0.5 * glow})`
        ctx.arc(n.x, n.y, n.r * 2.4, 0, Math.PI * 2)
        ctx.fill()
        ctx.beginPath()
        ctx.fillStyle = `rgba(255, 255, 255, ${0.75 * glow})`
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

      // Comet — an occasional fast, bright streak crossing the mesh. Rare and
      // quick on purpose: it's the "wait, what was that" surprise beat that
      // makes the background feel alive instead of just ambient.
      if (!reduceMotion) {
        frame++
        if (frame >= nextCometAt && comets.length < 2) {
          comets.push(spawnComet())
          nextCometAt = frame + 260 + Math.random() * 320
        }
        comets = comets.filter((c) => {
          drawComet(c)
          c.x += c.vx
          c.y += c.vy
          c.life++
          return c.life < c.maxLife && c.x > -60 && c.x < width + 60 && c.y > -60 && c.y < height + 60
        })
      }

      if (!reduceMotion && running) rafId = requestAnimationFrame(step)
    }

    function spawnComet() {
      const fromLeft = Math.random() < 0.5
      const speed = 5.5 + Math.random() * 3
      const angle = (Math.random() - 0.5) * 0.5
      const y = height * (0.15 + Math.random() * 0.6)
      return {
        x: fromLeft ? -40 : width + 40,
        y,
        vx: (fromLeft ? 1 : -1) * speed * Math.cos(angle),
        vy: speed * Math.sin(angle),
        life: 0,
        maxLife: 60,
      }
    }

    function drawComet(c) {
      // Fade in/out over its lifetime so it doesn't pop in/out abruptly.
      const t = c.life / c.maxLife
      const fade = t < 0.15 ? t / 0.15 : t > 0.75 ? (1 - t) / 0.25 : 1
      const tailX = c.x - c.vx * 9
      const tailY = c.y - c.vy * 9

      const grad = ctx.createLinearGradient(tailX, tailY, c.x, c.y)
      grad.addColorStop(0, 'rgba(176, 224, 255, 0)')
      grad.addColorStop(1, `rgba(225, 245, 255, ${0.85 * fade})`)

      ctx.save()
      ctx.shadowColor = 'rgba(176, 224, 255, 0.9)'
      ctx.shadowBlur = 12
      ctx.strokeStyle = grad
      ctx.lineWidth = 1.6
      ctx.lineCap = 'round'
      ctx.beginPath()
      ctx.moveTo(tailX, tailY)
      ctx.lineTo(c.x, c.y)
      ctx.stroke()
      ctx.restore()

      ctx.beginPath()
      ctx.fillStyle = `rgba(255, 255, 255, ${fade})`
      ctx.arc(c.x, c.y, 1.6, 0, Math.PI * 2)
      ctx.fill()
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
