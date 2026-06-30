import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'
import { consumePostAuthRedirect } from '../lib/postAuthRedirect'
import { getBusinessProfile } from '../lib/businessProfile'
import './SignIn.css'

// Minimal inline brand mark — lucide-react doesn't ship logo glyphs, and
// pulling in a whole brand-icon package for one static SVG isn't worth the
// dependency weight.
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

export default function SignIn() {
  const { signIn, signUp, signInWithProvider } = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  // Careers hand-off: ?applied=1&email=… arrives after submitting an
  // application — default such visitors to "create account".
  const appliedFromCareers = searchParams.get('applied') === '1'
  const [mode, setMode] = useState(appliedFromCareers ? 'signup' : 'signin') // 'signin' | 'signup'
  const [email, setEmail] = useState(searchParams.get('email') || '')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('') // e.g. "check your email to confirm"
  const [loading, setLoading] = useState(false)
  const [oauthLoading, setOauthLoading] = useState(null)
  const [showReset, setShowReset] = useState(false)
  const [resetStatus, setResetStatus] = useState('')

  const isSignup = mode === 'signup'

  async function handleOAuth(provider) {
    setError('')
    setOauthLoading(provider)
    const { error } = await signInWithProvider(provider)
    if (error) { setError(error.message); setOauthLoading(null) }
  }

  // After a successful sign-in, route the same way OAuth does: no business
  // profile yet → onboarding wizard; profile set up → the hub.
  async function routeAfterSignIn() {
    const redirect = consumePostAuthRedirect()
    if (redirect) { navigate(redirect); return }
    try {
      const { data } = await supabase.auth.getUser()
      const profile = data?.user ? await getBusinessProfile(data.user.id) : null
      navigate(profile ? '/get-started' : '/onboarding')
    } catch {
      navigate('/get-started')
    }
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setNotice('')
    setLoading(true)

    if (isSignup) {
      const { data, error } = await signUp(email, password)
      if (error) { setError(error.message); setLoading(false); return }
      // A brand-new account always starts in onboarding. If the project
      // requires email confirmation there's no session yet — tell them to
      // confirm; otherwise drop straight into the wizard.
      if (data?.session) {
        navigate('/onboarding', { replace: true })
      } else {
        setNotice(`Almost there — we sent a confirmation link to ${email}. Click it and you'll land right in setup.`)
        setLoading(false)
      }
      return
    }

    const { error } = await signIn(email, password)
    if (error) { setError(error.message); setLoading(false); return }
    await routeAfterSignIn()
  }

  async function handleResetPassword() {
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

  function switchMode() {
    setMode(m => (m === 'signin' ? 'signup' : 'signin'))
    setError('')
    setNotice('')
    setShowReset(false)
  }

  return (
    <div className="signin">
      <div className="signin-card">
        <a href="/" className="signin-logo">
          <span className="signin-logo-icon">⬡</span>
          <span>FASS <strong>Flow</strong></span>
        </a>

        <h1 className="signin-title">
          {appliedFromCareers ? 'Thanks for applying' : isSignup ? 'Create your account' : 'Welcome back'}
        </h1>
        <p className="signin-sub">
          {isSignup
            ? "Start in minutes — we'll set up your business and tailor FASS Flow to exactly how you work."
            : 'Sign in to pick up where you left off — WARDOG opportunities, your pipeline, and the Masterclass are all waiting.'}
        </p>

        <div className="signin-oauth">
          <button type="button" className="signin-oauth-btn" onClick={() => handleOAuth('google')} disabled={!!oauthLoading}>
            <GoogleIcon /> {oauthLoading === 'google' ? 'Redirecting…' : `Continue with Google`}
          </button>
        </div>

        <div className="signin-divider"><span>or {isSignup ? 'sign up' : 'sign in'} with email</span></div>

        <form className="signin-form" onSubmit={handleSubmit}>
          <div className="signin-field">
            <label htmlFor="email">Email</label>
            <input id="email" type="email" autoComplete="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" />
          </div>

          <div className="signin-field">
            <div className="signin-field-row">
              <label htmlFor="password">Password</label>
              {!isSignup && (
                <button type="button" className="signin-forgot-link" onClick={() => { setShowReset(v => !v); setResetStatus('') }}>
                  Forgot password?
                </button>
              )}
            </div>
            <input
              id="password"
              type="password"
              autoComplete={isSignup ? 'new-password' : 'current-password'}
              required
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder={isSignup ? 'Choose a password' : '••••••••'}
            />
          </div>

          {error && <p className="signin-error">{error}</p>}
          {notice && <p className="signin-notice">{notice}</p>}

          <button type="submit" className="btn-primary signin-btn" disabled={loading}>
            {loading ? (isSignup ? 'Creating account…' : 'Signing in…') : (isSignup ? 'Create account' : 'Sign in')}
          </button>
        </form>

        {showReset && !isSignup && (
          <div className="signin-reset">
            {resetStatus === 'sent' ? (
              <p className="signin-reset-success">Check your inbox — we sent a reset link to {email}.</p>
            ) : (
              <>
                <p className="signin-reset-hint">We'll email a reset link to the address above.</p>
                <button type="button" className="btn-outline signin-reset-btn" onClick={handleResetPassword} disabled={resetStatus === 'sending'}>
                  {resetStatus === 'sending' ? 'Sending…' : 'Send reset link'}
                </button>
                {resetStatus && resetStatus !== 'sending' && <p className="signin-error">{resetStatus}</p>}
              </>
            )}
          </div>
        )}

        <p className="signin-contact">
          {isSignup ? 'Already have an account?' : 'New to FASS Flow?'}{' '}
          <button type="button" className="signin-switch" onClick={switchMode}>
            {isSignup ? 'Sign in' : 'Create an account'}
          </button>
        </p>
      </div>
    </div>
  )
}
