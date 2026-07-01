// Cookie-based Supabase auth storage, scoped to .fass.systems — 2026-07-01,
// part of the subdomain rollout (flow./regulars./affiliates.fass.systems).
//
// Why: Supabase's default session storage is localStorage, which is
// scoped per-origin. The moment Regulars/Affiliates move to their own
// subdomains, a session created on flow.fass.systems would not exist on
// regulars.fass.systems — every cross-program link ("back to platform",
// an affiliate's referral landing on Regulars, etc.) would silently log
// the person out instead of just navigating. A cookie with
// `Domain=.fass.systems` is visible to every subdomain automatically,
// which is exactly the sharing behavior we want.
//
// Hand-rolled instead of pulling in @supabase/ssr's cookie helper because
// this build environment has no package-registry access to install a new
// dependency and verify the build with it. This mirrors that package's
// chunking approach (a real Supabase session — access token + refresh
// token + user object — routinely exceeds a single cookie's ~4KB limit)
// using nothing but document.cookie.
//
// Safe everywhere: on localhost or a Vercel preview URL (anything not
// ending in fass.systems), cookies are written host-only (no Domain
// attribute) since there's no subdomain-sharing need there anyway, and a
// browser will refuse to set a cookie with a Domain attribute that
// doesn't match the current host.

const CHUNK_SIZE = 3180 // comfortably under ~4096 bytes once name + attributes are counted
const MAX_CHUNKS = 5    // a real Supabase session has never needed more than this

function cookieDomain() {
  const host = window.location.hostname
  if (host === 'fass.systems' || host.endsWith('.fass.systems')) {
    return '.fass.systems'
  }
  return null // host-only cookie — localhost, *.vercel.app previews, etc.
}

function setCookie(name, value) {
  const domain = cookieDomain()
  const parts = [
    `${name}=${encodeURIComponent(value)}`,
    'Path=/',
    'Max-Age=31536000', // 1 year — Supabase's own refresh-token rotation bounds
                         // the *real* session lifetime, not this cookie's TTL
    'SameSite=Lax',
  ]
  if (domain) parts.push(`Domain=${domain}`)
  if (window.location.protocol === 'https:') parts.push('Secure')
  document.cookie = parts.join('; ')
}

function deleteCookie(name) {
  const domain = cookieDomain()
  const parts = [`${name}=`, 'Path=/', 'Max-Age=0', 'SameSite=Lax']
  if (domain) parts.push(`Domain=${domain}`)
  document.cookie = parts.join('; ')
}

function readAllCookies() {
  if (!document.cookie) return {}
  return document.cookie.split('; ').reduce((acc, pair) => {
    const idx = pair.indexOf('=')
    if (idx === -1) return acc
    acc[pair.slice(0, idx)] = decodeURIComponent(pair.slice(idx + 1))
    return acc
  }, {})
}

// Implements the Supabase `SupportedStorage` interface (getItem/setItem/
// removeItem) — sync return values are fine, the client awaits whatever
// comes back.
export const cookieAuthStorage = {
  getItem(key) {
    const all = readAllCookies()
    if (all[key] != null) return all[key] // small session, single cookie — common case
    if (all[`${key}.0`] == null) return null
    let value = ''
    for (let i = 0; i < MAX_CHUNKS; i++) {
      const chunk = all[`${key}.${i}`]
      if (chunk == null) break
      value += chunk
    }
    return value
  },

  setItem(key, value) {
    // Clear any previous chunk shape first — the new value may need fewer
    // or more chunks than whatever was written last time.
    deleteCookie(key)
    for (let i = 0; i < MAX_CHUNKS; i++) deleteCookie(`${key}.${i}`)

    if (value.length <= CHUNK_SIZE) {
      setCookie(key, value)
      return
    }
    for (let i = 0; i * CHUNK_SIZE < value.length; i++) {
      if (i >= MAX_CHUNKS) break // should never happen for a real session;
                                  // don't silently persist a truncated/corrupt one
      setCookie(`${key}.${i}`, value.slice(i * CHUNK_SIZE, (i + 1) * CHUNK_SIZE))
    }
  },

  removeItem(key) {
    deleteCookie(key)
    for (let i = 0; i < MAX_CHUNKS; i++) deleteCookie(`${key}.${i}`)
  },
}
