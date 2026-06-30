// Shared by AffiliateApply.jsx (which captures these) and AuthCallback.jsx
// (which consumes them on the way back from a Google round-trip).

// Same key AuthContext.jsx writes to on ?ref= capture — first-click-wins,
// 30-day window, read here so the apply flow can attach an applicant to
// whoever's link brought them in.
const REF_STORAGE_KEY = 'fass_ref'

export function readStoredRefCode() {
  try {
    const raw = JSON.parse(localStorage.getItem(REF_STORAGE_KEY) || 'null')
    return raw?.code || null
  } catch {
    return null
  }
}

// Stashed right before sending someone into the Google OAuth round-trip
// from /affiliates/apply — there's no router state that survives a full
// provider redirect, so AuthCallback.jsx checks this flag (and clears it)
// to know it should provision an affiliate instead of doing its normal
// business-profile routing.
const INTENT_KEY = 'fass_affiliate_apply_intent'

export function setAffiliateApplyIntent() {
  try {
    localStorage.setItem(INTENT_KEY, '1')
  } catch {
    // Private/locked-down storage contexts can throw — worst case the
    // Google round-trip just falls through to normal routing.
  }
}

export function consumeAffiliateApplyIntent() {
  try {
    const v = localStorage.getItem(INTENT_KEY)
    if (v) localStorage.removeItem(INTENT_KEY)
    return !!v
  } catch {
    return false
  }
}
