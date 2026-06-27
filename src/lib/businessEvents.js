import { supabase } from './supabase'

// Business Health — Phase 1 of the "Gmailification of Business" build.
//
// Every module writes a row to `business_events` whenever the user does
// something that should move the needle on their business. This file is
// the single place that knows the five categories, the point values, and
// how to turn a pile of events into one 0-100 score. The Inbox feed and
// the Business Timeline (later phases) read the same table — nothing here
// is Classroom- or Pipeline-specific.

export const CATEGORIES = [
  { key: 'government_readiness', label: 'Government Readiness' },
  { key: 'customer_growth',      label: 'Customer Growth' },
  { key: 'operations',           label: 'Operations' },
  { key: 'documentation',        label: 'Documentation' },
  { key: 'marketing',            label: 'Marketing' },
]

// Raw points needed to fully max out a category's 20-point share of the
// 100-point total (5 categories x 20 = 100). Tune these as real usage data
// comes in — for now they're set so a moderately active business reaches
// ~60-80 within its first few weeks, not maxed out on day one.
const CATEGORY_CAP = 40

// Fire-and-forget — never let a missing/slow business_events write block
// the actual feature the user is using.
export async function logBusinessEvent(userId, category, action, points, label = null, metadata = null) {
  if (!userId) return
  try {
    await supabase.from('business_events').insert({
      user_id: userId,
      category,
      action,
      points,
      label,
      metadata: metadata || {},
    })
  } catch (err) {
    console.error('logBusinessEvent failed', err)
  }
}

export async function fetchBusinessEvents(userId, limit = 500) {
  if (!userId) return []
  const { data } = await supabase
    .from('business_events')
    .select('category, points, label, action, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit)
  return data || []
}

function totalsByCategory(events) {
  const sums = Object.fromEntries(CATEGORIES.map(c => [c.key, 0]))
  events.forEach(e => {
    if (sums[e.category] !== undefined) sums[e.category] += e.points
  })
  let total = 0
  const perCategory = CATEGORIES.map(c => {
    const share = Math.min(20, Math.round((sums[c.key] / CATEGORY_CAP) * 20))
    total += share
    return { ...c, raw: sums[c.key], share }
  })
  return { total, perCategory }
}

// Score now vs. score as of the start of today (local time) — the
// "+4 today" delta the dashboard shows.
export function computeBusinessHealth(events) {
  const now = totalsByCategory(events)
  const todayStart = new Date()
  todayStart.setHours(0, 0, 0, 0)
  const eventsBeforeToday = events.filter(e => new Date(e.created_at) < todayStart)
  const before = totalsByCategory(eventsBeforeToday)
  return {
    total: now.total,
    perCategory: now.perCategory,
    deltaToday: now.total - before.total,
  }
}
