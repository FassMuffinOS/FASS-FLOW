import { forwardRef, useImperativeHandle, useRef, useState, useEffect } from 'react'
import { gsap } from 'gsap'
import { Wallet as WalletIcon, Check, Stamp } from 'lucide-react'
import './WalletCardFly.css'

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
  const [landed, setLanded] = useState(false)

  function play() {
    const card = cardRef.current
    const wallet = walletRef.current
    if (!card || !wallet) return

    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    setLanded(false)
    gsap.killTweensOf([card, wallet])

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

    const tl = gsap.timeline({
      onComplete: () => {
        setLanded(true)
        gsap.fromTo(wallet, { scale: 1 }, { scale: 1.22, duration: 0.16, ease: 'back.out(3)', yoyo: true, repeat: 1 })
        onComplete?.()
      },
    })
    tl.to(card, { scale: 1.045, y: -6, duration: 0.16, ease: 'power2.out' })
      .to(card, { rotateY: 360, duration: 0.55, ease: 'power2.inOut' }, '<0.02')
      .to(card, { x: dx, y: dy - 4, scale: 0.16, opacity: 0.12, rotateZ: 10, duration: 0.48, ease: 'back.in(1.5)' }, '-=0.12')
  }

  useImperativeHandle(ref, () => ({ play }))

  useEffect(() => {
    if (!autoPlay) return undefined
    const start = setTimeout(play, 600)
    const interval = loop ? setInterval(play, 3600) : null
    return () => { clearTimeout(start); if (interval) clearInterval(interval) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoPlay, loop])

  return (
    <div className="wcf" ref={stageRef}>
      <div className="wcf-stage">
        <div className="wcf-card" ref={cardRef} style={{ '--wcf-accent': accentColor }}>
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
      <div className={`wcf-wallet ${landed ? 'is-landed' : ''}`} ref={walletRef}>
        {landed ? <Check size={16} /> : <WalletIcon size={16} />}
      </div>
    </div>
  )
})

export default WalletCardFly
