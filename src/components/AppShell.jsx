import { useState, useEffect } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import {
  Compass, ClipboardCheck, Kanban, ClipboardList, BookOpen,
  ShieldCheck, LogOut, GraduationCap, IdCard, DollarSign, Network, Mail,
  Award, LifeBuoy, Handshake, Calculator, HardHat, Camera,
  Radar, Images, Trophy, Flame, Menu, X, Send,
} from 'lucide-react'
import AlertsBell from './AlertsBell'
import './AppShell.css'

const API_BASE = import.meta.env.VITE_API_URL || ''

// Nav grouped by the journey so the 20+ modules read as a map, not a wall.
const NAV_GROUPS = [
  { label: null, items: [
    { name: 'Dashboard', icon: Compass, to: '/dashboard', match: ['/dashboard'] },
  ] },
  { label: 'Find work', items: [
    { name: 'WARDOG', icon: Radar, to: '/wardog', match: ['/wardog'] },
    { name: 'Inbox', icon: Mail, to: '/inbox', match: ['/inbox'] },
  ] },
  { label: 'Bid', items: [
    { name: 'R-E-A-D', icon: ClipboardCheck, to: '/read', match: ['/read'] },
    { name: 'Estimator', icon: Calculator, to: '/estimator', match: ['/estimator'] },
    { name: 'FASS FILL', icon: ClipboardList, to: '/fill', match: ['/fill'] },
    { name: 'Client Proposals', icon: Send, to: '/proposals', match: ['/proposals'] },
    { name: 'Pipeline', icon: Kanban, to: '/pipeline', match: ['/pipeline'] },
    { name: 'Awarded', icon: Trophy, to: '/awarded', match: ['/awarded'] },
  ] },
  { label: 'Do the work', items: [
    { name: 'Contractor Camera', icon: Camera, to: '/camera', match: ['/camera'] },
    { name: 'Captures', icon: Images, to: '/captures', match: ['/captures'] },
    { name: 'Witness', icon: ShieldCheck, to: '/witness', match: ['/witness'] },
    { name: 'Foreman', icon: HardHat, to: '/foreman', match: ['/foreman'] },
    { name: 'Restoration', icon: Flame, to: '/restoration', match: ['/restoration'] },
  ] },
  { label: 'Grow', items: [
    { name: 'Network', icon: Network, to: '/network', match: ['/network'] },
    { name: 'Funding', icon: DollarSign, to: '/money', match: ['/money'] },
    { name: 'BD Partner', icon: Handshake, to: '/bd-partner', match: ['/bd-partner'] },
  ] },
  { label: 'Learn', items: [
    { name: 'Classroom', icon: BookOpen, to: '/classroom', match: ['/classroom'] },
    { name: 'Masterclass', icon: Award, to: '/masterclass', match: ['/masterclass'] },
    { name: 'Glossary', icon: GraduationCap, to: '/glossary', match: ['/glossary'] },
  ] },
  { label: 'Account', items: [
    { name: 'Passport', icon: IdCard, to: '/passport', match: ['/passport'] },
    { name: 'Support', icon: LifeBuoy, to: '/support', match: ['/support'] },
  ] },
]

const PLAN_LABELS = {
  lite: 'Lite',
  starter: 'Core', // backend/Stripe key stays "starter" — display renamed
  // to "Core" once the cheaper "Lite" tier was added below it.
  pro: 'Pro',
  team: 'Team',
  promo: 'Promo Access',
}

export default function AppShell({ children }) {
  const { session, signOut } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [profile, setProfile] = useState(null)
  const [menuOpen, setMenuOpen] = useState(false)

  // Close the mobile drawer whenever the route changes.
  useEffect(() => { setMenuOpen(false) }, [location.pathname])

  const email = session?.user?.email ?? ''
  const userId = session?.user?.id

  useEffect(() => {
    if (!userId) return
    let cancelled = false
    fetch(`${API_BASE}/api/v1/users/${userId}/profile`)
      .then(res => res.ok ? res.json() : null)
      .then(data => { if (!cancelled) setProfile(data) })
      .catch(() => {})
    return () => { cancelled = true }
  }, [userId])

  async function handleSignOut() {
    await signOut()
    navigate('/')
  }

  const plan = profile?.plan
  const status = profile?.subscription_status
  const isActive = status === 'active'

  return (
    <div className="shell">
      {/* Mobile top bar (≤900px) */}
      <div className="shell-mobilebar">
        <button className="shell-burger" onClick={() => setMenuOpen(true)} aria-label="Open menu">
          <Menu size={22} />
        </button>
        <Link to="/dashboard" className="shell-logo shell-logo-mobile">
          <span className="shell-logo-icon">⬡</span>
          <span>FASS <strong>Flow</strong></span>
        </Link>
      </div>

      {menuOpen && <div className="shell-scrim" onClick={() => setMenuOpen(false)} />}

      <aside className={`shell-sidebar ${menuOpen ? 'shell-open' : ''}`}>
        <div className="shell-side-top">
          <Link to="/dashboard" className="shell-logo">
            <span className="shell-logo-icon">⬡</span>
            <span>FASS <strong>Flow</strong></span>
          </Link>
          <button className="shell-closemenu" onClick={() => setMenuOpen(false)} aria-label="Close menu">
            <X size={18} />
          </button>
        </div>

        <nav className="shell-nav">
          {NAV_GROUPS.map((group, gi) => (
            <div className="shell-navgroup" key={gi}>
              {group.label && <span className="shell-navgroup-label">{group.label}</span>}
              {group.items.map(item => {
                const active = item.match.some(p => location.pathname.startsWith(p))
                const Icon = item.icon
                return (
                  <Link
                    key={item.name}
                    to={item.to}
                    className={`shell-nav-item ${active ? 'shell-nav-active' : ''}`}
                  >
                    <Icon size={16} />
                    {item.name}
                  </Link>
                )
              })}
            </div>
          ))}
        </nav>

        <div className="shell-user">
          {profile && (
            <span className={`shell-plan-badge ${isActive ? 'plan-active' : 'plan-inactive'}`}>
              {PLAN_LABELS[plan] || plan || 'No plan'} · {isActive ? 'Active' : status || 'inactive'}
            </span>
          )}
          <span className="shell-email" title={email}>{email}</span>
          <button className="shell-signout" onClick={handleSignOut}>
            <LogOut size={14} /> Sign out
          </button>
        </div>
      </aside>

      <div className="shell-content">{children}</div>

      <AlertsBell />
    </div>
  )
}
