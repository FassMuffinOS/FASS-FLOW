import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'
import { Bell, X, Clock, Flag, Compass, CheckCircle2 } from 'lucide-react'
import './AlertsBell.css'

const API_BASE = import.meta.env.VITE_API_URL || ''

function daysLeft(str) {
  return Math.ceil((new Date(str) - new Date()) / 86400000)
}

// Floating in-app alerts. Surfaces the things a contractor can't afford to
// miss — bids closing soon, milestones due/overdue — plus a personalized
// "new opportunities match your NAICS" nudge from the live feed. Computed on
// load from the user's own data, so it works with no email setup.
export default function AlertsBell({ inline = false }) {
  const { session } = useAuth()
  const navigate = useNavigate()
  const userId = session?.user?.id
  const [alerts, setAlerts] = useState([])
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (!userId) return
    let cancelled = false

    async function load() {
      const list = []
      const horizon = new Date(Date.now() + 7 * 86400000).toISOString()

      // Bids closing within 7 days (still in motion).
      const { data: props } = await supabase
        .from('proposals')
        .select('id, title, due_date, stage')
        .eq('user_id', userId)
        .not('due_date', 'is', null)
        .lte('due_date', horizon)
        .order('due_date', { ascending: true })
      for (const p of props || []) {
        if (['awarded', 'passed'].includes(p.stage)) continue
        const d = daysLeft(p.due_date)
        if (d < 0) continue
        list.push({
          id: 'bid-' + p.id, kind: 'deadline',
          title: p.title,
          detail: d <= 0 ? 'closes today' : `closes in ${d}d`,
          urgent: d <= 3, href: '/pipeline',
        })
      }

      // Witness milestones due/overdue.
      try {
        const { data: ms } = await supabase
          .from('witness_milestones')
          .select('id, title, due_date, status')
          .eq('user_id', userId)
          .not('due_date', 'is', null)
          .lte('due_date', horizon)
          .order('due_date', { ascending: true })
        for (const m of ms || []) {
          if (['done', 'complete', 'completed'].includes((m.status || '').toLowerCase())) continue
          const d = daysLeft(m.due_date)
          list.push({
            id: 'ms-' + m.id, kind: d < 0 ? 'overdue' : 'milestone',
            title: m.title,
            detail: d < 0 ? `overdue ${-d}d` : (d === 0 ? 'due today' : `due in ${d}d`),
            urgent: d <= 2, href: '/witness',
          })
        }
      } catch { /* witness table optional */ }

      // Personalized: opportunities matching the user's NAICS (live feed).
      try {
        const { data: prof } = await supabase
          .from('profiles').select('naics_codes').eq('id', userId).single()
        const naics = Array.isArray(prof?.naics_codes) ? prof.naics_codes[0] : ''
        if (API_BASE && naics) {
          const res = await fetch(`${API_BASE}/api/v1/wardog/search?limit=20&naics=${encodeURIComponent(naics)}&state=`)
          if (res.ok) {
            const data = await res.json()
            const n = (data.opportunities || []).length
            if (n > 0) list.unshift({
              id: 'opps', kind: 'match',
              title: `${n} open ${n === 1 ? 'opportunity matches' : 'opportunities match'} your NAICS`,
              detail: `NAICS ${naics} · tap to review in WARDOG`,
              urgent: false, href: '/wardog',
            })
          }
        }
      } catch { /* feed optional */ }

      if (!cancelled) setAlerts(list)
    }

    load()
    return () => { cancelled = true }
  }, [userId])

  const urgentCount = alerts.filter(a => a.urgent || a.kind === 'overdue').length
  const count = alerts.length
  // Health: red = something urgent/overdue, amber = items but nothing urgent,
  // green = all clear.
  const level = urgentCount > 0 ? 'red' : count > 0 ? 'amber' : 'green'

  function go(href) { setOpen(false); navigate(href) }

  const iconFor = k =>
    k === 'match' ? <Compass size={15} />
    : k === 'overdue' ? <Flag size={15} />
    : <Clock size={15} />

  return (
    <>
      {inline ? (
        <button
          className={`ab-inline ab-inline-${level}`}
          onClick={() => setOpen(o => !o)}
          aria-label="Alerts and status"
          title={count === 0 ? 'All clear' : `${count} item${count === 1 ? '' : 's'} need attention`}
        >
          <span className={`ab-dot ab-dot-${level}`} />
          <Bell size={15} />
          {count > 0 && <span className="ab-inline-count">{count > 9 ? '9+' : count}</span>}
        </button>
      ) : (
        <button
          className={`ab-bell ${urgentCount ? 'ab-bell-urgent' : ''}`}
          onClick={() => setOpen(o => !o)}
          aria-label="Alerts"
        >
          <Bell size={20} />
          {count > 0 && <span className="ab-badge">{count > 9 ? '9+' : count}</span>}
        </button>
      )}

      {open && (
        <>
          <div className="ab-scrim" onClick={() => setOpen(false)} />
          <div className={`ab-panel ${inline ? 'ab-panel-top' : ''}`}>
            <div className="ab-head">
              <span>Alerts {count > 0 && <em>· {count}</em>}</span>
              <button className="ab-close" onClick={() => setOpen(false)}><X size={16} /></button>
            </div>
            {count === 0 ? (
              <div className="ab-empty">
                <CheckCircle2 size={22} />
                <p>You're all caught up — no deadlines or matches need you right now.</p>
              </div>
            ) : (
              <ul className="ab-list">
                {alerts.map(a => (
                  <li key={a.id}>
                    <button className={`ab-item ${a.urgent || a.kind === 'overdue' ? 'ab-item-urgent' : ''}`} onClick={() => go(a.href)}>
                      <span className="ab-item-icon">{iconFor(a.kind)}</span>
                      <span className="ab-item-body">
                        <span className="ab-item-title">{a.title}</span>
                        <span className="ab-item-detail">{a.detail}</span>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </>
      )}
    </>
  )
}
