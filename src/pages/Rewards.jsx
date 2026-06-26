import { useState, useEffect, useCallback } from 'react'
import { Stamp, Gift, Copy, Check, Loader, Plus, Minus } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import './Rewards.css'

const API_BASE = import.meta.env.VITE_API_URL || ''

// FASS Rewards — restaurant/business loyalty stamp cards. A business sets
// up ONE program here (stamp threshold + branding), then shares the join
// link with customers. Each customer who joins gets their own real, signed
// Apple Wallet storeCard pass tracking their personal stamp count. No live
// push yet (see applewallet.py's generate_storecard_pkpass comment) — after
// stamping someone, they re-download the same /rewards/pass?slug=... link
// to see the updated count until the Apple PassKit web service is built.
export default function Rewards() {
  const { session } = useAuth()
  const [program, setProgram] = useState(null)
  const [cards, setCards] = useState([])
  const [loading, setLoading] = useState(true)

  const [businessName, setBusinessName] = useState('')
  const [threshold, setThreshold] = useState(10)
  const [description, setDescription] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const [copied, setCopied] = useState(false)
  const [stampingSlug, setStampingSlug] = useState(null)

  const load = useCallback(async () => {
    if (!session?.user || !API_BASE) { setLoading(false); return }
    try {
      const res = await fetch(`${API_BASE}/api/v1/rewards/program/mine?user_id=${session.user.id}`)
      if (res.ok) {
        const data = await res.json()
        setProgram(data.program)
        setCards(data.cards || [])
        setBusinessName(data.program.business_name || '')
        setThreshold(data.program.reward_threshold || 10)
        setDescription(data.program.reward_description || '')
      } else {
        setProgram(null)
      }
    } catch {
      setProgram(null)
    } finally {
      setLoading(false)
    }
  }, [session])

  useEffect(() => { load() }, [load])

  async function saveProgram() {
    if (!session?.user || !businessName.trim() || !API_BASE) return
    setSaving(true)
    setSaved(false)
    try {
      const res = await fetch(`${API_BASE}/api/v1/rewards/program`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          business_user_id: session.user.id,
          business_name: businessName.trim(),
          reward_threshold: Number(threshold) || 10,
          reward_description: description.trim() || null,
        }),
      })
      if (res.ok) {
        setSaved(true)
        load()
      }
    } finally {
      setSaving(false)
    }
  }

  async function stamp(slug, delta) {
    if (!session?.user || !API_BASE) return
    setStampingSlug(slug)
    try {
      const res = await fetch(`${API_BASE}/api/v1/rewards/stamp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug, business_user_id: session.user.id, delta }),
      })
      if (res.ok) {
        const data = await res.json()
        setCards(prev => prev.map(c => c.slug === slug ? { ...c, stamps: data.stamps } : c))
      }
    } finally {
      setStampingSlug(null)
    }
  }

  function copyJoinLink() {
    if (!session?.user) return
    const url = `${window.location.origin}/rewards/join/${session.user.id}`
    navigator.clipboard?.writeText(url)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (loading) return <div className="rw"><Loader className="rw-spin" size={18} /> Loading…</div>

  return (
    <div className="rw">
      <div className="rw-container">
        <div className="rw-head">
          <Stamp size={22} className="rw-head-icon" />
          <div>
            <h1>FASS Rewards</h1>
            <p>Set up a punch card once — every customer who joins gets their own real, signed Apple Wallet stamp card.</p>
          </div>
        </div>

        <div className="rw-card">
          <div className="rw-card-head">{program ? 'Your rewards program' : 'Set up your rewards program'}</div>
          <div className="rw-grid">
            <label className="rw-field">
              <span className="rw-label">Business name</span>
              <input value={businessName} onChange={e => { setBusinessName(e.target.value); setSaved(false) }} placeholder="Michaelangelo's Pizza" />
            </label>
            <label className="rw-field">
              <span className="rw-label">Stamps needed for a reward</span>
              <input type="number" min={1} value={threshold} onChange={e => { setThreshold(e.target.value); setSaved(false) }} />
            </label>
            <label className="rw-field rw-field-wide">
              <span className="rw-label">What's the reward? (shows on the back of the card)</span>
              <input value={description} onChange={e => { setDescription(e.target.value); setSaved(false) }} placeholder="Collect 10 stamps, get a free large pizza" />
            </label>
          </div>
          <div className="rw-save-row">
            <button type="button" className="btn-primary" onClick={saveProgram} disabled={saving || !businessName.trim()}>
              {saving ? 'Saving…' : program ? 'Save changes' : 'Create program'}
            </button>
            {saved && <span className="rw-saved"><Check size={14} /> Saved</span>}
          </div>
        </div>

        {program && (
          <div className="rw-card">
            <div className="rw-card-head">Hand this out to customers</div>
            <p className="rw-note">Anyone who opens this link claims their own stamp card and can add it to Apple Wallet — no account needed.</p>
            <div className="rw-link-row">
              <input readOnly value={`${window.location.origin}/rewards/join/${session.user.id}`} onFocus={e => e.target.select()} />
              <button type="button" className="btn-outline" onClick={copyJoinLink}>
                {copied ? <Check size={14} /> : <Copy size={14} />} {copied ? 'Copied' : 'Copy link'}
              </button>
            </div>
          </div>
        )}

        {program && (
          <div className="rw-card">
            <div className="rw-card-head">Customers ({cards.length})</div>
            {cards.length === 0 ? (
              <p className="rw-note">No one has joined yet — share the link above to get your first customer card.</p>
            ) : (
              <div className="rw-customers">
                {cards.map(c => (
                  <div className="rw-customer-row" key={c.slug}>
                    <div className="rw-customer-info">
                      <span className="rw-customer-name">{c.customer_name || 'Customer'}</span>
                      <span className="rw-customer-stamps"><Gift size={13} /> {c.stamps} / {threshold} stamps</span>
                    </div>
                    <div className="rw-customer-actions">
                      <button type="button" className="rw-stamp-btn" onClick={() => stamp(c.slug, -1)} disabled={stampingSlug === c.slug || c.stamps <= 0}>
                        <Minus size={14} />
                      </button>
                      <button type="button" className="rw-stamp-btn rw-stamp-btn--add" onClick={() => stamp(c.slug, 1)} disabled={stampingSlug === c.slug}>
                        <Plus size={14} /> Stamp
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
            <p className="rw-note rw-note-block">After stamping, the customer needs to re-download their card (same link they used to add it) to see the new count — live auto-update is coming next.</p>
          </div>
        )}
      </div>
    </div>
  )
}
