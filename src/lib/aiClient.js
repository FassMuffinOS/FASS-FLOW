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

// Scope-grounded materials takeoff for the Estimator. Reads the real
// solicitation text, classifies the job type, and only returns materials
// consistent with that type — so an inspection contract stops getting
// fire-rated construction materials. Returns { job_type, job_type_reason,
// scope_summary, scope_items[], materials[], excluded[] }.
export function scopeTakeoff({ scopeText, title, agency, naicsCode, userId }) {
  return post('/scope-takeoff', {
    scope_text: scopeText || '',
    title: title || '',
    agency: agency || '',
    naics_code: naicsCode || '',
    user_id: userId || null,
  })
}

// RAG-grounded section draft: backend ranks the user's past-performance
// entries by relevance and only feeds the LLM the ones that matched.
export function draftSection({ sectionName, sectionDescription, solicitationSummary, profile, pastPerformance, userId }) {
  return post('/draft-section', {
    section_name: sectionName,
    section_description: sectionDescription || '',
    solicitation_summary: solicitationSummary || '',
    company_name: profile?.company_name || '',
    core_competencies: profile?.core_competencies || '',
    differentiators: profile?.differentiators || '',
    past_performance: pastPerformance || [],
    user_id: userId || null, // when present, the draft costs 1 AI credit
  })
}

// Screenshot → text. `files` is a FileList/array of image File objects
// (e.g. from a portal that's behind a login, so we can't fetch it
// server-side — the user is already looking at it in their own browser).
// Each file is base64-encoded client-side and sent in one request so a
// multi-screenshot solicitation comes back as one ordered transcript.
function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result.split(',')[1]) // strip the data: URI prefix
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

// Show Me The Money's AI breakdown: feeds whatever scope text the proposal
// already has (from WARDOG/Inbox/FASS FILL) into the LLM for a rough cost
// estimate, complexity read, and risk flags — no new paste box, no extra
// data entry from the user.
export function costBreakdown({ scopeText, title, agency, awardAmount, userId }) {
  return post('/cost-breakdown', {
    scope_text: scopeText || '',
    title: title || '',
    agency: agency || '',
    award_amount: awardAmount ?? null,
    user_id: userId || null,
  })
}

// The "first five seconds" triage score: real fit/probability/competition/
// revenue read on a solicitation, grounded in its actual text plus what we
// know about the business — shown the instant someone opens a found
// opportunity, before they've touched the R-E-A-D worksheet. Returns
// { fit_score, fit_label, win_probability, competition_level,
//   competition_reason, estimated_revenue{low,high,basis},
//   required_certifications[], cert_gaps[], ai_summary, why_bullets[],
//   risk_flags[], provider, model }.
export function scoreOpportunity({
  solicitationText, title, agency, solicitationNaics, setAside, dueDate,
  awardAmount, businessName, businessNaics, businessCertifications,
  pastPerformance, userId,
}) {
  return post('/score-opportunity', {
    solicitation_text: solicitationText || '',
    title: title || '',
    agency: agency || '',
    solicitation_naics: solicitationNaics || '',
    set_aside: setAside || '',
    due_date: dueDate || '',
    award_amount: awardAmount ?? null,
    business_name: businessName || '',
    business_naics: businessNaics || '',
    business_certifications: businessCertifications || [],
    past_performance: pastPerformance || [],
    user_id: userId || null,
  })
}

export async function extractFromImages(files) {
  const images = await Promise.all(
    Array.from(files).map(async file => ({
      data: await fileToBase64(file),
      media_type: file.type || 'image/png',
    }))
  )
  return post('/extract-from-image', { images })
}
