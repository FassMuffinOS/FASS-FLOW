import { supabase } from './supabase'
import { MASTERCLASS_NIGHTS } from '../data/masterclassNights'

const API_BASE = import.meta.env.VITE_API_URL || ''

// The daily feed — the "9 items that can grow your business today" list.
// Deliberately built on data that's already cheap to query (proposals,
// witness_milestones, wallet_campaigns, masterclass_progress, the live
// WARDOG search) rather than a new table: every item here is a live read of
// state that already exists. Mirrors the deadline logic in AlertsBell.jsx
// (same tables, same day-math) but renders as the full daily action list
// instead of a bell dropdown, and adds items AlertsBell doesn't cover
// (R-E-A-D scoring needed, expiring Wallet campaigns, next Masterclass
// mission). Each item carries a `weight` used only to sort the list.
function daysUntil(iso) {
  if (!iso) return null
  return Math.ceil((new Date(iso).getTime() - Date.now()) / 86400000)
}

export async function fetchDailyFeed(userId) {
  if (!userId) return []
  const items = []

  const [
    { data: proposals },
    { data: milestones },
    campaignsRes,
    { data: progress },
    { data: profile },
  ] = await Promise.all([
    supabase.from('proposals').select('id, title, agency, stage, read_score, due_date').eq('user_id', userId),
    supabase
      .from('witness_milestones')
      .select('id, title, due_date, status, proposal_id, proposals(title)')
      .eq('user_id', userId)
      .not('due_date', 'is', null),
    API_BASE
      ? fetch(`${API_BASE}/api/v1/campaigns/mine?user_id=${userId}`).then(r => r.ok ? r.json() : { campaigns: [] }).catch(() => ({ campaigns: [] }))
      : Promise.resolve({ campaigns: [] }),
    supabase.from('masterclass_progress').select('night').eq('user_id', userId),
    supabase.from('profiles').select('naics_codes').eq('id', userId).single(),
  ])

  // Flagged bids with no R-E-A-D score yet — the very next action in the
  // bid workflow, so these lead the list.
  ;(proposals || [])
    .filter(p => p.stage === 'flagged' && !p.read_score)
    .forEach(p => items.push({
      id: `score-${p.id}`,
      emoji: '🎯',
      text: `Score "${p.title}" with R-E-A-D before deciding to pursue it`,
      href: `/read?proposalId=${p.id}&title=${encodeURIComponent(p.title)}&agency=${encodeURIComponent(p.agency || '')}`,
      weight: 90,
    }))

  // Scored/pursuing bids closing in on their due date.
  ;(proposals || [])
    .filter(p => ['scored', 'pursuing'].includes(p.stage) && p.due_date)
    .forEach(p => {
      const d = daysUntil(p.due_date)
      if (d === null || d > 10) return
      items.push({
        id: `due-${p.id}`,
        emoji: d <= 2 ? '🚨' : '⏰',
        text: d < 0
          ? `"${p.title}" was due ${Math.abs(d)} day${Math.abs(d) === 1 ? '' : 's'} ago — check its status`
          : `"${p.title}" is due in ${d} day${d === 1 ? '' : 's'} — move it to Submitted when it's in`,
        href: '/pipeline',
        weight: d < 0 ? 95 : Math.max(40, 80 - d * 4),
      })
    })

  // Open milestones from awarded contracts — overdue first, then soonest due.
  ;(milestones || [])
    .filter(m => !['done', 'complete', 'completed'].includes((m.status || '').toLowerCase()))
    .forEach(m => {
      const d = daysUntil(m.due_date)
      if (d === null || d > 14) return
      items.push({
        id: `milestone-${m.id}`,
        emoji: d < 0 ? '🚨' : '📋',
        text: d < 0
          ? `Milestone "${m.title}" on "${m.proposals?.title || 'a contract'}" is overdue`
          : `Milestone "${m.title}" on "${m.proposals?.title || 'a contract'}" is due in ${d} day${d === 1 ? '' : 's'}`,
        href: '/witness',
        weight: d < 0 ? 92 : Math.max(35, 75 - d * 3),
      })
    })

  // Wallet campaigns expiring soon.
  ;(campaignsRes?.campaigns || []).forEach(c => {
    const d = daysUntil(c.expires_at)
    if (d === null || d > 5 || d < 0) return
    items.push({
      id: `campaign-${c.id}`,
      emoji: '📣',
      text: `Your offer "${c.message}" expires in ${d} day${d === 1 ? '' : 's'}`,
      href: '/wallet/campaigns',
      weight: Math.max(30, 60 - d * 5),
    })
  })

  // Live WARDOG matches for the user's primary NAICS code — same source
  // AlertsBell uses, surfaced here as a feed item rather than a bell count.
  try {
    const naics = Array.isArray(profile?.naics_codes) ? profile.naics_codes[0] : ''
    if (API_BASE && naics) {
      const res = await fetch(`${API_BASE}/api/v1/wardog/search?limit=20&naics=${encodeURIComponent(naics)}&state=`)
      if (res.ok) {
        const data = await res.json()
        const n = (data.opportunities || []).length
        if (n > 0) {
          items.push({
            id: 'wardog-matches',
            emoji: '🧭',
            text: `${n} open ${n === 1 ? 'opportunity matches' : 'opportunities match'} your NAICS ${naics} — review in WARDOG`,
            href: '/wardog',
            weight: 70,
          })
        }
      }
    }
  } catch { /* feed optional */ }

  // Next Masterclass mission — keeps the course moving without making it the
  // whole feed.
  const completed = new Set((progress || []).map(p => p.night))
  const next = MASTERCLASS_NIGHTS.find(nt => !completed.has(nt.n) && (nt.n === 1 || completed.has(nt.n - 1)))
  if (next) {
    items.push({
      id: `mission-${next.n}`,
      emoji: '🎓',
      text: `Continue the Masterclass — Mission ${next.n}: ${next.title}`,
      href: '/classroom',
      weight: 20,
    })
  }

  return items.sort((a, b) => b.weight - a.weight)
}

// Short AI-generated morning summary, pointed at today's feed items instead
// of lesson content — reuses the same Notebook AI backend (llm_router) as
// the Classroom chat/insight features rather than standing up new infra.
export async function fetchDailyBrief(userId, items) {
  if (!userId || !API_BASE) return null
  try {
    const res = await fetch(`${API_BASE}/api/v1/notebook/daily-brief`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: userId, feed_items: items.map(i => i.text) }),
    })
    if (!res.ok) return null
    const data = await res.json()
    return data.brief || null
  } catch {
    return null
  }
}
