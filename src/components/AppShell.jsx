import { useState, useEffect } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'
import {
  Compass, ClipboardCheck, Kanban, ClipboardList, BookOpen,
  ShieldCheck, LogOut, GraduationCap, IdCard, DollarSign, Network, Mail,
  LifeBuoy, Handshake, Calculator, HardHat, Camera,
  Radar, Images, Trophy, Flame, Menu, X, Send, Lock, ChevronDown, Stamp, Wallet, Rocket, Crop, Megaphone, Gift, Landmark,
  Sparkles, Users, Award, MessageCircle, Newspaper, LayoutGrid, PenSquare,
  PanelLeft, Plus, Pencil, Check, Trash2, Settings as SettingsIcon,
} from 'lucide-react'
import ChatDock from './ChatDock'
import BottomNav from './BottomNav'
import TopBar from './TopBar'
import InstallPrompt from './InstallPrompt'
import { loadSidebarConfig, saveSidebarConfig, newViewId, MAX_TOOLS_PER_VIEW } from '../lib/sidebarViews'
import { getTrack, setTrack, TRACKS, TRACK_TO_VIEW, TRACK_EVENT } from '../lib/track'
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
    { name: 'Get Started', icon: LayoutGrid, to: '/get-started', match: ['/get-started'], tier: 'free' },
    { name: 'Growth Challenge', icon: Rocket, to: '/growth-challenge', match: ['/growth-challenge'], tier: 'free' },
    { name: 'Messages', icon: MessageCircle, to: '/messages', match: ['/messages'], tier: 'free' },
  ] },
  { label: 'Find work', items: [
    { name: 'WARDOG', icon: Radar, to: '/wardog', match: ['/wardog'], tier: 'free' },
    { name: 'Inbox', icon: Mail, to: '/inbox', match: ['/inbox'], tier: 'locked' },
  ] },
  { label: 'Bid', items: [
    { name: 'R-E-A-D', icon: ClipboardCheck, to: '/read', match: ['/read'], tier: 'free' },
    { name: 'Estimator', icon: Calculator, to: '/estimator', match: ['/estimator'], tier: 'locked' },
    { name: 'FASS FILL', icon: ClipboardList, to: '/fill', match: ['/fill'], tier: 'gated' },
    { name: 'Proposal Editor', icon: PenSquare, to: '/proposal-editor', match: ['/proposal-editor'], tier: 'gated' },
    { name: 'Templates', icon: LayoutGrid, to: '/templates', match: ['/templates'], tier: 'gated' },
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
    { name: 'Feed', icon: Newspaper, to: '/feed', match: ['/feed'], tier: 'free' },
    { name: 'Affiliates', icon: Award, to: '/affiliates/dashboard', match: ['/affiliates'], tier: 'free' },
    { name: 'Network', icon: Network, to: '/network', match: ['/network'], tier: 'locked' },
    { name: 'Funding', icon: DollarSign, to: '/money', match: ['/money'], tier: 'locked' },
    { name: 'BD Partner', icon: Handshake, to: '/bd-partner', match: ['/bd-partner'], tier: 'locked' },
    { name: 'Team Up', icon: Users, to: '/teamup', match: ['/teamup'], tier: 'free' },
    { name: 'Rewards', icon: Stamp, to: '/rewards', match: ['/rewards'], tier: 'free' },
    { name: 'Wallet Messaging', icon: Megaphone, to: '/campaigns', match: ['/campaigns'], tier: 'free' },
    { name: 'Gift Cards', icon: Gift, to: '/giftcards', match: ['/giftcards'], tier: 'free' },
  ] },
  { label: 'Learn', items: [
    { name: 'Classroom', icon: BookOpen, to: '/classroom', match: ['/classroom', '/masterclass'], tier: 'locked' },
    { name: 'My Notebook', icon: Sparkles, to: '/notebook', match: ['/notebook'], tier: 'locked' },
    { name: 'Glossary', icon: GraduationCap, to: '/glossary', match: ['/glossary'], tier: 'free' },
  ] },
  { label: 'Account', items: [
    { name: 'Passport', icon: IdCard, to: '/passport', match: ['/passport'], tier: 'free' },
    { name: 'Wallet', icon: Wallet, to: '/wallet', match: ['/wallet'], tier: 'free' },
    { name: 'Payouts', icon: Landmark, to: '/payouts', match: ['/payouts'], tier: 'free' },
    { name: 'Support', icon: LifeBuoy, to: '/support', match: ['/support'], tier: 'free' },
    { name: 'Settings', icon: SettingsIcon, to: '/settings', match: ['/settings'], tier: 'free' },
  ] },
]

// Flat lookup so a view's stored tool-names resolve back to renderable items.
const ALL_ITEMS = NAV_GROUPS.flatMap(g => g.items)
const ITEM_BY_NAME = Object.fromEntries(ALL_ITEMS.map(i => [i.name, i]))

