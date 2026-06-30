// ── Account Settings client ─────────────────────────────────
// Backs src/pages/Settings.jsx. Preferences/email/password/privacy requests
// are owner-scoped (see app/routers/settings.py), so every call rides the
// bearer token via apiFetch — never a raw fetch. Billing, AI credits,
// Stripe Connect, and the affiliate program are NOT duplicated here; the
// Settings page calls their existing client modules/endpoints directly.
import { apiAvailable, apiFetch, apiFetchJson } from './apiClient'

export async function getPreferences(userId) {
  if (!userId || !apiAvailable()) return null
  try {
    const res = await apiFetch(`/api/v1/settings/preferences?user_id=${userId}`)
    if (!res.ok) return null
    return await res.json()
  } catch {
    return null
  }
}

export async function updatePreferences(userId, fields) {
  if (!userId || !apiAvailable()) return { ok: false }
  try {
    const res = await apiFetch('/api/v1/settings/preferences', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: userId, ...fields }),
    })
    const data = await res.json().catch(() => null)
    if (!res.ok) return { ok: false, error: data?.detail || 'Could not save preferences' }
    return { ok: true, preferences: data }
  } catch {
    return { ok: false, error: 'Could not save preferences' }
  }
}

export async function changeEmail(userId, newEmail) {
  if (!userId || !apiAvailable()) return { ok: false }
  try {
    const res = await apiFetchJson('/api/v1/settings/account/email', { user_id: userId, new_email: newEmail })
    const data = await res.json().catch(() => null)
    if (!res.ok) return { ok: false, error: data?.detail || 'Could not update email' }
    return { ok: true, message: data?.message }
  } catch {
    return { ok: false, error: 'Could not update email' }
  }
}

export async function changePassword(userId, newPassword) {
  if (!userId || !apiAvailable()) return { ok: false }
  try {
    const res = await apiFetchJson('/api/v1/settings/account/password', { user_id: userId, new_password: newPassword })
    const data = await res.json().catch(() => null)
    if (!res.ok) return { ok: false, error: data?.detail || 'Could not update password' }
    return { ok: true }
  } catch {
    return { ok: false, error: 'Could not update password' }
  }
}

export async function requestDataExport(userId) {
  if (!userId || !apiAvailable()) return { ok: false }
  try {
    const res = await apiFetchJson('/api/v1/settings/privacy/export', { user_id: userId })
    return { ok: res.ok }
  } catch {
    return { ok: false }
  }
}

export async function requestAccountDeletion(userId) {
  if (!userId || !apiAvailable()) return { ok: false }
  try {
    const res = await apiFetchJson('/api/v1/settings/privacy/delete', { user_id: userId })
    return { ok: res.ok }
  } catch {
    return { ok: false }
  }
}

export async function listAccountRequests(userId) {
  if (!userId || !apiAvailable()) return []
  try {
    const res = await apiFetch(`/api/v1/settings/privacy/requests?user_id=${userId}`)
    if (!res.ok) return []
    return await res.json()
  } catch {
    return []
  }
}

export async function getConnectStatus(userId) {
  if (!userId || !apiAvailable()) return null
  try {
    const res = await apiFetch(`/api/v1/connect/status?user_id=${userId}`)
    if (!res.ok) return null
    return await res.json()
  } catch {
    return null
  }
}

export async function getAffiliateStatus() {
  if (!apiAvailable()) return null
  try {
    const res = await apiFetch('/api/v1/affiliates/me')
    if (!res.ok) return null
    return await res.json()
  } catch {
    return null
  }
}

export async function getBillingPortalUrl(userId) {
  if (!userId || !apiAvailable()) return null
  try {
    const res = await apiFetch(`/api/v1/subscriptions/portal/${userId}`)
    if (!res.ok) return null
    const data = await res.json()
    return data?.url || null
  } catch {
    return null
  }
}
