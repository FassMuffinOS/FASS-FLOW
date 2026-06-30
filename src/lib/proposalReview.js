// ── Proposal review persistence client ────────────────────
// Talks to fass-flow-backend's proposal_docs.py. Persists the editor's
// review loop (comments + section approvals) so it survives reloads. Same
// bearer-token auth as the other clients (apiFetch). Every call degrades to
// a safe no-op if the backend/table isn't there yet, so the editor still
// works offline / pre-migration.
import { apiAvailable, apiFetch } from './apiClient'

export async function ensureDoc(userId, { proposalId = 'sample', title } = {}) {
  if (!userId || !apiAvailable()) return null
  try {
    const res = await apiFetch('/api/v1/proposal-docs/ensure', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: userId, proposal_id: proposalId, title }),
    })
    if (!res.ok) return null
    return await res.json()
  } catch {
    return null
  }
}

export async function listComments(userId, documentId) {
  if (!userId || !documentId || !apiAvailable()) return []
  try {
    const res = await apiFetch(`/api/v1/proposal-docs/${documentId}/comments?user_id=${userId}`)
    if (!res.ok) return []
    const data = await res.json()
    return data.comments || []
  } catch {
    return []
  }
}

export async function addComment(userId, documentId, sectionKey, body) {
  if (!userId || !documentId || !apiAvailable()) return null
  try {
    const res = await apiFetch(`/api/v1/proposal-docs/${documentId}/comments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: userId, section_key: sectionKey, body }),
    })
    if (!res.ok) return null
    return await res.json()
  } catch {
    return null
  }
}

export async function resolveComment(userId, commentId, status) {
  if (!userId || !commentId || !apiAvailable()) return false
  try {
    const res = await apiFetch(`/api/v1/proposal-docs/comments/${commentId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: userId, status }),
    })
    return res.ok
  } catch {
    return false
  }
}

export async function deleteComment(userId, commentId) {
  if (!userId || !commentId || !apiAvailable()) return false
  try {
    const res = await apiFetch(`/api/v1/proposal-docs/comments/${commentId}?user_id=${userId}`, { method: 'DELETE' })
    return res.ok
  } catch {
    return false
  }
}

export async function listSectionState(userId, documentId) {
  if (!userId || !documentId || !apiAvailable()) return []
  try {
    const res = await apiFetch(`/api/v1/proposal-docs/${documentId}/state?user_id=${userId}`)
    if (!res.ok) return []
    const data = await res.json()
    return data.sections || []
  } catch {
    return []
  }
}

export async function setSectionApproved(userId, documentId, sectionKey, approved) {
  if (!userId || !documentId || !apiAvailable()) return false
  try {
    const res = await apiFetch(`/api/v1/proposal-docs/${documentId}/state`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: userId, section_key: sectionKey, approved }),
    })
    return res.ok
  } catch {
    return false
  }
}
