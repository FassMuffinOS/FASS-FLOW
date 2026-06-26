import { useState, useEffect, useCallback } from 'react'
import { Megaphone, Send, Loader, Users, Ticket, DollarSign, Repeat, CalendarClock } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import './WalletCampaigns.css'

const API_BASE = import.meta.env.VITE_API_URL || ''

// FASS Wallet Messaging — one-way broadcast offers/coupons pushed onto every
// customer's EXISTING Rewards stamp card (see Rewards.jsx). Writing and
// sending a campaign here uses the live push built for Rewards: every
// customer card gets silently re-fetched, and Apple Wallet's own
// "changeMessage" mechanism pops a notification banner showing the offer —
// no separate notification system, no re-download needed.
export default function WalletCampaigns() {
  const { session } = useAuth()
  const [campaigns, setCampaigns] = useState([])
  const [customerCount, setCustomerCount] = useState(0)
  const [loading, setLoading] = useState(true)

  const [message, setMessage] = useState('')
  const [detail, setDetail] = useState('')
  const [expiresAt, setExpiresAt] = useState('')
  const [repeatUse, setRepeatUse] = useState(false)
  const [estimatedValue, setEstimatedValue] = useState('')
  const [sending, setSending] = useState(false)
  const [sentNotice, setSentNotice] = useState(null)

  const load = useCallback(async () => {
    if (!session?.user || !API_BASE) { setLoading(false); return }
    try {
      const res = await fetch(`${API_BASE}/api/v1/campaigns/mine?user_id=${session.user.id}`)
      if (res.ok) {
        const data = await res.json()
        setCampaigns(data.campaigns || [])
        setCustomerCount(data.customer_count || 0)
      }
    } finally {
      setLoading(false)
    }
  }, [session])

  useEffect(() => { load() }, [load])

  async function sendCampaign(e) {
    e.preventDefault()
    if (!session?.user || !message.trim() || !API_BASE) return
    setSending(true)
    setSentNotice(null)
    try {
      const res = await fetch(`${API_BASE}/api/v1/campaigns`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          business_user_id: session.user.id,
          message: message.trim(),
          detail: detail.trim() || null,
          expires_at: expiresAt ? new Date(expiresAt).toISOString() : null,
          repeat_use: repeatUse,
          estimated_value: estimatedValue ? Number(estimatedValue) : null,
        }),
      })
      if (res.ok) {
        const data = await res.json()
        setSentNotice(`Sent to ${data.sent_count} customer card${data.sent_count === 1 ? '' : 's'}.`)
        setMessage('')
        setDetail('')
        setExpiresAt('')
        setRepeatUse(false)
        setEstimatedValue('')
        load()
      }
    } finally {
      setSending(false)
    }
  }

  if (loading) return <div className="wc"><Loader className="wc-spin" size={18} /> Loading…</div>

  return (
    <div className="wc">
      <div className="wc-container">
        <div className="wc-head">
          <Megaphone size={22} className="wc-head-icon" />
          <div>
            <h1>Wallet Messaging</h1>
            <p>Send an offer straight to every customer's stamp card already in Apple Wallet — no app, no email list, just a notification on their lock screen.</p>
          </div>
        </div>

        {customerCount === 0 && (
          <div className="wc-card wc-warn">
            <p className="wc-note">You don't have any Rewards customers yet — set up a card and share the join link from the Rewards page first, then come back here to message them.</p>
          </div>
        )}

        <form className="wc-card" onSubmit={sendCampaign}>
          <div className="wc-card-head">New offer</div>
          <div className="wc-grid">
            <label className="wc-field wc-field-wide">
              <span className="wc-label">Offer message (shown on the card + push banner)</span>
              <input value={message} onChange={e => setMessage(e.target.value)} placeholder="Free lemonade with any wing combo today" maxLength={60} required />
            </label>
            <label className="wc-field wc-field-wide">
              <span className="wc-label">Details (optional, shown on the back of the card)</span>
              <input value={detail} onChange={e => setDetail(e.target.value)} placeholder="Valid in-store only, one per customer" />
            </label>
            <label className="wc-field">
              <span className="wc-label"><CalendarClock size={13} /> Expires (optional)</span>
              <input type="date" value={expiresAt} onChange={e => setExpiresAt(e.target.value)} />
            </label>
            <label className="wc-field">
              <span className="wc-label"><DollarSign size={13} /> Est. value per redemption (optional)</span>
              <input type="number" min={0} step="0.01" value={estimatedValue} onChange={e => setEstimatedValue(e.target.value)} placeholder="8.00" />
            </label>
            <label className="wc-field wc-field-wide wc-checkbox-field">
              <input type="checkbox" checked={repeatUse} onChange={e => setRepeatUse(e.target.checked)} />
              <span><Repeat size={13} /> Repeat use — keep the offer live after a customer redeems it once</span>
            </label>
          </div>
          <div className="wc-save-row">
            <button type="submit" className="btn-primary" disabled={sending || !message.trim() || customerCount === 0}>
              <Send size={14} /> {sending ? 'Sending…' : `Send to ${customerCount} customer${customerCount === 1 ? '' : 's'}`}
            </button>
            {sentNotice && <span className="wc-sent">{sentNotice}</span>}
          </div>
        </form>

        <div className="wc-card">
          <div className="wc-card-head">Past campaigns</div>
          {campaigns.length === 0 ? (
            <p className="wc-note">Nothing sent yet — your first offer will show up here with redemption counts.</p>
          ) : (
            <div className="wc-campaigns">
              {campaigns.map(c => (
                <div className="wc-campaign-row" key={c.id}>
                  <div className="wc-campaign-info">
                    <span className="wc-campaign-message">{c.message}</span>
                    {c.detail && <span className="wc-campaign-detail">{c.detail}</span>}
                    <span className="wc-campaign-meta">
                      <Users size={12} /> {c.sent_count} sent
                      <Ticket size={12} /> {c.redeemed_count} redeemed
                      {c.revenue_estimate > 0 && <span className="wc-campaign-revenue">~${c.revenue_estimate.toFixed(2)} est. revenue</span>}
                      {c.repeat_use && <span className="wc-campaign-tag">Repeat use</span>}
                      {c.expires_at && <span className="wc-campaign-tag">Expires {new Date(c.expires_at).toLocaleDateString()}</span>}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="wc-card">
          <div className="wc-card-head">Redeeming an offer</div>
          <p className="wc-note">When a customer shows their card, scan the same QR code on it with your phone's normal camera app — it opens a redemption confirm page for staff, no separate scanner app needed.</p>
        </div>
      </div>
    </div>
  )
}
