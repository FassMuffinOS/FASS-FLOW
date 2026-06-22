import { ArrowRight, Check } from 'lucide-react'
import './Masterclass.css'

// ── Replace this with your real Stripe Payment Link once created ──
const STRIPE_PAYMENT_LINK = 'https://buy.stripe.com/6oU00cerM1VQd6UfAffnO0c'

// ── Founding-100 promo: full price is $350; while we scale to our first
// 100 students, it's 50% off at $175. Once the Stripe price/coupon for
// this is live, point STRIPE_PAYMENT_LINK at the discounted link/coupon. ──
const FULL_PRICE = 350
const PROMO_PRICE = 175
const PROMO_LABEL = 'Founding 100 pricing — 50% off while we scale'

const NIGHTS = [
  { n: '01', title: 'Why government contracts exist for you', body: 'Who buys services from small businesses, why set-asides matter, and why the market is larger than you think.' },
  { n: '02', title: 'Entity registration: SAM.gov and Maryland eMMA', body: 'Step-by-step registration, common mistakes that kill eligibility, and what active status actually means.' },
  { n: '03', title: 'NAICS codes and capability profile', body: 'Choosing the right codes for your service, building a capability statement that matches what agencies are buying.' },
  { n: '04', title: 'Reading a solicitation', body: 'How to open an RFQ or IFB and immediately identify scope, eligibility requirements, evaluation criteria, and red flags.' },
  { n: '05', title: 'The R-E-A-D bid/no-bid decision', body: 'Six questions that tell you whether to pursue an opportunity before you spend a single hour writing.' },
  { n: '06', title: 'Pricing government work', body: 'How to build a price that covers your costs, meets the solicitation, and doesn\'t lose money on delivery.' },
  { n: '07', title: 'Assembling a compliant response', body: 'Required forms, technical narrative, staffing plan, cover letter — what goes in and what order it needs to be in.' },
  { n: '08', title: 'WARDOG: finding qualified opportunities daily', body: 'How FASS monitors SAM.gov and eMMA for notices that match your real capacity and geography.' },
  { n: '09', title: 'Execution readiness: preparing to perform after award', body: 'Crew planning, provider coordination, reporting requirements, and the evidence you need to collect from day one.' },
  { n: '10', title: 'Building past performance that compounds', body: 'How to document each completed contract so the next pursuit is easier — the FASS WITNESS closeout system.' },
]

const FOR_YOU_IF = [
  'You own a service business in Maryland or the DC Metro area',
  'You do cleaning, facilities, staffing, catering, logistics, event support, or light labor',
  'You already do the work commercially and want a disciplined path into government procurement',
  'You have never bid a government contract and want to learn the system before paying for ongoing support',
]

const NOT_FOR_YOU_IF = [
  'You are looking for a list of contacts or shortcuts',
  'You want someone else to make procurement decisions for you',
  'You are not willing to do the registration and preparation work',
]

export default function Masterclass() {
  return (
    <div className="mc">

      {/* ── Hero ── */}
      <section className="mc-hero">
        <div className="container mc-hero-inner">
          <span className="mc-label">FASS Masterclass</span>
          <h1 className="mc-headline">
            10 nights. Everything you need to compete for government contracts.
          </h1>
          <p className="mc-subhead">
            Most service businesses lose before they start — wrong codes, wrong forms, no bid discipline.
            This Masterclass fixes that. We assume you know nothing and build the foundation correctly.
          </p>
          <span className="mc-promo-badge">{PROMO_LABEL}</span>
          <div className="mc-price-block">
            <span className="mc-price-old">${FULL_PRICE}</span>
            <span className="mc-price">${PROMO_PRICE}</span>
            <span className="mc-price-note">One-time. No subscription.</span>
          </div>
          <a href={STRIPE_PAYMENT_LINK} className="btn-primary mc-cta">
            Enroll now — ${PROMO_PRICE}
            <ArrowRight size={18} />
          </a>
          <p className="mc-bd-note">
            This rate locks in only for our first 100 students — price returns to ${FULL_PRICE} once we hit
            that mark. BD Partner support available for graduates ready to move from learning to active pursuit.
          </p>
        </div>
      </section>

      {/* ── Who it's for ── */}
      <section className="mc-fit">
        <div className="container mc-fit-inner">
          <div className="mc-fit-col">
            <h2 className="mc-section-title">This is for you if</h2>
            <ul className="mc-checklist">
              {FOR_YOU_IF.map(item => (
                <li key={item}>
                  <span className="mc-check"><Check size={15} /></span>
                  {item}
                </li>
              ))}
            </ul>
          </div>
          <div className="mc-fit-col mc-fit-not">
            <h2 className="mc-section-title">This is not for you if</h2>
            <ul className="mc-checklist mc-checklist-no">
              {NOT_FOR_YOU_IF.map(item => (
                <li key={item}>
                  <span className="mc-ex">✕</span>
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* ── 10 Nights ── */}
      <section className="mc-nights">
        <div className="container">
          <span className="mc-label">The curriculum</span>
          <h2 className="mc-section-title mc-nights-title">What you learn, night by night</h2>
          <div className="mc-nights-grid">
            {NIGHTS.map(night => (
              <div className="mc-night-card" key={night.n}>
                <span className="mc-night-num">Night {night.n}</span>
                <h3 className="mc-night-title">{night.title}</h3>
                <p className="mc-night-body">{night.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── What you leave with ── */}
      <section className="mc-outcome">
        <div className="container mc-outcome-inner">
          <div className="mc-outcome-text">
            <span className="mc-label">After the Masterclass</span>
            <h2 className="mc-section-title">You leave with a foundation, not a fantasy</h2>
            <p>
              Active SAM.gov and eMMA registration. A completed capability profile. The R-E-A-D workflow you can apply to any solicitation the same day you see it. An understanding of what a compliant response actually requires.
            </p>
            <p style={{ marginTop: 16 }}>
              The client remains the prime contractor and authorizes every submission. FASS brings the operating system. You bring the business.
            </p>
          </div>
          <div className="mc-outcome-modules">
            {[
              { name: 'WARDOG', sub: 'Opportunity intelligence' },
              { name: 'R-E-A-D', sub: 'Bid discipline' },
              { name: 'FASS FILL', sub: 'Execution capacity' },
              { name: 'WITNESS', sub: 'Closeout proof' },
            ].map(m => (
              <div className="mc-module" key={m.name}>
                <span className="mc-module-name">{m.name}</span>
                <span className="mc-module-sub">{m.sub}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="mc-bottom-cta">
        <div className="container mc-bottom-cta-inner">
          <h2>Ready to start?</h2>
          <p>
            <span className="mc-bottom-old-price">${FULL_PRICE}</span> ${PROMO_PRICE} for our first 100 students.
            10 nights. The system that puts Maryland service businesses in the room.
          </p>
          <a href={STRIPE_PAYMENT_LINK} className="btn-primary mc-cta">
            Enroll now — ${PROMO_PRICE}
            <ArrowRight size={18} />
          </a>
          <p className="mc-legal">
            FASS does not guarantee a contract award. Award decisions are made solely by the procuring agency.
            FASS Technologies LLC · Baltimore, MD · admin@fass.systems
          </p>
        </div>
      </section>

    </div>
  )
}
