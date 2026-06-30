import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Snowflake, ArrowRight, Loader2, Copy, Check, Sparkles, Link2, ShieldCheck, ChevronDown } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { readStoredRefCode, setAffiliateApplyIntent } from '../lib/affiliateRef'
import useSeo from '../hooks/useSeo'
import './AffiliateApply.css'

const API_BASE = import.meta.env.VITE_API_URL || ''

// Minimal inline brand mark, same as SignIn.jsx — lucide-react doesn't ship
// logo glyphs, not worth a whole package for one static SVG.
function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
      <path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.71v2.26h2.9c1.7-1.57 2.7-3.88 2.7-6.61z"/>
      <path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.9-2.26c-.8.55-1.84.87-3.06.87-2.36 0-4.36-1.59-5.08-3.73H.92v2.33A9 9 0 0 0 9 18z"/>
      <path fill="#FBBC05" d="M3.92 10.7A5.4 5.4 0 0 1 3.64 9c0-.59.1-1.16.28-1.7V4.97H.92A9 9 0 0 0 0 9c0 1.45.35 2.83.92 4.03l3-2.33z"/>
      <path fill="#EA4335" d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.58A8.59 8.59 0 0 0 9 0 9 9 0 0 0 .92 4.97l3 2.33C4.64 5.17 6.64 3.58 9 3.58z"/>
    </svg>
  )
}

const STEPS = [
  { title: 'Apply', body: 'Your link goes live the moment you submit — no waiting to start sharing it.' },
  { title: 'Get reviewed', body: "We check applications for curation only — it never blocks you from earning, even before it's done." },
  { title: 'Get paid', body: 'Every conversion is tracked automatically; payouts go out from your dashboard balance.' },
]

const FAQS = [
  { q: 'Do I need to already be a FASS Flow customer?', a: "No — this application creates a brand-new, affiliate-only account. If you're already a customer, use the in-app affiliate page instead so you keep your existing account." },
  { q: 'How much do I actually earn?', a: '30% commission, recurring for 12 months on any referral that stays subscribed — plus 10% of everything anyone you recruit earns.' },
  { q: "What if my application doesn't get approved?", a: "Approval is for curation and visibility only. It doesn't pause your ability to share your link or earn commission either way." },
  { q: 'Is my information kept private?', a: "Your application is only used to set up your creator account and isn't shared or sold." },
]

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
  const { signInWithProvider } = useAuth()

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
  const [oauthLoading, setOauthLoading] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState(null) // { affiliate, link }
  const [copied, setCopied] = useState(false)
  const [openFaq, setOpenFaq] = useState(null)

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

  // Skips the password field entirely — Supabase creates the auth.users row
  // itself on the OAuth round-trip. AuthCallback.jsx reads this flag back
  // on the way in and calls POST /affiliates/apply-oauth to do the
  // affiliate-specific provisioning apply() does inline above.
  async function handleGoogleApply() {
    setError('')
    setOauthLoading(true)
    setAffiliateApplyIntent()
    const { error: err } = await signInWithProvider('google')
    if (err) { setError(err.message); setOauthLoading(false) }
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
            {WHY.map((point, i) => (
              <li key={point}><Check size={14} /> {i === 0 ? <strong>{point}</strong> : point}</li>
            ))}
          </ul>

          <div className="afa-steps">
            <span className="afa-steps-title">What happens next</span>
            <ol className="afa-steps-list">
              {STEPS.map((s, i) => (
                <li key={s.title}>
                  <span className="afa-step-num">{i + 1}</span>
                  <div><strong>{s.title}</strong><p>{s.body}</p></div>
                </li>
              ))}
            </ol>
          </div>

          <div className="afa-faq">
            {FAQS.map(f => (
              <div className="afa-faq-item" key={f.q}>
                <button type="button" className="afa-faq-q" onClick={() => setOpenFaq(o => o === f.q ? null : f.q)}>
                  {f.q}
                  <ChevronDown size={14} className={openFaq === f.q ? 'afa-faq-chevron afa-faq-chevron-open' : 'afa-faq-chevron'} />
                </button>
                {openFaq === f.q && <p className="afa-faq-a">{f.a}</p>}
              </div>
            ))}
          </div>
        </div>

        <div className="afa-card">
          {!result ? (
            <form className="afa-form" onSubmit={handleSubmit}>
              <h2 className="afa-form-title">Tell us about yourself</h2>

              <button type="button" className="afa-oauth-btn" onClick={handleGoogleApply} disabled={oauthLoading || submitting}>
                <GoogleIcon /> {oauthLoading ? 'Redirecting…' : 'Continue with Google'}
              </button>
              <div className="afa-divider"><span>or apply with email</span></div>

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
                <span>What made you want to join? <em>(optional, helps us feature you)</em></span>
                <textarea value={form.why_join} onChange={e => update('why_join', e.target.value)} rows={2} placeholder="A sentence or two is plenty" />
              </label>

              <label className="afa-field">
                <span>How do you picture sharing FASS Flow? <em>(optional, helps us feature you)</em></span>
                <textarea value={form.how_promote} onChange={e => update('how_promote', e.target.value)} rows={2} placeholder="Posts, newsletter, DMs, etc." />
              </label>

              {error && <p className="afa-error">{error}</p>}

              <button type="submit" className="afa-submit" disabled={submitting}>
                {submitting ? <Loader2 size={16} className="spin" /> : <ArrowRight size={16} />}
                {submitting ? 'Setting up your account…' : 'Apply and get my link'}
              </button>

              <p className="afa-trust"><ShieldCheck size={13} /> Your link goes live instantly — review is for curation only, never a gate on earning.</p>

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
