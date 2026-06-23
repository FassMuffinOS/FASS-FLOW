import { useState, useEffect, useRef } from 'react'
import { useSearchParams, useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'
import {
  CheckCircle, XCircle, AlertCircle, ChevronDown, ChevronUp,
  Save, ArrowLeft, Lightbulb, ShieldAlert, TrendingUp, Brain, X, HelpCircle
} from 'lucide-react'
import './Read.css'

const API_BASE = import.meta.env.VITE_API_URL || ''

// ─────────────────────────────────────────────────────────────
// TOOLTIP CONTENT — specific guidance per sub-question per answer
// ─────────────────────────────────────────────────────────────
const TOOLTIPS = {
  sam_active: {
    yes: 'SAM.gov registration is active, UEI is valid, and renewal is more than 60 days out.',
    partial: 'Active but expiring within 30–60 days. Renew immediately — an expired registration disqualifies your bid.',
    no: 'Registration is lapsed or UEI is inactive. You cannot submit a compliant bid until this is resolved. Full stop.',
  },
  naics_match: {
    yes: 'Your primary or secondary NAICS code in SAM.gov matches the solicitation exactly.',
    partial: 'Adjacent or related NAICS. You may still be eligible, but your proposal will need to explicitly justify the code alignment.',
    no: 'NAICS mismatch. Contracting officers flag non-matching codes as non-responsive. Do not bid.',
  },
  setaside_qual: {
    yes: 'You hold the required set-aside certification or no set-aside applies to this solicitation.',
    partial: 'You may qualify but certification is pending or in process. Verify the solicitation allows self-certification.',
    no: 'You do not meet the set-aside requirement. Unless this opens to full-and-open competition, pass on this opportunity.',
  },
  licenses: {
    yes: 'Every license, certification, bond, and clearance listed in the solicitation is in hand.',
    partial: 'Most requirements met but one item is in process. Confirm the solicitation allows conditional submission.',
    no: 'A required license or clearance is missing. Submitting without it wastes your resources and damages your record.',
  },
  past_perf: {
    yes: 'You have at least one documented, relevant project and a reference who will respond promptly and positively.',
    partial: 'Commercial or informal experience that parallels the scope — not a direct federal match. Acceptable but requires strong framing.',
    no: 'No relevant past performance to cite. On competitive solicitations, this is a serious weakness. Consider teaming.',
  },
  mandatory_met: {
    yes: 'Every "shall" and "must" in the solicitation requirements section is satisfied.',
    partial: 'One or more items are close but require a written explanation or exception. Proceed with caution.',
    no: 'A mandatory requirement is unmet. This is a non-responsive bid and will be eliminated before evaluation.',
  },
  staff: {
    yes: 'You have current employees who can be assigned, or a realistic and fast path to hire before the contract start.',
    partial: 'Staffing plan exists but relies on key hires not yet made. Confirm your labor pool before bidding.',
    no: 'You cannot staff this contract today and have no credible path to do so in time. Pass.',
  },
  equipment: {
    yes: 'All equipment, vehicles, technology, and supplies needed for performance are owned or readily available to lease.',
    partial: 'Some equipment needs to be acquired or rented. Factor the cost into your pricing and confirm availability.',
    no: 'Critical equipment is unavailable. Unless you can source it quickly and cheaply, the performance risk is too high.',
  },
  bandwidth: {
    yes: 'Your team and operations can absorb this contract without degrading quality on existing work.',
    partial: 'Tight but manageable. You will need to monitor closely and possibly hire support staff.',
    no: 'You are at capacity. Taking this contract risks your existing performance record — your most valuable asset.',
  },
  response_time: {
    yes: 'The due date gives you enough time to read, plan, draft, review, and submit a compliant and competitive proposal.',
    partial: 'Tight but achievable if you start immediately. Cut scope or complexity from the response to fit the window.',
    no: 'Insufficient time to submit a quality response. A rushed bid is worse than no bid — it signals poor process to the agency.',
  },
  start_date: {
    yes: 'You can be operational and delivering the scope on the contract start date without issue.',
    partial: 'Mobilization will be tight. Confirm with your team and add a mobilization plan to your proposal.',
    no: 'You cannot start on the required date. An inability to mobilize is a contract default before you begin.',
  },
  period: {
    yes: 'The length of the contract is compatible with your business planning, staffing model, and risk tolerance.',
    partial: 'Longer than ideal, but manageable with annual price adjustment clauses or option-year pricing reviews.',
    no: 'The period of performance creates unsustainable risk — labor cost exposure, long-term commitments, or cash flow pressure.',
  },
  cost_known: {
    yes: 'You can estimate labor, supplies, overhead, and indirect costs with reasonable confidence from the scope of work.',
    partial: 'Scope is partially clear. Consider pricing with a contingency buffer or requesting a scope clarification.',
    no: 'Scope is too vague to price accurately. Submitting blind creates catastrophic risk. Request an industry day or Q&A.',
  },
  margin: {
    yes: 'At a competitive price point, your fully-loaded margin exceeds 15%. This is a financially sound pursuit.',
    partial: 'Margin is in the 8–14% range. Acceptable if this builds past performance or a strategic relationship.',
    no: 'You cannot win and make money at the same time. A below-cost contract is a liability, not an asset.',
  },
  risk: {
    yes: 'No unusual cost risks identified — stable labor market, clear scope, no required specialized equipment or travel.',
    partial: 'Some cost risk identified. Price in a 5–10% contingency and document your assumptions.',
    no: 'Significant cost risk that could erase your margin. Identify and quantify before deciding to bid.',
  },
  references: {
    yes: 'You have at least one strong past performance reference who is reachable, willing, and will speak to relevant work.',
    partial: 'Reference is available but the work is only partially relevant. Frame the transferable scope clearly.',
    no: 'No usable reference. Evaluators will score past performance as neutral or negative. Consider teaming with an experienced prime.',
  },
  personnel: {
    yes: 'Key personnel are identified, available, and their qualifications can be documented in the proposal.',
    partial: 'Key personnel identified but resumes need updating or one position is not yet filled.',
    no: 'Key personnel cannot be named or documented. This is a significant proposal weakness on any staffing-intensive contract.',
  },
  approach: {
    yes: 'You can write a specific, tailored technical approach that directly addresses the evaluation factors — not generic filler.',
    partial: 'You understand the scope but some sections will require research and expert input to fill out properly.',
    no: 'You do not understand the work well enough to write a credible technical approach. Pass or invest in a pre-bid site visit.',
  },
}

// ─────────────────────────────────────────────────────────────
// SECTION INSIGHTS — generated based on score per question
// ─────────────────────────────────────────────────────────────
const SECTION_INSIGHTS = {
  eligibility: {
    strong: 'Eligibility gate cleared. Your registration, NAICS alignment, and set-aside status are in order. Proceed.',
    caution: 'Eligibility gap detected. Resolve registration or set-aside issues before investing time in a proposal.',
    stop: '⚠ Hard stop. One or more eligibility requirements are unmet. Do not submit until resolved.',
  },
  requirements: {
    strong: 'Requirements gate cleared. You meet all mandatory qualifications — your bid is legally defensible from the start.',
    caution: 'Partial requirement gaps exist. Document your mitigation plan and confirm the agency will accept conditional qualifications.',
    stop: '⚠ Hard stop. A mandatory requirement is unmet. Submitting an ineligible bid wastes resources and harms your record.',
  },
  availability: {
    strong: 'Capacity confirmed. You can staff, equip, and deliver this contract without compromising existing work.',
    caution: 'Capacity is tight. Build a staffing plan and identify your flex resources before committing.',
    stop: '⚠ Capacity risk. Taking on work you cannot deliver destroys your past performance record — your most valuable asset.',
  },
  deadlines: {
    strong: 'Timeline is workable. You have room to prepare a quality response and a feasible mobilization window.',
    caution: 'Timing is tight. Prioritize immediately and consider which proposal sections you can template vs. which require original work.',
    stop: '⚠ Timeline is unworkable. A rushed or late proposal is worse than passing. Wait for the next cycle.',
  },
  economics: {
    strong: 'Financially sound. You can price competitively and still protect your margin. This is a viable business decision.',
    caution: 'Thin margin. Acceptable if this builds strategic past performance, but price your contingencies carefully.',
    stop: '⚠ Economics do not work. A below-cost win creates liability, cash flow strain, and performance risk. Pass.',
  },
  documentation: {
    strong: 'Proposal-ready. You have the references, personnel, and technical substance to build a compelling response.',
    caution: 'Proposal gaps exist. Fill them before the due date — references, resumes, and technical approach are all evaluatable.',
    stop: '⚠ Insufficient documentation. A proposal without substantiation cannot compete. Either team up or build evidence first.',
  },
}

// ─────────────────────────────────────────────────────────────
// THE 6 R-E-A-D QUESTIONS
// ─────────────────────────────────────────────────────────────
const QUESTIONS = [
  {
    id: 'eligibility', letter: 'R', category: 'Registration & Eligibility',
    headline: 'Are you registered, active, and eligible to compete?',
    guidance: 'An ineligible bid wastes your time and damages your record. If any sub-question is No, this is a hard stop before the next section.',
    hardStopSubs: ['sam_active', 'naics_match', 'setaside_qual'],
    subs: [
      { id: 'sam_active', label: 'SAM.gov registration is active and will not expire before the award date.' },
      { id: 'naics_match', label: 'Your primary or secondary NAICS code matches the solicitation.' },
      { id: 'setaside_qual', label: 'You meet the set-aside qualification, or none is required.' },
    ],
  },
  {
    id: 'requirements', letter: 'E', category: 'Experience & Mandatory Requirements',
    headline: 'Do you meet every mandatory requirement in the solicitation?',
    guidance: 'Mandatory requirements are pass/fail. One missed requirement eliminates your bid before evaluation begins.',
    hardStopSubs: ['mandatory_met'],
    subs: [
      { id: 'licenses', label: 'You hold all required licenses, certifications, bonds, or clearances.' },
      { id: 'past_perf', label: 'You can demonstrate relevant past performance.' },
      { id: 'mandatory_met', label: 'Every other mandatory qualification in the solicitation is met.' },
    ],
  },
  {
    id: 'availability', letter: 'A', category: 'Availability & Capacity',
    headline: 'Do you have the people, equipment, and bandwidth to perform?',
    guidance: 'Winning a contract you cannot deliver destroys your past performance and future opportunities. Be honest about real capacity today.',
    hardStopSubs: [],
    subs: [
      { id: 'staff', label: 'You can staff this contract from current team or realistic hires within the mobilization window.' },
      { id: 'equipment', label: 'You have or can acquire the required equipment, vehicles, or supplies.' },
      { id: 'bandwidth', label: 'Your current active work will not prevent full-quality performance on this contract.' },
    ],
  },
  {
    id: 'deadlines', letter: 'D', category: 'Deadlines & Timing',
    headline: 'Is the response timeline and performance period workable?',
    guidance: 'Rushed proposals are weak proposals. If you cannot assemble a compliant, competitive response in time, pass and pursue the next opportunity.',
    hardStopSubs: [],
    subs: [
      { id: 'response_time', label: 'You have enough time to prepare a compliant, competitive proposal before the due date.' },
      { id: 'start_date', label: 'The performance start date is realistic — you can mobilize and be operational in time.' },
      { id: 'period', label: 'The period of performance is manageable within your business planning horizon.' },
    ],
  },
  {
    id: 'economics', letter: 'E', category: 'Economics & Margin',
    headline: 'Can you price to win AND make money?',
    guidance: 'A contract that loses money is worse than no contract. Estimate your fully-loaded costs first. Target minimum 15% margin on service work.',
    hardStopSubs: ['margin'],
    subs: [
      { id: 'cost_known', label: 'You understand the scope well enough to estimate costs with reasonable confidence.' },
      { id: 'margin', label: 'At a competitive price, your estimated margin is at least 12–15% after all costs.' },
      { id: 'risk', label: 'No unusual cost risks exist that could erase your margin.' },
    ],
  },
  {
    id: 'documentation', letter: 'D', category: 'Documentation & Substantiation',
    headline: 'Can you build a compelling, substantiated proposal?',
    guidance: 'The best-priced bid loses without proof of capability. A strong proposal requires real evidence — references, personnel, and a specific technical approach.',
    hardStopSubs: [],
    subs: [
      { id: 'references', label: 'You have at least one strong past performance reference who will respond promptly.' },
      { id: 'personnel', label: 'Key personnel are identified and their qualifications can be documented.' },
      { id: 'approach', label: 'You can write a specific, credible technical approach — not boilerplate.' },
    ],
  },
]

// ─────────────────────────────────────────────────────────────
// TAILORED TOOLTIPS — substitutes real opportunity data into the
// generic guidance above, when WARDOG passed it through
// ─────────────────────────────────────────────────────────────
function tailoredTooltip(subId, opt, ctx) {
  const base = TOOLTIPS[subId]?.[opt] || ''
  if (!ctx) return base

  if (subId === 'naics_match' && ctx.naics) {
    if (opt === 'yes') return `Your primary or secondary NAICS code in SAM.gov matches NAICS ${ctx.naics}, the code on this solicitation, exactly.`
    if (opt === 'partial') return `Your code is adjacent or related to NAICS ${ctx.naics}. You may still be eligible, but your proposal will need to explicitly justify the code alignment.`
    if (opt === 'no') return `Your registered code doesn't match NAICS ${ctx.naics} on this solicitation. Contracting officers flag non-matching codes as non-responsive. Do not bid.`
  }
  if (subId === 'setaside_qual' && ctx.setaside) {
    if (opt === 'yes') return `You hold the ${ctx.setaside} certification this solicitation requires, or it's open to all businesses.`
    if (opt === 'partial') return `You may qualify for the ${ctx.setaside} set-aside but certification is pending or in process. Verify the solicitation allows self-certification.`
    if (opt === 'no') return `You do not meet the ${ctx.setaside} set-aside requirement on this solicitation. Unless it opens to full-and-open competition, pass on this opportunity.`
  }
  if (subId === 'response_time' && ctx.daysUntilDue != null) {
    if (opt === 'yes') return `You have ${ctx.daysUntilDue} day${ctx.daysUntilDue === 1 ? '' : 's'} until the due date — enough time to read, plan, draft, review, and submit a compliant, competitive proposal.`
    if (opt === 'partial') return `${ctx.daysUntilDue} day${ctx.daysUntilDue === 1 ? '' : 's'} is tight but achievable if you start immediately. Cut scope or complexity from the response to fit the window.`
    if (opt === 'no') return `With only ${ctx.daysUntilDue} day${ctx.daysUntilDue === 1 ? '' : 's'} left, there isn't enough time for a quality response. A rushed bid is worse than no bid — it signals poor process to the agency.`
  }
  return base
}

const SUB_VALUES = { yes: 1, partial: 0.5, no: 0 }

function qScore(answers, q) {
  const raw = q.subs.reduce((s, sub) => s + (SUB_VALUES[answers[sub.id]] ?? 0), 0)
  return (raw / q.subs.length) * 3 // 0–3 scale per question
}

function totalScore(answers) {
  // Each question scores 0–3; averaging across the 6 questions gives a 0–3
  // per-question average, so *2 (not *6) is what actually rescales that
  // onto the 0–6 total scale the recommendation thresholds and axis
  // labels below assume. The old *6 let the raw total run as high as 18
  // while everything downstream displayed it as "X / 6.0".
  return QUESTIONS.reduce((s, q) => s + qScore(answers, q), 0) / QUESTIONS.length * 2
}

function recommendation(score) {
  if (score >= 4.5) return { label: 'PURSUE', variant: 'go', text: 'Strong bid. Proceed to proposal assembly.' }
  if (score >= 3.0) return { label: 'CONDITIONAL', variant: 'maybe', text: 'Proceed only after closing the gaps identified below.' }
  return { label: 'PASS', variant: 'no', text: 'Do not bid. Risk outweighs the opportunity at this time.' }
}

function hasHardStop(answers, q) {
  return q.hardStopSubs.some(id => answers[id] === 'no')
}

// ─────────────────────────────────────────────────────────────
// AI SYNTHESIS — rule-based but reads like real analysis
// ─────────────────────────────────────────────────────────────
function generateAIAnalysis(answers, score, ctx) {
  const scores = QUESTIONS.map(q => ({ id: q.id, label: q.category, s: qScore(answers, q) }))
  const sorted = [...scores].sort((a, b) => a.s - b.s)
  const weakest = sorted.slice(0, 2)
  const strongest = [...scores].sort((a, b) => b.s - a.s).slice(0, 2)
  const hardStops = QUESTIONS.filter(q => hasHardStop(answers, q))
  const noAnswers = Object.values(answers).filter(v => v === 'no').length
  const partialAnswers = Object.values(answers).filter(v => v === 'partial').length

  const oppRef = ctx?.title ? `"${ctx.title}"${ctx.agency ? ` (${ctx.agency})` : ''}` : 'this opportunity'

  let posture = ''
  if (score >= 4.5) {
    posture = `For ${oppRef}, this is a well-positioned bid. Your strongest areas — ${strongest[0].label} and ${strongest[1]?.label ?? 'capacity'} — give you a defensible and competitive foundation. ` +
      (weakest[0].s < 2 ? `The main area to shore up before submitting is ${weakest[0].label.toLowerCase()}, where partial scores suggest actionable gaps rather than disqualifiers. ` : 'Your weakest sections still clear the threshold for a competitive response. ') +
      `With ${noAnswers} hard No${noAnswers !== 1 ? 's' : ''} and ${partialAnswers} Partials across the worksheet, your principal task is gap documentation and mitigation planning, not re-evaluating whether to pursue.`
  } else if (score >= 3.0) {
    posture = `For ${oppRef}, this is a conditional bid. Your ${strongest[0].label} position is solid, but ${weakest[0].label.toLowerCase()} and ${weakest[1]?.label.toLowerCase() ?? 'timing'} each show gaps that — unaddressed — will weaken your submission or create performance risk. ` +
      `${hardStops.length > 0 ? `You have ${hardStops.length} hard-stop answer${hardStops.length > 1 ? 's' : ''} that must be resolved before proceeding. ` : ''}` +
      `${ctx?.daysUntilDue != null ? `With ${ctx.daysUntilDue} day${ctx.daysUntilDue === 1 ? '' : 's'} until the due date, ` : 'A '}conditional pursue decision is appropriate only if you can close the identified gaps before the due date.`
  } else {
    posture = `${ctx?.title ? `${oppRef} does` : 'This opportunity does'} not clear the FASS bid threshold at this time. With ${noAnswers} hard No${noAnswers !== 1 ? 's' : ''} and a score below 3.0, the combination of eligibility gaps, capacity constraints, or economic risk creates more exposure than the contract value justifies. ` +
      `The right move is to pass, document what would need to change to pursue this type of opportunity, and invest your proposal time in a better-matched solicitation.`
  }

  const actions = []
  QUESTIONS.forEach(q => {
    const s = qScore(answers, q)
    if (s < 2) {
      q.subs.forEach(sub => {
        if (answers[sub.id] === 'no') {
          actions.push({ type: 'stop', text: TOOLTIPS[sub.id]?.no || 'Resolve this hard stop before proceeding.' })
        } else if (answers[sub.id] === 'partial') {
          actions.push({ type: 'action', text: TOOLTIPS[sub.id]?.partial || 'Address this gap in your proposal or pre-submission checklist.' })
        }
      })
    }
  })

  return { posture, actions: actions.slice(0, 5) }
}

// ─────────────────────────────────────────────────────────────
// COMPONENTS
// ─────────────────────────────────────────────────────────────

function Tooltip({ text, children }) {
  const [visible, setVisible] = useState(false)
  const ref = useRef(null)

  return (
    <span
      className="rd-tooltip-wrap"
      onMouseEnter={() => setVisible(true)}
      onMouseLeave={() => setVisible(false)}
      ref={ref}
    >
      {children}
      {visible && <span className="rd-tooltip">{text}</span>}
    </span>
  )
}

function ProgressTracker({ questions, answers }) {
  return (
    <div className="rd-tracker">
      {questions.map((q, i) => {
        const answered = q.subs.every(s => answers[s.id] !== undefined)
        const score = answered ? qScore(answers, q) / 3 : null
        const hasStop = hasHardStop(answers, q)
        const state = !answered ? 'pending' : hasStop ? 'stop' : score >= 0.67 ? 'strong' : score >= 0.34 ? 'caution' : 'weak'

        return (
          <div key={q.id} className="rd-tracker-item">
            <div className={`rd-tracker-dot rd-tracker-${state}`}>
              {state === 'stop'   && <XCircle size={14} />}
              {state === 'strong' && <CheckCircle size={14} />}
              {state === 'caution' && <AlertCircle size={14} />}
              {state === 'weak'   && <XCircle size={14} />}
              {state === 'pending' && <span className="rd-tracker-num">{i + 1}</span>}
            </div>
            {i < questions.length - 1 && (
              <div className={`rd-tracker-line ${answered ? `rd-line-${state}` : ''}`} />
            )}
            <span className="rd-tracker-label">{q.letter}</span>
          </div>
        )
      })}
    </div>
  )
}

function SectionInsight({ q, answers }) {
  const answered = q.subs.every(s => answers[s.id] !== undefined)
  if (!answered) return null

  const s = qScore(answers, q) / 3
  const hasStop = hasHardStop(answers, q)
  const insight = SECTION_INSIGHTS[q.id]
  const variant = hasStop ? 'stop' : s >= 0.67 ? 'strong' : s >= 0.34 ? 'caution' : 'stop'
  const text = insight[variant]
  const Icon = variant === 'strong' ? CheckCircle : variant === 'caution' ? Lightbulb : ShieldAlert

  return (
    <div className={`rd-insight rd-insight-${variant}`}>
      <Icon size={15} />
      <span>{text}</span>
    </div>
  )
}

function SubQuestion({ sub, value, onChange, ctx }) {
  return (
    <div className="rd-sub">
      <p className="rd-sub-label">{sub.label}</p>
      <div className="rd-sub-options">
        {['yes', 'partial', 'no'].map(opt => (
          <Tooltip key={opt} text={tailoredTooltip(sub.id, opt, ctx)}>
            <label className={`rd-option ${value === opt ? `rd-option-${opt}` : ''}`}>
              <input
                type="radio"
                name={sub.id}
                value={opt}
                checked={value === opt}
                onChange={() => onChange(sub.id, opt)}
              />
              {opt === 'yes' ? 'Yes' : opt === 'partial' ? 'Partial' : 'No'}
            </label>
          </Tooltip>
        ))}
      </div>
    </div>
  )
}

function QuestionCard({ q, answers, notes, onAnswer, onNote, ctx, defaultOpen, bulkSignal, synthesis, synthesisLoading }) {
  const [open, setOpen] = useState(defaultOpen)

  useEffect(() => {
    if (bulkSignal) setOpen(bulkSignal.open)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bulkSignal?.token])
  const answered = q.subs.every(s => answers[s.id] !== undefined)
  const s = answered ? qScore(answers, q) : null
  const hasStop = hasHardStop(answers, q)
  const scoreVariant = hasStop ? 'qs-no' : s >= 2 ? 'qs-go' : s >= 1 ? 'qs-maybe' : 'qs-no'

  return (
    <div className={`rd-question ${answered ? `rd-q-done` : ''} ${hasStop ? 'rd-q-hardstop' : ''}`}>
      <button className="rd-q-header" onClick={() => setOpen(o => !o)}>
        <div className="rd-q-left">
          <span className={`rd-q-letter ${answered && !hasStop ? 'rd-letter-done' : hasStop ? 'rd-letter-stop' : ''}`}>
            {q.letter}
          </span>
          <div>
            <span className="rd-q-category">{q.category}</span>
            <span className="rd-q-headline">{q.headline}</span>
          </div>
        </div>
        <div className="rd-q-right">
          {answered && (
            <span className={`rd-q-score ${scoreVariant}`}>
              {s.toFixed(1)} / 3.0
            </span>
          )}
          {open ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
        </div>
      </button>

      {open && (
        <div className="rd-q-body">
          {/* Grounded in the actual solicitation text (carried on the linked
              proposal row), not just generic per-category guidance — this is
              what tells a user landing here cold what THIS solicitation says
              about this section, before they have to answer Yes/Partial/No. */}
          {synthesisLoading && (
            <div className="rd-synthesis rd-synthesis-loading">
              <Brain size={14} />
              <span>Reading the solicitation for this section…</span>
            </div>
          )}
          {!synthesisLoading && synthesis && (
            <div className="rd-synthesis">
              <div className="rd-synthesis-label">
                <Brain size={14} />
                <span>What this solicitation says</span>
              </div>
              <p className="rd-synthesis-text">{synthesis}</p>
            </div>
          )}
          <p className="rd-guidance">{q.guidance}</p>
          <div className="rd-subs">
            {q.subs.map(sub => (
              <SubQuestion key={sub.id} sub={sub} value={answers[sub.id]} onChange={onAnswer} ctx={ctx} />
            ))}
          </div>
          <SectionInsight q={q} answers={answers} />
          <div className="rd-notes">
            <label>Notes & observations</label>
            <textarea
              placeholder="Document your reasoning, gaps, or mitigation strategy…"
              value={notes[q.id] || ''}
              onChange={e => onNote(q.id, e.target.value)}
              rows={3}
            />
          </div>
        </div>
      )}
    </div>
  )
}

function AIAnalysis({ answers, score, ctx }) {
  const allAnswered = QUESTIONS.every(q => q.subs.every(s => answers[s.id] !== undefined))
  if (!allAnswered) return null

  const { posture, actions } = generateAIAnalysis(answers, score, ctx)

  return (
    <div className="rd-ai">
      <div className="rd-ai-header">
        <Brain size={18} />
        <span>FASS AI Analysis</span>
        <span className="rd-ai-badge">Powered by FASS R-E-A-D</span>
      </div>
      <p className="rd-ai-posture">{posture}</p>
      {actions.length > 0 && (
        <div className="rd-ai-actions">
          <p className="rd-ai-actions-label">Priority actions before deciding:</p>
          {actions.map((a, i) => (
            <div key={i} className={`rd-ai-action rd-ai-action-${a.type}`}>
              {a.type === 'stop' ? <ShieldAlert size={13} /> : <TrendingUp size={13} />}
              <span>{a.text}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// MAIN PAGE
// ─────────────────────────────────────────────────────────────
export default function Read() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { session } = useAuth()

  const oppTitle = searchParams.get('title') || 'Untitled Opportunity'
  const oppAgency = searchParams.get('agency') || ''
  const oppNaics = searchParams.get('naics') || ''
  const oppSetAside = searchParams.get('setaside') || ''
  const oppDue = searchParams.get('due') || ''
  // Shared join key with the proposals table. When present (from WARDOG's
  // "Save interest" or Pipeline's "Score with R-E-A-D"), saving here
  // UPDATEs that existing row instead of inserting a second one — this is
  // what keeps one opportunity as one Pipeline card across tools.
  const incomingProposalId = searchParams.get('proposalId') || null
  const daysUntilDue = oppDue
    ? Math.ceil((new Date(oppDue).getTime() - Date.now()) / 86400000)
    : null
  const ctx = {
    title: oppTitle !== 'Untitled Opportunity' ? oppTitle : '',
    agency: oppAgency,
    naics: oppNaics,
    setaside: oppSetAside,
    daysUntilDue,
  }

  const [answers, setAnswers] = useState({})
  const [notes, setNotes] = useState({})
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [savedProposalId, setSavedProposalId] = useState(incomingProposalId)
  // "Does this system grow with you" — track how many R-E-A-D worksheets
  // this user has actually completed. After a few, we assume they know
  // the drill: collapse sections by default and skip the help banner
  // automatically, rather than making them dismiss it every time.
  const completedCount = Number(localStorage.getItem('fass_read_completed_count') || 0)
  const isAdvanced = completedCount >= 3

  const [showHelp, setShowHelp] = useState(
    () => !isAdvanced && localStorage.getItem('fass_read_help_dismissed') !== '1'
  )
  const [bulkSignal, setBulkSignal] = useState(null)

  // The worksheet used to show identical generic guidance no matter which
  // solicitation it was scoring — someone landing here straight from WARDOG
  // had to leave the page to know what THIS opportunity actually requires.
  // Pull the real solicitation text off the linked proposal row (now carried
  // there by WARDOG/Pipeline/FASS FILL) and ask the backend for a per-section
  // synthesis grounded in it.
  const [solicitationText, setSolicitationText] = useState('')
  const [synthesisMap, setSynthesisMap] = useState({})
  const [synthesisLoading, setSynthesisLoading] = useState(false)
  const [synthesisError, setSynthesisError] = useState('')

  useEffect(() => {
    if (!savedProposalId) return
    let cancelled = false
    ;(async () => {
      const { data } = await supabase
        .from('proposals')
        .select('description')
        .eq('id', savedProposalId)
        .single()
      if (!cancelled && data?.description) setSolicitationText(data.description)
    })()
    return () => { cancelled = true }
  }, [savedProposalId])

  useEffect(() => {
    if (!solicitationText.trim()) return
    let cancelled = false
    setSynthesisLoading(true)
    setSynthesisError('')
    ;(async () => {
      try {
        const res = await fetch(`${API_BASE}/api/v1/ai/read-synthesis`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            solicitation_text: solicitationText,
            title: oppTitle,
            agency: oppAgency,
            user_id: session?.user?.id || null,
          }),
        })
        if (!res.ok) {
          if (res.status === 402) {
            const detail = await res.json().catch(() => ({}))
            throw new Error(detail.detail || 'AI synthesis quota reached for this billing cycle.')
          }
          throw new Error(`Synthesis request failed (${res.status})`)
        }
        const json = await res.json()
        if (!cancelled) setSynthesisMap(json.synthesis || {})
      } catch (err) {
        if (!cancelled) setSynthesisError(err.message || 'Could not generate synthesis')
      } finally {
        if (!cancelled) setSynthesisLoading(false)
      }
    })()
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [solicitationText])

  function dismissHelp() {
    setShowHelp(false)
    localStorage.setItem('fass_read_help_dismissed', '1')
  }

  function expandAll() { setBulkSignal(prev => ({ open: true, token: (prev?.token || 0) + 1 })) }
  function collapseAll() { setBulkSignal(prev => ({ open: false, token: (prev?.token || 0) + 1 })) }

  const score = totalScore(answers)
  const answeredCount = QUESTIONS.filter(q => q.subs.every(s => answers[s.id] !== undefined)).length
  const allAnswered = answeredCount === QUESTIONS.length
  const rec = recommendation(score)
  const pct = Math.min((score / 6) * 100, 100)

  function handleAnswer(subId, value) {
    setAnswers(prev => ({ ...prev, [subId]: value }))
    setSaved(false)
  }

  function handleNote(qId, value) {
    setNotes(prev => ({ ...prev, [qId]: value }))
    setSaved(false)
  }

  async function handleSave() {
    if (!session) return
    setSaving(true)
    setSaveError('')
    const worksheet = { answers, notes, score, recommendation: rec.label, completedAt: new Date().toISOString() }
    const payload = {
      title: oppTitle,
      status: rec.label === 'PURSUE' ? 'pursuing' : rec.label === 'CONDITIONAL' ? 'review' : 'passed',
      stage: 'scored',
      agency: oppAgency || null,
      naics_code: oppNaics || null,
      due_date: oppDue || null,
      read_score: score,
      read_worksheet: worksheet,
    }

    let error, data
    if (savedProposalId) {
      // Came from an existing flagged/scored row (WARDOG save-interest or
      // Pipeline's "Score with R-E-A-D") — update it in place instead of
      // inserting a duplicate Pipeline card for the same opportunity.
      ;({ error, data } = await supabase.from('proposals').update(payload).eq('id', savedProposalId).select().single())
    } else {
      ;({ error, data } = await supabase.from('proposals').insert({ user_id: session.user.id, ...payload }).select().single())
    }

    if (error) setSaveError(error.message)
    else {
      setSaved(true)
      if (data?.id) setSavedProposalId(data.id)
      localStorage.setItem('fass_read_completed_count', String(completedCount + 1))
    }
    setSaving(false)
  }

  const RecIcon = rec.variant === 'go' ? CheckCircle : rec.variant === 'maybe' ? AlertCircle : XCircle

  return (
    <div className="rd">
      {/* Header */}
      <header className="rd-header">
        <div className="rd-header-inner">
          <button className="rd-back" onClick={() => navigate('/dashboard')}>
            <ArrowLeft size={16} /> Dashboard
          </button>
          <div className="rd-header-meta">
            <span className="rd-tool-label">R-E-A-D Worksheet</span>
            <span className="rd-header-title">{oppTitle}</span>
            {(oppAgency || oppNaics || daysUntilDue != null) && (
              <span className="rd-header-sub">
                {[oppAgency, oppNaics && `NAICS ${oppNaics}`, daysUntilDue != null && `Due in ${daysUntilDue}d`].filter(Boolean).join(' · ')}
              </span>
            )}
          </div>
          <span className="rd-progress">{answeredCount} / {QUESTIONS.length} complete</span>
          {!showHelp && (
            <button className="rd-help-reopen" onClick={() => setShowHelp(true)} aria-label="How this works">
              <HelpCircle size={16} />
            </button>
          )}
        </div>
      </header>

      {showHelp && (
        <div className="rd-help-banner">
          <div className="rd-help-banner-inner">
            <div className="rd-help-text">
              <h3>How R-E-A-D works — 60 seconds</h3>
              <p>
                {ctx.title
                  ? <>You're scoring <strong>{ctx.title}</strong>{ctx.agency ? ` (${ctx.agency})` : ''}. </>
                  : null}
                Six sections, three quick questions each — 18 total, but you only answer Yes / Partial / No, no writing required.
                A <strong>No</strong> on certain questions is a hard stop (don't bid); <strong>Partial</strong> usually means proceed with caution.
                {daysUntilDue != null && daysUntilDue <= 7 && (
                  <> This one's due in <strong>{daysUntilDue} day{daysUntilDue === 1 ? '' : 's'}</strong> — work fast.</>
                )}
                {' '}Your score and recommendation update live as you go, and nothing saves to your pipeline until you've answered every question —
                so it's safe to leave this open and come back to it, your answers stay on screen as you work through it.
                Not sure about a question? Hover the tooltip under each answer — it's written for this specific solicitation where we have the data.
              </p>
            </div>
            <button className="rd-help-dismiss" onClick={dismissHelp} aria-label="Dismiss">
              <X size={16} />
            </button>
          </div>
        </div>
      )}

      {/* Progress tracker */}
      <div className="rd-tracker-bar">
        <div className="rd-tracker-inner">
          <ProgressTracker questions={QUESTIONS} answers={answers} />
          <div className="rd-bulk-actions">
            <button onClick={expandAll}>Expand all</button>
            <span className="rd-bulk-sep">·</span>
            <button onClick={collapseAll}>Collapse all</button>
          </div>
        </div>
      </div>

      <div className="rd-body">
        <div className="rd-container">

          {/* Live score summary */}
          <div className="rd-summary">
            <div className="rd-summary-scores">
              {QUESTIONS.map(q => {
                const s = q.subs.every(sub => answers[sub.id] !== undefined) ? qScore(answers, q) : null
                const hasStop = hasHardStop(answers, q)
                return (
                  <div key={q.id} className="rd-mini-score">
                    <span className="rd-mini-letter">{q.letter}</span>
                    <div className="rd-mini-bar-track">
                      <div
                        className={`rd-mini-bar-fill ${hasStop ? 'fill-no' : s === null ? 'fill-empty' : s >= 2 ? 'fill-go' : s >= 1 ? 'fill-maybe' : 'fill-no'}`}
                        style={{ height: s !== null ? `${(s / 3) * 100}%` : '0%' }}
                      />
                    </div>
                    <span className="rd-mini-val">{s !== null ? s.toFixed(1) : '—'}</span>
                  </div>
                )
              })}
            </div>

            <div className="rd-summary-main">
              <div className="rd-total-row">
                <div>
                  <div className="rd-total-label">Total Score</div>
                  <div className="rd-total-num">
                    <span className={`rd-total-val score-${rec.variant}`}>{score.toFixed(1)}</span>
                    <span className="rd-total-max">/ 6.0</span>
                  </div>
                </div>
                <div className={`rd-rec-pill rec-${rec.variant}`}>
                  <RecIcon size={16} />
                  {rec.label}
                </div>
              </div>

              {/* Animated score bar */}
              <div className="rd-score-track">
                <div className={`rd-score-fill score-fill-${rec.variant}`} style={{ width: `${pct}%` }} />
                <div className="rd-score-marker" style={{ left: '50%' }} title="Conditional (3.0)" />
                <div className="rd-score-marker" style={{ left: '75%' }} title="Pursue (4.5)" />
              </div>
              <div className="rd-score-axis">
                <span>0</span>
                <span className="rd-axis-mid">3.0 Conditional</span>
                <span className="rd-axis-high">4.5 Pursue</span>
                <span>6</span>
              </div>
              <p className="rd-rec-text">{rec.text}</p>
            </div>
          </div>

          {/* Questions */}
          <div className="rd-questions">
            {QUESTIONS.map(q => {
              const qAnswered = q.subs.every(s => answers[s.id] !== undefined)
              return (
                <QuestionCard
                  key={q.id}
                  q={q}
                  answers={answers}
                  notes={notes}
                  onAnswer={handleAnswer}
                  onNote={handleNote}
                  ctx={ctx}
                  // Advanced users get sections collapsed by default to move
                  // faster — but a section that's still unanswered must never
                  // start collapsed, or it silently sits incomplete below the
                  // fold while the Save button stays disabled with no clue why.
                  defaultOpen={!isAdvanced || !qAnswered}
                  bulkSignal={bulkSignal}
                  synthesis={synthesisMap[q.id]}
                  synthesisLoading={synthesisLoading && solicitationText.trim() && !synthesisMap[q.id]}
                />
              )
            })}
          </div>
          {synthesisError && !synthesisLoading && (
            <p className="rd-synthesis-error">Couldn't generate AI synthesis: {synthesisError}</p>
          )}

          {/* AI Analysis */}
          <AIAnalysis answers={answers} score={score} ctx={ctx} />

          {/* Save */}
          <div className="rd-footer">
            <div className={`rd-decision rec-${rec.variant}`}>
              <RecIcon size={26} />
              <div>
                <h2 className="rd-decision-label">{rec.label}</h2>
                <p className="rd-decision-text">{rec.text}</p>
              </div>
            </div>
            {saveError && <p className="rd-save-error">{saveError}</p>}
            <div className="rd-footer-actions">
              <button className="btn-primary rd-save-btn" onClick={handleSave} disabled={saving || !allAnswered}>
                <Save size={15} />
                {saving ? 'Saving…' : saved ? 'Saved to pipeline ✓' : 'Save decision to pipeline'}
              </button>
              {!allAnswered && <p className="rd-save-note">Complete all {QUESTIONS.length} sections to save.</p>}
              {saved && (
                <div className="rd-next-steps">
                  <span className="rd-next-label">What's next:</span>
                  <Link
                    to={`/fill?new=1&proposalId=${savedProposalId || ''}&title=${encodeURIComponent(oppTitle)}&agency=${encodeURIComponent(oppAgency)}`}
                    className="rd-next-link"
                  >
                    Continue to FASS FILL →
                  </Link>
                  <button className="rd-next-link" onClick={() => navigate('/pipeline')}>
                    View in Pipeline →
                  </button>
                </div>
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}
