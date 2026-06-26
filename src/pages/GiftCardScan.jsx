import { useState, useEffect, useCallback } from 'react'
import { useParams } from 'react-router-dom'
import { Gift, Loader, CheckCircle2, AlertTriangle, DollarSign } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import './GiftCardScan.css'

const API_BASE = import.meta.env.VITE_API_URL || ''

// Staff redemption confirm page for Gift Cards — the landing target after
// staff scan a customer's gift card QR with their phone's normal camera app
// (that QR already encodes https://flow.fass.systems/giftcards/scan/:slug,
// the same one used in the pass barcode). Unlike RedeemScan.jsx's one-click
// confirm, a gift card balance can be partially applied, so this page asks
// staff how much of the balance to redeem before confirming.
// Protected by the business's existing Supabase login (see App.jsx route).
export default function GiftCardScan() {
  const { slug } = useParams()
  const { session } = useAuth()
  const [card, setCard] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [amount, setAmount] = useState('')
  const [redeeming, setRedeeming] = useState(false)
  const [result, setResult] = useState(null)

  const load = useCallback(async () => {
    if (!session?.user || !slug || !API_BASE) { setLoading(false); return }
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`${API_BASE}/api/v1/giftcards/lookup?slug=${encodeURIComponent(slug)}&business_user_id=${session.user.id}`)
      if (!res.ok) {
        const data = await res.json().catch(() => null)
        setError(data?.detail || 'Could not look up that gift card.')
        setCard(null)
        return
      }
      const data = await res.json()
      setCard(data)
      setAmount(data.balance > 0 ? String(data.balance) : '')
    } catch {
      setError('Something went wrong looking up that card.')
    } finally {
      setLoading(false)
    }
  }, [session, slug])

  useEffect(() => { load() }, [load])

  async function confirmRedeem() {
    if (!session?.user || !slug || !amount || Number(amount) <= 0) return
    setRedeeming(true)
    try {
      const res = await fetch(`${API_BASE}/api/v1/giftcards/redeem`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug, business_user_id: session.user.id, amount: Number(amount) }),
      })
      if (res.ok) {
        const data = await res.json()
        setResult(data)
      } else {
        const data = await res.json().catch(() => null)
        setError(data?.detail || 'Could not redeem this gift card.')
      }
    } finally {
      setRedeeming(false)
    }
  }

  if (loading) return <div className="gcs-state"><Loader className="gcs-spin" size={18} /> Looking up card…</div>

  if (error) {
    return (
      <div className="gcs-state gcs-state-error">
        <AlertTriangle size={20} />
        <p>{error}</p>
      </div>
    )
  }

  if (!card) return <div className="gcs-state">No gift card found for that link.</div>

  return (
    <div className="gcs">
      <div className="gcs-wrap">
        <div className="gcs-badge"><Gift size={14} /> {card.customer_name || 'Customer'}'s gift card</div>

        {result ? (
          <>
            <CheckCircle2 size={40} className="gcs-success-icon" />
            <h1 className="gcs-title">${result.amount.toFixed(2)} redeemed</h1>
            <p className="gcs-sub">
              {result.balance > 0
                ? `Remaining balance: $${result.balance.toFixed(2)}`
                : 'Balance fully redeemed.'}
            </p>
          </>
        ) : !card.active || card.balance <= 0 ? (
          <>
            <h1 className="gcs-title">No balance remaining</h1>
            <p className="gcs-sub">This gift card has already been fully redeemed.</p>
          </>
        ) : (
          <>
            <h1 className="gcs-title">${Number(card.balance).toFixed(2)} balance</h1>
            <p className="gcs-sub">Original value ${Number(card.original_value).toFixed(2)}. Enter how much of this balance to apply to the purchase.</p>
            <label className="gcs-amount-field">
              <DollarSign size={14} />
              <input
                type="number"
                min={0.01}
                max={card.balance}
                step="0.01"
                value={amount}
                onChange={e => setAmount(e.target.value)}
              />
            </label>
            <button
              type="button"
              className="btn-primary gcs-btn"
              onClick={confirmRedeem}
              disabled={redeeming || !amount || Number(amount) <= 0 || Number(amount) > card.balance}
            >
              {redeeming ? 'Redeeming…' : `Confirm $${amount ? Number(amount).toFixed(2) : '0.00'} Redeem`}
            </button>
          </>
        )}

        <p className="gcs-foot gcs-foot-brand">Powered by FASS Wallet</p>
      </div>
    </div>
  )
}
