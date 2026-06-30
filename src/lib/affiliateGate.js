import { useState, useEffect } from 'react'

const API_BASE = import.meta.env.VITE_API_URL || ''

// Route-level counterpart to AppShell/TopBar's UI-level wall. An affiliate-
// only account (profiles.is_affiliate_only, provisioned by the external
// /affiliates/apply flow) gets a real Supabase Auth session, so without this
// guard it could type any GovCon URL directly into the address bar and load
// that page's content even though the sidebar/topbar around it is stripped.
// This list mirrors AppShell's AFFILIATE_NAV_ITEMS exactly — anything not
// listed here is GovCon product surface and bounces to /affiliates/dashboard.
export const AFFILIATE_ALLOWED_PATHS = ['/affiliates/dashboard', '/affiliates', '/settings', '/support']

export function isAffiliateAllowedPath(pathname) {
  return AFFILIATE_ALLOWED_PATHS.some(p => pathname === p || pathname.startsWith(p + '/'))
}

// Fetches just the is_affiliate_only flag for a signed-in user via the
// public, unauthenticated, 120s-cached GET /users/{id}/profile (see
// users.py) — cheap enough to call from every route guard.
export async function fetchIsAffiliateOnly(userId) {
  if (!userId) return false
  try {
    const res = await fetch(`${API_BASE}/api/v1/users/${userId}/profile`)
    if (!res.ok) return false
    const data = await res.json()
    return !!data?.is_affiliate_only
  } catch {
    return false
  }
}

// null while checking (no session yet decided, or fetch in flight) — every
// caller should treat null as "render nothing yet", same as `loading` from
// useAuth(), to avoid a flash of GovCon content before the redirect lands.
export function useAffiliateOnly(session) {
  const [affiliateOnly, setAffiliateOnly] = useState(null)
  const userId = session?.user?.id

  useEffect(() => {
    let cancelled = false
    if (!userId) {
      setAffiliateOnly(false)
      return
    }
    setAffiliateOnly(null)
    fetchIsAffiliateOnly(userId).then(v => { if (!cancelled) setAffiliateOnly(v) })
    return () => { cancelled = true }
  }, [userId])

  return affiliateOnly
}
