import { useAuth } from '../context/AuthContext'
import { useNavigate } from 'react-router-dom'
import Wardog from './Wardog'
import './Dashboard.css'

const TOOLS = [
  { name: 'WARDOG', sub: 'Opportunity intelligence', status: 'live', desc: 'Live SAM.gov sweep matching your NAICS codes and geography, plus a curated directory of FedConnect, Unison, DIBBS, eMMA, and local/university procurement sources.', href: '#wardog' },
  { name: 'R-E-A-D', sub: 'Bid discipline', status: 'live', desc: 'Six-question bid/no-bid scoring for every flagged opportunity.', href: '/read' },
  { name: 'PIPELINE', sub: 'CRM & tracking', status: 'live', desc: 'Kanban + list view of every bid in motion. Drag, drop, and monitor.', href: '/pipeline' },
  { name: 'FASS FILL', sub: 'Execution capacity', status: 'live', desc: 'Paste a solicitation, get an instant compliance matrix, outline, and capability statement.', href: '/fill' },
  { name: 'CLASSROOM', sub: '10-Night Masterclass', status: 'live', desc: 'Work through the full Government Contracting Masterclass, night by night, with progress tracking.', href: '/classroom' },
  { name: 'WITNESS', sub: 'Closeout proof', status: 'coming', desc: 'Past-performance evidence collection after every completed contract.', href: null },
]

export default function Dashboard() {
  const { session, signOut } = useAuth()
  const navigate = useNavigate()

  async function handleSignOut() {
    await signOut()
    navigate('/')
  }

  const email = session?.user?.email ?? ''

  return (
    <div className="dash">
      <header className="dash-header">
        <div className="dash-header-inner">
          <a href="/" className="dash-logo">
            <span className="dash-logo-icon">⬡</span>
            <span>FASS <strong>Flow</strong></span>
          </a>
          <div className="dash-user">
            <span className="dash-email">{email}</span>
            <button className="dash-signout" onClick={handleSignOut}>Sign out</button>
          </div>
        </div>
      </header>

      <main className="dash-main">
        <div className="dash-container">

          {/* Tool nav */}
          <div className="dash-tool-nav">
            {TOOLS.map(tool => (
              <div
                key={tool.name}
                className={`dash-tool-tab ${tool.status === 'coming' ? 'dash-tab-coming' : ''}`}
                onClick={() => {
                  if (!tool.href) return
                  if (tool.href.startsWith('/')) navigate(tool.href)
                  else document.querySelector(tool.href)?.scrollIntoView({ behavior: 'smooth' })
                }}
              >
                <span className="dash-tab-name">{tool.name}</span>
                <span className={`dash-tool-badge ${tool.status === 'live' ? 'badge-live' : 'badge-coming'}`}>
                  {tool.status === 'live' ? 'Live' : 'Soon'}
                </span>
              </div>
            ))}
          </div>

          {/* WARDOG */}
          <section id="wardog" className="dash-section">
            <Wardog />
          </section>

          <div className="dash-support">
            <p>Questions about your engagement or pipeline?</p>
            <a href="mailto:admin@fass.systems" className="btn-outline">
              Contact admin@fass.systems
            </a>
          </div>
        </div>
      </main>
    </div>
  )
}
