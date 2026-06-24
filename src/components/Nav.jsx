import { useState } from 'react'
import {
  Menu, X, ChevronDown, Radar, Mail, ClipboardCheck, Kanban,
  ClipboardList, Camera, ShieldCheck, Calculator,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import './Nav.css'

// The marketing mega-menu mirrors the in-app journey: Find → Bid → Execute.
const PLATFORM = [
  {
    label: 'Find work',
    items: [
      { icon: Radar, name: 'WARDOG', sub: 'Live SAM.gov opportunity feed' },
      { icon: Mail, name: 'Inbox', sub: 'Parse solicitations from email' },
    ],
  },
  {
    label: 'Bid',
    items: [
      { icon: ClipboardCheck, name: 'R-E-A-D', sub: 'Six-question bid / no-bid' },
      { icon: ClipboardList, name: 'FASS FILL', sub: 'AI compliance matrix + draft' },
      { icon: Kanban, name: 'Pipeline', sub: 'Track every bid in motion' },
    ],
  },
  {
    label: 'Execute',
    items: [
      { icon: Camera, name: 'Contractor Camera', sub: 'Document the job from your phone' },
      { icon: Calculator, name: 'Estimator', sub: 'Materials + AI scope takeoff' },
      { icon: ShieldCheck, name: 'Witness', sub: 'Run the award to closeout' },
    ],
  },
]

export default function Nav() {
  const [open, setOpen] = useState(false)
  const [platformOpen, setPlatformOpen] = useState(false)
  const { session, signOut } = useAuth()

  async function handleSignOut() {
    await signOut()
    window.location.href = '/'
  }

  return (
    <nav className="nav">
      <div className="container nav-inner">
        <a href="/" className="nav-logo">
          <span className="logo-icon">⬡</span>
          <span className="logo-text">FASS <strong>Flow</strong></span>
        </a>

        <ul className="nav-links">
          <li
            className="nav-platform"
            onMouseEnter={() => setPlatformOpen(true)}
            onMouseLeave={() => setPlatformOpen(false)}
          >
            <button className={`nav-platform-btn ${platformOpen ? 'open' : ''}`}>
              Platform <ChevronDown size={14} />
            </button>
            {platformOpen && (
              <div className="nav-mega">
                {PLATFORM.map(group => (
                  <div className="nav-mega-col" key={group.label}>
                    <span className="nav-mega-label">{group.label}</span>
                    {group.items.map(it => {
                      const Icon = it.icon
                      return (
                        <a href="/signin" className="nav-mega-item" key={it.name}>
                          <span className="nav-mega-icon"><Icon size={17} /></span>
                          <span>
                            <span className="nav-mega-name">{it.name}</span>
                            <span className="nav-mega-sub">{it.sub}</span>
                          </span>
                        </a>
                      )
                    })}
                  </div>
                ))}
              </div>
            )}
          </li>
          <li><a href="/pricing">Pricing</a></li>
          <li><a href="/masterclass">Masterclass</a></li>
          <li><a href="/bd-partner">BD Partner</a></li>
        </ul>

        <div className="nav-cta">
          {session ? (
            <>
              <a href="/dashboard" className="btn-outline nav-signin">Dashboard</a>
              <button className="btn-outline nav-signin" onClick={handleSignOut} style={{ marginLeft: 8 }}>Sign Out</button>
            </>
          ) : (
            <>
              <a href="/signin" className="nav-login">Log In</a>
              <a href="/masterclass" className="btn-primary nav-book">Get Started</a>
            </>
          )}
        </div>

        <button className="nav-toggle" onClick={() => setOpen(o => !o)} aria-label="Toggle menu">
          {open ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>

      {open && (
        <div className="nav-drawer">
          <span className="nav-drawer-label">Platform</span>
          {PLATFORM.flatMap(g => g.items).map(it => (
            <a key={it.name} href="/signin" onClick={() => setOpen(false)}>{it.name}</a>
          ))}
          <span className="nav-drawer-label">More</span>
          <a href="/pricing" onClick={() => setOpen(false)}>Pricing</a>
          <a href="/masterclass" onClick={() => setOpen(false)}>Masterclass</a>
          <a href="/bd-partner" onClick={() => setOpen(false)}>BD Partner</a>
          {session ? (
            <a href="/dashboard" className="btn-primary" style={{ marginTop: 8 }}>Dashboard</a>
          ) : (
            <>
              <a href="/signin" onClick={() => setOpen(false)}>Log In</a>
              <a href="/masterclass" className="btn-primary" style={{ marginTop: 8 }}>Get Started</a>
            </>
          )}
        </div>
      )}
    </nav>
  )
}
