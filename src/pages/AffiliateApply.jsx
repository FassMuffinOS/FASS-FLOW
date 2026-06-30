import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Snowflake, ArrowRight, Loader2, Copy, Check, Sparkles, Link2 } from 'lucide-react'
import { supabase } from '../lib/supabase'
import useSeo from '../hooks/useSeo'
import './AffiliateApply.css'

const API_BASE = import.meta.env.VITE_API_URL || ''
const REF_STORAGE_KEY = 'fass_ref' // same key AuthContext.jsx writes to on ?ref= capture

const PLATFORMS = [
  { value: '', label: 'Select one' },
  { value: 'instagram', label: 'Instagram' },
  { value: 'youtube', label: 'YouTube' },
  { value: 'tiktok', label: 'TikTok' },
  { value: 'blog', label: 'Blog / website' },
  { value: 'newsletter', label: 'Newsletter' },
  { value: 'other', label: 'Other' },
]

const AUDIENCE_BANDS = [
  { value: '', label: 'Select one' },
  { value: 'under-1k', label: 'Under 1,000' },
  { value: '1k-10k', label: '1,000 – 10,000' },
  { value: '10k-50k', label: '10,000 – 50,000' },
  { value: '50k-plus', label: '50,000+' },
]

const WHY = [
  '30% commission, recurring for 12 months on every referral that stays subscribed',
  'Your link and code generate instantly — start sharing while your application is reviewed',
  'A full creator dashboard: stats, growth calendar, pitch scripts, payouts',
  'Recruit other creators and earn 10% of everything they earn too',
]

function readStoredRefCode() {
  try {
    const raw = JSON.parse(localStorage.getItem(REF_STORAGE_KEY) || 'null')
    return raw?.code || null
  } catch {
    return null
  }
}

