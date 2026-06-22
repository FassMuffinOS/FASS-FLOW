import { useState } from 'react'
import { Loader2, Send, UserPlus, KeyRound, CheckCircle2 } from 'lucide-react'
import './Admin.css'

// Manual onboarding tool — for students who pay you directly (Cash App,
// Apple Pay via a payment link, cash at an event, promo pricing) instead
// of going through the in-app Stripe Checkout. Hits the backend's
// /admin/invite endpoint, which creates a real Supabase Auth user via
// invite-by-email (they set their own password) and grants them an
// active profile row immediately — no password ever passes through here.
//
// Gated by a shared secret typed in by hand each session. Not linked from
// anywhere in the app nav — only reachable if you know the /admin URL.

const API_BASE = import.meta.env.VITE_API_URL || ''

export default function Admin() {
  const [secret, setSecret] = useState(sessionStorage.getItem('fass_admin_secret') || '')
  const [email, setEmail] = useState('')
  const [fullName, setFullName] = useState('')
  const [plan, setPlan] = useState('promo')
  const [note, setNote] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')

  function rememberSecret(v) {
    setSecret(v)
    sessionStorage.setItem('fass_admin_secret', v)
  }

  async function handleInvite(e) {
    e.preventDefault()
    setError('')
    setResult(null)
    setLoading(true)
    try {
      const res = await fetch(`${API_BASE}/api/v1/admin/invite`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Admin-Secret': secret,
        },
        body: JSON.stringify({ email, full_name: fullName, plan, note }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.detail || `Request failed (${res.status})`)
      setResult(data)
      setEmail('')
      setFullName('')
      setNote('')
    } catch (err) {
      setError(err.message || 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="admin-page">
      <div className="admin-card">
        <div className="admin-header">
          <KeyRound size={18} />
          <h1>Manual Student Onboarding</h1>
        </div>
        <p className="admin-sub">
          For anyone paying you directly outside Stripe Checkout. This sends a real
          Supabase invite email — they set their own password, you never see it.
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

        <form onSubmit={handleInvite} className="admin-form">
          <div className="admin-field">
            <label>Student email</label>
            <input
              type="email"
              required
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="student@example.com"
            />
          </div>

          <div className="admin-field">
            <label>Full name (optional)</label>
            <input
              type="text"
              value={fullName}
              onChange={e => setFullName(e.target.value)}
              placeholder="Jane Doe"
            />
          </div>

          <div className="admin-row">
            <div className="admin-field">
              <label>Plan</label>
              <select value={plan} onChange={e => setPlan(e.target.value)}>
                <option value="promo">promo</option>
                <option value="starter">starter</option>
                <option value="pro">pro</option>
                <option value="team">team</option>
              </select>
            </div>
            <div className="admin-field admin-field-grow">
              <label>Note (optional — shows up on their profile)</label>
              <input
                type="text"
                value={note}
                onChange={e => setNote(e.target.value)}
                placeholder="$200 Cash App promo 6/22"
              />
            </div>
          </div>

          {error && <p className="admin-error">{error}</p>}

          {result && (
            <div className="admin-success">
              <CheckCircle2 size={16} />
              <span>
                Invited <strong>{result.email}</strong> on plan <strong>{result.plan}</strong>.
                They'll get a magic-link email to set their password and sign in with instant access.
              </span>
            </div>
          )}

          <button type="submit" className="btn-primary admin-submit" disabled={loading || !secret || !email}>
            {loading ? <Loader2 size={16} className="spin" /> : <UserPlus size={16} />}
            {loading ? 'Sending invite…' : 'Invite + grant access'}
          </button>
        </form>

        <p className="admin-hint">
          <Send size={12} /> Already has an account and just needs the plan flipped on?
          Use the backend's <code>/admin/grant-access</code> endpoint with their user_id instead —
          ask me to add a quick form for that too if you need it often.
        </p>
      </div>
    </div>
  )
}
