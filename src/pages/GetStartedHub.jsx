import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Search, Radar, Mail, GraduationCap, ClipboardCheck, ClipboardList, Kanban,
  ShieldCheck, HardHat, Camera, Newspaper, Users, DollarSign, BookOpen,
  Sparkles, IdCard, ArrowRight, Lock, PenSquare, LayoutGrid,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'
import useSeo from '../hooks/useSeo'
import './GetStartedHub.css'

const API_BASE = import.meta.env.VITE_API_URL || ''

// The signed-in "where am I in the lifecycle?" hub. Renders inside AppShell
// (it's a protected route), so it inherits the sidebar — a guided map of the
// platform organized by the contract journey, not a marketing page.
//
// First-run gating mirrors AppShell's tier model so the hub and sidebar agree:
//   'free'   — always open (the core Find -> Decide path)
//   'gated'  — opens after the first R-E-A-D score (proof of value), or any paid plan
//   'locked' — opens on a paid plan
// Locked cards stay visible but dimmed, with a hint that teaches the unlock —
// so a brand-new user sees the whole map but only a few live doors, instead
// of 18 equally-weighted tools and no idea where to start.
const SECTIONS = [
  {
    label: 'Find work',
    sub: 'Surface winnable opportunities matched to your business.',
    cards: [
      { icon: Radar, name: 'WARDOG', to: '/wardog', tier: 'free', desc: 'Live SAM.gov sweep matched to your NAICS codes and geography, plus FedConnect, DIBBS, eMMA and local sources.' },
      { icon: Mail, name: 'Inbox', to: '/inbox', tier: 'locked', desc: 'Solicitations captured from the browser extension land here, parsed and ready to score.' },
      { icon: GraduationCap, name: 'Glossary', to: '/glossary', tier: 'free', desc: 'Plain-English explanations of RFQs, set-asides, NAICS, DIBBS and every term in a solicitation.' },
    ],
  },
  {
    label: 'Decide & bid',
    sub: 'Score the opportunity, then cut proposal work from weeks to hours.',
    cards: [
      { icon: ClipboardCheck, name: 'R-E-A-D', to: '/read', tier: 'free', desc: 'Six-question bid / no-bid scoring for every flagged opportunity, grounded in the actual solicitation.' },
      { icon: ClipboardList, name: 'FASS FILL', to: '/fill', tier: 'gated', desc: 'Paste a solicitation, get an instant compliance matrix, outline, and capability statement.' },
      { icon: PenSquare, name: 'Proposal Editor', to: '/proposal-editor', tier: 'gated', desc: 'Review your generated proposal in a Docs-like editor — volumes, table of contents, and only the parts that need you, highlighted.' },
      { icon: LayoutGrid, name: 'Templates', to: '/templates', tier: 'gated', desc: 'Start from a winning proposal structure for your industry — cover letter to pricing, ready to AI-draft.' },
      { icon: Kanban, name: 'Pipeline', to: '/pipeline', tier: 'gated', desc: 'Kanban + list view of every bid in motion, with a self-checking submission checklist per card.' },
    ],
  },
  {
    label: 'Win & deliver',
    sub: 'Execute the award — documents, site capture, and management.',
    cards: [
      { icon: ShieldCheck, name: 'Witness', to: '/witness', tier: 'locked', desc: 'Milestones, documents, vendors, and insurance/bonding resources for every awarded contract.' },
      { icon: HardHat, name: 'Foreman', to: '/foreman', tier: 'locked', desc: 'Schedule of values, AIA payment apps, RFIs, submittals, T&M tickets and daily logs.' },
      { icon: Camera, name: 'Contractor Camera', to: '/camera', tier: 'locked', desc: 'Walk the job on your phone, snap photos with a note on each — every capture maps back to the bid.' },
    ],
  },
  {
    label: 'Grow & get paid',
    sub: 'Build reputation, find partners, and route money to your account.',
    cards: [
      { icon: Newspaper, name: 'Feed', to: '/feed', tier: 'free', desc: 'Posts, wins, and milestones from every member — manual and auto-posted on contract awards.' },
      { icon: Users, name: 'Team Up', to: '/teamup', tier: 'free', desc: "Find a partner or sub for a bid you can't carry alone, then message them in-platform." },
      { icon: DollarSign, name: 'Funding', to: '/money', tier: 'locked', desc: 'Punch in an award amount and see what lands after fees, plus a realistic Net 15/30/45 timeline.' },
    ],
  },
  {
    label: 'Learn the game',
    sub: 'Go from new to confident, one mission at a time.',
    cards: [
      { icon: BookOpen, name: 'Classroom', to: '/classroom', tier: 'free', desc: 'The full Government Contracting Masterclass — 10 missions, worksheets, progress tracking, certificate.' },
      { icon: Sparkles, name: 'My Notebook', to: '/notebook', tier: 'locked', desc: 'An AI chief-of-staff per mission — ask questions, capture insights, earn XP as you work.' },
      { icon: IdCard, name: 'Passport', to: '/passport', tier: 'free', desc: 'UEI, CAGE code, set-aside status and authorized signers — the page you reference every day.' },
    ],
  },
]

