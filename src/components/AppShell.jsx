import { useState, useEffect } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'
import {
  Compass, ClipboardCheck, Kanban, ClipboardList, BookOpen,
  ShieldCheck, LogOut, GraduationCap, IdCard, DollarSign, Network, Mail,
  LifeBuoy, Handshake, Calculator, HardHat, Camera,
  Radar, Images, Trophy, Flame, Menu, X, Send, Lock, ChevronDown, Stamp, Wallet, Rocket, Crop, Megaphone, Gift, Landmark,
  Sparkles, Users,
} from 'lucide-react'
import AlertsBell from './AlertsBell'
import './AppShell.css'

const API_BASE = import.meta.env.VITE_API_URL || ''

// Nav grouped by the journey so the 20+ modules read as a map, not a wall.
// `tier` controls free-account visibility:
//   'free'   — always visible and usable (the core Find -> Qualify path)
//   'gated'  — visible but shows a lock until the user has a paid plan OR
//              has completed their first R-E-A-D score (proof of value
//              before the upgrade ask)
//   'locked' — collapsed under "More tools — unlocks on Pro" until paid
// Paid accounts (any active plan) see every item unlocked and ungrouped,
// exactly as before — this only changes the free-tier first-run experience.
const NAV_GROUPS = [
  { label: null, items: [
    { name: 'Start a Business', icon: Rocket, to: '/start', match: ['/start'], tier: 'free' },
    { name: 'Resize Tool', icon: Crop, to: '/resize', match: ['/resize'], tier: 'free' },
    { name: 'Dashboard', icon: Compass, to: '/dashboard', match: ['/dashboard'], tier: 'free' },
  ] },
  { label: 'Find work', items: [
    { name: 'WARDOG', icon: Radar, to: '/wardog', match: ['/wardog'], tier: 'free' },
    { name: 'Inbox', icon: Mail, to: '/inbox', match: ['/inbox'], tier: 'locked' },
  ] },
  { label: 'Bid', items: [
    { name: 'R-E-A-D', icon: ClipboardCheck, to: '/read', match: ['/read'], tier: 'free' },
    { name: 'Estimator', icon: Calculator, to: '/estimator', match: ['/estimator'], tier: 'locked' },
    { name: 'FASS FILL', icon: ClipboardList, to: '/fill', match: ['/fill'], tier: 'gated' },
    { name: 'Client Proposals', icon: Send, to: '/proposals', match: ['/proposals'], tier: 'locked' },
    { name: 'Pipeline', icon: Kanban, to: '/pipeline', match: ['/pipeline'], tier: 'gated' },
    { name: 'Awarded', icon: Trophy, to: '/awarded', match: ['/awarded'], tier: 'locked' },
  ] },
  { label: 'Do the work', items: [
    { name: 'Contractor Camera', icon: Camera, to: '/camera', match: ['/camera'], tier: 'locked' },
    { name: 'Captures', icon: Images, to: '/captures', match: ['/captures'], tier: 'locked' },
    { name: 'Witness', icon: ShieldCheck, to: '/witness', match: ['/witness'], tier: 'locked' },
    { name: 'Foreman', icon: HardHat, to: '/foreman', match: ['/foreman'], tier: 'locked' },
    { name: 'Restoration', icon: Flame, to: '/restoration', match: ['/restoration'], tier: 'locked' },
  ] },
  { label: 'Grow', items: [
    { name: 'Network', icon: Network, to: '/network', match: ['/network'], tier: 'locked' },
    { name: 'Funding', icon: DollarSign, to: '/money', match: ['/money'], tier: 'locked' },
    { name: 'BD Partner', icon: Handshake, to: '/bd-partner', match: ['/bd-partner'], tier: 'locked' },
    { name: 'Team Up', icon: Users, to: '/teamup', match: ['/teamup'], tier: 'free' },
    { name: 'Rewards', icon: Stamp, to: '/rewards', match: ['/rewards'], tier: 'free' },
    { name: 'Wallet Messaging', icon: Megaphone, to: '/campaigns', match: ['/campaigns'], tier: 'free' },
    { name: 'Gift Cards', icon: Gift, to: '/giftcards', match: ['/giftcards'], tier: 'free' },
  ] },
  { label: 'Learn', items: [
    // "Masterclass" used to be its own nav item pointing at /masterclass —
    // the pre-purchase sales page. Signed-in users now get redirected
    // straight from /masterclass to /classroom (App.jsx's MasterclassRoute),
    // so Classroom is the only Learn destination a logged-in user needs.
    { name: 'Classroom', icon: BookOpen, to: '/classroom', match: ['/classroom', '/masterclass'], tier: 'locked' },
    { name: 'My Notebook', icon: Sparkles, to: '/notebook', match: ['/notebook'], tier: 'locked' },
    { name: 'Glossary', icon: GraduationCap, to: '/glossary', match: ['/glossary'], tier: 'free' },
  ] },
  { label: 'Account', items: [
    { name: 'Passport', icon: IdCard, to: '/passport', match: ['/passport'], tier: 'free' },
    { name: 'Wallet', icon: Wallet, to: '/wallet', match: ['/wallet'], tier: 'free' },
    { name: 'Payouts', icon: Landmark, to: '/payouts', match: ['/payouts'], tier: 'free' },
    { name: 'Support', icon: LifeBuoy, to: '/support', match: ['/support'], tier: 'free' },
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
  const [hasReadPass, setHasReadPass] = useState(false)
  const [moreOpen, setMoreOpen] = useState(false)

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

  // Free-tier nav locking needs to know whether the user has cleared the
  // "see real value before paying" bar — defined as at least one completed
  // R-E-A-D score. Once that happens, Pipeline/FASS FILL unlock even
  // without a paid plan yet; everything else still waits for an upgrade.
  useEffect(() => {
    if (!userId) return
    let cancelled = false
    supabase
      .from('proposals')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .not('read_score', 'is', null)
      .then(({ count }) => { if (!cancelled) setHasReadPass((count || 0) > 0) })
    return () => { cancelled = true }
  }, [userId])

  async function handleSignOut() {
    await signOut()
    navigate('/')
  }

  const plan = profile?.plan
  const status = profile?.subscription_status
  const isActive = status === 'active'
  // No active paid plan yet = free tier, slice the nav down to the core
  // Find -> Qualify -> Respond path per V2MOM's "win the one workflow" rule.
  const isFreeTier = !isActive

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
          {NAV_GROUPS.map((group, gi) => {
            // On a free account, items tiered 'locked' move out of their
            // journey group entirely and collect into "More tools" below —
            // a flat 18-item sidebar is exactly the sprawl V2MOM calls out.
            const visibleItems = isFreeTier
              ? group.items.filter(item => item.tier !== 'locked')
              : group.items
            if (!visibleItems.length) return null
            return (
              <div className="shell-navgroup" key={gi}>
                {group.label && <span className="shell-navgroup-label">{group.label}</span>}
                {visibleItems.map(item => {
                  const active = item.match.some(p => location.pathname.startsWith(p))
                  const Icon = item.icon
                  const isLocked = isFreeTier && item.tier === 'gated' && !hasReadPass
                  if (isLocked) {
                    return (
                      <button
                        key={item.name}
                        type="button"
                        className="shell-nav-item shell-nav-locked"
                        onClick={() => navigate('/pricing')}
                        title="Unlocks after your first R-E-A-D score, or on any paid plan"
                      >
                        <Icon size={16} />
                        {item.name}
                        <Lock size={12} className="shell-nav-lock" />
                      </button>
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
              </div>
            )
          })}

          {isFreeTier && (() => {
            const lockedItems = NAV_GROUPS.flatMap(g => g.items).filter(item => item.tier === 'locked')
            if (!lockedItems.length) return null
            return (
              <div className="shell-navgroup shell-navgroup-more">
                <button
                  type="button"
                  className="shell-navgroup-more-toggle"
                  onClick={() => setMoreOpen(v => !v)}
                  aria-expanded={moreOpen}
                >
                  <Lock size={13} />
                  <span>More tools — unlocks on Pro</span>
                  <ChevronDown size={14} className={`shell-more-chevron ${moreOpen ? 'shell-more-open' : ''}`} />
                </button>
                {moreOpen && lockedItems.map(item => {
                  const Icon = item.icon
                  return (
                    <button
                      key={item.name}
                      type="button"
                      className="shell-nav-item shell-nav-locked"
                      onClick={() => navigate('/pricing')}
                      title="Available on Pro"
                    >
                      <Icon size={16} />
                      {item.name}
                      <Lock size={12} className="shell-nav-lock" />
                    </button>
                  )
                })}
              </div>
            )
          })()}
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
