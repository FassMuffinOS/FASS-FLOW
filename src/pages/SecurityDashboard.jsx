import { useState, useEffect, useCallback } from 'react'
import { Loader2, ShieldAlert, RefreshCw, KeyRound, ShieldCheck } from 'lucide-react'
import './Admin.css'
import './SecurityDashboard.css'

// Founder-only Security Dashboard — runs the backend's static scanner
// (scripts/security_scan.py, exposed at GET /admin/security-scan) and shows
// the results. Same admin-secret gate as /admin and /admin/bd-partner, not
// linked anywhere in nav.
//
// What it's looking for: the IDOR bug class from the 2026-06-29 review
// (client-supplied user_id/business_user_id with no session check — see
// app/auth_deps.py), hardcoded secrets committed to source, and CORS/debug
// misconfig. It's static analysis only — reads source, makes no live
// requests against anything, safe to re-run as often as you want.

const API_BASE = import.meta.env.VITE_API_URL || ''

const SEVERITY_ORDER = ['HIGH', 'MEDIUM', 'LOW', 'INFO']
const SEVERITY_COPY = {
  HIGH: 'A real, exploitable gap — fix before anything else.',
  MEDIUM: 'Worth a look, not urgent.',
  LOW: 'Lower-risk version of the same pattern (usually a read, not a write).',
  INFO: 'For awareness only.',
}

export default function SecurityDashboard() {
  const [secret, setSecret] = useState(sessionStorage.getItem('fass_admin_secret') || '')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [data, setData] = useState(null)
  const [lastRun, setLastRun] = useState(null)
  const [filter, setFilter] = useState('ALL')

  function rememberSecret(v) {
    setSecret(v)
    sessionStorage.setItem('fass_admin_secret', v)
  }

  const runScan = useCallback(async () => {
    if (!secret) return
    setLoading(true)
    setError('')
    try {
      const res = await fetch(`${API_BASE}/api/v1/admin/security-scan`, {
        headers: { 'X-Admin-Secret': secret },
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json.detail || `Request failed (${res.status})`)
      setData(json)
      setLastRun(new Date())
    } catch (err) {
      setError(err.message || 'Could not run the security scan')
    } finally {
      setLoading(false)
    }
  }, [secret])

  useEffect(() => {
    if (secret) runScan()
  }, [secret, runScan])

  const findings = data?.findings || []
  const visible = filter === 'ALL' ? findings : findings.filter(f => f.severity === filter)

  return (
    <div className="admin-page">
      <div className="admin-card admin-card-wide">
        <div className="admin-header">
          <ShieldAlert size={18} />
          <h1>Security Dashboard</h1>
        </div>
        <p className="admin-sub">
          Static scan of the backend's routers for the IDOR pattern caught in the June 29
          auth-gap review (client-supplied user_id with no session check), plus hardcoded
          secrets and CORS/debug misconfig. Read-only — nothing here makes a live request
          against anything, so re-run it as often as you want.
        </p>

        <div className="admin-field">
          <label>Admin secret</label>
          <input
            type="password"
            value={secret}
            onChange={e => rememberSecret(e.target.value)}
            placeholder="paste your ADMIN_SECRET"
          />
        </div>

        {!secret && (
          <p className="admin-hint"><KeyRound size={12} /> Paste your admin secret above to run a scan.</p>
        )}

        {secret && (
          <button
            type="button"
            className="btn-primary admin-submit sec-rerun"
            disabled={loading}
            onClick={runScan}
          >
            {loading ? <Loader2 size={16} className="spin" /> : <RefreshCw size={16} />}
            {loading ? 'Scanning…' : 'Re-run scan'}
          </button>
        )}

        {error && <p className="admin-error">{error}</p>}

        {data && (
          <>
            <div className="sec-summary">
              {SEVERITY_ORDER.map(sev => (
                <button
                  key={sev}
                  type="button"
                  className={`sec-summary-pill sec-${sev.toLowerCase()} ${filter === sev ? 'sec-pill-active' : ''}`}
                  onClick={() => setFilter(filter === sev ? 'ALL' : sev)}
                >
                  {sev} <strong>{data.summary?.[sev] ?? 0}</strong>
                </button>
              ))}
              <span className="sec-summary-total">{data.total} total</span>
            </div>

            {lastRun && (
              <p className="admin-hint">Last run {lastRun.toLocaleTimeString()}.</p>
            )}

            {data.total === 0 ? (
              <div className="sec-clean">
                <ShieldCheck size={18} />
                <span>No findings. Clean scan.</span>
              </div>
            ) : (
              <div className="sec-findings-list">
                {visible.map((f, i) => (
                  <div className={`sec-finding sec-finding-${f.severity.toLowerCase()}`} key={i}>
                    <div className="sec-finding-top">
                      <span className={`sec-badge sec-${f.severity.toLowerCase()}`}>{f.severity}</span>
                      <span className="sec-finding-loc">{f.file}:{f.line}</span>
                      <span className="sec-finding-cat">{f.category}</span>
                    </div>
                    <p className="sec-finding-msg">{f.message}</p>
                  </div>
                ))}
                {visible.length === 0 && (
                  <p className="admin-hint">No {filter} findings.</p>
                )}
              </div>
            )}

            <p className="admin-hint sec-legend">
              {SEVERITY_ORDER.map(sev => `${sev}: ${SEVERITY_COPY[sev]}`).join('  ·  ')}
            </p>
          </>
        )}
      </div>
    </div>
  )
}
