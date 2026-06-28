import { useState, useEffect, useCallback } from 'react'
import { Loader2, Send, UserPlus, KeyRound, CheckCircle2, Users, ExternalLink } from 'lucide-react'
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

  // Applicants — Careers page submissions (job_applicants table, public
  // /careers/apply). Lets the founder review who applied and, for anyone
  // worth bringing on, seed them a real platform account in one click via
  // /careers/applicants/{id}/invite — same invite-by-email mechanism as the
  // student-onboarding form above, just keyed off an applicant row instead
  // of a hand-typed email.
  const [applicants, setApplicants] = useState([])
  const [applicantsLoading, setApplicantsLoading] = useState(false)
  const [applicantsError, setApplicantsError] = useState('')
  const [invitingId, setInvitingId] = useState(null)
  const [inviteNotes, setInviteNotes] = useState({}) // applicant id -> result message

  const loadApplicants = useCallback(async () => {
    if (!secret) return
    setApplicantsLoading(true)
    setApplicantsError('')
    try {
      const res = await fetch(`${API_BASE}/api/v1/careers/applicants`, {
        headers: { 'X-Admin-Secret': secret },
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.detail || `Request failed (${res.status})`)
      setApplicants(data.applicants || [])
    } catch (err) {
      setApplicantsError(err.message || 'Could not load applicants')
    } finally {
      setApplicantsLoading(false)
    }
  }, [secret])

  useEffect(() => {
    if (secret) loadApplicants()
  }, [secret, loadApplicants])

  async function handleInviteApplicant(applicant) {
    setInvitingId(applicant.id)
    setInviteNotes(n => ({ ...n, [applicant.id]: '' }))
    try {
      const res = await fetch(`${API_BASE}/api/v1/careers/applicants/${applicant.id}/invite`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Admin-Secret': secret,
        },
        body: JSON.stringify({ plan: 'starter' }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.detail || `Request failed (${res.status})`)
      setInviteNotes(n => ({ ...n, [applicant.id]: 'Invited — magic-link email sent.' }))
      loadApplicants()
    } catch (err) {
      setInviteNotes(n => ({ ...n, [applicant.id]: err.message || 'Could not invite this applicant' }))
    } finally {
      setInvitingId(null)
    }
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

      <div className="admin-card admin-card-wide">
        <div className="admin-header">
          <Users size={18} />
          <h1>Careers Applicants</h1>
        </div>
        <p className="admin-sub">
          Everyone who submitted through the public Careers page. Seed a real account for anyone worth bringing
          on — same invite-by-email flow as above, no password ever touches this screen.
        </p>

        {!secret && <p className="admin-hint">Paste your admin secret above to load applicants.</p>}

        {secret && applicantsLoading && <p className="admin-hint"><Loader2 size={14} className="spin" /> Loading…</p>}
        {secret && applicantsError && <p className="admin-error">{applicantsError}</p>}

        {secret && !applicantsLoading && !applicantsError && applicants.length === 0 && (
          <p className="admin-hint">No applicants yet.</p>
        )}

        {secret && applicants.length > 0 && (
          <div className="admin-applicants-list">
            {applicants.map(a => (
              <div className="admin-applicant-row" key={a.id}>
                <div className="admin-applicant-info">
                  <div className="admin-applicant-name">
                    {a.name} <span className="admin-applicant-email">{a.email}</span>
                  </div>
                  <div className="admin-applicant-meta">
                    {a.role_interest && <span>{a.role_interest}</span>}
                    <span className={`admin-applicant-status admin-applicant-status-${a.status}`}>{a.status}</span>
                    {a.created_at && <span>{new Date(a.created_at).toLocaleDateString()}</span>}
                  </div>
                  {a.portfolio_url && (
                    <a href={a.portfolio_url} target="_blank" rel="noreferrer" className="admin-applicant-link">
                      <ExternalLink size={12} /> {a.portfolio_url}
                    </a>
                  )}
                  {a.note && <p className="admin-applicant-note">{a.note}</p>}
                  {inviteNotes[a.id] && <p className="admin-applicant-result">{inviteNotes[a.id]}</p>}
                </div>
                <button
                  type="button"
                  className="btn-outline admin-applicant-invite"
                  disabled={invitingId === a.id || a.status === 'invited' || !!a.user_id}
                  onClick={() => handleInviteApplicant(a)}
                >
                  {invitingId === a.id ? <Loader2 size={14} className="spin" /> : <UserPlus size={14} />}
                  {a.status === 'invited' || a.user_id ? 'Invited' : invitingId === a.id ? 'Inviting…' : 'Seed account'}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
