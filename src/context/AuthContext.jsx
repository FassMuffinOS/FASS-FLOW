import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [session, setSession] = useState(undefined) // undefined = loading

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
    })

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
    })

    return () => subscription.unsubscribe()
  }, [])

  const signIn = (email, password) =>
    supabase.auth.signInWithPassword({ email, password })

  // OAuth sign-in/sign-up in one step — Supabase auto-creates the user on
  // first login with any of these, so this doubles as self-serve signup.
  // 'azure' is Microsoft's provider key in Supabase Auth; 'linkedin_oidc'
  // is LinkedIn's newer OpenID Connect provider (the older 'linkedin'
  // provider is deprecated and only returns name/email/photo either way —
  // LinkedIn doesn't expose company or work-history data to standard apps).
  const signInWithProvider = (provider) =>
    supabase.auth.signInWithOAuth({
      provider,
      // Lands on a dedicated callback page (not /dashboard directly) so we
      // can branch a brand-new signup into onboarding (/start) instead of
      // dropping them on an empty Dashboard with no business profile yet.
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    })

  const signOut = () => supabase.auth.signOut()

  return (
    <AuthContext.Provider value={{ session, signIn, signInWithProvider, signOut, loading: session === undefined }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
