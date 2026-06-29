import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Check, Rocket, Target, Users, GraduationCap, Trophy,
  Code2, Palette, Sparkles, FileText, HeartHandshake, Briefcase, Megaphone,
  GitBranch, Layers, Globe, Workflow, Building2, Star, Send, Loader2,
} from 'lucide-react'
import Reveal from '../components/Reveal'
import useSeo from '../hooks/useSeo'
import './Careers.css'

const API_BASE = import.meta.env.VITE_API_URL || ''

// Seven open roles per the founder's brief. icon/dept/location are display
// only — applying just records role_interest as free text on job_applicants
// (see careers.py), so adding/removing a role here never needs a backend
// change.
const POSITIONS = [
  {
    icon: Code2,
    title: 'Senior Full Stack Engineer',
    dept: 'Engineering',
    location: 'Remote (US)',
    tags: ['React', 'Python/FastAPI', 'Supabase'],
    blurb: 'Own real product surfaces end to end — WARDOG, R-E-A-D, FASS FILL — shipping fast against a live customer base, not a backlog.',
  },
  {
    icon: Palette,
    title: 'Product Designer',
    dept: 'Design',
    location: 'Remote (US)',
    tags: ['Product design', 'Design systems'],
    blurb: 'Turn a genuinely complicated workflow (government contracting) into something a small business owner can use in five minutes.',
  },
  {
    icon: Sparkles,
    title: 'AI Engineer',
    dept: 'Engineering',
    location: 'Remote (US)',
    tags: ['LLMs', 'Prompt systems', 'Python'],
    blurb: 'Build the AI that reads solicitations, scores fit, and drafts proposals — the part of FASS Flow that actually saves people days of work.',
  },
  {
    icon: FileText,
    title: 'Government Contracting Specialist',
    dept: 'Operations',
    location: 'Remote (US)',
    tags: ['GovCon', 'Compliance', 'Proposals'],
    blurb: 'Bring real contracting-officer-side or small-business-side experience to make sure what we build actually matches how this works.',
  },
  {
    icon: HeartHandshake,
    title: 'Customer Success',
    dept: 'Customer Success',
    location: 'Remote (US)',
    tags: ['Onboarding', 'Support', 'Retention'],
    blurb: "Be the first human a new business owner talks to. Make sure they win their first contract and tell five friends about us.",
  },
  {
    icon: Briefcase,
    title: 'Business Development Partner',
    dept: 'BD',
    location: 'Remote (US)',
    tags: ['Sales', 'Success fee', 'GovCon'],
    blurb: 'White-glove bid support for our highest-tier clients — paid on a base plus a real piece of every contract you help them win.',
  },
  {
    icon: Megaphone,
    title: 'Campus Ambassador',
    dept: 'Growth',
    location: 'Remote / On-campus',
    tags: ['Part-time', 'Growth', 'Community'],
    blurb: 'Bring FASS Flow to student entrepreneurs and small-business programs on your campus. Flexible hours, real equity in the outcome.',
  },
]

const VALUES = [
  { icon: Rocket, name: 'Ship Fast', desc: "Working software beats a perfect plan. We ship, we learn, we ship again." },
  { icon: Target, name: 'Solve Real Problems', desc: "Every feature traces back to an actual small business stuck on an actual problem." },
  { icon: Users, name: 'Customer First', desc: "We talk to the people using this every week — not just at launch." },
  { icon: GraduationCap, name: 'Learn Constantly', desc: "Government contracting, AI, design — nobody here knew all of this on day one." },
  { icon: Trophy, name: 'Ownership', desc: "You'll own a real piece of the product, not a ticket queue." },
]

const BENEFITS = [
  'Competitive salary + meaningful equity',
  'Fully remote, async-friendly culture',
  'Direct access to the founder and the roadmap',
  'Build something a real small business depends on, day one',
  'Move fast — no nine-layer approval process',
]

