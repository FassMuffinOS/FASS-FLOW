import { useState, useEffect, useCallback, useMemo } from 'react'
import { Megaphone, Send, Loader, Users, Ticket, DollarSign, Repeat, CalendarClock, Search, Gift, Moon, X } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import './WalletCampaigns.css'

const STALE_DAYS = 30

function daysSince(iso) {
  if (!iso) return null
  return Math.floor((Date.now() - new Date(iso).getTime()) / 86400000)
}

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
  const [customers, setCustomers] = useState([])
  const [customerCount, setCustomerCount] = useState(0)
  const [loading, setLoading] = useState(true)

  const [message, setMessage] = useState('')
  const [detail, setDetail] = useState('')
  const [expiresAt, setExpiresAt] = useState('')
  const [repeatUse, setRepeatUse] = useState(false)
  const [estimatedValue, setEstimatedValue] = useState('')
  const [sending, setSending] = useState(false)
  const [sentNotice, setSentNotice] = useState(null)

  // Customer list tools — search + checkbox targeting so a send can go to
  // everyone (default) or a chosen segment instead of always broadcasting.
  const [customerSearch, setCustomerSearch] = useState('')
  const [selectedSlugs, setSelectedSlugs] = useState(() => new Set())

  const load = useCallback(async () => {
    if (!session?.user || !API_BASE) { setLoading(false); return }
    try {
      const res = await fetch(`${API_BASE}/api/v1/campaigns/mine?user_id=${session.user.id}`)
      if (res.ok) {
        const data = await res.json()
        setCampaigns(data.campaigns || [])
        setCustomerCount(data.customer_count || 0)
        setCustomers(data.customers || [])
      }
    } finally {
      setLoading(false)
    }
  }, [session])

  useEffect(() => { load() }, [load])

  const filteredCustomers = useMemo(() => {
    const q = customerSearch.trim().toLowerCase()
    if (!q) return customers
    return customers.filter(c =>
      (c.customer_name || '').toLowerCase().includes(q) ||
      (c.customer_contact || '').toLowerCase().includes(q)
    )
  }, [customers, customerSearch])

  function toggleSlug(slug) {
    setSelectedSlugs(prev => {
      const next = new Set(prev)
      if (next.has(slug)) next.delete(slug)
      else next.add(slug)
      return next
    })
  }

  function selectAllFiltered() {
    setSelectedSlugs(new Set(filteredCustomers.map(c => c.slug)))
  }

  function selectStale() {
    setSelectedSlugs(new Set(
      filteredCustomers.filter(c => (daysSince(c.updated_at) ?? 0) >= STALE_DAYS).map(c => c.slug)
    ))
  }

  function clearSelection() {
    setSelectedSlugs(new Set())
  }

  const sendTargetCount = selectedSlugs.size > 0 ? selectedSlugs.size : customerCount

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
          target_slugs: selectedSlugs.size > 0 ? Array.from(selectedSlugs) : null,
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
        clearSelection()
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
              <Send size={14} /> {sending
                ? 'Sending…'
                : selectedSlugs.size > 0
                  ? `Send to ${sendTargetCount} selected`
                  : `Send to ${sendTargetCount} customer${sendTargetCount === 1 ? '' : 's'}`}
            </button>
            {selectedSlugs.size > 0 && (
              <button type="button" className="wc-clear-selection" onClick={clearSelection}>
                <X size={12} /> Clear selection
              </button>
            )}
            {sentNotice && <span className="wc-sent">{sentNotice}</span>}
          </div>
        </form>

        <div className="wc-card">
          <div className="wc-card-head-row">
            <div className="wc-card-head"><Users size={15} /> Your customers ({customerCount})</div>
            {customers.length > 0 && (
              <div className="wc-customer-tools">
                <button type="button" onClick={selectAllFiltered}>Select all</button>
                <button type="button" onClick={selectStale} title={`No activity in ${STALE_DAYS}+ days`}>
                  <Moon size={12} /> Select inactive 30d+
                </button>
                {selectedSlugs.size > 0 && <button type="button" onClick={clearSelection}>Clear</button>}
              </div>
            )}
          </div>

          {customers.length === 0 ? (
            <p className="wc-note">No customers yet — share your Rewards join link to start building this list.</p>
          ) : (
            <>
              <label className="wc-search">
                <Search size={14} />
                <input
                  value={customerSearch}
                  onChange={e => setCustomerSearch(e.target.value)}
                  placeholder="Search by name or contact…"
                />
              </label>

              <div className="wc-customer-table">
                <div className="wc-customer-row wc-customer-head">
                  <span></span>
                  <span>Customer</span>
                  <span>Stamps</span>
                  <span>Offers redeemed</span>
                  <span>Last active</span>
                  <span>Status</span>
                </div>
                {filteredCustomers.map(c => {
                  const stale = (daysSince(c.updated_at) ?? 0) >= STALE_DAYS
                  return (
                    <label className="wc-customer-row" key={c.slug}>
                      <input
                        type="checkbox"
                        checked={selectedSlugs.has(c.slug)}
                        onChange={() => toggleSlug(c.slug)}
                      />
                      <span className="wc-customer-name">
                        {c.customer_name || c.slug}
                        {c.customer_contact && <span className="wc-customer-contact">{c.customer_contact}</span>}
                      </span>
                      <span>{c.stamps}</span>
                      <span>{c.offer_redemptions > 0 ? (<><Ticket size={12} /> {c.offer_redemptions}</>) : '—'}</span>
                      <span className={stale ? 'wc-stale' : ''}>
                        {daysSince(c.updated_at) === null ? '—' : `${daysSince(c.updated_at)}d ago`}
                      </span>
                      <span className="wc-customer-badges">
                        {c.has_active_offer && <span className="wc-badge wc-badge-offer"><Gift size={11} /> Has offer</span>}
                        {stale && <span className="wc-badge wc-badge-stale">Win-back</span>}
                      </span>
                    </label>
                  )
                })}
              </div>
            </>
          )}
        </div>

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
