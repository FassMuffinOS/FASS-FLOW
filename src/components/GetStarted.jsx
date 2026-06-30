import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { Check, ArrowRight, Rocket, X } from 'lucide-react'
import { getTrack, setTrack, TRACKS, TRACK_EVENT } from '../lib/track'
import { fetchTrackSignals, progressFor, loadManual, MANUAL_KEY } from '../lib/trackProgress'
import './GetStarted.css'

const DISMISS = 'fass_getstarted_dismissed'

// The Dashboard's guided path. Tracks, steps, and the data-driven completion
// all come from the shared trackProgress lib, so the top-bar progress and this
// card never disagree.
export default function GetStarted() {
  const { session } = useAuth()
  const navigate = useNavigate()
  const userId = session?.user?.id
  const [signals, setSignals] = useState(null)
  const [trackId, setTrackId] = useState(() => getTrack())
  const [manual, setManual] = useState(loadManual)
  const [dismissed, setDismissed] = useState(() => localStorage.getItem(DISMISS) === '1')

  // Stay in sync when the track is switched from the sidebar or onboarding.
  useEffect(() => {
    const onChange = e => setTrackId(e.detail || getTrack())
    window.addEventListener(TRACK_EVENT, onChange)
    return () => window.removeEventListener(TRACK_EVENT, onChange)
  }, [])

  useEffect(() => {
    if (!userId) return
    let cancelled = false
    fetchTrackSignals(userId).then(s => { if (!cancelled) setSignals(s) })
    return () => { cancelled = true }
  }, [userId])

  if (dismissed || !signals) return null

  const { steps, doneCount, pct, allDone } = progressFor(trackId, signals, manual)
  const nextIdx = steps.findIndex(s => !s.done)

  function chooseTrack(id) {
    setTrackId(id)
    setTrack(id) // persists + broadcasts so the sidebar view + AI follow
  }
  function toggleManual(step) {
    if (step.signal) return // data-backed steps aren't hand-checkable
    const id = `${trackId}:${step.key}`
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

      {/* Track switcher — a path per kind of contractor. */}
      <div className="gs-tracks">
        {TRACKS.map(t => (
          <button
            key={t.id}
            className={`gs-track-chip ${t.id === trackId ? 'is-active' : ''}`}
            onClick={() => chooseTrack(t.id)}
          >
            {t.short}
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
