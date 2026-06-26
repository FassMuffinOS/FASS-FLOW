import { useState, useEffect, useCallback } from 'react'
import { useParams } from 'react-router-dom'
import { Ticket, Loader, CheckCircle2, AlertTriangle, Stamp } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import './RedeemScan.css'

const API_BASE = import.meta.env.VITE_API_URL || ''

// Staff redemption confirm page — the landing target after staff scan a
// customer's EXISTING Wallet pass QR code with their phone's normal camera
// app (that QR already encodes https://flow.fass.systems/rewards/:slug, the
// same one Rewards.jsx and the pass barcode already use). No in-app QR
// scanner was built; this page does the rest: look up whatever offer is
// currently live on that card, and let staff confirm the redemption.
// Protected by the business's existing Supabase login (see App.jsx route).
export default function RedeemScan() {
  const { slug } = useParams()
  const { session } = useAuth()
  const [card, setCard] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [redeeming, setRedeeming] = useState(false)
  const [redeemed, setRedeemed] = useState(false)

  const load = useCallback(async () => {
    if (!session?.user || !slug || !API_BASE) { setLoading(false); return }
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`${API_BASE}/api/v1/campaigns/lookup?slug=${encodeURIComponent(slug)}&business_user_id=${session.user.id}`)
      if (!res.ok) {
        const data = await res.json().catch(() => null)
        setError(data?.detail || 'Could not look up that card.')
        setCard(null)
        return
      }
      setCard(await res.json())
    } catch {
      setError('Something went wrong looking up that card.')
    } finally {
      setLoading(false)
    }
  }, [session, slug])

  useEffect(() => { load() }, [load])

  async function confirmRedeem() {
    if (!session?.user || !slug) return
    setRedeeming(true)
    try {
      const res = await fetch(`${API_BASE}/api/v1/campaigns/redeem`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug, business_user_id: session.user.id }),
      })
      if (res.ok) {
        setRedeemed(true)
      } else {
        const data = await res.json().catch(() => null)
        setError(data?.detail || 'Could not redeem this offer.')
      }
    } finally {
      setRedeeming(false)
    }
  }

  if (loading) return <div className="rs-state"><Loader className="rs-spin" size={18} /> Looking up card…</div>

  if (error) {
    return (
      <div className="rs-state rs-state-error">
        <AlertTriangle size={20} />
        <p>{error}</p>
      </div>
    )
  }

  if (!card) return <div className="rs-state">No card found for that link.</div>

  return (
    <div className="rs">
      <div className="rs-wrap">
        <div className="rs-badge"><Stamp size={14} /> {card.customer_name || 'Customer'}'s card</div>

        {!card.offer_message ? (
          <>
            <h1 className="rs-title">No active offer</h1>
            <p className="rs-sub">This card has {card.stamps} stamp{card.stamps === 1 ? '' : 's'} but no live Wallet Messaging offer to redeem right now.</p>
          </>
        ) : redeemed ? (
          <>
            <CheckCircle2 size={40} className="rs-success-icon" />
            <h1 className="rs-title">Redeemed</h1>
            <p className="rs-sub">"{card.offer_message}" has been marked redeemed for this customer.</p>
          </>
        ) : (
          <>
            <Ticket size={28} className="rs-offer-icon" />
            <h1 className="rs-title">{card.offer_message}</h1>
            {card.offer_detail && <p className="rs-sub">{card.offer_detail}</p>}
            <button type="button" className="btn-primary rs-btn" onClick={confirmRedeem} disabled={redeeming}>
              {redeeming ? 'Redeeming…' : 'Confirm Redeem'}
            </button>
          </>
        )}

        <p className="rs-foot rs-foot-brand">Powered by FASS Wallet</p>
      </div>
    </div>
  )
}
