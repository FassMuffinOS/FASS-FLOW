// Shared "Customer 360" business profile — the one backend record that
// Start Business, Wallet, and Rewards all read from and write to, so info
// entered in one tool shows up in the others instead of staying trapped in
// that tool's own localStorage or table. See fass-flow-backend's
// app/routers/business_profile.py for the upsert/merge semantics.
//
// 2026-06-29: every endpoint below now requires the caller to be logged in
// as the user_id it's acting on (see business_profile.py's security-fix
// docstring) — calls now go through apiFetch so the Supabase access token
// rides along as a Bearer header instead of a raw, unauthenticated fetch.
import { apiAvailable, apiFetch } from './apiClient'

export async function getBusinessProfile(userId) {
  if (!userId || !apiAvailable()) return null
  try {
    const res = await apiFetch(`/api/v1/business-profile/mine?user_id=${userId}`)
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
  if (!userId || !apiAvailable()) return false
  try {
    const res = await apiFetch('/api/v1/business-profile/mine', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: userId, ...fields }),
    })
    return res.ok
  } catch {
    return false
  }
}

// ── Multi-entity (tiered) ──
// business_profiles above stays a mirror of whichever entity is "active" —
// these calls manage the real multi-business list behind it. Free/Core get
// 1 entity, Pro gets 3, Team is unlimited (enforced server-side).

export async function listBusinessEntities(userId) {
  if (!userId || !apiAvailable()) return { entities: [], limit: 1, plan: 'free' }
  try {
    const res = await apiFetch(`/api/v1/business-profile/entities?user_id=${userId}`)
    if (!res.ok) return { entities: [], limit: 1, plan: 'free' }
    return await res.json()
  } catch {
    return { entities: [], limit: 1, plan: 'free' }
  }
}

export async function createBusinessEntity(userId, businessName) {
  if (!userId || !apiAvailable()) return { ok: false }
  try {
    const res = await apiFetch('/api/v1/business-profile/entities', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: userId, business_name: businessName || null }),
    })
    const data = await res.json().catch(() => null)
    if (!res.ok) return { ok: false, error: data?.detail || 'Could not create business' }
    return { ok: true, entity: data }
  } catch {
    return { ok: false, error: 'Could not create business' }
  }
}

export async function activateBusinessEntity(userId, entityId) {
  if (!userId || !entityId || !apiAvailable()) return false
  try {
    const res = await apiFetch(`/api/v1/business-profile/entities/${entityId}/activate?user_id=${userId}`, {
      method: 'POST',
    })
    return res.ok
  } catch {
    return false
  }
}

export async function deleteBusinessEntity(userId, entityId) {
  if (!userId || !entityId || !apiAvailable()) return { ok: false }
  try {
    const res = await apiFetch(`/api/v1/business-profile/entities/${entityId}?user_id=${userId}`, {
      method: 'DELETE',
    })
    const data = await res.json().catch(() => null)
    if (!res.ok) return { ok: false, error: data?.detail || 'Could not remove business' }
    return { ok: true }
  } catch {
    return { ok: false, error: 'Could not remove business' }
  }
}
