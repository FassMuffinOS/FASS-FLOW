import { useState, useEffect, useCallback } from 'react'
import { Megaphone, Loader2, RefreshCw, DollarSign, PlusCircle } from 'lucide-react'
import './AffiliateAdmin.css'

const API_BASE = import.meta.env.VITE_API_URL || ''
const SOURCES = ['subscription', 'wallet_pass', 'masterclass', 'bd_partner', 'other']

function timeAgo(iso) {
  const diffMs = Date.now() - new Date(iso).getTime()
  const days = Math.floor(diffMs / 86400000)
  if (days < 1) return 'today'
  if (days === 1) return 'yesterday'
  return `${days}d ago`
}

// Founder-side payout console for the affiliate program — same shape as
// BDPartnerAdmin.jsx: a roster (here, every affiliate with a running
// balance), select one to see their conversions + payout history, then
// log a manual conversion (for Masterclass/BD Partner, which have no
// webhook) or a payout. Subscription/wallet_pass conversions show up
// here automatically — they're written by subscriptions.py's webhook via
// affiliates.py's record_conversion(), never entered by hand.
export default function AffiliateAdmin() {
  const [secret, setSecret] = useState(sessionStorage.getItem('fass_admin_secret') || '')
  const [affiliates, setAffiliates] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [selected, setSelected] = useState(null)
  const [detail, setDetail] = useState({ conversions: [], payouts: [] })
  const [detailLoading, setDetailLoading] = useState(false)

  const [convSource, setConvSource] = useState('masterclass')
  const [convAmount, setConvAmount] = useState('')
  const [convNote, setConvNote] = useState('')
  const [logging, setLogging] = useState(false)

  const [payoutAmount, setPayoutAmount] = useState('')
  const [payoutNote, setPayoutNote] = useState('')
  const [paying, setPaying] = useState(false)

  function rememberSecret(v) {
    setSecret(v)
    sessionStorage.setItem('fass_admin_secret', v)
  }

  const loadAffiliates = useCallback(async () => {
    if (!secret) return
    setLoading(true)
    setError('')
    try {
      const res = await fetch(`${API_BASE}/api/v1/affiliates/admin/list`, {
        headers: { 'X-Admin-Secret': secret },
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.detail || `Request failed (${res.status})`)
      setAffiliates(data.affiliates || [])
    } catch (err) {
      setError(err.message || 'Failed to load affiliates')
    } finally {
      setLoading(false)
    }
  }, [secret])

  useEffect(() => {
    let cancelled = false
    async function run() {
      if (cancelled) return
      await loadAffiliates()
    }
    run()
    return () => { cancelled = true }
  }, [loadAffiliates])

  async function loadDetail(userId) {
    setDetailLoading(true)
    try {
      const res = await fetch(`${API_BASE}/api/v1/affiliates/admin/detail?user_id=${userId}`, {
        headers: { 'X-Admin-Secret': secret },
      })
      const data = await res.json().catch(() => ({}))
      setDetail({ conversions: data.conversions || [], payouts: data.payouts || [] })
    } catch (err) {
      console.error('AffiliateAdmin: failed to load detail', err)
    } finally {
      setDetailLoading(false)
    }
  }

  function selectAffiliate(a) {
    setSelected(a)
    setConvAmount('')
    setConvNote('')
    setPayoutAmount('')
    setPayoutNote('')
    loadDetail(a.user_id)
  }

  async function logConversion(e) {
    e.preventDefault()
    if (!selected || !convAmount || Number(convAmount) <= 0) return
    setLogging(true)
    setError('')
    try {
      const res = await fetch(`${API_BASE}/api/v1/affiliates/admin/conversion`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Admin-Secret': secret },
        body: JSON.stringify({
          affiliate_user_id: selected.user_id,
          source: convSource,
          amount: Number(convAmount),
          note: convNote.trim(),
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.detail || `Request failed (${res.status})`)
      setConvAmount('')
      setConvNote('')
      await Promise.all([loadDetail(selected.user_id), loadAffiliates()])
    } catch (err) {
      setError(err.message || 'Failed to log conversion')
    } finally {
      setLogging(false)
    }
  }

  async function logPayout(e) {
    e.preventDefault()
    if (!selected || !payoutAmount || Number(payoutAmount) <= 0) return
    setPaying(true)
    setError('')
    try {
      const res = await fetch(`${API_BASE}/api/v1/affiliates/admin/payout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Admin-Secret': secret },
        body: JSON.stringify({
          affiliate_user_id: selected.user_id,
          amount: Number(payoutAmount),
          note: payoutNote.trim(),
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.detail || `Request failed (${res.status})`)
      setPayoutAmount('')
      setPayoutNote('')
      await Promise.all([loadDetail(selected.user_id), loadAffiliates()])
    } catch (err) {
      setError(err.message || 'Failed to log payout')
    } finally {
      setPaying(false)
    }
  }

  return (
    <div className="afa-page">
      <div className="afa-header">
        <Megaphone size={18} />
        <h1>Affiliate Program — Payout Console</h1>
        <button className="afa-refresh" onClick={loadAffiliates} title="Reload"><RefreshCw size={15} /></button>
      </div>
      <p className="afa-sub">
        Every affiliate, what they've earned, and what's still owed. Subscription and Wallet conversions
        are recorded automatically from the Stripe webhook — log Masterclass/BD Partner conversions and
        payouts by hand here.
      </p>

      <div className="afa-field afa-secret">
        <label>Admin secret</label>
        <input
          type="password"
          value={secret}
          onChange={e => rememberSecret(e.target.value)}
          placeholder="paste your ADMIN_SECRET"
        />
      </div>

      {error && <p className="afa-error">{error}</p>}

      <div className="afa-layout">
        <div className="afa-roster">
          <div className="afa-roster-head">Affiliates{affiliates.length > 0 ? ` (${affiliates.length})` : ''}</div>

          {loading && <div className="afa-loading"><Loader2 size={15} className="spin" /> Loading…</div>}
          {!loading && affiliates.length === 0 && <div className="afa-empty">No affiliates yet.</div>}

          {affiliates.map(a => (
            <div
              key={a.user_id}
              className={`afa-row ${selected?.user_id === a.user_id ? 'afa-row-active' : ''}`}
              onClick={() => selectAffiliate(a)}
            >
              <div className="afa-row-top">
                <span className="afa-row-name">{a.company_name || a.full_name || a.code}</span>
                <span className={`afa-row-status afa-status-${a.status}`}>{a.status}</span>
              </div>
              <div className="afa-row-meta">code: {a.code} · earned ${a.total_earned?.toFixed(2)} · paid ${a.total_paid?.toFixed(2)}</div>
              <div className="afa-row-balance">${a.balance_due?.toFixed(2)} due</div>
            </div>
          ))}
        </div>

        <div className="afa-detail">
          {!selected && <div className="afa-detail-empty">Select an affiliate to log conversions or payouts.</div>}

          {selected && (
            <>
              <div className="afa-detail-head">
                <div>
                  <div className="afa-detail-name">{selected.company_name || selected.full_name || selected.code}</div>
                  <div className="afa-detail-id">{selected.user_id} · code: {selected.code}</div>
                </div>
                <div className="afa-detail-balance">
                  <DollarSign size={15} /> ${selected.balance_due?.toFixed(2)} due
                </div>
              </div>

              <form className="afa-form" onSubmit={logConversion}>
                <div className="afa-form-title">Log a manual conversion</div>
                <div className="afa-form-row">
                  <select value={convSource} onChange={e => setConvSource(e.target.value)}>
                    {SOURCES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="Amount paid ($)"
                    value={convAmount}
                    onChange={e => setConvAmount(e.target.value)}
                  />
                  <input
                    placeholder="Note (optional)"
                    value={convNote}
                    onChange={e => setConvNote(e.target.value)}
                  />
                  <button type="submit" className="btn-primary" disabled={logging || !convAmount}>
                    {logging ? <Loader2 size={14} className="spin" /> : <PlusCircle size={14} />}
                    Log
                  </button>
                </div>
              </form>

              <form className="afa-form" onSubmit={logPayout}>
                <div className="afa-form-title">Log a payout</div>
                <div className="afa-form-row">
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="Amount paid out ($)"
                    value={payoutAmount}
                    onChange={e => setPayoutAmount(e.target.value)}
                  />
                  <input
                    placeholder="Note (optional)"
                    value={payoutNote}
                    onChange={e => setPayoutNote(e.target.value)}
                  />
                  <button type="submit" className="btn-primary" disabled={paying || !payoutAmount}>
                    {paying ? <Loader2 size={14} className="spin" /> : <DollarSign size={14} />}
                    Pay
                  </button>
                </div>
              </form>

              <div className="afa-timeline-head">Conversions</div>
              {detailLoading && <div className="afa-loading"><Loader2 size={15} className="spin" /> Loading…</div>}
              {!detailLoading && detail.conversions.length === 0 && <div className="afa-empty">No conversions yet.</div>}
              <div className="afa-timeline">
                {detail.conversions.map(c => (
                  <div key={c.id} className="afa-entry">
                    <div className="afa-entry-body">
                      <div className="afa-entry-top">
                        <span className="afa-entry-title">{c.source} · ${c.amount} paid</span>
                        <span className="afa-entry-time">{timeAgo(c.created_at)}</span>
                      </div>
                      <span className="afa-entry-sub">+${c.commission_amount} commission{c.note ? ` — ${c.note}` : ''}</span>
                    </div>
                  </div>
                ))}
              </div>

              <div className="afa-timeline-head">Payouts</div>
              {!detailLoading && detail.payouts.length === 0 && <div className="afa-empty">No payouts logged yet.</div>}
              <div className="afa-timeline">
                {detail.payouts.map(p => (
                  <div key={p.id} className="afa-entry">
                    <div className="afa-entry-body">
                      <div className="afa-entry-top">
                        <span className="afa-entry-title">${p.amount} paid</span>
                        <span className="afa-entry-time">{timeAgo(p.paid_at)}</span>
                      </div>
                      {p.note && <span className="afa-entry-sub">{p.note}</span>}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
