import { ArrowRight, Check, Radar } from 'lucide-react'
import './BDPartner.css'

const STRIPE_PAYMENT_LINK = 'https://buy.stripe.com/8x214g97sdEyff2bjZfnO0d'
const BD_PARTNER_CAPACITY = { filled: 0, total: 10 }

const ONBOARDING_TIMELINE = [
  { week: 'Week 1', title: 'Capability profile + NAICS positioning', body: 'We lock in your real NAICS codes, geography, set-aside status, and delivery capacity so WARDOG only flags work you can actually perform.' },
  { week: 'Week 2', title: 'Opportunity filters + WARDOG setup', body: 'Your daily sweep goes live across SAM.gov, Maryland eMMA, and other public sources, tuned to your capability profile.' },
  { week: 'Week 3', title: 'First bid/no-bid review', body: 'We run your first flagged opportunity through the six-question R-E-A-D scoring workflow together.' },
  { week: 'Week 4', title: 'Active proposal plan + monthly strategy review', body: 'One opportunity moves into an active response plan, and we set the cadence for your recurring monthly pipeline review.' },
]

const INCLUDED = [
  {
    title: 'WARDOG Opportunity Scan',
    body: 'Daily WARDOG Alerts + 2 Bid/No-Bid Reviews per Month. FASS monitors SAM.gov, Maryland eMMA, and other public procurement sources every day for notices that match your approved capability profile — your real NAICS codes, geography, and delivery capacity.',
  },
  {
    title: 'Bid / no-bid scoring',
    body: 'Every flagged opportunity goes through the six-question R-E-A-D workflow: eligibility, mandatory requirements, capacity, timing, margin, and substantiation. No chasing the wrong work.',
  },
  {
    title: 'Response planning',
    body: 'FASS maps solicitation instructions, evaluation factors, staffing needs, technical approach, compliance items, and pricing inputs into a controlled response plan before any writing starts.',
  },
  {
    title: 'Proposal assembly support',
    body: 'Technical narrative development, staffing plan organization, pricing support, cover-letter preparation, and required-form tracking — one active solicitation response at a time, included in the monthly plan.',
  },
  {
    title: 'FASS Flow platform access',
    body: 'Full access to your pipeline tracker, opportunity worksheet, registration checklist, capability profile workspace, and response dashboard while you are engaged.',
  },
  {
    title: 'Monthly pipeline review',
    body: 'A structured review of your active opportunities, bid decisions made, and pursuit status — so you always know where you stand and what is next.',
  },
]

const NOT_INCLUDED = [
  'Government filing fees, insurance, bonding, certifications, or third-party vendor costs',
  'Unlimited concurrent proposals or emergency turnaround work (quoted separately by scope)',
  'Any guarantee of a contract award, score, contract value, or procurement outcome',
  'Client payroll, worker classification, taxes, insurance, or performance responsibility',
  'Complex cost-volume development or specialized compliance work unless separately scoped',
]

const FOR_YOU_IF = [
  'You completed the FASS Masterclass and are ready to move from learning to active pursuit',
  'You own a service business in Maryland or the DC Metro region',
  'You do cleaning, facilities, staffing, catering, logistics, event support, or light labor',
  'You want a disciplined bidding system — not a list of contacts',
  'You are ready to review materials promptly and authorize every submission',
]

const MODULES = [
  { name: 'WARDOG', sub: 'Opportunity intelligence' },
  { name: 'R-E-A-D', sub: 'Bid discipline' },
  { name: 'FASS FILL', sub: 'Execution capacity' },
  { name: 'WITNESS', sub: 'Closeout proof' },
]

