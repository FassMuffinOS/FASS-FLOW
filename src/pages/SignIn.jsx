import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'
import { consumePostAuthRedirect } from '../lib/postAuthRedirect'
import './SignIn.css'

// Minimal inline brand marks — lucide-react doesn't ship logo glyphs, and
// pulling in a whole brand-icon package for three static SVGs isn't worth
// the dependency weight.
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
function MicrosoftIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
      <rect x="0" y="0" width="8.5" height="8.5" fill="#F25022"/>
      <rect x="9.5" y="0" width="8.5" height="8.5" fill="#7FBA00"/>
      <rect x="0" y="9.5" width="8.5" height="8.5" fill="#00A4EF"/>
      <rect x="9.5" y="9.5" width="8.5" height="8.5" fill="#FFB900"/>
    </svg>
  )
}
function LinkedInIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
      <rect width="18" height="18" rx="3" fill="#0A66C2"/>
      <path fill="#fff" d="M5.34 6.9H3.13V14.4H5.34V6.9ZM4.24 5.94a1.27 1.27 0 1 0 0-2.55 1.27 1.27 0 0 0 0 2.55ZM6.78 6.9H8.9v1.02h.03c.3-.56 1.03-1.16 2.12-1.16 2.26 0 2.68 1.49 2.68 3.42v4.22h-2.21v-3.74c0-.89-.02-2.04-1.25-2.04-1.25 0-1.44.97-1.44 1.97v3.81H6.78V6.9Z"/>
    </svg>
  )
}

export default function SignIn() {
  const { signIn, signInWithProvider } = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  // Careers page hand-off: after submitting an application, Careers.jsx
  // redirects here with ?applied=1&email=... so the applicant is prompted
  // to create a real account right away instead of just getting a "thanks,
  // we'll email you" dead end. There's no separate email/password signup
  // form in this app — Google/Microsoft/LinkedIn OAuth auto-creates the
  // account on first use (see AuthContext's signInWithProvider comment) —
  // so the banner below points them at those buttons, and the email field
  // is prefilled in case they came in to reset/sign in instead.
  const appliedFromCareers = searchParams.get('applied') === '1'
  const [email, setEmail] = useState(searchParams.get('email') || '')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [oauthLoading, setOauthLoading] = useState(null)

  async function handleOAuth(provider) {
    setError('')
    setOauthLoading(provider)
    const { error } = await signInWithProvider(provider)
    if (error) {
      setError(error.message)
      setOauthLoading(null)
    }
    // On success the browser redirects away to the provider, so there's
    // nothing else to do here — AuthContext picks up the session on return.
  }

  // Forgot-password flow — collapsed into the same card so a student who
  // can't remember their password doesn't have to leave the page or guess
  // where to go. Reuses whatever's already typed in the email field.
  const [showReset, setShowReset] = useState(false)
  const [resetStatus, setResetStatus] = useState('') // '' | 'sending' | 'sent' | error message

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)

    const { error } = await signIn(email, password)

    if (error) {
      setError(error.message)
      setLoading(false)
    } else {
      navigate(consumePostAuthRedirect() || '/dashboard')
    }
  }

  async function handleResetPassword(e) {
    e.preventDefault()
    if (!email.trim()) {
      setResetStatus('Enter your email above first, then click "Send reset link."')
      return
    }
    setResetStatus('sending')
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/signin`,
    })
    setResetStatus(error ? error.message : 'sent')
  }

  return (
    <div className="signin">
      <div className="signin-card">
        <a href="/" className="signin-logo">
          <span className="signin-logo-icon">⬡</span>
          <span>FASS <strong>Flow</strong></span>
        </a>

        <h1 className="signin-title">{appliedFromCareers ? 'Thanks for applying' : 'Welcome back'}</h1>
        <p className="signin-sub">
          {appliedFromCareers
            ? "We got what you sent — create your account below so we know where to reach you, and you'll be set up the moment we're ready to talk."
            : 'Sign in to pick up where you left off — WARDOG opportunities, your pipeline, and the Masterclass are all waiting.'}
        </p>

        {appliedFromCareers && (
          <p className="signin-sub" style={{ marginTop: -8, fontWeight: 600 }}>
            Create your account with one click below ↓
          </p>
        )}

        <div className="signin-oauth">
          <button type="button" className="signin-oauth-btn" onClick={() => handleOAuth('google')} disabled={!!oauthLoading}>
            <GoogleIcon /> {oauthLoading === 'google' ? 'Redirecting…' : 'Continue with Google'}
          </button>
          <button type="button" className="signin-oauth-btn" onClick={() => handleOAuth('azure')} disabled={!!oauthLoading}>
            <MicrosoftIcon /> {oauthLoading === 'azure' ? 'Redirecting…' : 'Continue with Microsoft'}
          </button>
          <button type="button" className="signin-oauth-btn" onClick={() => handleOAuth('linkedin_oidc')} disabled={!!oauthLoading}>
            <LinkedInIcon /> {oauthLoading === 'linkedin_oidc' ? 'Redirecting…' : 'Continue with LinkedIn'}
          </button>
        </div>

        <div className="signin-divider"><span>or sign in with email</span></div>

        <form className="signin-form" onSubmit={handleSubmit}>
          <div className="signin-field">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="you@example.com"
            />
          </div>

          <div className="signin-field">
            <div className="signin-field-row">
              <label htmlFor="password">Password</label>
              <button
                type="button"
                className="signin-forgot-link"
                onClick={() => { setShowReset(v => !v); setResetStatus('') }}
              >
                Forgot password?
              </button>
            </div>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
            />
          </div>

          {error && <p className="signin-error">{error}</p>}

          <button type="submit" className="btn-primary signin-btn" disabled={loading}>
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>

        {showReset && (
          <div className="signin-reset">
            {resetStatus === 'sent' ? (
              <p className="signin-reset-success">Check your inbox — we sent a reset link to {email}.</p>
            ) : (
              <>
                <p className="signin-reset-hint">We'll email a reset link to the address above.</p>
                <button
                  type="button"
                  className="btn-outline signin-reset-btn"
                  onClick={handleResetPassword}
                  disabled={resetStatus === 'sending'}
                >
                  {resetStatus === 'sending' ? 'Sending…' : 'Send reset link'}
                </button>
                {resetStatus && resetStatus !== 'sending' && (
                  <p className="signin-error">{resetStatus}</p>
                )}
              </>
            )}
          </div>
        )}

        <p className="signin-contact">
          Need access? <a href="mailto:admin@fass.systems">Contact admin@fass.systems</a>
        </p>
        <p className="signin-contact">
          New to FASS Flow? <a href="/masterclass">See plans &amp; the Masterclass</a>
        </p>
      </div>
    </div>
  )
}