export default function Careers() {
  useSeo({
    title: 'Careers',
    description: "We're hiring across engineering, design, AI, and customer success to build the operating system for small-business government contracting.",
    path: '/careers',
    markdownUrl: '/llms/careers.md',
  })
  const navigate = useNavigate()
  const formRef = useRef(null)

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [roleInterest, setRoleInterest] = useState('')
  const [portfolioUrl, setPortfolioUrl] = useState('')
  const [note, setNote] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [submitted, setSubmitted] = useState(false)

  function scrollToApply(roleTitle) {
    if (roleTitle) setRoleInterest(roleTitle)
    formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!name.trim() || !email.trim()) return
    setError('')
    setSubmitting(true)
    try {
      const res = await fetch(`${API_BASE}/api/v1/careers/apply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          role_interest: roleInterest,
          portfolio_url: portfolioUrl.trim(),
          note: note.trim(),
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.detail || `Request failed (${res.status})`)
      setSubmitted(true)
      // Prompt the applicant straight into account creation, per the
      // founder's instruction — Careers shouldn't be a dead-end mailto.
      setTimeout(() => {
        navigate(`/signin?applied=1&email=${encodeURIComponent(email.trim())}`)
      }, 1800)
    } catch (err) {
      setError(err.message || 'Something went wrong submitting this — try again in a moment.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="careers">
      {/* Hero */}
      <section className="careers-hero">
        <div className="container">
          <Reveal as="div" className="careers-hero-inner">
            <span className="section-label">Careers at FASS</span>
            <h1 className="careers-title">Help Build the Operating System for Small Business</h1>
            <p className="careers-sub">
              We're building the platform that helps small businesses find government work, win it, execute it,
              and get paid — end to end. If that sounds like a problem worth your time, keep reading.
            </p>
            <button className="btn-primary careers-hero-cta" onClick={() => scrollToApply('')}>
              See open positions ↓
            </button>
          </Reveal>
        </div>
      </section>

      {/* Why FASS */}
      <section className="careers-section">
        <div className="container">
          <Reveal as="div" className="careers-section-header">
            <span className="section-label">Why FASS</span>
            <h2 className="careers-h2">Small businesses are stuck on problems we can actually fix</h2>
          </Reveal>
          <div className="careers-why-grid">
            {[
              'Finding the right government contracts takes hours of manual searching, every single day.',
              'Deciding whether to bid is a guess — most businesses have no real fit or win-probability signal.',
              'Compliance paperwork and proposal drafting eat weeks that should go toward doing the work.',
              'Winning the work is only half the job — execution, documentation, and getting paid are their own mess.',
              'Most small-business tooling is built for enterprises, not a five-person crew trying to grow.',
            ].map((d, i) => (
              <Reveal as="div" key={d} className="careers-why-item" delay={i * 70}>
                <Check size={16} className="careers-why-check" />
                <span>{d}</span>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Our Mission */}
      <section className="careers-section careers-section-alt">
        <div className="container">
          <Reveal as="div" className="careers-section-header">
            <span className="section-label">Our Mission</span>
            <h2 className="careers-h2">One platform, every step of the job</h2>
          </Reveal>
          <div className="careers-mission-grid">
            {[
              'Help small businesses find real, winnable government contracts',
              'Tell them honestly whether a bid is worth their time before they spend it',
              'Cut proposal and compliance work from weeks to hours',
              'Give them the tools to execute, document, and close out the work',
              'Help them get paid faster and grow their customer base while they do it',
            ].map((m, i) => (
              <Reveal as="div" key={m} className="careers-mission-item" delay={i * 70}>
                <Check size={16} className="careers-why-check" />
                <span>{m}</span>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* People we're looking for */}
      <section className="careers-section">
        <div className="container">
          <Reveal as="div" className="careers-section-header">
            <span className="section-label">The People We're Looking For</span>
            <h2 className="careers-h2">Builders, not bystanders</h2>
            <p className="careers-section-desc">
              We're a small team moving fast on a real product with real customers. We're looking for people who'd
              rather ship something this week than plan something perfect for next quarter — who've built things on
              their own time because they wanted to, not because someone assigned it.
            </p>
          </Reveal>
        </div>
      </section>

      {/* Open Positions */}
      <section className="careers-section careers-section-alt" id="positions">
        <div className="container">
          <Reveal as="div" className="careers-section-header">
            <span className="section-label">Open Positions</span>
            <h2 className="careers-h2">Seven roles, one mission</h2>
          </Reveal>
          <div className="careers-grid">
            {POSITIONS.map((p, i) => {
              const Icon = p.icon
              return (
                <Reveal as="div" key={p.title} className="position-card" delay={i * 60}>
                  <div className="position-icon"><Icon size={20} /></div>
                  <div className="position-title">{p.title}</div>
                  <div className="position-meta">
                    <span>{p.dept}</span>
                    <span>·</span>
                    <span>{p.location}</span>
                  </div>
                  <p className="position-blurb">{p.blurb}</p>
                  <div className="position-tags">
                    {p.tags.map(t => <span key={t} className="position-tag">{t}</span>)}
                  </div>
                  <button type="button" className="btn-outline position-cta" onClick={() => scrollToApply(p.title)}>
                    Apply for this role
                  </button>
                </Reveal>
              )
            })}
          </div>
        </div>
      </section>

      {/* Values */}
      <section className="careers-section">
        <div className="container">
          <Reveal as="div" className="careers-section-header">
            <span className="section-label">Our Values</span>
            <h2 className="careers-h2">What it's actually like to work here</h2>
          </Reveal>
          <div className="careers-values-grid">
            {VALUES.map((v, i) => {
              const Icon = v.icon
              return (
                <Reveal as="div" key={v.name} className="careers-value-card" delay={i * 70}>
                  <Icon size={20} className="careers-value-icon" />
                  <div className="careers-value-name">{v.name}</div>
                  <p className="careers-value-desc">{v.desc}</p>
                </Reveal>
              )
            })}
          </div>
        </div>
      </section>

      {/* Benefits */}
      <section className="careers-section careers-section-alt">
        <div className="container">
          <Reveal as="div" className="careers-section-header">
            <span className="section-label">Benefits</span>
            <h2 className="careers-h2">What you get</h2>
          </Reveal>
          <div className="careers-benefits-grid">
            {BENEFITS.map((b, i) => (
              <Reveal as="div" key={b} className="careers-why-item" delay={i * 60}>
                <Check size={16} className="careers-why-check" />
                <span>{b}</span>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* The Future */}
      <section className="careers-section">
        <div className="container">
          <Reveal as="div" className="careers-future">
            <span className="section-label">The Future</span>
            <h2 className="careers-h2">We're early — that's the opportunity</h2>
            <p className="careers-section-desc">
              FASS Flow is still a small team building against a real, live customer base. The roadmap for the next
              year is wide open: more of the government contracting lifecycle, deeper AI, and the tools that turn a
              one-person operation into a real company. Whoever joins now helps decide what that actually looks like.
            </p>
          </Reveal>
        </div>
      </section>

      {/* Apply / challenge */}
      <section className="careers-apply" id="apply" ref={formRef}>
        <div className="container">
          <Reveal as="div" className="careers-apply-header">
            <span className="section-label">Show Us What You've Built</span>
            <h2 className="careers-h2">Skip the cover letter</h2>
            <p className="careers-section-desc">
              We don't need a polished résumé — we need to see how you think and what you've made. Send us one of
              the following, whatever best represents you:
            </p>
            <div className="careers-build-list">
              <span><GitBranch size={15} /> A GitHub repository</span>
              <span><Layers size={15} /> A Figma prototype</span>
              <span><Globe size={15} /> A website</span>
              <span><Workflow size={15} /> An AI workflow</span>
              <span><Building2 size={15} /> A business you started</span>
              <span><Star size={15} /> Or anything you're proud of</span>
            </div>
            <p className="careers-build-tagline">Builders recognize builders.</p>
          </Reveal>

          <Reveal as="form" className="careers-form" delay={80} onSubmit={handleSubmit}>
            {submitted ? (
              <div className="careers-form-success">
                <Check size={18} /> Got it — taking you to create your account…
              </div>
            ) : (
              <>
                <div className="careers-form-row">
                  <div className="careers-field">
                    <label>Name</label>
                    <input type="text" required value={name} onChange={e => setName(e.target.value)} placeholder="Jane Doe" />
                  </div>
                  <div className="careers-field">
                    <label>Email</label>
                    <input type="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" />
                  </div>
                </div>

                <div className="careers-field">
                  <label>Role you're interested in</label>
                  <select value={roleInterest} onChange={e => setRoleInterest(e.target.value)}>
                    <option value="">General / not sure yet</option>
                    {POSITIONS.map(p => <option key={p.title} value={p.title}>{p.title}</option>)}
                  </select>
                </div>

                <div className="careers-field">
                  <label>Link to what you've built</label>
                  <input
                    type="url"
                    value={portfolioUrl}
                    onChange={e => setPortfolioUrl(e.target.value)}
                    placeholder="GitHub repo, Figma file, live site, anything"
                  />
                </div>

                <div className="careers-field">
                  <label>Tell us about it (optional)</label>
                  <textarea
                    rows={4}
                    value={note}
                    onChange={e => setNote(e.target.value)}
                    placeholder="What it is, why you built it, what you're proud of."
                  />
                </div>

                {error && <p className="careers-form-error">{error}</p>}

                <button type="submit" className="btn-primary careers-form-submit" disabled={submitting || !name.trim() || !email.trim()}>
                  {submitting ? <Loader2 size={16} className="careers-spin" /> : <Send size={16} />}
                  {submitting ? 'Sending…' : 'Send it over'}
                </button>
              </>
            )}
          </Reveal>
        </div>
      </section>
    </div>
  )
}
