import { useEffect, useState } from 'react'
import {
  Sparkles, Radar, BookOpen, GraduationCap, Wallet, CreditCard, Lock, ArrowRight, Zap, Check,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { listCreditPacks, startCreditCheckout } from '../lib/credits'
import { startIntelReportCheckout } from '../lib/intelligenceClient'
import Reveal from '../components/Reveal'
import useSeo from '../hooks/useSeo'
import './Store.css'

// One place every purchasable thing on FASS Flow shows up — previously
// scattered (credit packs buried in Settings > Billing, WARDOG Intel only
// surfaced inside a specific Opportunity Workspace, the ebook/Masterclass
// only linked from Support, Regulars not linked anywhere at all). This page
// doesn't replace any of those — it's the discoverability + sell layer on
// top, so it leans on real benefit copy and motion instead of a bare list.
export default function Store() {
  useSeo({
    title: 'Store — FASS Flow',
    description: 'AI credit packs, WARDOG Intel reports, the govcon ebook, Masterclass, and more — everything you can buy on FASS Flow in one place.',
    path: '/store',
  })

  const { session } = useAuth()
  const userId = session?.user?.id
  const email = session?.user?.email

  const [packs, setPacks] = useState([])
  const [packsLoading, setPacksLoading] = useState(true)
  const [buyingPack, setBuyingPack] = useState(null)
  const [buyingIntel, setBuyingIntel] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    setPacksLoading(true)
    listCreditPacks()
      .then(p => { if (!cancelled) setPacks(p) })
      .finally(() => { if (!cancelled) setPacksLoading(false) })
    return () => { cancelled = true }
  }, [])

  async function buyPack(priceId) {
    if (!userId) { window.location.href = '/signin'; return }
    setBuyingPack(priceId)
    setError('')
    try {
      const url = await startCreditCheckout(priceId, userId, email)
      if (url) { window.location.href = url; return }
      setError('Could not start checkout. Try again in a moment.')
    } catch {
      setError('Could not start checkout. Try again in a moment.')
    } finally {
      setBuyingPack(null)
    }
  }

  async function buyIntelReport() {
    if (!userId) { window.location.href = '/signin'; return }
    setBuyingIntel(true)
    setError('')
    try {
      const data = await startIntelReportCheckout(userId, email)
      if (data?.url) { window.location.href = data.url; return }
      setError('Could not start checkout. Try again in a moment.')
    } catch (e) {
      setError(e.message || 'Could not start checkout.')
    } finally {
      setBuyingIntel(false)
    }
  }

  return (
    <div className="store">
      {/* ── Hero ── */}
      <section className="store-hero">
        <div className="store-hero-glow" aria-hidden="true" />
        <div className="store-hero-grid" aria-hidden="true" />
        <div className="container store-hero-inner">
          <Reveal as="span" className="store-eyebrow reveal-fade">
            <Zap size={12} /> The Store
          </Reveal>
          <Reveal as="h1" className="store-title" delay={60}>
            Everything that gets you<br />closer to the next contract
          </Reveal>
          <Reveal as="p" className="store-hero-sub" delay={120}>
            No subscription required for most of this. Pay once, get exactly what you need, right now.
          </Reveal>
        </div>
      </section>

      <div className="container">
        {error && <p className="store-error">{error}</p>}

        {/* Subscriptions */}
        <Reveal as="section" className="store-section reveal-fade">
          <div className="store-section-head">
            <span className="store-icon-badge store-badge-navy"><Wallet size={18} /></span>
            <div>
              <h2>Subscription plans</h2>
              <p>Core, Pro, Team, and Enterprise — monthly or annual, save 17% upfront.</p>
            </div>
          </div>
          <a href="/pricing" className="store-wide-card">
            <div>
              <div className="store-wide-title">See plans &amp; pricing</div>
              <div className="store-wide-desc">Start free. Every paid plan includes a 14-day trial — cancel anytime.</div>
            </div>
            <ArrowRight size={20} className="store-wide-arrow" />
          </a>
        </Reveal>

        {/* AI Credit Packs */}
        <Reveal as="section" className="store-section reveal-fade">
          <div className="store-section-head">
            <span className="store-icon-badge store-badge-teal"><Sparkles size={18} /></span>
            <div>
              <h2>AI credit packs</h2>
              <p>Out of drafting credits the night before a deadline? Top up in 30 seconds — no waiting on a renewal.</p>
            </div>
          </div>
          {!userId && (
            <a href="/signin" className="store-signin-cta"><Lock size={13} /> Sign in to buy credits</a>
          )}
          {packsLoading ? (
            <div className="store-pack-grid">
              {[0, 1, 2, 3].map(i => <div key={i} className="store-pack-skeleton" />)}
            </div>
          ) : packs.length > 0 ? (
            <div className="store-pack-grid">
              {packs.map((p, i) => (
                <button
                  key={p.price_id}
                  type="button"
                  className="store-pack-card"
                  style={{ transitionDelay: `${i * 30}ms` }}
                  disabled={buyingPack === p.price_id}
                  onClick={() => buyPack(p.price_id)}
                >
                  <span className="store-pack-price">{p.amount_display}</span>
                  <span className="store-pack-credits">{p.credits} credits</span>
                  {buyingPack === p.price_id && <span className="store-pack-loading">Starting…</span>}
                </button>
              ))}
            </div>
          ) : (
            <p className="store-empty">Credit packs aren't available right now — check back shortly.</p>
          )}
        </Reveal>

        {/* WARDOG Intel */}
        <Reveal as="section" className="store-section reveal-fade">
          <div className="store-section-head">
            <span className="store-icon-badge store-badge-amber"><Radar size={18} className="store-radar-spin" /></span>
            <div>
              <h2>WARDOG Intel — à la carte</h2>
              <p>You just found a $2M recompete. Before you spend 40 hours on a proposal, find out in 5 minutes if the incumbent's held it for 8 years unchallenged.</p>
            </div>
          </div>
          <div className="store-feature-card">
            <div className="store-feature-list">
              {['Who holds it now, and what they were paid', 'Every other vendor who has bid it', 'AI re-compete odds + a likely price band', 'One concrete entry-strategy recommendation'].map(f => (
                <div key={f} className="store-feature-item"><Check size={14} /> {f}</div>
              ))}
            </div>
            <div className="store-feature-cta">
              <div className="store-feature-price">$39<span>/report</span></div>
              {userId ? (
                <button type="button" className="btn-primary store-feature-btn" disabled={buyingIntel} onClick={buyIntelReport}>
                  {buyingIntel ? 'Starting…' : 'Buy a report'}
                </button>
              ) : (
                <a href="/signin" className="btn-outline store-feature-btn"><Lock size={13} /> Sign in to buy</a>
              )}
              <span className="store-feature-note">No Enterprise plan required</span>
            </div>
          </div>
        </Reveal>

        {/* Ebook + Masterclass */}
        <Reveal as="section" className="store-section reveal-fade">
          <div className="store-section-head">
            <span className="store-icon-badge store-badge-navy"><GraduationCap size={18} /></span>
            <div>
              <h2>Learn government contracting</h2>
              <p>Go from "what's a NAICS code" to your first bid — live cohort or entirely self-paced.</p>
            </div>
          </div>
          <div className="store-plain-grid">
            <div className="store-plain-card">
              <span className="store-plain-badge">Instant download</span>
              <BookOpen size={22} className="store-plain-icon" />
              <div className="store-plain-title">Self-paced ebook — $9</div>
              <div className="store-plain-desc">Same content as the Masterclass, in book form. Learn the language of federal contracting in a weekend, on your own schedule.</div>
              <a
                href="https://buy.stripe.com/3cI3co4Rc6c69UIco3fnO0e"
                target="_blank"
                rel="noreferrer"
                className="btn-outline store-plain-cta"
              >
                Buy the ebook — $9
              </a>
            </div>
            <div className="store-plain-card">
              <span className="store-plain-badge">10 missions</span>
              <GraduationCap size={22} className="store-plain-icon" />
              <div className="store-plain-title">Masterclass</div>
              <div className="store-plain-desc">10 missions, real worksheets, and a certificate at the end — structured, with progress tracking the whole way through.</div>
              <a href="/masterclass" className="btn-outline store-plain-cta">See Masterclass</a>
            </div>
          </div>
        </Reveal>

        {/* Regulars */}
        <Reveal as="section" className="store-section reveal-fade">
          <a href="/regulars" className="store-regulars-card">
            <div className="store-regulars-glow" aria-hidden="true" />
            <span className="store-icon-badge store-badge-light"><CreditCard size={18} /></span>
            <div className="store-regulars-body">
              <div className="store-regulars-eyebrow">Not bidding on federal contracts?</div>
              <div className="store-regulars-title">Try Regulars — from $39/mo</div>
              <div className="store-regulars-desc">Apple Wallet loyalty passes, punch cards, gift cards, and SMS campaigns for local businesses. No app download required.</div>
            </div>
            <ArrowRight size={20} className="store-wide-arrow" />
          </a>
        </Reveal>
      </div>
    </div>
  )
}
