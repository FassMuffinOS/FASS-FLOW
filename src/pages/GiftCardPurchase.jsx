import { useState, useEffect, useCallback, useRef } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import { Gift, Loader, Mail, CheckCircle2, AlertTriangle, Download } from 'lucide-react'
import './GiftCardPurchase.css'

const API_BASE = import.meta.env.VITE_API_URL || ''
const PRESETS = [10, 25, 50, 100]

// Public, no-login storefront — the link a business shares so a customer
// can buy a gift card for themselves or someone else without the business
// having to issue it by hand from the dashboard. Pays via Stripe Checkout
// (gift_cards.py's /purchase/checkout), then this same page handles the
// success redirect by polling /purchase/status until the webhook has
// actually created the card, same "poll after redirect" idea as Wallet's
// paywalled unlock flow.
export default function GiftCardPurchase() {
  const { businessUserId } = useParams()
  const [searchParams] = useSearchParams()
  const successSlug = searchParams.get('slug')
  const isSuccess = searchParams.get('success') === '1' && successSlug
  const isCancelled = searchParams.get('cancelled') === '1'

  const [businessName, setBusinessName] = useState('')
  const [loadingBusiness, setLoadingBusiness] = useState(true)

  const [amount, setAmount] = useState(25)
  const [customAmount, setCustomAmount] = useState('')
  const [email, setEmail] = useState('')
  const [name, setName] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)

  const [cardReady, setCardReady] = useState(null)
  const [pollFailed, setPollFailed] = useState(false)
  const pollsRef = useRef(0)

  useEffect(() => {
    if (!businessUserId || !API_BASE) { setLoadingBusiness(false); return }
    let cancelled = false
    fetch(`${API_BASE}/api/v1/giftcards/business?business_user_id=${businessUserId}`)
      .then(res => res.ok ? res.json() : null)
      .then(data => { if (!cancelled && data) setBusinessName(data.business_name) })
      .finally(() => { if (!cancelled) setLoadingBusiness(false) })
    return () => { cancelled = true }
  }, [businessUserId])

  const pollStatus = useCallback(async () => {
    if (!successSlug || !API_BASE) return
    try {
      const res = await fetch(`${API_BASE}/api/v1/giftcards/purchase/status?slug=${successSlug}`)
      if (res.ok) {
        const data = await res.json()
        if (data.found) { setCardReady(data); return }
      }
    } catch { /* keep polling */ }
    pollsRef.current += 1
    if (pollsRef.current >= 12) { setPollFailed(true); return }
    setTimeout(pollStatus, 1500)
  }, [successSlug])

  useEffect(() => {
    if (isSuccess) pollStatus()
  }, [isSuccess, pollStatus])

  const selectedAmount = customAmount ? Number(customAmount) : amount

  async function startCheckout(e) {
    e.preventDefault()
    if (!email.trim() || !selectedAmount || selectedAmount < 1 || !API_BASE) return
    setSubmitting(true)
    setError(null)
    try {
      const res = await fetch(`${API_BASE}/api/v1/giftcards/purchase/checkout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          business_user_id: businessUserId,
          value: selectedAmount,
          customer_email: email.trim(),
          customer_name: name.trim() || null,
        }),
      })
      if (res.ok) {
        const data = await res.json()
        window.location.href = data.url
      } else {
        const data = await res.json().catch(() => null)
        setError(data?.detail || 'Could not start checkout — try again.')
        setSubmitting(false)
      }
    } catch {
      setError('Something went wrong starting checkout.')
      setSubmitting(false)
    }
  }

  if (isSuccess) {
    return (
      <div className="gcp">
        <div className="gcp-wrap">
          <div className="gcp-badge"><Gift size={14} /> Gift card purchase</div>
          {cardReady ? (
            <>
              <CheckCircle2 size={40} className="gcp-success-icon" />
              <h1 className="gcp-title">${Number(cardReady.original_value).toFixed(2)} gift card is ready</h1>
              <p className="gcp-sub">Add it to Apple Wallet now — show it in-store any time to redeem the balance.</p>
              <a className="btn-primary gcp-btn" href={`${API_BASE}/api/v1/giftcards/pass?slug=${cardReady.slug}`}>
                <Download size={16} /> Add to Apple Wallet
              </a>
            </>
          ) : pollFailed ? (
            <>
              <AlertTriangle size={28} className="gcp-warn-icon" />
              <h1 className="gcp-title">Still confirming payment</h1>
              <p className="gcp-sub">This is taking longer than expected — refresh this page in a minute, your card will be here once payment finishes processing.</p>
            </>
          ) : (
            <>
              <Loader className="gcp-spin" size={28} />
              <h1 className="gcp-title">Confirming your payment…</h1>
              <p className="gcp-sub">This only takes a few seconds.</p>
            </>
          )}
          <p className="gcp-foot gcp-foot-brand">Powered by FASS Wallet</p>
        </div>
      </div>
    )
  }

  return (
    <div className="gcp">
      <div className="gcp-wrap">
        <div className="gcp-badge"><Gift size={14} /> Gift card</div>
        <h1 className="gcp-title">
          {loadingBusiness ? 'Loading…' : `Buy a gift card for ${businessName || 'this business'}`}
        </h1>
        <p className="gcp-sub">Pick an amount — it lands straight in Apple Wallet, ready to use in-store.</p>

        {isCancelled && <p className="gcp-note gcp-note-warn">Checkout was cancelled — no charge was made. Pick an amount below to try again.</p>}

        <form className="gcp-form" onSubmit={startCheckout}>
          <div className="gcp-presets">
            {PRESETS.map(p => (
              <button
                type="button"
                key={p}
                className={`gcp-preset ${!customAmount && amount === p ? 'gcp-preset-active' : ''}`}
                onClick={() => { setAmount(p); setCustomAmount('') }}
              >
                ${p}
              </button>
            ))}
          </div>
          <label className="gcp-field">
            <span className="gcp-label">Or enter a custom amount</span>
            <input
              type="number"
              min={1}
              step="0.01"
              value={customAmount}
              onChange={e => setCustomAmount(e.target.value)}
              placeholder="Custom $ amount"
            />
          </label>
          <label className="gcp-field">
            <span className="gcp-label"><Mail size={13} /> Your email (for the receipt + card link)</span>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@email.com" required />
          </label>
          <label className="gcp-field">
            <span className="gcp-label">Name on the card (optional)</span>
            <input value={name} onChange={e => setName(e.target.value)} placeholder="Jordan Lee" />
          </label>

          <button type="submit" className="btn-primary gcp-btn" disabled={submitting || !email.trim() || !selectedAmount || selectedAmount < 1}>
            {submitting ? 'Starting checkout…' : `Pay $${selectedAmount ? Number(selectedAmount).toFixed(2) : '0.00'}`}
          </button>
          {error && <p className="gcp-note gcp-note-error">{error}</p>}
        </form>

        <p className="gcp-foot gcp-foot-brand">Powered by FASS Wallet</p>
      </div>
    </div>
  )
}
