import { useEffect } from 'react'
import Lenis from 'lenis'

// Wires up Lenis smooth scrolling for whatever it wraps. Scoped to the
// public landing page only (mounted around <Landing/> in App.jsx) rather
// than the whole app, so it never touches scroll behavior inside the
// authenticated dashboard (tables, modals, etc. that expect native scroll).
// No-ops entirely under prefers-reduced-motion.
export default function SmoothScroll({ children }) {
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    const lenis = new Lenis({
      duration: 1.05,
      smoothWheel: true,
      wheelMultiplier: 1,
    })

    let rafId
    function raf(time) {
      lenis.raf(time)
      rafId = requestAnimationFrame(raf)
    }
    rafId = requestAnimationFrame(raf)

    return () => {
      cancelAnimationFrame(rafId)
      lenis.destroy()
    }
  }, [])

  return children
}
