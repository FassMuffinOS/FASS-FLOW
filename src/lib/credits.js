// ── AI credits client ──────────────────────────────────────
// Reads the user's AI-credit balance. Consumption happens server-side inside
// /ai/draft-section (returns remaining_credits), so this is just the balance
// read for display + gating. Owner-scoped, so it rides the bearer token.
import { apiAvailable, apiFetch } from './apiClient'

export async function getCreditBalance(userId) {
  if (!userId || !apiAvailable()) return null
  try {
    const res = await apiFetch(`/api/v1/credits/balance?user_id=${userId}`)
    if (!res.ok) return null
    const data = await res.json()
    return typeof data.balance === 'number' ? data.balance : null
  } catch {
    return null
  }
}

// Purchasable credit-pack catalog — read live from Stripe (see
// GET /credits/packs), not hardcoded here, so repricing a pack in Stripe
// shows up with no frontend deploy. Public endpoint, no userId needed.
export async function listCreditPacks() {
  if (!apiAvailable()) return []
  try {
    const res = await apiFetch('/api/v1/credits/packs')
    if (!res.ok) return []
    const data = await res.json()
    return Array.isArray(data.packs) ? data.packs : []
  } catch {
    return []
  }
}

// Starts a Stripe Checkout session for one pack and returns the redirect
// URL — caller does `window.location.href = url`, same pattern as
// Pricing.jsx's subscription checkout.
export async function startCreditCheckout(priceId, userId, email) {
  if (!apiAvailable()) return null
  try {
    const res = await apiFetch('/api/v1/credits/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ price_id: priceId, user_id: userId, email }),
    })
    if (!res.ok) return null
    const data = await res.json()
    return data?.url || null
  } catch {
    return null
  }
}
