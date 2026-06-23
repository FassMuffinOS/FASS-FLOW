import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Compass, MessageSquareText, FileOutput, Send, Trophy } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'
import './FunnelTracker.css'

// Most govcon tools stop at "here's a list of bids." This is the thing
// they don't show you: how far you actually got — from finding a
// solicitation, to working it, to producing a real capability statement
// / compliance output, to submitting, to winning. Every stage pulls from
// data the app already has — nothing new to maintain.
const STAGES = [
  { id: 'sourced', icon: Compass, label: 'Solicitations sourced', href: '/wardog' },
  { id: 'responding', icon: MessageSquareText, label: 'Responding', href: '/pipeline' },
  { id: 'output', icon: FileOutput, label: 'Capability statement output', href: '/fill' },
  { id: 'submitted', icon: Send, label: 'Submitted', href: '/pipeline' },
  { id: 'awarded', icon: Trophy, label: 'Awarded', href: '/pipeline' },
]

export default function FunnelTracker() {
  const { session } = useAuth()
  const navigate = useNavigate()
  const [counts, setCounts] = useState(null)

  useEffect(() => {
    if (!session?.user?.id) return
    let cancelled = false
    async function load() {
      const uid = session.user.id
      const [oppRes, propRes, docRes] = await Promise.all([
        supabase.from('opportunities').select('id', { count: 'exact', head: true }).eq('user_id', uid),
        supabase.from('proposals').select('stage').eq('user_id', uid),
        supabase.from('fass_fill_documents').select('id', { count: 'exact', head: true }).eq('user_id', uid),
      ])
      if (cancelled) return
      const stages = (propRes.data || []).map(p => p.stage)
      setCounts({
        sourced: oppRes.count || 0,
        responding: stages.filter(s => s === 'flagged' || s === 'scored' || s === 'pursuing').length,
        output: docRes.count || 0,
        submitted: stages.filter(s => s === 'submitted' || s === 'awarded').length,
        awarded: stages.filter(s => s === 'awarded').length,
      })
    }
    load()
    return () => { cancelled = true }
  }, [session?.user?.id])

  if (!counts) return null

  const max = Math.max(1, ...STAGES.map(s => counts[s.id]))

  return (
    <div className="ft">
      <div className="ft-header">
        <span>Solicitation → output tracker</span>
        <span className="ft-header-sub">Where your pipeline actually stands, end to end</span>
      </div>
      <div className="ft-row">
        {STAGES.map((s, i) => {
          const Icon = s.icon
          const val = counts[s.id]
          const pct = Math.max(6, Math.round((val / max) * 100))
          return (
            <div key={s.id} className="ft-stage" onClick={() => navigate(s.href)}>
              <div className="ft-stage-top">
                <Icon size={14} className="ft-stage-icon" />
                <span className="ft-stage-count">{val}</span>
              </div>
              <div className="ft-bar-track">
                <div className="ft-bar-fill" style={{ width: `${pct}%` }} />
              </div>
              <span className="ft-stage-label">{s.label}</span>
              {i < STAGES.length - 1 && <span className="ft-arrow">→</span>}
            </div>
          )
        })}
      </div>
    </div>
  )
}
