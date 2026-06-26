import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { Stamp, Download, Loader } from 'lucide-react'
import './RewardsJoin.css'

const API_BASE = import.meta.env.VITE_API_URL || ''

// Public, no-auth join page — the QR/link target a business hands a
// customer (Rewards.jsx's "copy link" button points here). On load it
// silently claims a brand-new stamp card under that business's program,
// then shows the Apple Wallet download link for it. No account needed,
// same pattern as Capability.jsx's /c/:slug page.
export default function RewardsJoin() {
  const { businessUserId } = useParams()
  const [slug, setSlug] = useState(null)
  const [businessName, setBusinessName] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!businessUserId || !API_BASE) { setError('Link is missing some details.'); setLoading(false); return }
    let cancelled = false
    async function join() {
      try {
        const res = await fetch(`${API_BASE}/api/v1/rewards/join`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ business_user_id: businessUserId }),
        })
        if (!res.ok) {
          const data = await res.json().catch(() => null)
          if (!cancelled) setError(data?.detail || "This rewards link isn't recognized.")
          return
        }
        const data = await res.json()
        if (!cancelled) setSlug(data.slug)
      } catch {
        if (!cancelled) setError('Something went wrong claiming your card — try again.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    join()
    return () => { cancelled = true }
  }, [businessUserId])

  if (loading) return <div className="rj-state"><Loader className="rj-spin" size={18} /> Setting up your card…</div>
  if (error || !slug) return <div className="rj-state">{error || "This card isn't recognized — the link may be out of date."}</div>

  return (
    <div className="rj">
      <div className="rj-wrap">
        <div className="rj-badge">
          <Stamp size={14} /> Your rewards card is ready
        </div>
        <h1 className="rj-title">You're in!</h1>
        <p className="rj-sub">Add your stamp card to Apple Wallet — show it each visit and watch the stamps add up.</p>

        <a className="btn-primary rj-btn" href={`${API_BASE}/api/v1/rewards/pass?slug=${slug}`}>
          <Download size={16} /> Add to Apple Wallet
        </a>

        <p className="rj-foot">After a stamp is added, re-open this same link from your Wallet pass to grab the updated count.</p>
        <p className="rj-foot rj-foot-brand">Powered by FASS Wallet</p>
      </div>
    </div>
  )
}
