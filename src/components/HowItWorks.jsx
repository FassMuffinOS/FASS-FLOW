import { GraduationCap, Search, ShoppingCart, FileText, CheckCircle } from 'lucide-react'
import './HowItWorks.css'

const STEPS = [
  {
    number: '01',
    icon: GraduationCap,
    name: 'Academy',
    tagline: 'Learn the system',
    description:
      'Master government contracting from zero. Structured courses on SAM.gov registration, NAICS codes, set-aside programs, and the full procurement lifecycle.',
  },
  {
    number: '02',
    icon: Search,
    name: 'Wardog',
    tagline: 'Find the opportunities',
    description:
      'AI-powered opportunity scanner that matches open solicitations to your capabilities and past performance — delivered daily before your competitors see them.',
  },
  {
    number: '03',
    icon: ShoppingCart,
    name: 'Procure',
    tagline: 'Build the bid',
    description:
      'Guided proposal builder with smart templates, compliance checklists, and pricing tools so your response meets every FAR requirement.',
  },
  {
    number: '04',
    icon: FileText,
    name: 'Fill',
    tagline: 'Automate the paperwork',
    description:
      'Auto-fill SAM.gov registrations, certifications, and contract forms from your stored profile. One click — done.',
  },
  {
    number: '05',
    icon: CheckCircle,
    name: 'Witness',
    tagline: 'Execute the award',
    description:
      'Track deliverables, manage invoicing, and document performance so every award builds the past-performance record that wins the next one.',
  },
]

export default function HowItWorks() {
  return (
    <section className="hiw" id="how-it-works">
      <div className="container">
        <div className="hiw-header">
          <span className="section-label">How It Works</span>
          <h2 className="hiw-title">Five modules. One complete system.</h2>
          <p className="hiw-desc">
            FASS Flow walks you through every stage of the government contracting journey —
            from training to execution — in a single platform.
          </p>
        </div>

        <div className="hiw-steps">
          {STEPS.map((step, i) => {
            const Icon = step.icon
            return (
              <div className="step-card" key={step.name}>
                <div className="step-number">{step.number}</div>
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
                {i < STEPS.length - 1 && (
                  <div className="step-connector" aria-hidden="true" />
                )}
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
