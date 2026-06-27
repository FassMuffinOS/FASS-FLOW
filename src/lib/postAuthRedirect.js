// Tiny redirect-intent helper. SignIn.jsx and AuthCallback.jsx both
// hardcode navigate('/dashboard') on success — there's no router state
// that survives a full email/password sign-up POST or an OAuth provider
// round-trip, so we stash the intended destination in localStorage right
// before sending someone to /signin, and consume (read + clear) it the
// moment auth actually succeeds. Used by the affiliate program's
// account-first CTA: click "Become an affiliate" -> straight to sign-up,
// land on /affiliates/dashboard instead of the default /dashboard.
const KEY = 'fass_post_auth_redirect'

export function setPostAuthRedirect(path) {
  try {
    localStorage.setItem(KEY, path)
  } catch {
    // Storage can throw in locked-down/private contexts — not worth
    // failing the navigation over, the user just lands on /dashboard.
  }
}

export function consumePostAuthRedirect() {
  try {
    const path = localStorage.getItem(KEY)
    if (path) localStorage.removeItem(KEY)
    return path
  } catch {
    return null
  }
}
