const API_BASE = import.meta.env.VITE_API_URL || ''

// Thin client for /growth-challenge/* — the 30-Day Growth Challenge ledger.
// `triggerGrowthCheck` is the one function most pages need: call it
// fire-and-forget right after a real action already logs to
// businessEvents.js (gift card issued, bid submitted, milestone logged,
// etc.) so missions/achievements complete the moment the underlying
// account state actually changes, not on some later poll. Never awaited
// by the caller and never throws into the UI — a missed check just means
// the next call (e.g. the Dashboard widget's own load) catches it instead.
export async function triggerGrowthCheck(userId) {
  if (!API_BASE || !userId) return null
  try {
    const res = await fetch(`${API_BASE}/api/v1/growth-challenge/check?user_id=${encodeURIComponent(userId)}`, {
      method: 'POST',
    })
    if (!res.ok) return null
    return res.json()
  } catch {
    return null
  }
}

export async function fetchMyGrowthChallenge(userId) {
  if (!API_BASE || !userId) return null
  const res = await fetch(`${API_BASE}/api/v1/growth-challenge/mine?user_id=${encodeURIComponent(userId)}`)
  if (!res.ok) throw new Error('Could not load the Growth Challenge')
  return res.json()
}

export async function completeMission(userId, missionKey) {
  const res = await fetch(`${API_BASE}/api/v1/growth-challenge/complete`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ user_id: userId, mission_key: missionKey }),
  })
  if (!res.ok) {
    const detail = await res.json().catch(() => null)
    throw new Error(detail?.detail || 'Could not mark that mission complete')
  }
  return res.json()
}

export async function claimAchievement(userId, achievementKey) {
  const res = await fetch(`${API_BASE}/api/v1/growth-challenge/claim-achievement`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ user_id: userId, achievement_key: achievementKey }),
  })
  if (!res.ok) {
    const detail = await res.json().catch(() => null)
    throw new Error(detail?.detail || 'Could not claim that achievement')
  }
  return res.json()
}
