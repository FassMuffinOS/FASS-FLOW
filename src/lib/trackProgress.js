// ── Shared guided-track progress ───────────────────────────
// One source of truth for the per-track onboarding steps, the data signals
// that auto-complete them, and the progress math. Used by both the Dashboard
// GetStarted card and the top-bar progress / mobile next-step button.
import { supabase } from './supabase'
import {
  IdCard, Radar, ClipboardCheck, ClipboardList, Kanban, Calculator, Send, Camera, Rocket, BookOpen,
} from 'lucide-react'

export const MANUAL_KEY = 'fass_track_manual' // steps with no data signal, checked by hand

// Step definitions per track. `signal` (when set) auto-completes the step the
// moment that data exists; signal-less steps are checked by hand.
export const TRACK_STEPS = {
  govcon: [
    { key: 'profile', signal: 'profile', icon: IdCard, title: 'Set up your Passport', body: 'Add your NAICS codes and set-aside status so WARDOG matches the right work.', cta: 'Open Passport', href: '/passport' },
    { key: 'opportunity', signal: 'opportunity', icon: Radar, title: 'Find your first opportunity', body: 'Browse the live SAM.gov feed and save one that fits.', cta: 'Open WARDOG', href: '/wardog' },
    { key: 'scored', signal: 'scored', icon: ClipboardCheck, title: 'Score it with R-E-A-D', body: 'Six questions tell you bid or no-bid before you sink time in.', cta: 'Open R-E-A-D', href: '/read' },
    { key: 'drafted', signal: 'fill', icon: ClipboardList, title: 'Draft your response', body: 'Turn it into a compliance matrix and capability statement in FASS FILL.', cta: 'Open FASS FILL', href: '/fill' },
    { key: 'tracked', signal: 'opportunity', icon: Kanban, title: 'Track it in Pipeline', body: 'Watch every bid in motion with a self-checking submission checklist.', cta: 'Open Pipeline', href: '/pipeline' },
  ],
  commercial: [
    { key: 'profile', signal: 'profile', icon: IdCard, title: 'Set up your business profile', body: 'Your company details flow into every estimate and proposal automatically.', cta: 'Open Passport', href: '/passport' },
    { key: 'estimate', signal: 'estimate', icon: Calculator, title: 'Build your first estimate', body: 'Add the trades on the job and get a zip-adjusted line-item cost range.', cta: 'Open Estimator', href: '/estimator' },
    { key: 'proposal', signal: 'proposalSent', icon: Send, title: 'Send a client proposal', body: 'Turn the estimate into an interactive proposal the client approves online.', cta: 'Open Client Proposals', href: '/proposals' },
    { key: 'capture', signal: null, icon: Camera, title: 'Capture the job site', body: 'Walk the job on your phone and snap photos tied to the contract.', cta: 'Open Contractor Camera', href: '/camera' },
  ],
  startup: [
    { key: 'start', signal: null, icon: Rocket, title: 'Set up your business', body: 'Structure, path, and the checklist to get legally operational.', cta: 'Open Start a Business', href: '/start' },
    { key: 'profile', signal: 'profile', icon: IdCard, title: 'Add your Passport details', body: 'UEI, CAGE, and set-aside status — the identity every contract needs.', cta: 'Open Passport', href: '/passport' },
    { key: 'learn', signal: 'masterclass', icon: BookOpen, title: 'Start the Masterclass', body: 'Mission 1 of the Government Contracting Masterclass — learn the fundamentals.', cta: 'Open Classroom', href: '/classroom' },
    { key: 'browse', signal: 'opportunity', icon: Radar, title: 'Browse live opportunities', body: 'See what real work looks like in WARDOG, matched to your codes.', cta: 'Open WARDOG', href: '/wardog' },
  ],
}

export function loadManual() {
  try { return new Set(JSON.parse(localStorage.getItem(MANUAL_KEY) || '[]')) } catch { return new Set() }
}

// Fetch the data signals that auto-complete steps. allSettled so a missing
// table never blanks the result.
export async function fetchTrackSignals(userId) {
  if (!userId) return null
  const [prof, props, fill, ests, mc] = await Promise.allSettled([
    supabase.from('profiles').select('naics_codes, certifications').eq('id', userId).single(),
    supabase.from('proposals').select('id, read_score').eq('user_id', userId),
    supabase.from('fass_fill_documents').select('id', { count: 'exact', head: true }).eq('user_id', userId),
    supabase.from('client_estimates').select('status').eq('user_id', userId),
    supabase.from('masterclass_progress').select('id', { count: 'exact', head: true }).eq('user_id', userId),
  ])
  const profData = prof.status === 'fulfilled' ? prof.value.data : null
  const propList = props.status === 'fulfilled' ? (props.value.data || []) : []
  const estList = ests.status === 'fulfilled' ? (ests.value.data || []) : []
  return {
    profile: (Array.isArray(profData?.naics_codes) && profData.naics_codes.length > 0) ||
             (Array.isArray(profData?.certifications) && profData.certifications.length > 0),
    opportunity: propList.length > 0,
    scored: propList.some(p => p.read_score != null),
    fill: fill.status === 'fulfilled' && (fill.value.count || 0) > 0,
    estimate: estList.length > 0,
    proposalSent: estList.some(e => e.status && e.status !== 'draft'),
    masterclass: mc.status === 'fulfilled' && (mc.value.count || 0) > 0,
  }
}

// Compute completion for a track given signals + manual checks.
export function progressFor(trackId, signals, manual = new Set()) {
  const defs = TRACK_STEPS[trackId] || TRACK_STEPS.govcon
  const isDone = s => (s.signal ? !!(signals && signals[s.signal]) : manual.has(`${trackId}:${s.key}`))
  const steps = defs.map(s => ({ ...s, done: isDone(s) }))
  const doneCount = steps.filter(s => s.done).length
  const total = steps.length
  return {
    steps,
    doneCount,
    total,
    pct: total ? Math.round((doneCount / total) * 100) : 0,
    next: steps.find(s => !s.done) || null,
    allDone: doneCount === total,
  }
}
