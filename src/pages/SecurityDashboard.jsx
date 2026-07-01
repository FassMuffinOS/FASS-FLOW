import { useState, useEffect, useCallback } from 'react'
import { Loader2, ShieldAlert, RefreshCw, KeyRound, ShieldCheck, Ban, Trash2 } from 'lucide-react'
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

  // IP blocking — backed by app/security.py's IPBlockMiddleware, a Redis
  // list checked on every request before rate limiting. This is the
  // control surface for it: nothing here is static analysis, these calls
  // have a real effect the moment they're made.
  const [blocked, setBlocked] = useState([])
  const [blockedLoading, setBlockedLoading] = useState(false)
  const [blockedError, setBlockedError] = useState('')
  const [newIp, setNewIp] = useState('')
  const [newReason, setNewReason] = useState('')
  const [blocking, setBlocking] = useState(false)

  const loadBlocked = useCallback(async () => {
    if (!secret) return
    setBlockedLoading(true)
    setBlockedError('')
    try {
      const res = await fetch(`${API_BASE}/api/v1/admin/ip-blocks`, {
        headers: { 'X-Admin-Secret': secret },
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json.detail || `Request failed (${res.status})`)
      setBlocked(json.blocked || [])
    } catch (err) {
      setBlockedError(err.message || 'Could not load blocked IPs')
    } finally {
      setBlockedLoading(false)
    }
  }, [secret])

  useEffect(() => {
    if (secret) loadBlocked()
  }, [secret, loadBlocked])

  async function addBlock(e) {
    e.preventDefault()
    if (!newIp.trim() || !secret) return
    setBlocking(true)
    setBlockedError('')
    try {
      const res = await fetch(`${API_BASE}/api/v1/admin/ip-blocks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Admin-Secret': secret },
        body: JSON.stringify({ ip: newIp.trim(), reason: newReason.trim() }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json.detail || `Request failed (${res.status})`)
      setBlocked(json.blocked || [])
      setNewIp('')
      setNewReason('')
    } catch (err) {
      setBlockedError(err.message || 'Could not block that IP')
    } finally {
      setBlocking(false)
    }
  }

  async function removeBlock(ip) {
    if (!secret) return
    setBlockedError('')
    try {
      const res = await fetch(`${API_BASE}/api/v1/admin/ip-blocks/${encodeURIComponent(ip)}`, {
        method: 'DELETE',
        headers: { 'X-Admin-Secret': secret },
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json.detail || `Request failed (${res.status})`)
      setBlocked(json.blocked || [])
    } catch (err) {
      setBlockedError(err.message || 'Could not unblock that IP')
    }
  }

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

        {secret && (
          <div className="sec-ipblock">
            <div className="admin-header sec-ipblock-header">
              <Ban size={16} />
              <h2>Blocked IPs</h2>
            </div>
            <p className="admin-hint">
              Rejected before rate limiting or any route runs — takes effect immediately, applies
              across every backend instance (backed by Redis, not per-process memory).
            </p>

            <form className="sec-ipblock-form" onSubmit={addBlock}>
              <input
                type="text"
                placeholder="IP address, e.g. 203.0.113.7"
                value={newIp}
                onChange={e => setNewIp(e.target.value)}
              />
              <input
                type="text"
                placeholder="Reason (optional)"
                value={newReason}
                onChange={e => setNewReason(e.target.value)}
              />
              <button type="submit" className="btn-primary" disabled={blocking || !newIp.trim()}>
                {blocking ? <Loader2 size={14} className="spin" /> : <Ban size={14} />}
                Block
              </button>
            </form>

            {blockedError && <p className="admin-error">{blockedError}</p>}

            {blockedLoading ? (
              <p className="admin-hint"><Loader2 size={12} className="spin" /> Loading…</p>
            ) : blocked.length === 0 ? (
              <p className="admin-hint">No IPs currently blocked.</p>
            ) : (
              <ul className="sec-ipblock-list">
                {blocked.map(b => (
                  <li key={b.ip} className="sec-ipblock-item">
                    <span className="sec-ipblock-ip">{b.ip}</span>
                    {b.reason && <span className="sec-ipblock-reason">{b.reason}</span>}
                    <button
                      type="button"
                      className="sec-ipblock-remove"
                      title="Unblock"
                      onClick={() => removeBlock(b.ip)}
                    >
                      <Trash2 size={14} />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

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
