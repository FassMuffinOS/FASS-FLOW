import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'
import {
  Check, ArrowRight, IdCard, Radar, ClipboardCheck, ClipboardList, Kanban,
  Calculator, Send, Camera, Rocket, BookOpen, X,
} from 'lucide-react'
import './GetStarted.css'

const DISMISS = 'fass_getstarted_dismissed'
const TRACK_KEY = 'fass_track'
const MANUAL_KEY = 'fass_track_manual' // steps with no data signal, checked by hand

// The guided paths. Each track is an ordered set of steps; a step with a
// `signal` auto-checks the moment that data exists (real progress, never a
// separate to-do to keep in sync). Steps without a signal (e.g. "walk the
// job site") can be checked off by hand. FASS serves more than one kind of
// contractor, so the path you see matches the business you're actually
// running — not one generic checklist.
const TRACKS = [
  {
    id: 'govcon',
    name: 'Win government contracts',
    steps: [
      { key: 'profile', signal: 'profile', icon: IdCard, title: 'Set up your Passport', body: 'Add your NAICS codes and set-aside status so WARDOG matches the right work.', cta: 'Open Passport', href: '/passport' },
      { key: 'opportunity', signal: 'opportunity', icon: Radar, title: 'Find your first opportunity', body: 'Browse the live SAM.gov feed and save one that fits.', cta: 'Open WARDOG', href: '/wardog' },
      { key: 'scored', signal: 'scored', icon: ClipboardCheck, title: 'Score it with R-E-A-D', body: 'Six questions tell you bid or no-bid before you sink time in.', cta: 'Open R-E-A-D', href: '/read' },
      { key: 'drafted', signal: 'fill', icon: ClipboardList, title: 'Draft your response', body: 'Turn it into a compliance matrix and capability statement in FASS FILL.', cta: 'Open FASS FILL', href: '/fill' },
      { key: 'tracked', signal: 'opportunity', icon: Kanban, title: 'Track it in Pipeline', body: 'Watch every bid in motion with a self-checking submission checklist.', cta: 'Open Pipeline', href: '/pipeline' },
    ],
  },
  {
    id: 'commercial',
    name: 'Bid commercial jobs',
    steps: [
      { key: 'profile', signal: 'profile', icon: IdCard, title: 'Set up your business profile', body: 'Your company details flow into every estimate and proposal automatically.', cta: 'Open Passport', href: '/passport' },
      { key: 'estimate', signal: 'estimate', icon: Calculator, title: 'Build your first estimate', body: 'Add the trades on the job and get a zip-adjusted line-item cost range.', cta: 'Open Estimator', href: '/estimator' },
      { key: 'proposal', signal: 'proposalSent', icon: Send, title: 'Send a client proposal', body: 'Turn the estimate into an interactive proposal the client approves online.', cta: 'Open Client Proposals', href: '/proposals' },
      { key: 'capture', signal: null, icon: Camera, title: 'Capture the job site', body: 'Walk the job on your phone and snap photos tied to the contract.', cta: 'Open Contractor Camera', href: '/camera' },
    ],
  },
  {
    id: 'startup',
    name: 'Start & set up my business',
    steps: [
      { key: 'start', signal: null, icon: Rocket, title: 'Set up your business', body: 'Structure, path, and the checklist to get legally operational.', cta: 'Open Start a Business', href: '/start' },
      { key: 'profile', signal: 'profile', icon: IdCard, title: 'Add your Passport details', body: 'UEI, CAGE, and set-aside status — the identity every contract needs.', cta: 'Open Passport', href: '/passport' },
      { key: 'learn', signal: 'masterclass', icon: BookOpen, title: 'Start the Masterclass', body: 'Mission 1 of the Government Contracting Masterclass — learn the fundamentals.', cta: 'Open Classroom', href: '/classroom' },
      { key: 'browse', signal: 'opportunity', icon: Radar, title: 'Browse live opportunities', body: 'See what real work looks like in WARDOG, matched to your codes.', cta: 'Open WARDOG', href: '/wardog' },
    ],
  },
]

function loadManual() {
  try { return new Set(JSON.parse(localStorage.getItem(MANUAL_KEY) || '[]')) } catch { return new Set() }
}

