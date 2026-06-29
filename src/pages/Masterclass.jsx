import { useState } from 'react'
import { ArrowRight, Check, Lock, Download, Award, ClipboardCheck } from 'lucide-react'
import { MASTERCLASS_NIGHTS } from '../data/masterclassNights'
import useSeo from '../hooks/useSeo'
import './Masterclass.css'

// ── Replace this with your real Stripe Payment Link once created ──
const STRIPE_PAYMENT_LINK = 'https://buy.stripe.com/6oU00cerM1VQd6UfAffnO0c'

// ── Founding-100 promo: full price is $350; while we scale to our first
// 100 students, it's 50% off at $175. Once the Stripe price/coupon for
// this is live, point STRIPE_PAYMENT_LINK at the discounted link/coupon. ──
const FULL_PRICE = 350
const PROMO_PRICE = 175
const PROMO_LABEL = 'Founding 100 pricing — 50% off while we scale'

// Per-mission summaries now pulled straight from the real curriculum data that
// powers the Classroom — same titles, same subtitles, same lesson count. The
// sales page no longer says less than the product actually delivers.
const MISSIONS = MASTERCLASS_NIGHTS.map(night => ({
  n: String(night.n).padStart(2, '0'),
  title: night.title,
  body: night.subtitle,
  lessons: night.sections.length,
  objectives: night.objectives.length,
  hasWorksheet: (night.worksheet || []).length > 0,
}))

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
  useSeo({
    title: 'Masterclass',
    description: 'FASS Academy — a government contracting masterclass with real missions, worksheets, and a certificate of completion.',
    path: '/masterclass',
    markdownUrl: '/llms/masterclass.md',
  })
  const [sampleNight, setSampleNight] = useState(1)
  const mission = MASTERCLASS_NIGHTS.find(n => n.n === sampleNight) || MASTERCLASS_NIGHTS[0]

  return (
    <div className="mc">

      {/* ── Hero ── */}
      <section className="mc-hero">
        <div className="container mc-hero-inner">
          <span className="mc-label">FASS Masterclass — Launch Accelerator</span>
          <h1 className="mc-headline">
            10 short missions. Everything you need to compete for government contracts.
          </h1>
          <p className="mc-subhead">
            Most service businesses lose before they start — wrong codes, wrong forms, no bid discipline.
            This Masterclass fixes that in focused, fast sessions — most students finish the core training
            in under 2 hours, then put it to work at their own pace.
          </p>
          <p className="mc-subhead" style={{ marginTop: 4 }}>
            A guided launch program, not a subscription tier — includes the workbook, live setup help, and
            building your first real pipeline inside FASS Flow by Mission 10.
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

      {/* ── 10 Missions ── */}
      <section className="mc-nights">
        <div className="container">
          <span className="mc-label">The curriculum</span>
          <h2 className="mc-section-title mc-nights-title">What you learn, mission by mission</h2>
          <div className="mc-nights-grid">
            {MISSIONS.map(n => (
              <div className="mc-night-card" key={n.n}>
                <span className="mc-night-num">Mission {n.n}</span>
                <h3 className="mc-night-title">{n.title}</h3>
                <p className="mc-night-body">{n.body}</p>
                <div className="mc-night-meta">
                  <span>{n.objectives} objectives</span>
                  <span>{n.lessons} lessons</span>
                  {n.hasWorksheet && <span><ClipboardCheck size={12} /> Worksheet</span>}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Proof of depth: a real mission, in full ── */}
      <section className="mc-sample">
        <div className="container">
          <span className="mc-label">See it for yourself</span>
          <h2 className="mc-section-title mc-nights-title">
            This isn't a webinar. Here's an actual mission, unlocked.
          </h2>
          <p className="mc-sample-intro">
            Every mission in the Classroom looks like this — real objectives, real teaching, a real homework
            assignment, a printable worksheet, and a place to track what you did. Most take 10–20 minutes.
            Pick any mission below to see it.
          </p>

          <div className="mc-sample-picker">
            {MASTERCLASS_NIGHTS.map(n => (
              <button
                key={n.n}
                className={`mc-sample-pick ${sampleNight === n.n ? 'active' : ''}`}
                onClick={() => setSampleNight(n.n)}
              >
                {n.n}
              </button>
            ))}
          </div>

          <div className="mc-sample-card">
            <div className="mc-sample-head">
              <span className="mc-night-num">Mission {mission.n} of {MASTERCLASS_NIGHTS.length}</span>
              <h3>{mission.title}</h3>
              <p>{mission.subtitle}</p>
            </div>

            <div className="mc-sample-block">
              <h4>Objectives</h4>
              <ul>
                {mission.objectives.map((o, i) => <li key={i}>{o}</li>)}
              </ul>
            </div>

            {mission.sections.slice(0, 2).map((s, i) => (
              <div className="mc-sample-block" key={i}>
                <h4>{s.heading}</h4>
                <p>{s.body}</p>
              </div>
            ))}
            {mission.sections.length > 2 && (
              <p className="mc-sample-more">
                + {mission.sections.length - 2} more lesson{mission.sections.length - 2 === 1 ? '' : 's'} this mission, unlocked in the Classroom.
              </p>
            )}

            <div className="mc-sample-block">
              <h4>Homework</h4>
              <p>{mission.homework}</p>
            </div>

            {mission.worksheet && mission.worksheet.length > 0 && (
              <div className="mc-sample-block">
                <h4><Download size={13} /> Downloadable worksheet — fields you fill in</h4>
                <ul className="mc-sample-worksheet">
                  {mission.worksheet.map((w, i) => <li key={i}>{w}</li>)}
                </ul>
              </div>
            )}

            <div className="mc-sample-locked">
              <Lock size={13} /> Mission {mission.n + 1 > MASTERCLASS_NIGHTS.length ? '—' : mission.n + 1} unlocks once this one is marked complete.
            </div>
          </div>
        </div>
      </section>

      {/* ── How it's tracked ── */}
      <section className="mc-mechanics">
        <div className="container mc-mechanics-inner">
          <span className="mc-label">How the 10 missions actually work</span>
          <h2 className="mc-section-title mc-nights-title">Built like a class, not a video library</h2>
          <div className="mc-mechanics-grid">
            <div className="mc-mech-card">
              <Lock size={18} />
              <h3>Sequential unlock</h3>
              <p>Mission 2 doesn't open until Mission 1 is marked complete. No skipping ahead and missing the foundation.</p>
            </div>
            <div className="mc-mech-card">
              <ClipboardCheck size={18} />
              <h3>Real homework, every mission</h3>
              <p>Each mission ends with an assignment tied to your actual business — your NAICS code, your solicitation, your price.</p>
            </div>
            <div className="mc-mech-card">
              <Download size={18} />
              <h3>Printable worksheets</h3>
              <p>Every mission has a downloadable worksheet with the exact fields to fill in — no guessing what "homework" means.</p>
            </div>
            <div className="mc-mech-card">
              <Award size={18} />
              <h3>Certificate of Completion</h3>
              <p>Finish all 10 missions and get a Certificate of Completion from FASS Technologies LLC, downloadable on the spot.</p>
            </div>
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
            10 missions. The system that puts Maryland service businesses in the room.
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
