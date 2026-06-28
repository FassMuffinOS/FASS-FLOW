const API_BASE = import.meta.env.VITE_API_URL || ''

// Thin client for /notebook/ask — the goal-based "I need money" / "what
// should I do today" query layer. Context is plain strings the caller
// already has on hand (typically the same dailyFeed.js items rendered on
// the Dashboard) so the backend never has to re-derive business state
// itself; it only reasons over what it's handed, same shape as
// fetchDailyBrief.
export async function askChiefOfStaff(userId, question, businessContext = []) {
  if (!API_BASE) throw new Error('AI is not configured for this environment')
  const res = await fetch(`${API_BASE}/api/v1/notebook/ask`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ user_id: userId, question, business_context: businessContext }),
  })
  if (!res.ok) {
    const detail = await res.json().catch(() => null)
    throw new Error(detail?.detail || 'Could not reach the AI Chief of Staff right now')
  }
  return res.json()
}
