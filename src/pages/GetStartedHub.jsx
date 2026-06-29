import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Search, Radar, Mail, GraduationCap, ClipboardCheck, ClipboardList, Kanban,
  ShieldCheck, HardHat, Camera, Newspaper, Users, DollarSign, BookOpen,
  Sparkles, IdCard, ArrowRight,
} from 'lucide-react'
import useSeo from '../hooks/useSeo'
import './GetStartedHub.css'

// The signed-in "where am I in the lifecycle?" hub. Renders inside AppShell
// (it's a protected route), so it inherits the sidebar — this is a map of
// the platform organized by the contract journey, not a marketing page.
// Every card routes straight to a real tool.
const SECTIONS = [
  {
    label: 'Find work',
    sub: 'Surface winnable opportunities matched to your business.',
    cards: [
      { icon: Radar, name: 'WARDOG', to: '/wardog', desc: 'Live SAM.gov sweep matched to your NAICS codes and geography, plus FedConnect, DIBBS, eMMA and local sources.' },
      { icon: Mail, name: 'Inbox', to: '/inbox', pill: 'Pro', muted: true, desc: 'Solicitations captured from the browser extension land here, parsed and ready to score.' },
      { icon: GraduationCap, name: 'Glossary', to: '/glossary', pill: 'Free', desc: 'Plain-English explanations of RFQs, set-asides, NAICS, DIBBS and every term in a solicitation.' },
    ],
  },
  {
    label: 'Decide & bid',
    sub: 'Score the opportunity, then cut proposal work from weeks to hours.',
    cards: [
      { icon: ClipboardCheck, name: 'R-E-A-D', to: '/read', pill: 'Free', desc: 'Six-question bid / no-bid scoring for every flagged opportunity, grounded in the actual solicitation.' },
      { icon: ClipboardList, name: 'FASS FILL', to: '/fill', desc: 'Paste a solicitation, get an instant compliance matrix, outline, and capability statement.' },
      { icon: Kanban, name: 'Pipeline', to: '/pipeline', desc: 'Kanban + list view of every bid in motion, with a self-checking submission checklist per card.' },
    ],
  },
  {
    label: 'Win & deliver',
    sub: 'Execute the award — documents, site capture, and management.',
    cards: [
      { icon: ShieldCheck, name: 'Witness', to: '/witness', desc: 'Milestones, documents, vendors, and insurance/bonding resources for every awarded contract.' },
      { icon: HardHat, name: 'Foreman', to: '/foreman', desc: 'Schedule of values, AIA payment apps, RFIs, submittals, T&M tickets and daily logs.' },
      { icon: Camera, name: 'Contractor Camera', to: '/camera', desc: 'Walk the job on your phone, snap photos with a note on each — every capture maps back to the bid.' },
    ],
  },
  {
    label: 'Grow & get paid',
    sub: 'Build reputation, find partners, and route money to your account.',
    cards: [
      { icon: Newspaper, name: 'Feed', to: '/feed', pill: 'Free', desc: 'Posts, wins, and milestones from every member — manual and auto-posted on contract awards.' },
      { icon: Users, name: 'Team Up', to: '/teamup', pill: 'Free', desc: "Find a partner or sub for a bid you can't carry alone, then message them in-platform." },
      { icon: DollarSign, name: 'Funding', to: '/money', desc: 'Punch in an award amount and see what lands after fees, plus a realistic Net 15/30/45 timeline.' },
    ],
  },
  {
    label: 'Learn the game',
    sub: 'Go from new to confident, one mission at a time.',
    cards: [
      { icon: BookOpen, name: 'Classroom', to: '/classroom', desc: 'The full Government Contracting Masterclass — 10 missions, worksheets, progress tracking, certificate.' },
      { icon: Sparkles, name: 'My Notebook', to: '/notebook', desc: 'An AI chief-of-staff per mission — ask questions, capture insights, earn XP as you work.' },
      { icon: IdCard, name: 'Passport', to: '/passport', desc: 'UEI, CAGE code, set-aside status and authorized signers — the page you reference every day.' },
    ],
  },
]

export default function GetStartedHub() {
  useSeo({ title: 'Get Started', description: 'Pick where you are in the contract lifecycle.', path: '/get-started' })
  const navigate = useNavigate()
  const [q, setQ] = useState('')

  const query = q.trim().toLowerCase()
  const sections = query
    ? SECTIONS.map(s => ({
        ...s,
        cards: s.cards.filter(c =>
          c.name.toLowerCase().includes(query) || c.desc.toLowerCase().includes(query)
        ),
      })).filter(s => s.cards.length)
    : SECTIONS

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

      {sections.map(section => (
        <section className="fx-section" key={section.label}>
          <div className="fx-section-head">
            <h2>{section.label}</h2>
            <p>{section.sub}</p>
          </div>
          <div className="fx-grid">
            {section.cards.map(card => {
              const Icon = card.icon
              return (
                <button
                  key={card.name}
                  className="fx-card fx-card-link gsh-card"
                  onClick={() => navigate(card.to)}
                >
                  <span className="fx-icon"><Icon size={22} /></span>
                  <span className="gsh-card-body">
                    <span className="gsh-card-title">
                      {card.name}
                      {card.pill && (
                        <span className={`fx-pill ${card.muted ? 'is-muted' : 'is-accent'}`}>{card.pill}</span>
                      )}
                    </span>
                    <span className="gsh-card-desc">{card.desc}</span>
                  </span>
                  <ArrowRight size={16} className="gsh-card-arrow" />
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
