import { useState, useEffect } from 'react'

const API_BASE = import.meta.env.VITE_API_URL || ''

// Route-level counterpart to AppShell's UI-level wall for Regulars
// (profiles.is_wallet_only) accounts — same pattern as affiliateGate.js.
// A Regulars signup gets a real Supabase Auth session, so without this
// guard it could type any GovCon URL directly into the address bar.
export const WALLET_ALLOWED_PATHS = [
  '/regulars/dashboard', '/wallet', '/rewards', '/campaigns', '/giftcards', '/comms', '/settings', '/support',
]

export function isWalletAllowedPath(pathname) {
  return WALLET_ALLOWED_PATHS.some(p => pathname === p || pathname.startsWith(p + '/'))
}

// Same public, unauthenticated, cached GET /users/{id}/profile call
// affiliateGate.js uses — cheap enough for every route guard.
export async function fetchIsWalletOnly(userId) {
  if (!userId) return false
  try {
    const res = await fetch(`${API_BASE}/api/v1/users/${userId}/profile`)
    if (!res.ok) return false
    const data = await res.json()
    return !!data?.is_wallet_only
  } catch {
    return false
  }
}

// null while checking — every caller treats null as "render nothing yet",
// same convention as useAffiliateOnly.
export function useWalletOnly(session) {
  const [walletOnly, setWalletOnly] = useState(null)
  const userId = session?.user?.id

  useEffect(() => {
    let cancelled = false
    if (!userId) {
      setWalletOnly(false)
      return
    }
    setWalletOnly(null)
    fetchIsWalletOnly(userId).then(v => { if (!cancelled) setWalletOnly(v) })
    return () => { cancelled = true }
  }, [userId])

  return walletOnly
}
