import { useLayoutEffect, useRef } from 'react'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import heroWallet from '../assets/scroll-blast/hero-wallet.png'
import starBadge from '../assets/scroll-blast/star-badge.png'
import qrCoin from '../assets/scroll-blast/qr-coin.png'
import megaphone from '../assets/scroll-blast/megaphone.png'
import giftCard from '../assets/scroll-blast/gift-card.png'
import badgeCoin from '../assets/scroll-blast/badge-coin.png'
import './ScrollBlastHero.css'

gsap.registerPlugin(ScrollTrigger)

// Five icons converging on the hero wallet as the section scrolls past —
// each entry is where the icon STARTS (scattered off to a side), animating
// toward its natural centered position (x:0,y:0) as scroll progress runs
// 0 -> 1. Desktop offsets; scaled down for narrow viewports in the effect
// below so the scatter never runs off-canvas on mobile.
const ICONS = [
  { name: 'star-badge', img: starBadge, x: -260, y: -190, rotate: -35, size: 92 },
  { name: 'qr-coin', img: qrCoin, x: 280, y: -170, rotate: 40, size: 96 },
  { name: 'megaphone', img: megaphone, x: -310, y: 130, rotate: -22, size: 100 },
  { name: 'gift-card', img: giftCard, x: 300, y: 150, rotate: 26, size: 96 },
  { name: 'badge-coin', img: badgeCoin, x: 10, y: -280, rotate: 16, size: 84 },
]

// Scroll-driven "blast" hero — replaces the static single hero shot with a
// pinned section where five icon assets fly in from scattered positions and
// converge onto the wallet centerpiece as the visitor scrolls, capped with a
// particle-burst flash at the moment of impact. Scrubbed directly to scroll
// position (not a one-shot autoplay), so the effect tracks the user's own
// scroll speed and direction — scroll back up and it reverses cleanly.
export default function ScrollBlastHero() {
  const pinRef = useRef(null)
  const heroRef = useRef(null)
  const burstRef = useRef(null)
  const iconRefs = useRef([])
  const headlineRef = useRef(null)

  useLayoutEffect(() => {
    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    const narrow = window.innerWidth < 640
    const scale = narrow ? 0.55 : 1

    const ctx = gsap.context(() => {
      if (reduced) {
        // Static, fully-assembled state — no scroll-jacking for users who
        // asked for less motion.
        gsap.set(iconRefs.current, { xPercent: -50, yPercent: -50, x: 0, y: 0, rotate: 0, opacity: 1, scale: 1 })
        gsap.set(burstRef.current, { opacity: 0.35, scale: 1 })
        return
      }

      gsap.set(iconRefs.current, (i) => ({
        xPercent: -50,
        yPercent: -50,
        x: ICONS[i].x * scale,
        y: ICONS[i].y * scale,
        rotate: ICONS[i].rotate,
        opacity: 0,
        scale: 0.6,
      }))
      gsap.set(burstRef.current, { opacity: 0, scale: 0.7 })
      gsap.set(headlineRef.current, { opacity: 0, y: 16 })

      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: pinRef.current,
          start: 'top top',
          end: '+=120%',
          scrub: 0.6,
          pin: true,
          anticipatePin: 1,
        },
      })

      tl.to(headlineRef.current, { opacity: 1, y: 0, duration: 0.15 }, 0)
        .to(iconRefs.current, {
          x: 0,
          y: 0,
          rotate: 0,
          opacity: 1,
          scale: 1,
          duration: 0.55,
          stagger: 0.05,
          ease: 'power2.inOut',
        }, 0.1)
        .to(heroRef.current, { scale: 1.08, duration: 0.12, ease: 'power2.out' }, 0.62)
        .to(burstRef.current, { opacity: 1, scale: 1.25, duration: 0.18, ease: 'power2.out' }, 0.62)
        .to(heroRef.current, { scale: 1, duration: 0.15, ease: 'power2.inOut' }, 0.76)
        .to(burstRef.current, { opacity: 0, duration: 0.2, ease: 'power2.in' }, 0.78)
    }, pinRef)

    return () => ctx.revert()
  }, [])

  return (
    <div className="sbh" ref={pinRef}>
      <div className="sbh-stage">
        <p className="sbh-headline" ref={headlineRef}>One tap. Right into their Wallet.</p>
        <div className="sbh-center">
          <div className="sbh-burst" ref={burstRef} aria-hidden="true">
            <span className="sbh-burst-glow" />
            <span className="sbh-burst-rays" />
          </div>
          <img className="sbh-hero" ref={heroRef} src={heroWallet} alt="FASS Systems Regulars wallet pass" />
        </div>
        {ICONS.map((icon, i) => (
          <img
            key={icon.name}
            ref={el => { iconRefs.current[i] = el }}
            className={`sbh-icon sbh-icon-${icon.name}`}
            src={icon.img}
            alt=""
            aria-hidden="true"
            style={{ width: icon.size }}
          />
        ))}
      </div>
    </div>
  )
}
