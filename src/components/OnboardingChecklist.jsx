import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Download, Check, FileText, ClipboardCheck, Mail, CalendarClock,
  Sparkles, ArrowRight, X,
} from 'lucide-react'
import './OnboardingChecklist.css'

const STORAGE_KEY = 'fass_onboarding_steps'
const DISMISS_KEY = 'fass_onboarding_dismissed'

// ── All 5 of these are free and unlocked the moment you sign up — nothing
// here is paywalled. Checking each one off is just about building momentum
// toward the real goal: completing an actual solicitation inside the app. ──
const STEPS = [
  {
    id: 'sam',
    icon: FileText,
    title: 'Get the SAM.gov Registration Guide',
    body: 'The exact, in-order steps to register without losing weeks to a name/address mismatch.',
    action: 'Download guide',
    href: '/downloads/FASS-SAM-Registration-Guide.pdf',
    kind: 'download',
  },
  {
    id: 'template',
    icon: FileText,
    title: 'Get the Proposal Template',
    body: 'A ready-to-fill scaffold — cover letter through pricing — so you\'re not starting from a blank page.',
    action: 'Download template',
    href: '/downloads/FASS-Proposal-Template.pdf',
    kind: 'download',
  },
  {
    id: 'checklist',
    icon: ClipboardCheck,
    title: 'Get the Proposal Assembly Checklist',
    body: 'Run every proposal against this before you submit. If a box is unchecked, it isn\'t ready.',
    action: 'Download checklist',
    href: '/downloads/FASS-Proposal-Assembly-Checklist.pdf',
    kind: 'download',
  },
  {
    id: 'email',
    icon: Mail,
    title: 'Get the Email Etiquette Guide + CO templates',
    body: 'Two copy-paste email templates for contracting officers, plus an attachment checklist so nothing\'s missing when you hit send.',
    action: 'Download guide',
    href: '/downloads/FASS-Email-Etiquette-Guide.pdf',
    kind: 'download',
  },
  {
    id: 'call',
    icon: CalendarClock,
    title: 'Book a free strategy call',
    body: 'Talk through your first real opportunity with our team — no cost, no obligation.',
    action: 'Book a call',
    href: 'https://calendly.com/orders-munchiesgourmets',
    kind: 'link',
  },
]

export default function OnboardingChecklist() {
  const navigate = useNavigate()
  const [completed, setCompleted] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {}
    } catch {
      return {}
    }
  })
  const [dismissed, setDismissed] = useState(
    () => localStorage.getItem(DISMISS_KEY) === '1'
  )

  const doneCount = STEPS.filter(s => completed[s.id]).length
  const allDone = doneCount === STEPS.length
  const pct = Math.round((doneCount / STEPS.length) * 100)

  function markDone(id) {
    if (completed[id]) return
    const next = { ...completed, [id]: true }
    setCompleted(next)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
  }

  function dismiss() {
    setDismissed(true)
    localStorage.setItem(DISMISS_KEY, '1')
  }

  if (dismissed) return null

  return (
    <div className="onb">
      <button className="onb-close" onClick={dismiss} aria-label="Dismiss">
        <X size={14} />
      </button>

      <div className="onb-hook">
        <Sparkles size={16} className="onb-hook-icon" />
        <p>
          Only <strong>16% of businesses</strong> that register on SAM.gov ever go on to bid successfully.
          These 5 free steps are how you get into that 16% — no paywall, nothing locked.
        </p>
      </div>

      <div className="onb-progress-row">
        <div className="onb-progress-track">
          <div className="onb-progress-fill" style={{ width: `${pct}%` }} />
        </div>
        <span className="onb-progress-label">{doneCount} / {STEPS.length} unlocked</span>
      </div>

      <div className="onb-steps">
        {STEPS.map((step, i) => {
          const Icon = step.icon
          const done = !!completed[step.id]
          return (
            <div key={step.id} className={`onb-step ${done ? 'onb-step-done' : ''}`}>
              <div className="onb-step-num">{done ? <Check size={15} /> : i + 1}</div>
              <div className="onb-step-body">
                <div className="onb-step-top">
                  <Icon size={14} className="onb-step-icon" />
                  <span className="onb-step-title">{step.title}</span>
                  <span className="onb-step-free">Free</span>
                </div>
                <p className="onb-step-desc">{step.body}</p>
                {step.kind === 'download' ? (
                  <a
                    href={step.href}
                    download
                    className="onb-step-action"
                    onClick={() => markDone(step.id)}
                  >
                    <Download size={13} /> {step.action}
                  </a>
                ) : (
                  <a
                    href={step.href}
                    target="_blank"
                    rel="noreferrer"
                    className="onb-step-action"
                    onClick={() => markDone(step.id)}
                  >
                    <CalendarClock size={13} /> {step.action}
                  </a>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {allDone && (
        <div className="onb-celebrate">
          <Sparkles size={16} />
          <div>
            <strong>All 5 unlocked.</strong> You're ready. Go find a real opportunity and put this to work.
          </div>
          <button className="btn-primary onb-celebrate-cta" onClick={() => navigate('/wardog')}>
            Open WARDOG <ArrowRight size={14} />
          </button>
        </div>
      )}
    </div>
  )
}
