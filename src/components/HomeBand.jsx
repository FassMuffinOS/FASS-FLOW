import { Radar, Kanban, Camera } from 'lucide-react'
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
        <p className="hb-trust-label">Built for the businesses winning government work</p>
        <div className="hb-logos">
          {SOURCES.map(s => <span key={s}>{s}</span>)}
        </div>

        <div className="hb-cards">
          {FEATURES.map(f => {
            const Icon = f.icon
            return (
              <div className="hb-card" key={f.kicker}>
                <span className="hb-card-icon"><Icon size={22} /></span>
                <h3 className="hb-card-kicker">{f.kicker}</h3>
                <p className="hb-card-body">{f.body}</p>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
