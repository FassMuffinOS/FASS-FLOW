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
        supabase.from('proposals').select('stage, estimated_value').eq('user_id', uid),
        supabase.from('fass_fill_documents').select('id', { count: 'exact', head: true }).eq('user_id', uid),
      ])
      if (cancelled) return
      const props = propRes.data || []
      const stages = props.map(p => p.stage)
      const sumVal = list => list.reduce((acc, p) => acc + (Number(p.estimated_value) || 0), 0)
      // Every proposal in the pipeline was, by definition, sourced from
      // somewhere — even rows created before WARDOG started writing to the
      // `opportunities` table. Floor "sourced" at the proposal count so the
      // funnel can never show downstream stages outrunning the top of the
      // funnel (e.g. "Sourced: 0" next to "Responding: 2").
      setCounts({
        sourced: Math.max(oppRes.count || 0, props.length),
        responding: stages.filter(s => s === 'flagged' || s === 'scored' || s === 'pursuing').length,
        output: docRes.count || 0,
        submitted: stages.filter(s => s === 'submitted' || s === 'awarded').length,
        awarded: stages.filter(s => s === 'awarded').length,
        // ⭐ North Star: dollars won. Plus what's still in motion.
        wonValue: sumVal(props.filter(p => p.stage === 'awarded')),
        pipelineValue: sumVal(props.filter(p => !['awarded', 'passed'].includes(p.stage))),
      })
    }
    load()
    return () => { cancelled = true }
  }, [session?.user?.id])

  if (!counts) return null

  const max = Math.max(1, ...STAGES.map(s => counts[s.id]))
  const money = v => Number(v || 0).toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })

  return (
    <div className="ft">
      {/* ⭐ North Star — dollars won by you, the one number that matters */}
      <div className="ft-northstar" onClick={() => navigate('/awarded')}>
        <div className="ft-ns-main">
          <span className="ft-ns-label">Contract dollars won</span>
          <span className="ft-ns-value">{money(counts.wonValue)}</span>
        </div>
        <div className="ft-ns-side">
          <span className="ft-ns-side-value">{money(counts.pipelineValue)}</span>
          <span className="ft-ns-side-label">in open pipeline</span>
        </div>
      </div>

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
