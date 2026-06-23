import { useState, useEffect } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import {
  Compass, ClipboardCheck, Kanban, ClipboardList, BookOpen,
  ShieldCheck, LogOut, Lock, GraduationCap, IdCard, DollarSign, Network, Mail,
  Award, LifeBuoy, Handshake, Calculator, HardHat,
} from 'lucide-react'
import './AppShell.css'

const API_BASE = import.meta.env.VITE_API_URL || ''

// Single source of truth for every module's nav entry.
const NAV_ITEMS = [
  { name: 'Dashboard', icon: Compass, to: '/dashboard', match: ['/dashboard'] },
  { name: 'Inbox', icon: Mail, to: '/inbox', match: ['/inbox'] },
  { name: 'WARDOG', icon: Compass, to: '/wardog', match: ['/wardog'] },
  { name: 'Passport', icon: IdCard, to: '/passport', match: ['/passport'] },
  { name: 'R-E-A-D', icon: ClipboardCheck, to: '/read', match: ['/read'] },
  { name: 'Pipeline', icon: Kanban, to: '/pipeline', match: ['/pipeline'] },
  { name: 'FASS FILL', icon: ClipboardList, to: '/fill', match: ['/fill'] },
  { name: 'Network', icon: Network, to: '/network', match: ['/network'] },
  { name: 'Show Me The Money', icon: DollarSign, to: '/money', match: ['/money'] },
  { name: 'Classroom', icon: BookOpen, to: '/classroom', match: ['/classroom'] },
  { name: 'Glossary', icon: GraduationCap, to: '/glossary', match: ['/glossary'] },
  { name: 'Masterclass', icon: Award, to: '/masterclass', match: ['/masterclass'] },
  { name: 'BD Partner', icon: Handshake, to: '/bd-partner', match: ['/bd-partner'] },
  { name: 'Support', icon: LifeBuoy, to: '/support', match: ['/support'] },
  { name: 'Witness', icon: ShieldCheck, to: '/witness', match: ['/witness'] },
  { name: 'Estimator', icon: Calculator, to: '/estimator', match: ['/estimator'] },
  { name: 'Foreman', icon: HardHat, to: '/foreman', match: ['/foreman'] },
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
      <aside className="shell-sidebar">
        <Link to="/dashboard" className="shell-logo">
          <span className="shell-logo-icon">⬡</span>
          <span>FASS <strong>Flow</strong></span>
        </Link>

        <nav className="shell-nav">
          {NAV_ITEMS.map(item => {
            const active = item.match.some(p => location.pathname.startsWith(p))
            const Icon = item.icon
            if (item.soon || !item.to) {
              return (
                <span key={item.name} className="shell-nav-item shell-nav-soon">
                  <Icon size={16} />
                  {item.name}
                  <span className="shell-soon-badge"><Lock size={10} /> Soon</span>
                </span>
              )
            }
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
    </div>
  )
}
