// ── Reuse Engine client ────────────────────────────────────
// Talks to fass-flow-backend's reuse_library.py. Same auth model as
// businessProfile.js: every call rides the Supabase bearer token via
// apiFetch, since the library is private owner-scoped data.
import { apiAvailable, apiFetch } from './apiClient'

export async function listReuseBlocks(userId, category) {
  if (!userId || !apiAvailable()) return []
  try {
    const qs = new URLSearchParams({ user_id: userId })
    if (category) qs.set('category', category)
    const res = await apiFetch(`/api/v1/reuse?${qs.toString()}`)
    if (!res.ok) return []
    const data = await res.json()
    return data.blocks || []
  } catch {
    return []
  }
}

export async function suggestReuseBlocks(userId, section, limit = 5) {
  if (!userId || !section || !apiAvailable()) return []
  try {
    const qs = new URLSearchParams({ user_id: userId, section, limit: String(limit) })
    const res = await apiFetch(`/api/v1/reuse/suggest?${qs.toString()}`)
    if (!res.ok) return []
    const data = await res.json()
    return data.blocks || []
  } catch {
    return []
  }
}

export async function createReuseBlock(userId, { title, body, category, source = 'manual' }) {
  if (!userId || !apiAvailable()) return { ok: false }
  try {
    const res = await apiFetch('/api/v1/reuse/blocks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: userId, title, body, category, source }),
    })
    const data = await res.json().catch(() => null)
    if (!res.ok) return { ok: false, error: data?.detail || 'Could not save' }
    return { ok: true, block: data }
  } catch {
    return { ok: false, error: 'Could not save' }
  }
}

export async function markReuseBlockUsed(userId, blockId) {
  if (!userId || !blockId || !apiAvailable()) return false
  try {
    const res = await apiFetch(`/api/v1/reuse/blocks/${blockId}/used?user_id=${userId}`, { method: 'POST' })
    return res.ok
  } catch {
    return false
  }
}

export async function deleteReuseBlock(userId, blockId) {
  if (!userId || !blockId || !apiAvailable()) return false
  try {
    const res = await apiFetch(`/api/v1/reuse/blocks/${blockId}?user_id=${userId}`, { method: 'DELETE' })
    return res.ok
  } catch {
    return false
  }
}

// Guess a library category from a section heading, so saved blocks land in
// the right bucket and suggestions match. Mirrors the backend's categories.
export function guessCategory(heading = '') {
  const h = heading.toLowerCase()
  if (h.includes('technical')) return 'technical_approach'
  if (h.includes('management')) return 'management'
  if (h.includes('past performance')) return 'past_performance'
  if (h.includes('quality')) return 'quality_control'
  if (h.includes('staffing')) return 'staffing'
  if (h.includes('price') || h.includes('cost')) return 'price'
  if (h.includes('safety')) return 'safety'
  if (h.includes('transition')) return 'transition'
  return 'other'
}