// Public application page — the front door for someone who wants to promote
// FASS Flow WITHOUT being a customer first. Deliberately separate from
// SignIn.jsx: this creates a brand-new, affiliate-only account in one step
// and drops the applicant straight into the real affiliate dashboard with a
// live referral code, no waiting on review. Admin review (AffiliateAdmin)
// is for curation only — it never blocks the ability to promote.
export default function AffiliateApply() {
  useSeo({
    title: 'Apply — Creator Partner Program',
    description: 'Apply to become a FASS Flow creator partner. Get your referral link instantly and start earning 30% recurring commission.',
    path: '/affiliates/apply',
  })
  const navigate = useNavigate()

  const [form, setForm] = useState({
    full_name: '',
    email: '',
    password: '',
    platform: '',
    channel_url: '',
    audience_size: '',
    why_join: '',
    how_promote: '',
  })
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState(null) // { affiliate, link }
  const [copied, setCopied] = useState(false)

  function update(field, value) {
    setForm(f => ({ ...f, [field]: value }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (submitting) return
    setError('')

    if (!form.full_name.trim()) return setError('Tell us your name.')
    if (!form.email.trim() || !form.email.includes('@')) return setError('Enter a valid email.')
    if (!form.password || form.password.length < 8) return setError('Password must be at least 8 characters.')

    setSubmitting(true)
    try {
      const res = await fetch(`${API_BASE}/api/v1/affiliates/apply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: form.email.trim().toLowerCase(),
          password: form.password,
          full_name: form.full_name.trim(),
          platform: form.platform || null,
          channel_url: form.channel_url.trim() || null,
          audience_size: form.audience_size || null,
          why_join: form.why_join.trim() || null,
          how_promote: form.how_promote.trim() || null,
          ref_code: readStoredRefCode(),
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.detail || `Could not submit your application (${res.status})`)

      // Establish a real client-side session the same way SignIn.jsx does —
      // more reliable than trusting the backend's raw token pair, and it
      // keeps AuthContext/localStorage/auto-refresh all wired up correctly.
      await supabase.auth.signInWithPassword({ email: form.email.trim().toLowerCase(), password: form.password })

      const link = `${window.location.origin}/?ref=${data.affiliate.code}`
      setResult({ affiliate: data.affiliate, link })
    } catch (err) {
      setError(err.message || 'Something went wrong — try again.')
    } finally {
      setSubmitting(false)
    }
  }

  function copyLink() {
    if (!result?.link) return
    navigator.clipboard.writeText(result.link).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 1800)
    })
  }

  return (
    <div className="afa-page">
      <div className="afa-shard afa-shard-1" />
      <div className="afa-shard afa-shard-2" />
      <div className="afa-shard afa-shard-3" />

      <div className="afa-shell">
        <div className="afa-side">
          <span className="afa-badge"><Snowflake size={14} /> Creator Partner Program</span>
          <h1 className="afa-title">Apply to promote FASS Flow</h1>
          <p className="afa-sub">
            Your referral code generates the moment you apply — share it and start earning while
            we finish setting up your account. No waiting required.
          </p>
          <ul className="afa-why">
            {WHY.map(point => (
              <li key={point}><Check size={14} /> {point}</li>
            ))}
          </ul>
        </div>

        <div className="afa-card">
          {!result ? (
            <form className="afa-form" onSubmit={handleSubmit}>
              <h2 className="afa-form-title">Tell us about yourself</h2>

              <label className="afa-field">
                <span>Full name</span>
                <input value={form.full_name} onChange={e => update('full_name', e.target.value)} placeholder="Jordan Rivera" required />
              </label>

              <div className="afa-field-row">
                <label className="afa-field">
                  <span>Email</span>
                  <input type="email" value={form.email} onChange={e => update('email', e.target.value)} placeholder="you@example.com" required />
                </label>
                <label className="afa-field">
                  <span>Password</span>
                  <input type="password" value={form.password} onChange={e => update('password', e.target.value)} placeholder="At least 8 characters" required />
                </label>
              </div>

              <div className="afa-field-row">
                <label className="afa-field">
                  <span>Primary platform</span>
                  <select value={form.platform} onChange={e => update('platform', e.target.value)}>
                    {PLATFORMS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
                  </select>
                </label>
                <label className="afa-field">
                  <span>Audience size</span>
                  <select value={form.audience_size} onChange={e => update('audience_size', e.target.value)}>
                    {AUDIENCE_BANDS.map(a => <option key={a.value} value={a.value}>{a.label}</option>)}
                  </select>
                </label>
              </div>

              <label className="afa-field">
                <span>Channel / profile link <em>(optional)</em></span>
                <input value={form.channel_url} onChange={e => update('channel_url', e.target.value)} placeholder="https://instagram.com/you" />
              </label>

              <label className="afa-field">
                <span>Why do you want to join? <em>(optional)</em></span>
                <textarea value={form.why_join} onChange={e => update('why_join', e.target.value)} rows={2} placeholder="A sentence or two is plenty" />
              </label>

              <label className="afa-field">
                <span>How will you promote FASS Flow? <em>(optional)</em></span>
                <textarea value={form.how_promote} onChange={e => update('how_promote', e.target.value)} rows={2} placeholder="Posts, newsletter, DMs, etc." />
              </label>

              {error && <p className="afa-error">{error}</p>}

              <button type="submit" className="afa-submit" disabled={submitting}>
                {submitting ? <Loader2 size={16} className="spin" /> : <ArrowRight size={16} />}
                {submitting ? 'Setting up your account…' : 'Apply and get my link'}
              </button>

              <p className="afa-fine">
                By applying you agree to promote FASS Flow honestly and accurately. Commission is
                30%, recurring for 12 months on referrals that stay subscribed. Already a FASS
                Flow customer? <a href="/affiliates">Join from your existing account instead</a>.
              </p>
            </form>
          ) : (
            <div className="afa-success">
              <div className="afa-success-icon"><Sparkles size={22} /></div>
              <h2>You're in — your link is live</h2>
              <p className="afa-success-sub">
                Your application is in for review, but that doesn't block you — start sharing
                your link right now.
              </p>
              <div className="afa-link-box">
                <span className="afa-link-label">Your referral link</span>
                <div className="afa-link-row">
                  <input readOnly value={result.link} onClick={e => e.target.select()} />
                  <button type="button" className="afa-copy-btn" onClick={copyLink}>
                    <Copy size={14} /> {copied ? 'Copied' : 'Copy'}
                  </button>
                </div>
              </div>
              <button type="button" className="afa-submit" onClick={() => navigate('/affiliates/dashboard')}>
                <Link2 size={16} /> Go to my dashboard <ArrowRight size={16} />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
