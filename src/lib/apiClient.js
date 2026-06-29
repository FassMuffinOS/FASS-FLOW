// ── Authenticated API client ─────────────────────────────────
// 2026-06-29: the backend's owner-scoped endpoints (gift cards, wallet,
// business profile, comms, BD Partner, chat) now require a verified
// Supabase session — they no longer trust a caller-supplied user_id/
// business_user_id at face value (see each router's module docstring for
// the security-fix writeup). Every fetch call against one of those
// endpoints must carry `Authorization: Bearer <access_token>` or it will
// get a 401.
//
// This wraps fetch so call sites don't have to read the session
// themselves: it reads the *current* Supabase session fresh on every call
// (not from React state, which can be stale across re-renders/tab
// switches) and attaches the bearer token automatically. Falls back to an
// unauthenticated request if there's no session — callers that need a
// session will just get the backend's 401 in that case, same as before
// this helper existed.
import { supabase } from './supabase'

const API_BASE = import.meta.env.VITE_API_URL || ''

export function apiAvailable() {
  return !!API_BASE
}

// path should start with "/api/v1/..." — same as the raw fetch calls this
// replaces, just without the API_BASE prefix (this adds it).
export async function apiFetch(path, options = {}) {
  const { data } = await supabase.auth.getSession()
  const token = data?.session?.access_token

  const headers = { ...(options.headers || {}) }
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  return fetch(`${API_BASE}${path}`, { ...options, headers })
}

// Convenience wrapper for the common JSON POST/PUT/PATCH/DELETE case —
// sets Content-Type, stringifies the body, keeps the call site one line.
export async function apiFetchJson(path, body, options = {}) {
  return apiFetch(path, {
    method: 'POST',
    ...options,
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
    body: JSON.stringify(body),
  })
}
