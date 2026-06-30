// ── WARDOG Intel client ─────────────────────────────────────
// Thin wrapper around the backend's /intelligence endpoints — Enterprise
// plan gets unlimited access, everyone else can buy a single $39 report
// (see /intelligence/checkout). All of these are owner-gated server-side
// (get_current_user + require_owner), so — unlike the old version of this
// file — every call here rides the bearer token via apiFetch, same pattern
// as credits.js and the (since-fixed) Pricing.jsx checkout call.
import { apiAvailable, apiFetch } from './apiClient'

export function intelEnabled() {
  return apiAvailable()
}

async function get(path, params) {
  const qs = new URLSearchParams(params).toString()
  const res = await apiFetch(`/api/v1/intelligence${path}?${qs}`)
  if (!res.ok) {
    const detail = await res.json().catch(() => ({}))
    throw new Error(detail.detail || `Request failed (${res.status})`)
  }
  return res.json()
}

async function post(path, body) {
  const res = await apiFetch(`/api/v1/intelligence${path}`, {
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
// reportId is required for non-Enterprise users — it's the à la carte
// report being spent on this lookup.
export function getIncumbentHistory({ naics, agency, userId, reportId }) {
  return get('/incumbent', {
    naics: naics || '', agency: agency || '', user_id: userId || '', report_id: reportId || '',
  })
}

// AI synthesis on top of the award list above: incumbent read, re-compete
// odds, likely price band, entry strategy. Costs 1 AI credit. Returns
// { forecast, provider, model, credits_remaining }. reportId must match
// the same report getIncumbentHistory opened, for non-Enterprise users.
export function forecastRecompete({ naics, agency, title, awards, userId, reportId }) {
  return post('/forecast', {
    naics: naics || '',
    agency: agency || '',
    title: title || '',
    awards: awards || [],
    user_id: userId,
    report_id: reportId || '',
  })
}

// This buyer's report inventory — unused (paid, not yet spent) and past
// ones. Returns { reports: [{ id, status, naics, agency, created_at, ... }] }.
export function listMyReports(userId) {
  return get('/reports', { user_id: userId || '' })
}

// Starts a $39 Stripe Checkout session for one à la carte report. Returns
// { url, report_id } — redirect to url, report_id is also embedded in the
// success_url so the page can pick it up after the redirect back.
export function startIntelReportCheckout(userId, email) {
  return post('/checkout', { user_id: userId, email })
}
