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
