import { useState, useEffect } from 'react'
import { Database, Check, Zap, Loader } from 'lucide-react'
import './DataAPI.css'

const API_BASE = import.meta.env.VITE_API_URL || ''

// Public marketing + self-serve checkout page for the FASS Data API —
// external companies buying programmatic access to data FASS creates
// (v1: WARDOG Intel's incumbent/award-history synthesis). No FASS login
// involved; company_name/email is all a buyer needs. See
// fass-flow-backend/app/routers/data_api.py for the endpoints this calls.
export default function DataAPI() {
  const [catalog, setCatalog] = useState({ plans: [], packs: [] })
  const [loading, setLoading] = useState(true)
  const [companyName, setCompanyName] = useState('')
  const [email, setEmail] = useState('')
  const [buying, setBuying] = useState(null) // price_id currently checking out

  useEffect(() => {
    if (!API_BASE) { setLoading(false); return }
    fetch(`${API_BASE}/api/v1/data/plans`)
      .then(r => r.json())
      .then(data => setCatalog(data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  async function buy(priceId, kind) {
    if (!companyName.trim() || !email.trim()) {
      alert('Enter your company name and email first — that\'s how we\'ll identify your account.')
      return
    }
    setBuying(priceId)
    try {
      const res = await fetch(`${API_BASE}/api/v1/data/checkout/${kind}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ price_id: priceId, company_name: companyName.trim(), email: email.trim() }),
      })
      const data = await res.json()
      if (data.url) window.location.href = data.url
    } finally {
      setBuying(null)
    }
  }

  return (
    <div className="dapi">
      <div className="dapi-hero">
        <Database size={28} className="dapi-hero-icon" />
        <h1>FASS Data API</h1>
        <p>Programmatic access to data FASS creates — starting with WARDOG Intel's incumbent and award-history synthesis, pulled live from USASpending.gov and shaped into a decision-useful read. Get an API key in minutes, no sales call required.</p>
      </div>

      <div className="dapi-signup">
        <label className="dapi-field">
          <span>Company name</span>
          <input value={companyName} onChange={e => setCompanyName(e.target.value)} placeholder="Acme Capture Consulting" />
        </label>
        <label className="dapi-field">
          <span>Work email</span>
          <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@company.com" />
        </label>
      </div>

      {loading ? (
        <div className="dapi-loading"><Loader className="dapi-spin" size={18} /> Loading catalog…</div>
      ) : (
        <>
          <section className="dapi-section">
            <h2>Monthly plans</h2>
            <div className="dapi-plans">
              {catalog.plans.map(p => (
                <div className="dapi-plan-card" key={p.price_id}>
                  <div className="dapi-plan-name">{p.plan}</div>
                  <div className="dapi-plan-price">{p.amount_display}</div>
                  <div className="dapi-plan-quota"><Zap size={14} /> {p.monthly_quota.toLocaleString()} calls/mo</div>
                  <button className="btn-primary" onClick={() => buy(p.price_id, 'subscription')} disabled={buying === p.price_id}>
                    {buying === p.price_id ? 'Redirecting…' : 'Subscribe'}
                  </button>
                </div>
              ))}
            </div>
          </section>

          <section className="dapi-section">
            <h2>Pay-per-call packs</h2>
            <p className="dapi-note">No commitment — buy a block of calls, use them whenever.</p>
            <div className="dapi-packs">
              {catalog.packs.map(p => (
                <div className="dapi-pack-card" key={p.price_id}>
                  <div className="dapi-pack-credits">{p.credits.toLocaleString()} calls</div>
                  <div className="dapi-pack-price">{p.amount_display}</div>
                  <button className="btn-outline" onClick={() => buy(p.price_id, 'credits')} disabled={buying === p.price_id}>
                    {buying === p.price_id ? 'Redirecting…' : 'Buy'}
                  </button>
                </div>
              ))}
            </div>
          </section>
        </>
      )}

      <section className="dapi-section dapi-included">
        <h2>What's included</h2>
        <ul>
          <li><Check size={15} /> `fk_live_` / `fk_test_` API key, issued instantly after checkout</li>
          <li><Check size={15} /> WARDOG Intel incumbent/award-history endpoint (more data sources on the roadmap)</li>
          <li><Check size={15} /> Usage check endpoint — see your remaining balance/quota anytime</li>
        </ul>
      </section>
    </div>
  )
}