export default function BDPartner() {
  return (
    <div className="bd">

      {/* ── Hero ── */}
      <section className="bd-hero">
        <div className="container bd-hero-inner">
          <span className="bd-label">BD Partner Program</span>
          <h1 className="bd-headline">
            More than opportunity alerts.<br />A partner from readiness to performance.
          </h1>
          <p className="bd-subhead">
            Daily WARDOG alerts. Same-day bid/no-bid discipline. One active proposal at a time, assembled correctly.
            A monthly operating relationship — not a subscription to a list.
          </p>
          <div className="bd-price-block">
            <span className="bd-price">$500</span>
            <span className="bd-price-note">/month · month-to-month · 30-day written notice to cancel</span>
          </div>
          <a
            href={STRIPE_PAYMENT_LINK}
            className="btn-primary bd-cta"
          >
            Start the partnership
            <ArrowRight size={18} />
          </a>
          <p className="bd-hero-note">
            No percentage-of-award fee. No long-term contract. The client authorizes every submission.
          </p>
        </div>
      </section>

      {/* ── What's included ── */}
      <section className="bd-included">
        <div className="container">
          <span className="bd-label">What's included</span>
          <h2 className="bd-section-title">$500/month. Here is exactly what that gets you.</h2>
          <div className="bd-included-grid">
            {INCLUDED.map(item => (
              <div className="bd-card" key={item.title}>
                <div className="bd-card-icon"><Check size={16} /></div>
                <div>
                  <h3 className="bd-card-title">{item.title}</h3>
                  <p className="bd-card-body">{item.body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Pricing table ── */}
      <section className="bd-pricing">
        <div className="container bd-pricing-inner">
          <span className="bd-label">Pricing</span>
          <h2 className="bd-section-title">Clear pricing. No percentage-of-award fee.</h2>
          <p className="bd-outcome-line">
            Built for service businesses ready to identify, qualify, and submit real government opportunities.
          </p>
          <div className="bd-capacity-meter">
            <Radar size={15} />
            <span>BD Partner openings: {BD_PARTNER_CAPACITY.total - BD_PARTNER_CAPACITY.filled} of {BD_PARTNER_CAPACITY.total} remaining</span>
          </div>
          <div className="bd-pricing-table">
            <div className="bd-pricing-row bd-pricing-head">
              <span>Service</span>
              <span>Price</span>
              <span>Terms</span>
            </div>
            <div className="bd-pricing-row bd-pricing-featured">
              <span className="bd-pricing-service">
                <strong>FASS BD Partner</strong>
                <small>WARDOG Opportunity Scan · 2 bid/no-bid reviews/mo · 1 active proposal · FASS Flow access · monthly review</small>
              </span>
              <span className="bd-pricing-amount">$500<small>/mo</small></span>
              <span className="bd-pricing-terms">
                Month-to-month. 30-day written notice to cancel.
                <a href={STRIPE_PAYMENT_LINK} className="btn-primary bd-pricing-cta">
                  Apply for BD Partner <ArrowRight size={14} />
                </a>
              </span>
            </div>
            <div className="bd-pricing-row">
              <span className="bd-pricing-service">
                <strong>Additional Proposal Support</strong>
                <small>Technical narrative, staffing plan, compliance checklist, pricing support beyond included capacity</small>
              </span>
              <span className="bd-pricing-amount">Quoted by scope</span>
              <span className="bd-pricing-terms">Written scope and fee approval before work starts.</span>
            </div>
            <div className="bd-pricing-row">
              <span className="bd-pricing-service">
                <strong>Execution Support</strong>
                <small>Crew planning, provider coordination, job tracking, reporting, and closeout for awarded work</small>
              </span>
              <span className="bd-pricing-amount">Quoted by scope</span>
              <span className="bd-pricing-terms">Separate statement of work or subcontract as required.</span>
            </div>
          </div>
        </div>
      </section>

      {/* ── 30-day onboarding timeline ── */}
      <section className="bd-onboarding">
        <div className="container">
          <span className="bd-label">Getting started</span>
          <h2 className="bd-section-title">Your first 30 days</h2>
          <div className="bd-timeline">
            {ONBOARDING_TIMELINE.map((step, i) => (
              <div className="bd-timeline-step" key={step.week}>
                <div className="bd-timeline-marker">
                  <span className="bd-timeline-num">{i + 1}</span>
                </div>
                <div>
                  <span className="bd-timeline-week">{step.week}</span>
                  <h3 className="bd-timeline-title">{step.title}</h3>
                  <p className="bd-timeline-body">{step.body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Who it's for / not included ── */}
      <section className="bd-fit">
        <div className="container bd-fit-inner">
          <div>
            <h2 className="bd-section-title">This is for you if</h2>
            <ul className="bd-checklist">
              {FOR_YOU_IF.map(item => (
                <li key={item}>
                  <span className="bd-check"><Check size={15} /></span>
                  {item}
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h2 className="bd-section-title bd-not-title">What the monthly plan does not include</h2>
            <ul className="bd-checklist bd-checklist-no">
              {NOT_INCLUDED.map(item => (
                <li key={item}>
                  <span className="bd-ex">✕</span>
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* ── The FASS system ── */}
      <section className="bd-system">
        <div className="container bd-system-inner">
          <div className="bd-system-text">
            <span className="bd-label">The operating system</span>
            <h2 className="bd-section-title">A compounding system, not a one-time shot</h2>
            <p>
              Every opportunity evaluated builds your bid discipline. Every completed solicitation becomes structured past-performance evidence for the next pursuit.
              FASS does not sell a list of opportunities and disappear — we build a repeatable bidding and execution system with you.
            </p>
            <p style={{ marginTop: 16 }}>
              The client remains the prime contractor and authorizes every submission.
              FASS brings the operating system, opportunity intelligence, response support, and execution tools.
            </p>
          </div>
          <div className="bd-modules">
            {MODULES.map(m => (
              <div className="bd-module" key={m.name}>
                <span className="bd-module-name">{m.name}</span>
                <span className="bd-module-sub">{m.sub}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Bottom CTA ── */}
      <section className="bd-bottom-cta">
        <div className="container bd-bottom-cta-inner">
          <h2>Ready to build your bid pipeline?</h2>
          <p>$500/month. Month-to-month. No percentage-of-award fee.</p>
          <a
            href={STRIPE_PAYMENT_LINK}
            className="btn-primary bd-cta"
          >
            Start the partnership
            <ArrowRight size={18} />
          </a>
          <p className="bd-legal">
            FASS does not guarantee a contract award. Award decisions are made solely by the procuring agency.
            This program is a business template and should be reviewed by a licensed Maryland attorney before execution.
            FASS Technologies LLC · 1521 Bush St, Baltimore, MD 21230 · admin@fass.systems
          </p>
        </div>
      </section>

    </div>
  )
}
