import { useState, useRef, useEffect } from 'react'
import { useNavigate, useLocation, Link } from 'react-router-dom'
import { Search, LayoutGrid, Compass, CornerDownLeft, Plus, ChevronDown, LayoutTemplate, ClipboardCheck, ClipboardList, Send, Radar } from 'lucide-react'
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
export default function TopBar({ items = [] }) {
  const navigate = useNavigate()
  const location = useLocation()
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
        <Link to="/get-started" className="topbar-quick-btn" title="Get Started — the map of everything"><LayoutGrid size={15} /> Get Started</Link>
        <Link to="/dashboard" className="topbar-quick-btn topbar-quick-icon" title="Dashboard"><Compass size={16} /></Link>
      </div>
    </div>
  )
}
