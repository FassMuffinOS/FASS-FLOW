// ── Track: the user's business identity ────────────────────
// One source of truth that drives three things at once:
//   • the guided path on the Dashboard (GetStarted)
//   • the sidebar view (which tools are surfaced)
//   • the AI's framing (Chief of Staff / drafting context)
// Chosen in the onboarding wizard, switchable anytime from the sidebar.
// Persisted to localStorage; a change broadcasts a window event so every
// surface (sidebar, dashboard) reacts live without prop-drilling.

const KEY = 'fass_track'
export const TRACK_EVENT = 'fass-track-change'

export const TRACKS = [
  {
    id: 'govcon',
    name: 'Government Contracting',
    short: 'Government',
    tagline: 'Win federal, state & local contracts',
    view: 'bid',
    ai: 'government contracting — federal/state/local RFPs and RFQs, SAM.gov, set-asides, compliance, and proposal volumes',
  },
  {
    id: 'commercial',
    name: 'Commercial & Residential',
    short: 'Commercial',
    tagline: 'Bid private-sector & construction jobs',
    view: 'jobsite',
    ai: 'commercial and residential contracting — private-sector bids, line-item estimates, client proposals, and construction/job management',
  },
  {
    id: 'startup',
    name: 'Starting Out',
    short: 'Startup',
    tagline: 'Set up & launch your contracting business',
    view: 'growth',
    ai: 'a brand-new contractor setting up their business — formation, SAM.gov registration, and learning the fundamentals before bidding',
  },
]

export function trackById(id) {
  return TRACKS.find(t => t.id === id) || TRACKS[0]
}

export function getTrack() {
  try { return localStorage.getItem(KEY) || 'govcon' } catch { return 'govcon' }
}

export function setTrack(id) {
  try { localStorage.setItem(KEY, id) } catch { /* ignore */ }
  try { window.dispatchEvent(new CustomEvent(TRACK_EVENT, { detail: id })) } catch { /* ignore */ }
}

// Map a track to the sidebar view it should surface.
export const TRACK_TO_VIEW = { govcon: 'bid', commercial: 'jobsite', startup: 'growth' }