export default function GetStartedHub() {
  useSeo({ title: 'Get Started', description: 'Pick where you are in the contract lifecycle.', path: '/get-started' })
  const { session } = useAuth()
  const navigate = useNavigate()
  const userId = session?.user?.id
  const [q, setQ] = useState('')
  const [isActive, setIsActive] = useState(false)   // paid plan?
  const [hasReadPass, setHasReadPass] = useState(false)  // cleared the first R-E-A-D?

  // Same two signals AppShell uses, so the hub and sidebar never disagree
  // about what's unlocked.
  useEffect(() => {
    if (!userId) return
    let cancelled = false
    fetch(`${API_BASE}/api/v1/users/${userId}/profile`)
      .then(r => (r.ok ? r.json() : null))
      .then(d => { if (!cancelled) setIsActive(d?.subscription_status === 'active') })
      .catch(() => {})
    supabase
      .from('proposals')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .not('read_score', 'is', null)
      .then(({ count }) => { if (!cancelled) setHasReadPass((count || 0) > 0) })
    return () => { cancelled = true }
  }, [userId])

  const isFreeTier = !isActive

  // Returns null when open, or an unlock descriptor when the card is locked.
  function lockFor(card) {
    if (!isFreeTier || card.tier === 'free') return null
    if (card.tier === 'gated') {
      return hasReadPass ? null : { label: 'Locked', to: '/read', hint: 'Score your first R-E-A-D to unlock' }
    }
    return { label: 'Pro', to: '/pricing', hint: 'Unlocks on a paid plan' } // 'locked'
  }

  const query = q.trim().toLowerCase()
  const sections = query
    ? SECTIONS.map(s => ({
        ...s,
        cards: s.cards.filter(c =>
          c.name.toLowerCase().includes(query) || c.desc.toLowerCase().includes(query)
        ),
      })).filter(s => s.cards.length)
    : SECTIONS

  // First-run path strip: only while still on the free tier and pre-first-score.
  const showPath = isFreeTier && !hasReadPass && !query
  const PATH = ['Set up Passport', 'Find work in WARDOG', 'Score it with R-E-A-D']

  return (
    <div className="gsh fx-wrap">
      <header className="gsh-hero">
        <h1>What do you want to get done?</h1>
        <p>Pick where you are in the contract lifecycle. We'll take you straight to the tool.</p>
        <div className="gsh-search">
          <Search size={18} />
          <input
            value={q}
            onChange={e => setQ(e.target.value)}
            placeholder="Search tools, terms, or a solicitation number…"
          />
        </div>
      </header>

      {showPath && (
        <div className="gsh-path">
          <div className="gsh-path-head">
            <span className="fx-eyebrow">Your first run</span>
            <h2>Three steps to your first bid</h2>
            <p>Everything else unlocks as you go — no need to learn all 18 tools today.</p>
          </div>
          <ol className="gsh-path-steps">
            {PATH.map((step, i) => (
              <li key={step}><span className="gsh-path-num">{i + 1}</span>{step}</li>
            ))}
          </ol>
        </div>
      )}

      {sections.map(section => (
        <section className="fx-section" key={section.label}>
          <div className="fx-section-head">
            <h2>{section.label}</h2>
            <p>{section.sub}</p>
          </div>
          <div className="fx-grid">
            {section.cards.map(card => {
              const Icon = card.icon
              const lock = lockFor(card)
              return (
                <button
                  key={card.name}
                  className={`fx-card fx-card-link gsh-card ${lock ? 'gsh-locked' : ''}`}
                  onClick={() => navigate(lock ? lock.to : card.to)}
                  title={lock ? lock.hint : undefined}
                >
                  <span className="fx-icon">{lock ? <Lock size={20} /> : <Icon size={22} />}</span>
                  <span className="gsh-card-body">
                    <span className="gsh-card-title">
                      {card.name}
                      {lock && <span className="fx-pill is-muted">{lock.label}</span>}
                      {!lock && card.tier === 'free' && !isActive && <span className="fx-pill is-accent">Free</span>}
                    </span>
                    <span className="gsh-card-desc">{lock ? lock.hint : card.desc}</span>
                  </span>
                  {lock
                    ? <Lock size={14} className="gsh-card-arrow gsh-card-locklist" />
                    : <ArrowRight size={16} className="gsh-card-arrow" />}
                </button>
              )
            })}
          </div>
        </section>
      ))}

      {sections.length === 0 && (
        <p className="gsh-empty">No tool matches "{q}". Try a different term.</p>
      )}
    </div>
  )
}
