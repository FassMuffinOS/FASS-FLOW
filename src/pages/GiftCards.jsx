import { useState, useEffect, useCallback } from 'react'
import { Gift, Send, Loader, DollarSign, User, Phone, Download, Ticket, Wallet, Link2, Copy, Check, ChevronDown, ChevronUp, History } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import './GiftCards.css'

const API_BASE = import.meta.env.VITE_API_URL || ''

// FASS Gift Cards — prepaid dollar-balance Apple Wallet storeCard passes.
// Issue a card for a $ value here, hand the customer the Wallet download
// link, and they carry their balance on their phone. Redemption happens by
// scanning the same QR with a staff phone (GiftCardScan.jsx), exactly like
// Wallet Messaging's offer redemption — no NFC entitlement needed for this
// version (see migrations/gift_cards.sql for why), but the balance/ledger
// model here won't need to change if NFC tap-to-redeem is added later.
export default function GiftCards() {
  const { session } = useAuth()
  const [cards, setCards] = useState([])
  const [outstandingBalance, setOutstandingBalance] = useState(0)
  const [totalIssued, setTotalIssued] = useState(0)
  const [loading, setLoading] = useState(true)

  const [customerName, setCustomerName] = useState('')
  const [customerContact, setCustomerContact] = useState('')
  const [value, setValue] = useState('')
  const [issuing, setIssuing] = useState(false)
  const [issuedNotice, setIssuedNotice] = useState(null)
  const [linkCopied, setLinkCopied] = useState(false)

  // Per-card redemption history — fetched on demand when a row is expanded
  // rather than upfront for every card, since most businesses will have far
  // more cards than anyone wants to inspect at once.
  const [expandedSlug, setExpandedSlug] = useState(null)
  const [history, setHistory] = useState([])
  const [historyLoading, setHistoryLoading] = useState(false)

  const load = useCallback(async () => {
    if (!session?.user || !API_BASE) { setLoading(false); return }
    try {
      const res = await fetch(`${API_BASE}/api/v1/giftcards/mine?user_id=${session.user.id}`)
      if (res.ok) {
        const data = await res.json()
        setCards(data.cards || [])
        setOutstandingBalance(data.outstanding_balance || 0)
        setTotalIssued(data.total_issued || 0)
      }
    } finally {
      setLoading(false)
    }
  }, [session])

  useEffect(() => { load() }, [load])

  async function issueCard(e) {
    e.preventDefault()
    if (!session?.user || !value || Number(value) <= 0 || !API_BASE) return
    setIssuing(true)
    setIssuedNotice(null)
    try {
      const res = await fetch(`${API_BASE}/api/v1/giftcards/issue`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          business_user_id: session.user.id,
          value: Number(value),
          customer_name: customerName.trim() || null,
          customer_contact: customerContact.trim() || null,
        }),
      })
      if (res.ok) {
        const data = await res.json()
        setIssuedNotice(data.slug)
        setCustomerName('')
        setCustomerContact('')
        setValue('')
        load()
      }
    } finally {
      setIssuing(false)
    }
  }

  const storefrontLink = session?.user ? `${window.location.origin}/giftcards/buy/${session.user.id}` : ''

  function copyStorefrontLink() {
    if (!storefrontLink) return
    navigator.clipboard.writeText(storefrontLink).then(() => {
      setLinkCopied(true)
      setTimeout(() => setLinkCopied(false), 2000)
    })
  }

  async function toggleHistory(slug) {
    if (expandedSlug === slug) { setExpandedSlug(null); return }
    setExpandedSlug(slug)
    setHistory([])
    if (!session?.user || !API_BASE) return
    setHistoryLoading(true)
    try {
      const res = await fetch(`${API_BASE}/api/v1/giftcards/history?slug=${slug}&business_user_id=${session.user.id}`)
      if (res.ok) {
        const data = await res.json()
        setHistory(data.history || [])
      }
    } finally {
      setHistoryLoading(false)
    }
  }

  if (loading) return <div className="gc"><Loader className="gc-spin" size={18} /> Loading…</div>

  return (
    <div className="gc">
      <div className="gc-container">
        <div className="gc-head">
          <Gift size={22} className="gc-head-icon" />
          <div>
            <h1>Gift Cards</h1>
            <p>Sell or comp a prepaid dollar balance straight to your customer's Apple Wallet — redeemable in-store by scanning the card's QR code, no separate app or gift card terminal needed.</p>
          </div>
        </div>

        <div className="gc-stats">
          <div className="gc-stat">
            <span className="gc-stat-label">Outstanding balance</span>
            <span className="gc-stat-value">${outstandingBalance.toFixed(2)}</span>
          </div>
          <div className="gc-stat">
            <span className="gc-stat-label">Total issued</span>
            <span className="gc-stat-value">${totalIssued.toFixed(2)}</span>
          </div>
          <div className="gc-stat">
            <span className="gc-stat-label">Cards issued</span>
            <span className="gc-stat-value">{cards.length}</span>
          </div>
        </div>

        <div className="gc-card">
          <div className="gc-card-head"><Link2 size={15} /> Sell gift cards online</div>
          <p className="gc-note">Share this link anywhere — a customer can buy a card for themselves or someone else, pay by card, and get their Wallet download instantly. No login, no dashboard access needed on their end.</p>
          <div className="gc-storefront-row">
            <input className="gc-storefront-link" value={storefrontLink} readOnly onFocus={e => e.target.select()} />
            <button type="button" className="gc-copy-btn" onClick={copyStorefrontLink}>
              {linkCopied ? <Check size={13} /> : <Copy size={13} />} {linkCopied ? 'Copied' : 'Copy link'}
            </button>
          </div>
        </div>

        <form className="gc-card" onSubmit={issueCard}>
          <div className="gc-card-head">Issue a new gift card</div>
          <div className="gc-grid">
            <label className="gc-field">
              <span className="gc-label"><User size={13} /> Customer name (optional)</span>
              <input value={customerName} onChange={e => setCustomerName(e.target.value)} placeholder="Jordan Lee" />
            </label>
            <label className="gc-field">
              <span className="gc-label"><Phone size={13} /> Contact (optional)</span>
              <input value={customerContact} onChange={e => setCustomerContact(e.target.value)} placeholder="Phone or email" />
            </label>
            <label className="gc-field">
              <span className="gc-label"><DollarSign size={13} /> Value</span>
              <input type="number" min={1} step="0.01" value={value} onChange={e => setValue(e.target.value)} placeholder="25.00" required />
            </label>
          </div>
          <div className="gc-save-row">
            <button type="submit" className="btn-primary" disabled={issuing || !value || Number(value) <= 0}>
              <Send size={14} /> {issuing ? 'Issuing…' : 'Issue gift card'}
            </button>
            {issuedNotice && (
              <span className="gc-issued">
                Issued — <a href={`${API_BASE}/api/v1/giftcards/pass?slug=${issuedNotice}`} target="_blank" rel="noreferrer">
                  <Download size={12} /> hand them the Wallet download link
                </a>
              </span>
            )}
          </div>
        </form>

        <div className="gc-card">
          <div className="gc-card-head"><Wallet size={15} /> Issued cards ({cards.length})</div>
          {cards.length === 0 ? (
            <p className="gc-note">No gift cards yet — issue your first one above.</p>
          ) : (
            <div className="gc-table">
              <div className="gc-row gc-row-head">
                <span>Customer</span>
                <span>Balance</span>
                <span>Original value</span>
                <span>Status</span>
                <span>Wallet link</span>
                <span>History</span>
              </div>
              {cards.map(c => (
                <div key={c.slug}>
                  <div className="gc-row">
                    <span className="gc-customer-name">
                      {c.customer_name || c.slug}
                      {c.customer_contact && <span className="gc-customer-contact">{c.customer_contact}</span>}
                    </span>
                    <span className="gc-balance">${Number(c.balance).toFixed(2)}</span>
                    <span>${Number(c.original_value).toFixed(2)}</span>
                    <span>
                      {c.active ? (
                        <span className="gc-badge gc-badge-active"><Ticket size={11} /> Active</span>
                      ) : (
                        <span className="gc-badge gc-badge-depleted">Fully redeemed</span>
                      )}
                    </span>
                    <a href={`${API_BASE}/api/v1/giftcards/pass?slug=${c.slug}`} target="_blank" rel="noreferrer" className="gc-wallet-link">
                      <Download size={12} /> Download
                    </a>
                    <button type="button" className="gc-history-toggle" onClick={() => toggleHistory(c.slug)}>
                      <History size={12} /> {expandedSlug === c.slug ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                    </button>
                  </div>
                  {expandedSlug === c.slug && (
                    <div className="gc-history-panel">
                      {historyLoading ? (
                        <span className="gc-note"><Loader size={12} className="gc-spin" /> Loading history…</span>
                      ) : history.length === 0 ? (
                        <span className="gc-note">No redemptions yet on this card.</span>
                      ) : (
                        <div className="gc-history-list">
                          {history.map((h, i) => (
                            <div className="gc-history-row" key={i}>
                              <span>{new Date(h.redeemed_at).toLocaleString()}</span>
                              <span className="gc-history-amount">-${Number(h.amount).toFixed(2)}</span>
                              <span className="gc-history-balance">${Number(h.balance_after).toFixed(2)} left</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="gc-card">
          <div className="gc-card-head">Redeeming a gift card</div>
          <p className="gc-note">When a customer shows their card, scan the QR code on it with your phone's normal camera app — it opens a redemption page where you can apply all or part of the balance to a purchase.</p>
        </div>
      </div>
    </div>
  )
}
