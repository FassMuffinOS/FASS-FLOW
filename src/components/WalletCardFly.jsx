import { forwardRef, useImperativeHandle, useRef, useState, useEffect } from 'react'
import { gsap } from 'gsap'
import { Wallet as WalletIcon, Check, Stamp } from 'lucide-react'
import './WalletCardFly.css'

const SPARK_COUNT = 8

// Reusable "flip and fly into Wallet" animation for a loyalty stamp card.
// Two jobs, one component:
//   1. RewardsJoin.jsx (real product) — the customer's actual card flips
//      and flies into a wallet target when they tap "Add to Apple Wallet",
//      THEN the real .pkpass download fires (via onComplete), so the
//      animation never blocks or fakes the real Wallet handoff.
//   2. RegularsSignup.jsx (marketing) — same component in autoPlay+loop
//      mode with placeholder data, selling the feature to a business owner
//      who will never see this exact moment themselves.
//
// Landing gets a deliberate flourish — elastic bounce on the wallet icon,
// a shockwave ring, and a radiating spark burst — because this is the one
// "wow" moment the whole feature hinges on selling; a quick fade would
// undersell it.
//
// Exposes an imperative `play()` so callers can time the real navigation
// to the animation's completion instead of guessing a delay. Respects
// prefers-reduced-motion by skipping the transform choreography entirely.
const WalletCardFly = forwardRef(function WalletCardFly(
  {
    businessName = 'Your Business',
    stamps = 4,
    stampGoal = 8,
    accentColor = '#1D9E75',
    autoPlay = false,
    loop = false,
    onComplete,
  },
  ref
) {
  const stageRef = useRef(null)
  const cardRef = useRef(null)
  const walletRef = useRef(null)
  const ringRef = useRef(null)
  const sparkRefs = useRef([])
  const [landed, setLanded] = useState(false)

  function play() {
    const card = cardRef.current
    const wallet = walletRef.current
    if (!card || !wallet) return

    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    setLanded(false)
    gsap.killTweensOf([card, wallet, ringRef.current, ...sparkRefs.current])

    if (reduced) {
      gsap.set(card, { clearProps: 'transform,opacity' })
      const t = setTimeout(() => { setLanded(true); onComplete?.() }, 250)
      return () => clearTimeout(t)
    }

    const cardBox = card.getBoundingClientRect()
    const walletBox = wallet.getBoundingClientRect()
    const dx = (walletBox.left + walletBox.width / 2) - (cardBox.left + cardBox.width / 2)
    const dy = (walletBox.top + walletBox.height / 2) - (cardBox.top + cardBox.height / 2)

    gsap.set(card, { x: 0, y: 0, scale: 1, opacity: 1, rotateY: 0, rotateZ: 0 })
    gsap.set(wallet, { scale: 1, rotate: 0 })
    if (ringRef.current) gsap.set(ringRef.current, { scale: 0.5, opacity: 0 })
    if (sparkRefs.current.length) gsap.set(sparkRefs.current, { x: 0, y: 0, xPercent: -50, yPercent: -50, opacity: 0, scale: 1 })

    // Wind-up, full 3D flip, then a slower, weightier flight into the
    // wallet target — eased into with anticipation (back.in) so it reads
    // as deliberate rather than rushed.
    const tl = gsap.timeline({
      onComplete: () => {
        setLanded(true)

        const flare = gsap.timeline()
        flare
          .fromTo(wallet, { scale: 1, rotate: 0 }, { scale: 1.55, rotate: -10, duration: 0.24, ease: 'back.out(2.6)' })
          .to(wallet, { scale: 1, rotate: 0, duration: 0.55, ease: 'elastic.out(1, 0.4)' })
        if (ringRef.current) {
          flare.fromTo(ringRef.current, { scale: 0.5, opacity: 0.6 }, { scale: 2.6, opacity: 0, duration: 0.65, ease: 'power2.out' }, '<')
        }
        if (sparkRefs.current.length) {
          flare.to(sparkRefs.current, {
            x: (i) => Math.cos((i / SPARK_COUNT) * Math.PI * 2) * 44,
            y: (i) => Math.sin((i / SPARK_COUNT) * Math.PI * 2) * 44,
            opacity: 0,
            scale: 0.35,
            duration: 0.6,
            ease: 'power2.out',
            stagger: 0.015,
          }, '<')
          flare.set(sparkRefs.current, { opacity: 1 }, '<')
        }

        onComplete?.()
      },
    })
    tl.to(card, { scale: 1.06, y: -8, duration: 0.24, ease: 'power2.out' })
      .to(card, { rotateY: 360, duration: 0.78, ease: 'power3.inOut' }, '<0.05')
      .to(card, { x: dx, y: dy - 6, scale: 0.16, opacity: 0.1, rotateZ: 12, duration: 0.66, ease: 'back.in(1.35)' }, '-=0.2')
  }

  useImperativeHandle(ref, () => ({ play }))

  useEffect(() => {
    if (!autoPlay) return undefined
    const start = setTimeout(play, 700)
    const interval = loop ? setInterval(play, 4800) : null
    return () => { clearTimeout(start); if (interval) clearInterval(interval) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoPlay, loop])

  return (
    <div className="wcf" ref={stageRef} style={{ '--wcf-accent': accentColor }}>
      <div className="wcf-stage">
        <div className="wcf-card" ref={cardRef}>
          <div className="wcf-card-top">
            <span className="wcf-card-name">{businessName}</span>
            <Stamp size={14} />
          </div>
          <div className="wcf-stamps">
            {Array.from({ length: Math.max(1, stampGoal) }).map((_, i) => (
              <span key={i} className={`wcf-dot ${i < stamps ? 'is-filled' : ''}`} />
            ))}
          </div>
          <div className="wcf-card-bottom">{stamps}/{stampGoal} stamps</div>
          <div className="wcf-shine" />
        </div>
      </div>
      <div className="wcf-wallet-wrap">
        <span className="wcf-ring" ref={ringRef} />
        {Array.from({ length: SPARK_COUNT }).map((_, i) => (
          <span key={i} className="wcf-spark" ref={el => { sparkRefs.current[i] = el }} />
        ))}
        <div className={`wcf-wallet ${landed ? 'is-landed' : ''}`} ref={walletRef}>
          {landed ? <Check size={16} /> : <WalletIcon size={16} />}
        </div>
      </div>
    </div>
  )
})

export default WalletCardFly
