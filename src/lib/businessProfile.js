// Shared "Customer 360" business profile — the one backend record that
// Start Business, Wallet, and Rewards all read from and write to, so info
// entered in one tool shows up in the others instead of staying trapped in
// that tool's own localStorage or table. See fass-flow-backend's
// app/routers/business_profile.py for the upsert/merge semantics.
const API_BASE = import.meta.env.VITE_API_URL || ''

export async function getBusinessProfile(userId) {
  if (!userId || !API_BASE) return null
  try {
    const res = await fetch(`${API_BASE}/api/v1/business-profile/mine?user_id=${userId}`)
    if (!res.ok) return null
    return await res.json()
  } catch {
    return null
  }
}

// Fire-and-forget partial save — callers pass only the fields they own
// (e.g. Wallet sends identity fields, Start Business sends path/checklist).
// Failures are swallowed since this is always a secondary write alongside
// each tool's own primary save; a profile-sync hiccup shouldn't block the
// user's actual action.
export async function saveBusinessProfile(userId, fields) {
  if (!userId || !API_BASE) return false
  try {
    const res = await fetch(`${API_BASE}/api/v1/business-profile/mine`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: userId, ...fields }),
    })
    return res.ok
  } catch {
    return false
  }
}
