import { createContext, useContext, useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'

const AuthContext = createContext(null)
const API_BASE = import.meta.env.VITE_API_URL || ''
const REF_STORAGE_KEY = 'fass_ref'
const REF_WINDOW_MS = 30 * 24 * 60 * 60 * 1000 // 30-day attribution window

export function AuthProvider({ children }) {
  const [session, setSession] = useState(undefined) // undefined = loading
  const attributed = useRef(false)

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

  // Affiliate click capture — any page can be the landing page (a creator
  // might link straight to /pricing or /masterclass, not just "/"), so this
  // reads ?ref= on whatever URL the visitor actually lands on. First code
  // seen wins for the life of the 30-day window; a later link doesn't
  // overwrite an earlier one, matching the backend's first-click-wins rule.
  //
  // ?src= is the channel tag (discord/reddit/tiktok/…) so the creator can see
  // which placement drove the click. It rides along with the code under
  // first-click-wins: the source stored is the one from the FIRST tagged link
  // this visitor hit, kept in lockstep with the code it was captured with.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const code = params.get('ref')
    if (!code) return
    const source = params.get('src') || null
    // Preserve the original capture if one already exists in-window — don't
    // let a later link overwrite the source that first brought them in.
    let existing = null
    try {
      existing = JSON.parse(localStorage.getItem(REF_STORAGE_KEY) || 'null')
    } catch {
      existing = null
    }
    const fresh = !existing?.code || Date.now() - (existing.ts || 0) > REF_WINDOW_MS
    if (fresh) {
      localStorage.setItem(REF_STORAGE_KEY, JSON.stringify({ code, source, ts: Date.now() }))
    }
    if (API_BASE) {
      fetch(`${API_BASE}/api/v1/affiliates/track-click`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, landing_path: window.location.pathname, source }),
      }).catch(() => {})
    }
  }, [])

  // Attribution — once someone is actually signed in, tell the backend
  // which (if any) stored ref code brought them here. Runs once per app
  // load via the `attributed` ref guard, not on every token-refresh
  // re-render of `session`. The backend itself also no-ops if this user
  // already has a referred_by_code set, so this is safe to call more than
  // once across browser sessions too.
  useEffect(() => {
    if (!session?.user?.id || attributed.current || !API_BASE) return
    let raw
    try {
      raw = JSON.parse(localStorage.getItem(REF_STORAGE_KEY) || 'null')
    } catch {
      raw = null
    }
    if (!raw?.code || Date.now() - raw.ts > REF_WINDOW_MS) return
    attributed.current = true
    fetch(`${API_BASE}/api/v1/affiliates/attribute`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: session.user.id, code: raw.code, source: raw.source || null }),
    }).catch(() => {})
  }, [session])

  const signIn = (email, password) =>
    supabase.auth.signInWithPassword({ email, password })

  // Email/password account creation. If the Supabase project requires email
  // confirmation, the returned session is null until the user confirms (the
  // SignIn page handles that case); otherwise a session comes back right away
  // and the user goes straight into onboarding. Confirmation links land on
  // /auth/callback so a confirmed brand-new user routes into the wizard.
  const signUp = (email, password) =>
    supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    })

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
    <AuthContext.Provider value={{ session, signIn, signUp, signInWithProvider, signOut, loading: session === undefined }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
