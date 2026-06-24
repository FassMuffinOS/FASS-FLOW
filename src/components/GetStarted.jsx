import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'
import { Check, ArrowRight, IdCard, Radar, ClipboardCheck, FileText, X, Rocket } from 'lucide-react'
import './GetStarted.css'

const DISMISS = 'fass_getstarted_dismissed'

// Data-driven cold-start. Unlike the resource checklist, every step here
// reflects REAL progress in the product and auto-checks the moment the
// underlying data exists. Hides itself once the core path is rolling (or
// when dismissed), so it never nags an active user.
export default function GetStarted() {
  const { session } = useAuth()
  const navigate = useNavigate()
  const userId = session?.user?.id
  const [state, setState] = useState(null)
  const [dismissed, setDismissed] = useState(() => localStorage.getItem(DISMISS) === '1')

  useEffect(() => {
    if (!userId) return
    let cancelled = false
    async function load() {
      const [{ data: prof }, { data: props }, { count: fillCount }] = await Promise.all([
        supabase.from('profiles').select('naics_codes, certifications').eq('id', userId).single(),
        supabase.from('proposals').select('id, read_score').eq('user_id', userId),
        supabase.from('fass_fill_documents').select('id', { count: 'exact', head: true }).eq('user_id', userId),
      ])
      if (cancelled) return
      const hasProfile =
        (Array.isArray(prof?.naics_codes) && prof.naics_codes.length > 0) ||
        (Array.isArray(prof?.certifications) && prof.certifications.length > 0)
      const list = props || []
      setState({
        profile: hasProfile,
        opportunity: list.length > 0,
        scored: list.some(p => p.read_score != null),
        responded: (fillCount || 0) > 0,
      })
    }
    load()
    return () => { cancelled = true }
  }, [userId])

  if (dismissed || !state) return null

  const steps = [
    { id: 'profile', done: state.profile, icon: IdCard, title: 'Set up your Passport', body: 'Add your NAICS codes and set-aside status so WARDOG matches the right work.', cta: 'Open Passport', href: '/passport' },
    { id: 'opportunity', done: state.opportunity, icon: Radar, title: 'Find your first opportunity', body: 'Browse the live SAM.gov feed and save one that fits.', cta: 'Open WARDOG', href: '/wardog' },
    { id: 'scored', done: state.scored, icon: ClipboardCheck, title: 'Score it with R-E-A-D', body: 'Six questions tell you bid or no-bid before you sink time in.', cta: 'Open R-E-A-D', href: '/read' },
    { id: 'responded', done: state.responded, icon: FileText, title: 'Build your first response', body: 'Turn it into a compliance matrix and capability statement in FASS FILL.', cta: 'Open FASS FILL', href: '/fill' },
  ]

  const doneCount = steps.filter(s => s.done).length
  if (doneCount === steps.length) return null
  const pct = Math.round((doneCount / steps.length) * 100)
  const nextIdx = steps.findIndex(s => !s.done)

  function dismiss() {
    setDismissed(true)
    localStorage.setItem(DISMISS, '1')
  }

  return (
    <div className="gs">
      <button className="gs-close" onClick={dismiss} aria-label="Dismiss"><X size={15} /></button>

      <div className="gs-head">
        <span className="gs-head-icon"><Rocket size={18} /></span>
        <div>
          <h3 className="gs-title">Get your first bid moving</h3>
          <p className="gs-sub">{doneCount} of {steps.length} done · pick up where you left off</p>
        </div>
      </div>

      <div className="gs-track"><div className="gs-fill" style={{ width: `${pct}%` }} /></div>

      <div className="gs-steps">
        {steps.map((s, i) => {
          const Icon = s.icon
          return (
            <div key={s.id} className={`gs-step ${s.done ? 'gs-done' : ''} ${i === nextIdx ? 'gs-nextstep' : ''}`}>
              <div className="gs-num">{s.done ? <Check size={15} /> : i + 1}</div>
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
