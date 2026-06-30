import { useEffect, useState } from 'react'
import {
  Sparkles, Radar, BookOpen, GraduationCap, Wallet, CreditCard, Lock, ArrowRight, Check,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { listCreditPacks, startCreditCheckout } from '../lib/credits'
import { startIntelReportCheckout } from '../lib/intelligenceClient'
import useSeo from '../hooks/useSeo'
import './Store.css'

// One place every purchasable thing on FASS Flow shows up — previously
// scattered (credit packs buried in Settings > Billing, WARDOG Intel only
// surfaced inside a specific Opportunity Workspace, the ebook/Masterclass
// only linked from Support, Regulars not linked anywhere at all). This page
// doesn't replace any of those — it's the discoverability layer on top.
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
  const [buyingPack, setBuyingPack] = useState(null)
  const [buyingIntel, setBuyingIntel] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    listCreditPacks().then(p => { if (!cancelled) setPacks(p) })
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
      <div className="container">
        <header className="store-header">
          <span className="store-eyebrow">Store</span>
          <h1 className="store-title">Everything you can buy on FASS Flow</h1>
          <p className="store-sub">
            Subscriptions, one-time tools, and self-paced learning — no digging through Settings required.
          </p>
        </header>

        {error && <p className="store-error">{error}</p>}

        {/* Subscriptions */}
        <section className="store-section">
          <div className="store-section-head">
            <h2><Wallet size={18} /> Subscription plans</h2>
            <p>Core, Pro, Team, and Enterprise — monthly or annual (save 17%).</p>
          </div>
          <a href="/pricing" className="store-wide-card">
            <div>
              <div className="store-wide-title">See plans &amp; pricing</div>
              <div className="store-wide-desc">Start free, 14-day trial on every paid plan.</div>
            </div>
            <ArrowRight size={18} />
          </a>
        </section>

        {/* AI Credit Packs */}
        <section className="store-section">
          <div className="store-section-head">
            <h2><Sparkles size={18} /> AI credit packs</h2>
            <p>Top up AI drafting/synthesis credits anytime — $5 to $1,000.</p>
          </div>
          {!userId && (
            <a href="/signin" className="store-signin-cta"><Lock size={13} /> Sign in to buy credits</a>
          )}
          {packs.length > 0 ? (
            <div className="store-pack-grid">
              {packs.map(p => (
                <button
                  key={p.price_id}
                  type="button"
                  className="store-pack-card"
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
            <p className="store-empty">Loading packs…</p>
          )}
        </section>

        {/* WARDOG Intel */}
        <section className="store-section">
          <div className="store-section-head">
            <h2><Radar size={18} /> WARDOG Intel — à la carte</h2>
            <p>Incumbent &amp; award-history intelligence for one opportunity, plus an AI re-compete forecast. No Enterprise plan required.</p>
          </div>
          <div className="store-wide-card store-wide-card-action">
            <div>
              <div className="store-wide-title">$39 — one report</div>
              <div className="store-wide-desc">Who holds it, what they were paid, who else bids it, and a likely entry strategy.</div>
            </div>
            {userId ? (
              <button type="button" className="btn-primary" disabled={buyingIntel} onClick={buyIntelReport}>
                {buyingIntel ? 'Starting…' : 'Buy a report'}
              </button>
            ) : (
              <a href="/signin" className="btn-outline"><Lock size={13} /> Sign in to buy</a>
            )}
          </div>
        </section>

        {/* Ebook + Masterclass */}
        <section className="store-section">
          <div className="store-section-head">
            <h2><GraduationCap size={18} /> Learn government contracting</h2>
            <p>The full 10-mission curriculum — live cohort or self-paced.</p>
          </div>
          <div className="store-plain-grid">
            <div className="store-plain-card">
              <BookOpen size={20} className="store-plain-icon" />
              <div className="store-plain-title">Self-paced ebook — $9</div>
              <div className="store-plain-desc">Same content as the Masterclass, in book form, delivered instantly.</div>
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
              <GraduationCap size={20} className="store-plain-icon" />
              <div className="store-plain-title">Masterclass</div>
              <div className="store-plain-desc">10 missions, worksheets, and a certificate — work through it at your own pace.</div>
              <a href="/masterclass" className="btn-outline store-plain-cta">See Masterclass</a>
            </div>
          </div>
        </section>

        {/* Regulars */}
        <section className="store-section">
          <div className="store-section-head">
            <h2><CreditCard size={18} /> Run a local business instead?</h2>
            <p>Wallet loyalty passes, gift cards, and campaigns — for businesses that aren't bidding on federal contracts.</p>
          </div>
          <a href="/regulars" className="store-wide-card store-wide-card-regulars">
            <div>
              <div className="store-wide-title">Regulars — from $39/mo</div>
              <div className="store-wide-desc">Apple Wallet loyalty passes, punch cards, gift cards, and SMS campaigns. No app download.</div>
            </div>
            <ArrowRight size={18} />
          </a>
        </section>
      </div>
    </div>
  )
}
