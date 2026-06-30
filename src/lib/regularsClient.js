// ── Regulars client ──────────────────────────────────────────
// Thin wrapper around the backend's /regulars endpoints — the standalone
// Wallet/loyalty product for non-govcon local businesses. /signup is
// unauthenticated by design (it's account creation), so this uses plain
// fetch, not apiFetch, same as affiliates.js's /apply pattern.
const API_BASE = import.meta.env.VITE_API_URL || ''

export function regularsEnabled() {
  return !!API_BASE
}

// Live Stripe-backed price catalog. Returns
// { plans: { starter: { monthly: {price_id, amount_cents}, annual: {...} }, pro: {...} } }
export async function listRegularsPrices() {
  if (!API_BASE) return { plans: {} }
  try {
    const res = await fetch(`${API_BASE}/api/v1/regulars/prices`)
    if (!res.ok) return { plans: {} }
    return res.json()
  } catch {
    return { plans: {} }
  }
}

// One-step account + checkout. Returns { user_id, session, checkout_url }.
export async function regularsSignup({ email, password, businessName, plan, billingInterval }) {
  const res = await fetch(`${API_BASE}/api/v1/regulars/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email, password, business_name: businessName, plan, billing_interval: billingInterval,
    }),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error(data.detail || `Signup failed (${res.status})`)
  }
  return data
}

export async function regularsStatus(userId) {
  if (!API_BASE || !userId) return null
  try {
    const res = await fetch(`${API_BASE}/api/v1/regulars/status?user_id=${userId}`)
    if (!res.ok) return null
    return res.json()
  } catch {
    return null
  }
}