const PLAN_LABELS = {
  lite: 'Lite',
  starter: 'Core',
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

  // Sidebar custom views (localStorage). editingView holds a view id while
  // its add/remove/rename editor is open.
  const [cfg, setCfg] = useState(() => loadSidebarConfig())
  const [editingView, setEditingView] = useState(null)
  useEffect(() => { saveSidebarConfig(cfg) }, [cfg])

  // The user's track is the source of truth. Switching it (here or from the
  // dashboard/onboarding) flips the sidebar view to match. One listener keeps
  // every surface in sync without prop-drilling.
  const [track, setTrackState] = useState(() => getTrack())
  useEffect(() => {
    const onChange = e => {
      const id = e.detail || getTrack()
      setTrackState(id)
      setCfg(c => ({ ...c, activeView: TRACK_TO_VIEW[id] || c.activeView }))
    }
    window.addEventListener(TRACK_EVENT, onChange)
    return () => window.removeEventListener(TRACK_EVENT, onChange)
  }, [])

  // Close the mobile drawer whenever the route changes.
  useEffect(() => { setMenuOpen(false) }, [location.pathname])

  const inWorkspace = location.pathname.startsWith('/opportunity')
  const FOCUSED_GROUP_LABELS = ['Find work', 'Bid']

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
  const isFreeTier = !isActive

  // ── view config helpers ──
  const compact = cfg.compact && !menuOpen   // compact only on the docked desktop rail
  const activeView = cfg.views.find(v => v.id === cfg.activeView) || null
  const setActiveView = id => setCfg(c => ({ ...c, activeView: id }))
  const toggleCompact = () => setCfg(c => ({ ...c, compact: !c.compact }))

  function renameView(id, name) {
    setCfg(c => ({ ...c, views: c.views.map(v => v.id === id ? { ...v, name } : v) }))
  }
  function toggleToolInView(id, toolName) {
    setCfg(c => ({
      ...c,
      views: c.views.map(v => {
        if (v.id !== id) return v
        const has = v.tools.includes(toolName)
        if (has) return { ...v, tools: v.tools.filter(t => t !== toolName) }
        if (v.tools.length >= MAX_TOOLS_PER_VIEW) return v // cap at 7
        return { ...v, tools: [...v.tools, toolName] }
      }),
    }))
  }
  function createView() {
    const id = newViewId()
    setCfg(c => ({ ...c, views: [...c.views, { id, name: 'New view', tools: [] }], activeView: id }))
    setEditingView(id)
  }
  function deleteView(id) {
    setCfg(c => ({
      ...c,
      views: c.views.filter(v => v.id !== id),
      activeView: c.activeView === id ? 'all' : c.activeView,
    }))
    setEditingView(null)
  }

  // Shared item renderer — used by both the grouped "All" nav and a custom
  // view's flat list, so lock behavior and active state stay identical.
  function renderItem(item) {
    const active = item.match.some(p => location.pathname.startsWith(p))
    const Icon = item.icon
    const locked = isFreeTier && ((item.tier === 'gated' && !hasReadPass) || item.tier === 'locked')
    if (locked) {
      return (
        <button
          key={item.name}
          type="button"
          className="shell-nav-item shell-nav-locked"
          onClick={() => navigate('/pricing')}
          title={item.name + ' — unlocks on a paid plan'}
        >
          <Icon size={16} />
          <span className="shell-nav-text">{item.name}</span>
          <Lock size={12} className="shell-nav-lock" />
        </button>
      )
    }
    return (
      <Link
        key={item.name}
        to={item.to}
        className={`shell-nav-item ${active ? 'shell-nav-active' : ''}`}
        title={item.name}
      >
        <Icon size={16} />
        <span className="shell-nav-text">{item.name}</span>
      </Link>
    )
  }

  const editingObj = editingView ? cfg.views.find(v => v.id === editingView) : null

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

      <aside className={`shell-sidebar ${menuOpen ? 'shell-open' : ''} ${compact ? 'shell-compact' : ''}`}>
        <div className="shell-side-top">
          <Link to="/dashboard" className="shell-logo">
            <span className="shell-logo-icon">⬡</span>
            <span className="shell-nav-text">FASS <strong>Flow</strong></span>
          </Link>
          <button className="shell-compact-toggle" onClick={toggleCompact} aria-label="Toggle compact sidebar" title="Compact / expand">
            <PanelLeft size={16} />
          </button>
          <button className="shell-closemenu" onClick={() => setMenuOpen(false)} aria-label="Close menu">
            <X size={18} />
          </button>
        </div>

        {/* Track switcher — the user's business identity; switching it flips
            the view + guided path + AI framing in one move. */}
        {!compact && (
          <div className="shell-track">
            <span className="shell-track-label">Track</span>
            <select className="shell-track-select" value={track} onChange={e => setTrack(e.target.value)}>
              {TRACKS.map(t => <option key={t.id} value={t.id}>{t.short}</option>)}
            </select>
          </div>
        )}

        {/* View switcher — hidden in compact rail (no room for chips) */}
        {!compact && (
          <div className="shell-views">
            <button className={`shell-view-chip ${cfg.activeView === 'all' ? 'is-active' : ''}`} onClick={() => setActiveView('all')}>All</button>
            {cfg.views.map(v => (
              <button key={v.id} className={`shell-view-chip ${cfg.activeView === v.id ? 'is-active' : ''}`} onClick={() => setActiveView(v.id)}>{v.name}</button>
            ))}
            <button className="shell-view-chip shell-view-add" onClick={createView} title="New view"><Plus size={13} /></button>
          </div>
        )}

        {/* View editor (rename + add/remove tools, max 7) */}
        {editingObj && !compact ? (
          <div className="shell-vieweditor">
            <input
              className="shell-view-name"
              value={editingObj.name}
              onChange={e => renameView(editingObj.id, e.target.value)}
              placeholder="View name"
            />
            <div className="shell-view-count">{editingObj.tools.length}/{MAX_TOOLS_PER_VIEW} tools</div>
            <div className="shell-view-tools">
              {ALL_ITEMS.map(item => {
                const inView = editingObj.tools.includes(item.name)
                const full = editingObj.tools.length >= MAX_TOOLS_PER_VIEW && !inView
                const Icon = item.icon
                return (
                  <button
                    key={item.name}
                    className={`shell-view-tool ${inView ? 'is-in' : ''}`}
                    onClick={() => toggleToolInView(editingObj.id, item.name)}
                    disabled={full}
                    title={full ? 'View is full (7 max)' : item.name}
                  >
                    <Icon size={14} />
                    <span>{item.name}</span>
                    {inView ? <Check size={13} /> : <Plus size={13} />}
                  </button>
                )
              })}
            </div>
            <div className="shell-view-editactions">
              <button className="shell-view-del" onClick={() => deleteView(editingObj.id)}><Trash2 size={13} /> Delete view</button>
              <button className="shell-view-done" onClick={() => setEditingView(null)}>Done</button>
            </div>
          </div>
        ) : (
          <nav className="shell-nav">
            {cfg.activeView !== 'all' && activeView ? (
              // ── Custom view: flat list of the chosen tools ──
              <div className="shell-navgroup">
                <span className="shell-navgroup-label shell-view-headerlabel">
                  {activeView.name}
                  {!compact && (
                    <button className="shell-view-edit" onClick={() => setEditingView(activeView.id)} title="Edit this view"><Pencil size={12} /></button>
                  )}
                </span>
                {activeView.tools.map(name => ITEM_BY_NAME[name]).filter(Boolean).map(renderItem)}
                {activeView.tools.length === 0 && !compact && (
                  <button className="shell-view-empty" onClick={() => setEditingView(activeView.id)}>＋ Add tools to this view</button>
                )}
                {!compact && (
                  <button className="shell-view-showall" onClick={() => setActiveView('all')}>Show all tools →</button>
                )}
              </div>
            ) : (
              // ── All: the full grouped nav (original behavior) ──
              <>
                {NAV_GROUPS.map((group, gi) => {
                  const visibleItems = isFreeTier
                    ? group.items.filter(item => item.tier !== 'locked')
                    : group.items
                  if (!visibleItems.length) return null
                  const dimmed = inWorkspace && !FOCUSED_GROUP_LABELS.includes(group.label)
                  return (
                    <div className={`shell-navgroup ${dimmed ? 'shell-navgroup-dimmed' : ''}`} key={gi}>
                      {group.label && <span className="shell-navgroup-label">{group.label}</span>}
                      {visibleItems.map(renderItem)}
                    </div>
                  )
                })}

                {isFreeTier && !compact && (() => {
                  const lockedItems = ALL_ITEMS.filter(item => item.tier === 'locked')
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
                            <span className="shell-nav-text">{item.name}</span>
                            <Lock size={12} className="shell-nav-lock" />
                          </button>
                        )
                      })}
                    </div>
                  )
                })()}
              </>
            )}
          </nav>
        )}

        <div className="shell-user">
          {profile && (
            <span className={`shell-plan-badge ${isActive ? 'plan-active' : 'plan-inactive'}`}>
              {PLAN_LABELS[plan] || plan || 'No plan'} · {isActive ? 'Active' : status || 'inactive'}
            </span>
          )}
          <span className="shell-email shell-nav-text" title={email}>{email}</span>
          <button className="shell-signout" onClick={handleSignOut} title="Sign out">
            <LogOut size={14} /> <span className="shell-nav-text">Sign out</span>
          </button>
        </div>
      </aside>

      <div className="shell-content">
        <TopBar items={ALL_ITEMS} userId={userId} />
        {children}
      </div>

      {/* AlertsBell now lives in the TopBar as the inline health light. */}
      {!location.pathname.startsWith('/messages') && <ChatDock userId={userId} />}
      <BottomNav userId={userId} />
      <InstallPrompt />
    </div>
  )
}
