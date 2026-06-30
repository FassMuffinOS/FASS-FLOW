import { ShieldCheck, Lock, KeyRound, Server, ScanLine, FileCheck, Mail } from 'lucide-react'
import useSeo from '../hooks/useSeo'
import './Trust.css'

// Honest security posture + compliance roadmap. We state only what's true
// today and label each certification by real status — never "certified"
// before an audit exists. Buyers (especially government/enterprise) trust
// "in progress" far more than a fabricated badge.

const MEASURES = [
  { icon: Lock, title: 'Encryption in transit & at rest', body: 'All traffic is served over TLS. Data is stored in managed Postgres (Supabase) encrypted at rest.' },
  { icon: KeyRound, title: 'Authenticated, owner-scoped access', body: 'Every private endpoint verifies your session and checks resource ownership — you can only read and write your own data.' },
  { icon: Server, title: 'Row-Level Security', body: 'Database tables enforce row-level security policies as defense in depth, scoped to the authenticated user.' },
  { icon: ScanLine, title: 'Automated security scanning', body: 'An IDOR/authorization scanner runs in CI on every change and gates deploys, so access-control regressions are caught before release.' },
]

// status: 'progress' | 'planned' | 'notyet'
const COMPLIANCE = [
  { name: 'SOC 2 Type II', status: 'progress', note: 'Controls being implemented ahead of a formal Type II audit window. Report available under NDA once complete.' },
  { name: 'ISO/IEC 27001', status: 'planned', note: 'Information Security Management System scoping underway; certification audit planned after SOC 2.' },
  { name: 'HIPAA', status: 'notyet', note: 'Not offered today. We do not store PHI. HIPAA support requires a Business Associate Agreement and dedicated infrastructure — on the roadmap for healthcare-facing customers.' },
]

const STATUS_LABEL = { progress: 'In progress', planned: 'Planned', notyet: 'Not yet offered' }

export default function Trust() {
  useSeo({ title: 'Security & Trust', description: 'How FASS Flow protects your data, and our compliance roadmap.', path: '/trust' })

  return (
    <div className="trust">
      <section className="trust-hero">
        <div className="container">
          <ShieldCheck size={30} className="trust-hero-icon" />
          <h1>Security &amp; Trust</h1>
          <p>How we protect your business data — and an honest view of where we are on formal certifications. We publish only what's true today.</p>
        </div>
      </section>

      <section className="trust-section">
        <div className="container">
          <h2 className="trust-h2">What we do today</h2>
          <div className="trust-grid">
            {MEASURES.map(m => (
              <div className="trust-card" key={m.title}>
                <span className="trust-card-ic"><m.icon size={20} /></span>
                <h3>{m.title}</h3>
                <p>{m.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="trust-section trust-section-alt">
        <div className="container">
          <h2 className="trust-h2">Compliance roadmap</h2>
          <p className="trust-sub">We're an early-stage company and we won't claim a certification we don't hold. Here's the real status of each.</p>
          <div className="trust-compliance">
            {COMPLIANCE.map(c => (
              <div className="trust-comp-row" key={c.name}>
                <div className="trust-comp-main">
                  <FileCheck size={18} className="trust-comp-ic" />
                  <span className="trust-comp-name">{c.name}</span>
                  <span className={`trust-status trust-status-${c.status}`}>{STATUS_LABEL[c.status]}</span>
                </div>
                <p className="trust-comp-note">{c.note}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="trust-section">
        <div className="container trust-contact">
          <Mail size={20} />
          <div>
            <h3>Report a vulnerability or request our security details</h3>
            <p>Email <a href="mailto:admin@fass.systems">admin@fass.systems</a> — we respond to security reports first.</p>
          </div>
        </div>
      </section>
    </div>
  )
}
