import { useEffect, useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { getBusinessProfile } from '../lib/businessProfile'
import { consumePostAuthRedirect } from '../lib/postAuthRedirect'
import { Loader } from 'lucide-react'
import './SignIn.css'

// Where every OAuth provider (Google/Microsoft/LinkedIn) redirects back to.
// Supabase's client parses the access token out of the URL automatically
// (detectSessionInUrl, on by default) the moment this page loads, which
// fires AuthContext's onAuthStateChange and populates `session` here.
//
// From there: a brand-new signup has no business_profiles row yet, so they
// go to /start (the onboarding wizard) instead of landing on an empty
// Dashboard. Anyone who already has a profile — i.e. has used Wallet,
// Rewards, or Start Business before, on any sign-in method — goes straight
// to /dashboard. This also doubles as the "did the user cancel/deny the
// provider's consent screen" landing spot, since LinkedIn/Google/Microsoft
// all redirect back here with an error in the URL either way.
export default function AuthCallback() {
  const { session, loading } = useAuth()
  const navigate = useNavigate()
  // Read any provider error straight from the URL on first render (lazy
  // initializer) instead of in an effect — Google/Microsoft/LinkedIn all
  // append error/error_description if the user denies consent, and this
  // never changes after mount so there's nothing to "synchronize".
  const [error] = useState(() => {
    const params = new URLSearchParams(window.location.hash.replace(/^#/, '') || window.location.search)
    const errDescription = params.get('error_description') || params.get('error')
    return errDescription ? errDescription.replace(/\+/g, ' ') : ''
  })
  const routed = useRef(false)

  useEffect(() => {
    if (error || loading || routed.current) return

    if (!session?.user) {
      // No error param, but also no session after loading settled — the
      // provider redirect didn't carry a valid session. Bounce back to
      // sign-in rather than leaving the user stuck on a blank page.
      navigate('/signin', { replace: true })
      return
    }

    routed.current = true
    ;(async () => {
      // A stashed redirect (set right before sending someone to /signin,
      // e.g. the affiliate program's "Become an affiliate" CTA) means they
      // came here for something specific that has nothing to do with the
      // business-profile onboarding wizard — being an affiliate doesn't
      // require a business at all. Honor it and skip the /start gate
      // entirely, whether they're a brand-new signup or a returning user.
      const redirect = consumePostAuthRedirect()
      if (redirect) {
        navigate(redirect, { replace: true })
        return
      }
      try {
        const profile = await getBusinessProfile(session.user.id)
        navigate(profile ? '/dashboard' : '/start', { replace: true })
      } catch {
        // If the profile lookup itself fails (e.g. backend hiccup), don't
        // strand a successfully-authenticated user — send them to the
        // Dashboard, which can recover on its own.
        navigate('/dashboard', { replace: true })
      }
    })()
  }, [session, loading, error, navigate])

  return (
    <div className="signin">
      <div className="signin-card">
        <a href="/" className="signin-logo">
          <span className="signin-logo-icon">⬡</span>
          <span>FASS <strong>Flow</strong></span>
        </a>
        {error ? (
          <>
            <h1 className="signin-title">Sign-in didn't go through</h1>
            <p className="signin-error">{error}</p>
            <a className="btn-primary signin-btn" href="/signin" style={{ display: 'inline-block', textAlign: 'center', textDecoration: 'none' }}>
              Back to sign in
            </a>
          </>
        ) : (
          <>
            <h1 className="signin-title">Signing you in…</h1>
            <p className="signin-sub"><Loader className="signin-spin" size={16} style={{ verticalAlign: 'middle', marginRight: 6 }} />One moment.</p>
          </>
        )}
      </div>
    </div>
  )
}
