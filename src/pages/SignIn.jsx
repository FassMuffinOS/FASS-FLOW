import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'
import './SignIn.css'

export default function SignIn() {
  const { signIn } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

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
      navigate('/dashboard')
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

        <h1 className="signin-title">Welcome back</h1>
        <p className="signin-sub">Sign in to pick up where you left off — WARDOG opportunities, your pipeline, and the Masterclass are all waiting.</p>

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
