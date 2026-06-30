// ── WARDOG Intel client ─────────────────────────────────────
// Thin wrapper around the backend's Enterprise-only /intelligence
// endpoints. Mirrors aiClient.js's shape (same API_BASE env var, same
// "throw on !res.ok with the backend's detail message" pattern) but
// targets a different router prefix since this isn't part of /ai.

const API_BASE = import.meta.env.VITE_API_URL || ''

export function intelEnabled() {
  return !!API_BASE
}

async function get(path, params) {
  const qs = new URLSearchParams(params).toString()
  const res = await fetch(`${API_BASE}/api/v1/intelligence${path}?${qs}`)
  if (!res.ok) {
    const detail = await res.json().catch(() => ({}))
    throw new Error(detail.detail || `Request failed (${res.status})`)
  }
  return res.json()
}

async function post(path, body) {
  const res = await fetch(`${API_BASE}/api/v1/intelligence${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const detail = await res.json().catch(() => ({}))
    throw new Error(detail.detail || `Request failed (${res.status})`)
  }
  return res.json()
}

// Raw prime-award history for a NAICS (+ optional agency), pulled live
// from USASpending.gov. Returns { awards[], naics, agency, total }.
export function getIncumbentHistory({ naics, agency, userId }) {
  return get('/incumbent', { naics: naics || '', agency: agency || '', user_id: userId || '' })
}

// AI synthesis on top of the award list above: incumbent read, re-compete
// odds, likely price band, entry strategy. Costs 1 AI credit. Returns
// { forecast, provider, model, credits_remaining }.
export function forecastRecompete({ naics, agency, title, awards, userId }) {
  return post('/forecast', {
    naics: naics || '',
    agency: agency || '',
    title: title || '',
    awards: awards || [],
    user_id: userId,
  })
}