export default function GetStarted() {
  const { session } = useAuth()
  const navigate = useNavigate()
  const userId = session?.user?.id
  const [signals, setSignals] = useState(null)
  const [trackId, setTrackId] = useState(() => localStorage.getItem(TRACK_KEY) || 'govcon')
  const [manual, setManual] = useState(loadManual)
  const [dismissed, setDismissed] = useState(() => localStorage.getItem(DISMISS) === '1')

  useEffect(() => {
    if (!userId) return
    let cancelled = false
    async function load() {
      // allSettled so one missing table never blanks the whole card.
      const [prof, props, fill, ests, mc] = await Promise.allSettled([
        supabase.from('profiles').select('naics_codes, certifications').eq('id', userId).single(),
        supabase.from('proposals').select('id, read_score').eq('user_id', userId),
        supabase.from('fass_fill_documents').select('id', { count: 'exact', head: true }).eq('user_id', userId),
        supabase.from('client_estimates').select('status').eq('user_id', userId),
        supabase.from('masterclass_progress').select('id', { count: 'exact', head: true }).eq('user_id', userId),
      ])
      if (cancelled) return
      const profData = prof.status === 'fulfilled' ? prof.value.data : null
      const propList = props.status === 'fulfilled' ? (props.value.data || []) : []
      const estList = ests.status === 'fulfilled' ? (ests.value.data || []) : []
      setSignals({
        profile: (Array.isArray(profData?.naics_codes) && profData.naics_codes.length > 0) ||
                 (Array.isArray(profData?.certifications) && profData.certifications.length > 0),
        opportunity: propList.length > 0,
        scored: propList.some(p => p.read_score != null),
        fill: fill.status === 'fulfilled' && (fill.value.count || 0) > 0,
        estimate: estList.length > 0,
        proposalSent: estList.some(e => e.status && e.status !== 'draft'),
        masterclass: mc.status === 'fulfilled' && (mc.value.count || 0) > 0,
      })
    }
    load()
    return () => { cancelled = true }
  }, [userId])

  if (dismissed || !signals) return null

  const track = TRACKS.find(t => t.id === trackId) || TRACKS[0]
  const isDone = step => step.signal ? !!signals[step.signal] : manual.has(`${track.id}:${step.key}`)
  const steps = track.steps.map(s => ({ ...s, done: isDone(s) }))
  const doneCount = steps.filter(s => s.done).length
  const pct = Math.round((doneCount / steps.length) * 100)
  const nextIdx = steps.findIndex(s => !s.done)
  const allDone = doneCount === steps.length

  function chooseTrack(id) {
    setTrackId(id)
    try { localStorage.setItem(TRACK_KEY, id) } catch { /* ignore */ }
  }
  function toggleManual(step) {
    if (step.signal) return // data-backed steps aren't hand-checkable
    const id = `${track.id}:${step.key}`
    setManual(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      try { localStorage.setItem(MANUAL_KEY, JSON.stringify([...next])) } catch { /* ignore */ }
      return next
    })
  }
  function dismiss() {
    setDismissed(true)
    try { localStorage.setItem(DISMISS, '1') } catch { /* ignore */ }
  }

  return (
    <div className="gs">
      <button className="gs-close" onClick={dismiss} aria-label="Dismiss"><X size={15} /></button>

      <div className="gs-head">
        <span className="gs-head-icon"><Rocket size={18} /></span>
        <div>
          <h3 className="gs-title">Your guided path</h3>
          <p className="gs-sub">{allDone ? "You've completed this path — switch tracks to explore more" : `${doneCount} of ${steps.length} done · follow the steps for your track`}</p>
        </div>
      </div>

      {/* Track switcher — the missing piece: a path per kind of contractor. */}
      <div className="gs-tracks">
        {TRACKS.map(t => (
          <button
            key={t.id}
            className={`gs-track-chip ${t.id === track.id ? 'is-active' : ''}`}
            onClick={() => chooseTrack(t.id)}
          >
            {t.name}
          </button>
        ))}
      </div>

      <div className="gs-track"><div className="gs-fill" style={{ width: `${pct}%` }} /></div>

      <div className="gs-steps">
        {steps.map((s, i) => {
          const Icon = s.icon
          return (
            <div key={s.key} className={`gs-step ${s.done ? 'gs-done' : ''} ${i === nextIdx ? 'gs-nextstep' : ''}`}>
              <button
                className={`gs-num ${!s.signal ? 'gs-num-manual' : ''}`}
                onClick={() => toggleManual(s)}
                title={s.signal ? 'Completes automatically' : 'Click to mark done'}
              >
                {s.done ? <Check size={15} /> : i + 1}
              </button>
              <div className="gs-body">
                <div className="gs-step-title"><Icon size={14} /> {s.title}</div>
                <p className="gs-step-body">{s.body}</p>
              </div>
              {!s.done && (
                <button className="gs-cta" onClick={() => navigate(s.href)}>
                  {s.cta} <ArrowRight size={13} />
                </button>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
