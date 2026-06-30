import { useState, useRef, useEffect } from 'react'
import { useNavigate, useLocation, Link } from 'react-router-dom'
import { Search, LayoutGrid, Compass, CornerDownLeft, Plus, ChevronDown, LayoutTemplate, ClipboardCheck, ClipboardList, Send, Radar } from 'lucide-react'
import AlertsBell from './AlertsBell'
import { getTrack, TRACK_EVENT } from '../lib/track'
import { fetchTrackSignals, progressFor, loadManual } from '../lib/trackProgress'
import './TopBar.css'

// High-frequency "create" actions, reachable from anywhere without hunting
// the sidebar. They route into the relevant workflow's start.
const QUICK_ACTIONS = [
  { icon: LayoutTemplate, label: 'New proposal from template', to: '/templates' },
  { icon: ClipboardCheck, label: 'Score a solicitation (R-E-A-D)', to: '/read' },
  { icon: ClipboardList, label: 'Build a response (FASS FILL)', to: '/fill' },
  { icon: Send, label: 'New client proposal', to: '/proposals' },
  { icon: Radar, label: 'Find work in WARDOG', to: '/wardog' },
]

// Persistent orientation strip on every signed-in page. Tells you where you
// are and lets you jump to any of the 30+ tools by typing — the antidote to
// "lost in the sauce" navigation. `items` is AppShell's flat tool list.
// `affiliateOnly` suppresses every GovCon-specific affordance (quick-create
// menu, Zero-to-Hero guided-track progress, Get Started/Dashboard links) for
// profiles.is_affiliate_only accounts, which have no use for any of them.
export default function TopBar({ items = [], userId, affiliateOnly = false }) {
  const navigate = useNavigate()
  const location = useLocation()
  const [progress, setProgress] = useState(null)

  // Guided-track progress for the Zero-to-Hero bar + mobile next-step button.
  // Recompute on mount and whenever the track is switched.
  useEffect(() => {
    if (!userId || affiliateOnly) return
    let cancelled = false
    async function recompute() {
      const signals = await fetchTrackSignals(userId)
      if (!cancelled) setProgress(progressFor(getTrack(), signals, loadManual()))
    }
    recompute()
    const onChange = () => recompute()
    window.addEventListener(TRACK_EVENT, onChange)
    return () => { cancelled = true; window.removeEventListener(TRACK_EVENT, onChange) }
  }, [userId, affiliateOnly])
  const [q, setQ] = useState('')
  const [open, setOpen] = useState(false)
  const [actionsOpen, setActionsOpen] = useState(false)
  const wrapRef = useRef(null)
  const inputRef = useRef(null)
  const actionsRef = useRef(null)

  // ⌘K / Ctrl-K focuses the jump search from anywhere.
  useEffect(() => {
    function onKey(e) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        inputRef.current?.focus()
        setOpen(true)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  // Current location label, matched off the same route patterns the sidebar uses.
  const current = items.find(i => i.match?.some(p => location.pathname.startsWith(p)))

  // A regular (non-affiliate-only) customer can still browse into /affiliates/*
  // — e.g. checking their own creator dashboard. The GovCon "Next:" nudge and
  // quick-create menu are scoped to the bid workflow and make no sense there
  // ("Next: Score it with R-E-A-D" while looking at referral stats), so this
  // is suppressed by ROUTE, distinct from `affiliateOnly` which suppresses by
  // ACCOUNT TYPE everywhere. Get Started/Dashboard links stay — they're how
  // this user gets back to the main product from the affiliate area. The
  // ?from=affiliates marker covers the shared Settings/Support pages opened
  // from inside the hub, so the nudge stays hidden there too.
  const onAffiliatePage =
    location.pathname.startsWith('/affiliates') ||
    new URLSearchParams(location.search).get('from') === 'affiliates'

  const query = q.trim().toLowerCase()
  const results = query
    ? items.filter(i => i.name.toLowerCase().includes(query)).slice(0, 8)
    : []

  // Close dropdowns on outside click.
  useEffect(() => {
    function onDoc(e) {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false)
      if (actionsRef.current && !actionsRef.current.contains(e.target)) setActionsOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [])

  function go(item) {
    setQ(''); setOpen(false)
    navigate(item.to)
  }
  function onKeyDown(e) {
    if (e.key === 'Enter' && results.length) { e.preventDefault(); go(results[0]) }
    if (e.key === 'Escape') { setQ(''); setOpen(false) }
  }

  return (
    <div className="topbar">
      <div className="topbar-loc">
        {current ? <current.icon size={15} /> : <Compass size={15} />}
        <span>{current ? current.name : 'FASS Flow'}</span>
      </div>

      {!affiliateOnly && !onAffiliatePage && progress && !progress.allDone && progress.next && (
        <Link to={progress.next.href} className="topbar-next" title={`${progress.doneCount}/${progress.total} · Next: ${progress.next.title}`}>
          <span className="topbar-next-bar"><span className="topbar-next-fill" style={{ width: `${progress.pct}%` }} /></span>
          <span className="topbar-next-label"><b>Next:</b> {progress.next.title}</span>
        </Link>
      )}

      <div className="topbar-search" ref={wrapRef}>
        <Search size={15} className="topbar-search-icon" />
        <input
          ref={inputRef}
          value={q}
          onChange={e => { setQ(e.target.value); setOpen(true) }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          placeholder="Jump to any tool — type to search…"
        />
        {!q && <span className="topbar-kbd">⌘K</span>}
        {open && results.length > 0 && (
          <div className="topbar-results">
            {results.map((item, i) => (
              <button key={item.name} className="topbar-result" onClick={() => go(item)}>
                <item.icon size={15} />
                <span>{item.name}</span>
                {i === 0 && <span className="topbar-enter"><CornerDownLeft size={12} /> enter</span>}
              </button>
            ))}
          </div>
        )}
        {open && query && results.length === 0 && (
          <div className="topbar-results"><span className="topbar-empty">No tool matches "{q}"</span></div>
        )}
      </div>

      <div className="topbar-quick">
        {!affiliateOnly && !onAffiliatePage && (
          <div className="topbar-actions" ref={actionsRef}>
            <button className="topbar-new" onClick={() => setActionsOpen(o => !o)} title="Quick create">
              <Plus size={15} /> New <ChevronDown size={13} />
            </button>
            {actionsOpen && (
              <div className="topbar-actions-menu">
                {QUICK_ACTIONS.map(a => (
                  <button key={a.to} className="topbar-action" onClick={() => { setActionsOpen(false); navigate(a.to) }}>
                    <a.icon size={15} /> {a.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
        {!affiliateOnly && (
          <>
            <Link to="/get-started" className="topbar-quick-btn" title="Get Started — the map of everything"><LayoutGrid size={15} /> Get Started</Link>
            <Link to="/dashboard" className="topbar-quick-btn topbar-quick-icon" title="Dashboard"><Compass size={16} /></Link>
          </>
        )}
        {!affiliateOnly && <AlertsBell inline />}
      </div>
    </div>
  )
}
