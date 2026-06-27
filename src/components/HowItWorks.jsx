import {
  GraduationCap, Search, ShoppingCart, FileText, CheckCircle,
  Target, Wrench, HardHat, Calculator, Megaphone, Gift, TrendingUp,
} from 'lucide-react'
import Reveal from './Reveal'
import './HowItWorks.css'

// One platform, three lanes — Win Work (find/qualify/bid), Execute Work
// (perform and document the award), Grow Customers (Wallet/loyalty for
// the business's own customers, separate from the government side). This
// mirrors the offer architecture used on /pricing: Pro bundles all three
// lanes, which is the point — Wallet shouldn't read as a bolt-on.
const LANES = [
  {
    key: 'win',
    icon: Target,
    label: 'Lane 1',
    title: 'Win Work',
    desc: 'Find the right opportunities, decide which ones are worth pursuing, and build a compliant bid.',
    steps: [
      {
        icon: GraduationCap,
        name: 'Academy',
        tagline: 'Learn the system',
        description: 'Structured courses on SAM.gov registration, NAICS codes, set-aside programs, and the full procurement lifecycle.',
      },
      {
        icon: Search,
        name: 'Wardog',
        tagline: 'Find the opportunities',
        description: 'AI-powered opportunity scanner that matches open solicitations to your capabilities and past performance — delivered daily.',
      },
      {
        icon: CheckCircle,
        name: 'R-E-A-D',
        tagline: 'Bid / no-bid discipline',
        description: 'A six-question scoring workflow — eligibility, requirements, capacity, timing, margin, substantiation — before you spend an hour writing.',
      },
      {
        icon: ShoppingCart,
        name: 'Procure',
        tagline: 'Build the bid',
        description: 'Guided proposal builder with smart templates, compliance checklists, and pricing tools so your response meets every FAR requirement.',
      },
    ],
  },
  {
    key: 'execute',
    icon: Wrench,
    label: 'Lane 2',
    title: 'Execute Work',
    desc: 'Perform the awarded contract and build the documented track record that wins the next one.',
    steps: [
      {
        icon: FileText,
        name: 'Fill',
        tagline: 'Automate the paperwork',
        description: 'Auto-fill SAM.gov registrations, certifications, and contract forms from your stored profile. One click — done.',
      },
      {
        icon: HardHat,
        name: 'Foreman',
        tagline: 'Run the job',
        description: 'Schedule of values, AIA pay apps, RFIs, submittals, and daily logs — the execution paperwork a federal job actually requires.',
      },
      {
        icon: Calculator,
        name: 'Estimator',
        tagline: 'Price the work',
        description: 'Room-by-room or line-item estimating with photo verification, so the same list doubles as a work-progress tracker.',
      },
      {
        icon: CheckCircle,
        name: 'Witness',
        tagline: 'Document performance',
        description: 'Track deliverables, manage invoicing, and document performance so every award builds the past-performance record for the next pursuit.',
      },
    ],
  },
  {
    key: 'grow',
    icon: TrendingUp,
    label: 'Lane 3',
    title: 'Grow Customers',
    desc: "Your government work isn't your only revenue — Wallet runs loyalty and repeat business for everyone else you serve.",
    steps: [
      {
        icon: Gift,
        name: 'Wallet',
        tagline: 'Loyalty, in their Apple Wallet',
        description: 'Digital stamp cards and gift cards customers actually keep on their phone — no app to download, just tap to add.',
      },
      {
        icon: Megaphone,
        name: 'Campaigns',
        tagline: 'Push messages + CRM',
        description: 'Send a push notification straight to every customer\'s Wallet pass, backed by a real customer list — bonus stamps, offers, reminders.',
      },
    ],
  },
]

export default function HowItWorks() {
  return (
    <section className="hiw" id="how-it-works">
      <div className="container">
        <Reveal as="div" className="hiw-header">
          <span className="section-label">How It Works</span>
          <h2 className="hiw-title">One platform. Three lanes.</h2>
          <p className="hiw-desc">
            FASS Flow helps service businesses win government work, execute the job, and grow repeat
            customers — from one operating system, not three disconnected tools.
          </p>
        </Reveal>

        {LANES.map((lane, laneIdx) => {
          const LaneIcon = lane.icon
          return (
            <div className="hiw-lane" key={lane.key}>
              <Reveal as="div" className="hiw-lane-header" delay={laneIdx * 60}>
                <div className="hiw-lane-icon"><LaneIcon size={20} strokeWidth={1.8} /></div>
                <div>
                  <div className="hiw-lane-eyebrow">{lane.label}</div>
                  <h3 className="hiw-lane-title">{lane.title}</h3>
                  <p className="hiw-lane-desc">{lane.desc}</p>
                </div>
              </Reveal>

              <div className="hiw-steps">
                {lane.steps.map((step, i) => {
                  const Icon = step.icon
                  return (
                    <Reveal as="div" className="step-card" key={step.name} delay={i * 90}>
                      <div className="step-number">{String(i + 1).padStart(2, '0')}</div>
                      <div className="step-icon-wrap">
                        <Icon size={24} strokeWidth={1.8} />
                      </div>
                      <div className="step-content">
                        <div className="step-name-row">
                          <span className="step-name">{step.name}</span>
                          <span className="step-tagline">{step.tagline}</span>
                        </div>
                        <p className="step-desc">{step.description}</p>
                      </div>
                      {i < lane.steps.length - 1 && (
                        <div className="step-connector" aria-hidden="true" />
                      )}
                    </Reveal>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}
