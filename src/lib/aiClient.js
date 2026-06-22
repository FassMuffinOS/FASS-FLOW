// ── FASS FILL AI layer client ────────────────────────────────
// Thin wrapper around the backend's /ai endpoints. Deliberately optional:
// every caller checks `aiEnabled()` first and the regex-based matrix/outline
// works fully without this. If VITE_API_URL isn't set (or the backend has
// no provider key configured), callers should hide the AI buttons rather
// than show a broken one.

const API_BASE = import.meta.env.VITE_API_URL || ''

export function aiEnabled() {
  return !!API_BASE
}

async function post(path, body) {
  const res = await fetch(`${API_BASE}/api/v1/ai${path}`, {
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

// Hybrid regex+LLM analysis: pass the raw text and the regex parser's
// output so the backend can keep regex as source-of-truth on deterministic
// fields and use the LLM only for gap-filling + judgment calls.
export function analyzeSolicitation(rawText, regexParsed) {
  return post('/analyze-solicitation', { raw_text: rawText, regex_parsed: regexParsed })
}

// RAG-grounded section draft: backend ranks the user's past-performance
// entries by relevance and only feeds the LLM the ones that matched.
export function draftSection({ sectionName, sectionDescription, solicitationSummary, profile, pastPerformance }) {
  return post('/draft-section', {
    section_name: sectionName,
    section_description: sectionDescription || '',
    solicitation_summary: solicitationSummary || '',
    company_name: profile?.company_name || '',
    core_competencies: profile?.core_competencies || '',
    differentiators: profile?.differentiators || '',
    past_performance: pastPerformance || [],
  })
}
