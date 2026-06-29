import { Newspaper, Mail, Download, Building2, MapPin } from 'lucide-react'
import Reveal from '../components/Reveal'
import useSeo from '../hooks/useSeo'
import './Press.css'

const FACTS = [
  { label: 'Founded', value: '2025' },
  { label: 'Stage', value: 'Public beta, open for founding-member signups' },
  { label: 'Headquarters', value: 'Baltimore, MD' },
  { label: 'Company', value: 'FASS Technologies LLC' },
  { label: 'What we build', value: 'The end-to-end platform for small-business government contracting' },
]

export default function Press() {
  useSeo({
    title: 'Press',
    description: 'Media resources for FASS Flow, the operating system for small-business government contracting. Company facts, boilerplate, and contact info for press inquiries.',
    path: '/press',
    markdownUrl: '/llms/press.md',
  })
  return (
    <div className="press">
      <section className="press-hero">
        <div className="container">
          <Reveal as="div" className="press-hero-inner">
            <span className="section-label">Press</span>
            <h1 className="press-title">FASS Flow Media Resources</h1>
            <p className="press-sub">
              Covering FASS Flow, or want background on what we're building? Here's the short version, plus how to
              reach us directly.
            </p>
          </Reveal>
        </div>
      </section>

      <section className="press-section">
        <div className="container">
          <Reveal as="div" className="press-section-header">
            <span className="section-label">Company Facts</span>
          </Reveal>
          <div className="press-facts-grid">
            {FACTS.map((f, i) => (
              <Reveal as="div" key={f.label} className="press-fact-card" delay={i * 60}>
                <div className="press-fact-label">{f.label}</div>
                <div className="press-fact-value">{f.value}</div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section className="press-section press-section-alt">
        <div className="container">
          <Reveal as="div" className="press-section-header">
            <span className="section-label">Boilerplate</span>
            <h2 className="press-h2">About FASS Flow</h2>
          </Reveal>
          <Reveal as="p" className="press-boilerplate">
            FASS Flow is the operating system for small-business government contracting — a single platform that
            helps small businesses find winnable government contracts, decide whether a bid is worth their time, cut
            proposal and compliance work from weeks to hours, and execute and get paid on the work they win. The
            platform is currently in public beta; businesses who join now lock in founding-member pricing for as
            long as they stay subscribed. FASS Technologies LLC is based in Baltimore, MD.
          </Reveal>
        </div>
      </section>

      <section className="press-section">
        <div className="container">
          <Reveal as="div" className="press-contact-card">
            <Newspaper size={22} className="press-contact-icon" />
            <div>
              <div className="press-contact-name">Media Inquiries</div>
              <a href="mailto:admin@fass.systems" className="press-contact-detail press-contact-email">
                <Mail size={14} /> admin@fass.systems
              </a>
              <div className="press-contact-detail">
                <Building2 size={14} /> FASS Technologies LLC
              </div>
              <div className="press-contact-detail">
                <MapPin size={14} /> Baltimore, MD
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      <section className="press-section press-section-alt">
        <div className="container">
          <Reveal as="div" className="press-cta">
            <Download size={28} className="press-cta-icon" />
            <h2 className="press-h2">Need a logo or screenshot?</h2>
            <p className="press-section-desc">
              We don't have a packaged media kit yet — email us and we'll send brand assets and product screenshots
              directly.
            </p>
            <a href="mailto:admin@fass.systems" className="btn-primary press-cta-btn">Request media kit</a>
          </Reveal>
        </div>
      </section>
    </div>
  )
}
