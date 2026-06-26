import { Radar, Kanban, Camera } from 'lucide-react'
import Reveal from './Reveal'
import './HomeBand.css'

const SOURCES = ['SAM.gov', 'eMMA', 'DIBBS', 'FedConnect', 'Unison', 'BidNet']

const FEATURES = [
  {
    icon: Radar, kicker: 'Find it',
    body: 'A live SAM.gov ticker matched to your NAICS — qualified opportunities stream in instead of getting hunted down.',
  },
  {
    icon: Kanban, kicker: 'Win it',
    body: 'Score bids with R-E-A-D, draft responses with AI, and track every one on a Monday-style pipeline.',
  },
  {
    icon: Camera, kicker: 'Build it',
    body: 'Estimate the job, document the site from your phone, and run the award from kickoff to closeout.',
  },
]

export default function HomeBand() {
  return (
    <section className="hb">
      <div className="container">
        <Reveal as="p" className="hb-trust-label">
          Powered by live SAM.gov opportunities + the procurement sources contractors use every day
        </Reveal>
        <Reveal className="hb-logos" delay={80}>
          {SOURCES.map(s => <span key={s}>{s}</span>)}
        </Reveal>

        <div className="hb-cards">
          {FEATURES.map((f, i) => {
            const Icon = f.icon
            return (
              <Reveal as="div" className="hb-card" key={f.kicker} delay={120 + i * 100}>
                <span className="hb-card-icon"><Icon size={22} /></span>
                <h3 className="hb-card-kicker">{f.kicker}</h3>
                <p className="hb-card-body">{f.body}</p>
              </Reveal>
            )
          })}
        </div>
      </div>
    </section>
  )
}
