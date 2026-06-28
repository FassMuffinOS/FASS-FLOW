import { Target, Rocket, Users, GraduationCap, Trophy, Building2, MapPin, Mail } from 'lucide-react'
import Reveal from '../components/Reveal'
import './About.css'

// Mission/values copy intentionally mirrors Careers.jsx and the Hero —
// "About" should read as the same company, not a different voice.
const VALUES = [
  { icon: Rocket, name: 'Ship Fast', desc: "Working software beats a perfect plan. We ship, we learn, we ship again." },
  { icon: Target, name: 'Solve Real Problems', desc: "Every feature traces back to an actual small business stuck on an actual problem." },
  { icon: Users, name: 'Customer First', desc: "We talk to the people using this every week — not just at launch." },
  { icon: GraduationCap, name: 'Learn Constantly', desc: "Government contracting, AI, design — nobody here knew all of this on day one." },
  { icon: Trophy, name: 'Ownership', desc: "You'll own a real piece of the product, not a ticket queue." },
]

const MISSION_POINTS = [
  'Help small businesses find real, winnable government contracts',
  'Tell them honestly whether a bid is worth their time before they spend it',
  'Cut proposal and compliance work from weeks to hours',
  'Give them the tools to execute, document, and close out the work',
  'Help them get paid faster and grow their customer base while they do it',
]

export default function About() {
  return (
    <div className="about">
      <section className="about-hero">
        <div className="container">
          <Reveal as="div" className="about-hero-inner">
            <span className="section-label">About FASS</span>
            <h1 className="about-title">The Operating System for Small Business Government Contracting</h1>
            <p className="about-sub">
              FASS Flow is a small team building the platform that helps small businesses find government work,
              decide whether to bid, win it, execute it, and get paid — end to end, in one place.
            </p>
          </Reveal>
        </div>
      </section>

      <section className="about-section">
        <div className="container">
          <Reveal as="div" className="about-section-header">
            <span className="section-label">Why We Exist</span>
            <h2 className="about-h2">Government contracting shouldn't require a back office</h2>
            <p className="about-section-desc">
              Most small-business tooling is built for enterprises with procurement teams, not a five-person crew
              trying to grow. We started FASS Flow because finding, winning, and running government work is full of
              friction that has nothing to do with doing good work — and almost all of it is fixable with software.
            </p>
          </Reveal>
        </div>
      </section>

      <section className="about-section about-section-alt">
        <div className="container">
          <Reveal as="div" className="about-section-header">
            <span className="section-label">Our Mission</span>
            <h2 className="about-h2">One platform, every step of the job</h2>
          </Reveal>
          <div className="about-mission-grid">
            {MISSION_POINTS.map((m, i) => (
              <Reveal as="div" key={m} className="about-mission-item" delay={i * 70}>
                <Target size={16} className="about-mission-icon" />
                <span>{m}</span>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section className="about-section">
        <div className="container">
          <Reveal as="div" className="about-section-header">
            <span className="section-label">Our Values</span>
            <h2 className="about-h2">What it's actually like to work with us</h2>
          </Reveal>
          <div className="about-values-grid">
            {VALUES.map((v, i) => {
              const Icon = v.icon
              return (
                <Reveal as="div" key={v.name} className="about-value-card" delay={i * 70}>
                  <Icon size={20} className="about-value-icon" />
                  <div className="about-value-name">{v.name}</div>
                  <p className="about-value-desc">{v.desc}</p>
                </Reveal>
              )
            })}
          </div>
        </div>
      </section>

      <section className="about-section about-section-alt">
        <div className="container">
          <Reveal as="div" className="about-company-card">
            <Building2 size={22} className="about-company-icon" />
            <div>
              <div className="about-company-name">FASS Technologies LLC</div>
              <div className="about-company-detail"><MapPin size={14} /> Baltimore, MD</div>
              <a href="mailto:admin@fass.systems" className="about-company-detail about-company-email">
                <Mail size={14} /> admin@fass.systems
              </a>
            </div>
          </Reveal>
        </div>
      </section>

      <section className="about-section">
        <div className="container">
          <Reveal as="div" className="about-cta">
            <h2 className="about-h2">Want to help build this?</h2>
            <p className="about-section-desc">We're hiring across engineering, design, AI, and customer success.</p>
            <a href="/careers" className="btn-primary about-cta-btn">See open roles</a>
          </Reveal>
        </div>
      </section>
    </div>
  )
}
