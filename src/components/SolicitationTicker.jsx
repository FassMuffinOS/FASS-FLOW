import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'
import './SolicitationTicker.css'

const API_BASE = import.meta.env.VITE_API_URL || ''

function daysLeft(str) {
  if (!str) return null
  return Math.ceil((new Date(str) - new Date()) / 86400000)
}

// Bloomberg-style scrolling ticker of live solicitations. Pulls the same
// WARDOG/SAM.gov feed the WARDOG page uses; if the backend isn't reachable
// or the feed is empty, it falls back to the user's own pipeline so the
// ticker is never blank.
export default function SolicitationTicker() {
  const { session } = useAuth()
  const navigate = useNavigate()
  const [items, setItems] = useState([])
  const [live, setLive] = useState(false)

  useEffect(() => {
    let cancelled = false

    async function load() {
      // 1) Try the live SAM.gov feed.
      if (API_BASE) {
        try {
          const params = new URLSearchParams({ limit: '20', naics: '', state: '' })
          const res = await fetch(`${API_BASE}/api/v1/wardog/search?${params}`)
          if (res.ok) {
            const data = await res.json()
            const opps = (data.opportunities || []).slice(0, 20).map(o => ({
              id: o.noticeId,
              title: o.title,
              agency: o.fullParentPathName || o.department || '',
              naics: o.naicsCode || '',
              due: daysLeft(o.responseDeadLine),
            }))
            if (!cancelled && opps.length) { setItems(opps); setLive(true); return }
          }
        } catch { /* fall through to pipeline */ }
      }

      // 2) Fallback — the user's own pipeline.
      if (session?.user?.id) {
        const { data } = await supabase
          .from('proposals')
          .select('id, title, agency, naics_code, due_date')
          .eq('user_id', session.user.id)
          .order('created_at', { ascending: false })
          .limit(20)
        if (!cancelled) {
          setItems((data || []).map(p => ({
            id: p.id, title: p.title, agency: p.agency || '',
            naics: p.naics_code || '', due: daysLeft(p.due_date),
          })))
          setLive(false)
        }
      }
    }

    load()
    return () => { cancelled = true }
  }, [session?.user?.id])

  if (!items.length) return null

  const row = [...items, ...items] // duplicated for a seamless loop

  return (
    <div className="tk" onClick={() => navigate('/wardog')} title="Open WARDOG">
      <span className="tk-tag">
        <span className="tk-live-dot" />
        {live ? 'LIVE · SAM.gov' : 'PIPELINE'}
      </span>
      <div className="tk-viewport">
        <div
          className="tk-track"
          style={{ animationDuration: `${Math.max(90, items.length * 12)}s` }}
        >
          {row.map((it, i) => (
            <span className="tk-item" key={i}>
              <span className="tk-bull" />
              <span className="tk-title">{it.title}</span>
              {it.agency && <span className="tk-sub">{it.agency}</span>}
              {it.naics && <span className="tk-naics">NAICS {it.naics}</span>}
              {it.due != null && (
                <span className={`tk-due ${it.due <= 5 ? 'tk-due-urgent' : ''}`}>
                  {it.due <= 0 ? 'closing' : `${it.due}d`}
                </span>
              )}
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}
