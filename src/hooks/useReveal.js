import { useEffect, useRef, useState } from 'react'

// Scroll-triggered reveal, the CSS-only stand-in for Framer Motion's
// whileInView (npm install was blocked in this environment — see Reveal.jsx
// for the full note). Fires once, then disconnects; respects prefers-reduced-motion
// implicitly since the CSS transition itself is the thing that gets removed.
export default function useReveal({ threshold = 0.15, rootMargin = '0px 0px -60px 0px' } = {}) {
  const ref = useRef(null)
  // No-IntersectionObserver environments (old browsers, SSR) start visible
  // rather than synchronously flipping state inside the effect.
  const [visible, setVisible] = useState(() => typeof IntersectionObserver === 'undefined')

  useEffect(() => {
    const el = ref.current
    if (!el || typeof IntersectionObserver === 'undefined') return
    const obs = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setVisible(true)
        obs.disconnect()
      }
    }, { threshold, rootMargin })
    obs.observe(el)
    return () => obs.disconnect()
  }, [threshold, rootMargin])

  return [ref, visible]
}
