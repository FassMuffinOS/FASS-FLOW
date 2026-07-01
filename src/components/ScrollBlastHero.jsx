import { useRef, useEffect } from 'react'
import { motion, useAnimation, useInView, useReducedMotion } from 'framer-motion'
import { Wallet, Stamp, Check } from 'lucide-react'
import './ScrollBlastHero.css'

const DOT_COUNT = 6
const FILLED_BEFORE = 3   // dots already earned, shown solid from the start
const STAMPED_INDEX = 3   // the dot the stamp animates in and fills live (0-indexed, 4th dot)

// Product-accurate hero: no external art. A branded wallet pass builds in,
// then a stamp drops onto the next punch dot and fills it — the actual
// core loop (tap in, get stamped) instead of an abstract effect. Plays
// once when the section scrolls into view.
export default function ScrollBlastHero() {
  const sectionRef = useRef(null)
  const inView = useInView(sectionRef, { once: true, amount: 0.5 })
  const reduce = useReducedMotion()

  const headline = useAnimation()
  const card = useAnimation()
  const stamp = useAnimation()
  const dot = useAnimation()
  const glow = useAnimation()
  const badge = useAnimation()

  useEffect(() => {
    if (!inView) return

    if (reduce) {
      headline.set({ opacity: 1, y: 0 })
      card.set({ opacity: 1, x: 0, y: 0, rotateX: 0, scale: 1 })
      stamp.set({ opacity: 1, y: 0, rotate: -16 })
      dot.set({ scale: 1, backgroundColor: 'var(--teal)', borderColor: 'var(--teal)' })
      badge.set({ opacity: 1, y: 0, scale: 1 })
      return
    }

    let cancelled = false
    async function sequence() {
      await headline.start({ opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] } })
      if (cancelled) return

      // Arc-swept entrance with anticipation (a tiny coil before launch)
      // and an overshoot settle (the card lands past its resting scale,
      // then eases back) instead of a flat linear fly-in.
      await card.start({
        opacity: [0, 1, 1, 1],
        x: [26, 24, -10, 0],
        y: [64, 60, -12, 0],
        rotateX: [-22, -20, -5, 0],
        scale: [0.86, 0.82, 1.05, 1],
        transition: { duration: 0.82, times: [0, 0.12, 0.68, 1], ease: ['easeIn', 'easeOut', 'easeOut'] },
      })
      if (cancelled) return

      // Stamp drops with a real bounce — falls past its resting spot,
      // then springs back, like it actually thumped down.
      await stamp.start({
        opacity: [0, 1, 1],
        y: [-90, 8, 0],
        rotate: [-55, -12, -16],
        transition: { duration: 0.4, times: [0, 0.75, 1], ease: ['easeIn', 'backOut'] },
      })
      if (cancelled) return

      card.start({ y: [0, 5, -1, 0], transition: { duration: 0.28, ease: 'easeOut' } })
      dot.start({
        scale: [0.7, 1.35, 0.95, 1],
        backgroundColor: 'var(--teal)',
        borderColor: 'var(--teal)',
        transition: { duration: 0.45, ease: 'easeOut' },
      })
      glow.start({
        opacity: [0, 0.85, 0],
        scale: [0.4, 2.2, 2.6],
        transition: { duration: 0.55, ease: 'easeOut' },
      })
      await new Promise(r => setTimeout(r, 260))
      if (cancelled) return
      badge.start({ opacity: 1, y: 0, scale: 1, transition: { duration: 0.35, ease: [0.16, 1, 0.3, 1] } })
    }

    sequence()
    return () => { cancelled = true }
  }, [inView, reduce])

  return (
    <div className="sbh" ref={sectionRef}>
      <motion.p
        className="sbh-headline"
        initial={reduce ? false : { opacity: 0, y: 16 }}
        animate={headline}
      >
        One tap. Right into their Wallet.
      </motion.p>

      <div className="sbh-stage">
        <motion.div
          className="sbh-card"
          initial={reduce ? false : { opacity: 0, x: 26, y: 64, rotateX: -22, scale: 0.86 }}
          animate={card}
        >
          <div className="sbh-card-shine" />
          <div className="sbh-card-top">
            <span className="sbh-card-brand"><Wallet size={15} /> Fass.Systems</span>
            <span className="sbh-card-pill">REGULARS</span>
          </div>

          <div className="sbh-card-mid">
            <div className="sbh-card-name">Corner Coffee Co.</div>
            <div className="sbh-card-sub">Loyalty Card</div>
          </div>

          <div className="sbh-dots">
            {Array.from({ length: DOT_COUNT }).map((_, i) => {
              if (i === STAMPED_INDEX) {
                return (
                  <span key={i} className="sbh-dot-wrap">
                    <motion.span className="sbh-glow" initial={{ opacity: 0, scale: 0.4 }} animate={glow} />
                    <motion.span
                      className="sbh-dot"
                      initial={{ scale: 1, backgroundColor: 'transparent', borderColor: 'rgba(255,255,255,0.5)' }}
                      animate={dot}
                    />
                  </span>
                )
              }
              return (
                <span
                  key={i}
                  className={`sbh-dot ${i < FILLED_BEFORE ? 'is-filled' : ''}`}
                />
              )
            })}
          </div>

          <div className="sbh-card-bottom">
            <span>Tap to redeem</span>
            <svg className="sbh-barcode" width="46" height="18" viewBox="0 0 46 18" aria-hidden="true">
              {[2, 5, 7, 11, 13, 16, 20, 23, 27, 30, 33, 37, 40, 43].map((x, i) => (
                <rect key={i} x={x} y="0" width={i % 3 === 0 ? 2 : 1} height="18" fill="rgba(255,255,255,0.55)" />
              ))}
            </svg>
          </div>
        </motion.div>

        <motion.div
          className="sbh-stamp"
          initial={reduce ? false : { opacity: 0, y: -80, rotate: -50 }}
          animate={stamp}
        >
          <Stamp size={26} />
        </motion.div>

        <motion.div
          className="sbh-badge"
          initial={reduce ? false : { opacity: 0, y: 10, scale: 0.9 }}
          animate={badge}
        >
          <Check size={13} /> Added to Wallet
        </motion.div>
      </div>
    </div>
  )
}
