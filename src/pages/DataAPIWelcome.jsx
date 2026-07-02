import { useState, useEffect } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import { CheckCircle2, Copy, Check, AlertTriangle, Loader } from 'lucide-react'
import './DataAPI.css'

const API_BASE = import.meta.env.VITE_API_URL || ''

// Post-checkout landing page for the Data API — see data_api.py's
// /checkout/session/{id}. The raw API key only exists here, exactly once:
// the backend never stores it in plaintext, so if this page is closed
// without copying it, the key is gone for good (same as GitHub/Stripe).
export default function DataAPIWelcome() {
  const [params] = useSearchParams()
  const sessionId = params.get('session_id')
  const [status, setStatus] = useState('checking') // checking | paid_with_key | paid_no_key | not_paid | error
  const [apiKey, setApiKey] = useState(null)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (!sessionId || !API_BASE) { setStatus('error'); return }
    let cancelled = false
    fetch(`${API_BASE}/api/v1/data/checkout/session/${sessionId}`)
      .then(r => r.json())
      .then(data => {
        if (cancelled) return
        if (!data.paid) { setStatus('not_paid'); return }
        if (data.api_key) {
          setApiKey(data.api_key)
          setStatus('paid_with_key')
        } else {
          setStatus('paid_no_key')
        }
      })
      .catch(() => { if (!cancelled) setStatus('error') })
    return () => { cancelled = true }
  }, [sessionId])

  function copyKey() {
    navigator.clipboard?.writeText(apiKey)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="dapi" style={{ maxWidth: 560 }}>
      {status === 'checking' && (
        <div className="dapi-loading"><Loader className="dapi-spin" size={18} /> Confirming your purchase…</div>
      )}

      {status === 'not_paid' && (
        <div className="dapi-hero">
          <AlertTriangle size={28} color="#f5b942" />
          <h1>Payment not confirmed</h1>
          <p>We couldn't confirm this checkout went through yet. If you completed payment, refresh this page in a few seconds — Stripe can take a moment to notify us.</p>
        </div>
      )}

      {status === 'error' && (
        <div className="dapi-hero">
          <AlertTriangle size={28} color="#dc2626" />
          <h1>Something went wrong</h1>
          <p>We couldn't load your checkout confirmation. Contact <a href="mailto:support@fass.systems">support@fass.systems</a> with your receipt and we'll sort it out.</p>
        </div>
      )}

      {status === 'paid_with_key' && (
        <>
          <div className="dapi-hero">
            <CheckCircle2 size={28} color="#1d9e75" />
            <h1>You're in</h1>
            <p>Here's your live API key — copy it now. For security, we never store the raw value, so this is the only time it will ever be shown.</p>
          </div>
          <div className="dapi-signup" style={{ gridTemplateColumns: '1fr', gap: 10 }}>
            <code style={{ fontSize: '0.9rem', wordBreak: 'break-all', padding: '10px 12px', background: '#fff', borderRadius: 8, border: '1px solid #e5e7eb' }}>
              {apiKey}
            </code>
            <button className="btn-primary" onClick={copyKey}>
              {copied ? <Check size={14} /> : <Copy size={14} />} {copied ? 'Copied' : 'Copy key'}
            </button>
          </div>
          <p className="dapi-note" style={{ marginTop: 16 }}>
            Use it as <code>Authorization: Bearer {'{key}'}</code> against{' '}
            <code>GET /api/v1/data/wardog/incumbent?naics=...&agency=...</code>. Check your remaining
            balance anytime at <code>GET /api/v1/data/usage</code>.
          </p>
        </>
      )}

      {status === 'paid_no_key' && (
        <div className="dapi-hero">
          <CheckCircle2 size={28} color="#1d9e75" />
          <h1>Purchase confirmed</h1>
          <p>This top-up/plan change is now active on your existing API key — no new key was issued. Check <code>GET /api/v1/data/usage</code> with your existing key to see the updated balance.</p>
        </div>
      )}

      <p style={{ textAlign: 'center', marginTop: 24 }}>
        <Link to="/data-api">← Back to FASS Data API</Link>
      </p>
    </div>
  )
}
