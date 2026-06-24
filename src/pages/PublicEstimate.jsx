import { useState, useEffect, useRef } from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { Check, CheckCircle2, Loader } from 'lucide-react'
import { defaultSelections, computeTotal, money, fmtDelta } from '../lib/estimateTotal'
import './PublicEstimate.css'

export default function PublicEstimate() {
  const { token } = useParams()
  const [est, setEst] = useState(null)
  const [selections, setSelections] = useState({})
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [approved, setApproved] = useState(false)
  const [saving, setSaving] = useState(false)
  const saveTimer = useRef(null)

  useEffect(() => {
    let cancelled = false
    async function load() {
      const { data, error } = await supabase.rpc('get_client_estimate', { p_token: token })
      if (cancelled) return
      const row = Array.isArray(data) ? data[0] : data
      if (error || !row) { setNotFound(true); setLoading(false); return }
      setEst(row)
      const hasSel = row.selections && Object.keys(row.selections).length > 0
      setSelections(hasSel ? row.selections : defaultSelections(row.sections || []))
      setApproved(row.status === 'approved')
      setLoading(false)
    }
    load()
    return () => { cancelled = true }
  }, [token])

  // Persist selections (debounced) so the sender sees choices in real time.
  function persist(next, approve = false) {
    clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(() => {
      supabase.rpc('save_client_selection', { p_token: token, p_selections: next, p_approve: approve })
    }, approve ? 0 : 600)
  }

  function pick(secId, optId) {
    if (approved) return
    const next = { ...selections, [secId]: optId }
    setSelections(next)
    persist(next)
  }

  function toggleAddon(secId, optId) {
    if (approved) return
    const cur = Array.isArray(selections[secId]) ? selections[secId] : []
    const nextArr = cur.includes(optId) ? cur.filter(x => x !== optId) : [...cur, optId]
    const next = { ...selections, [secId]: nextArr }
    setSelections(next)
    persist(next)
  }

  async function approve() {
    setSaving(true)
    await supabase.rpc('save_client_selection', { p_token: token, p_selections: selections, p_approve: true })
    setSaving(false)
    setApproved(true)
  }

  if (loading) return <div className="pe-state"><Loader className="pe-spin" /> Loading your estimate…</div>
  if (notFound) return <div className="pe-state">This estimate link is invalid or has been removed.</div>

  const total = computeTotal(est.base_total, est.sections, selections)

  return (
    <div className="pe">
      <div className="pe-wrap">
        <div className="pe-head">
          {est.company_name && <p className="pe-from">Estimate from {est.company_name}</p>}
          <h1 className="pe-title">{est.title}</h1>
          {est.intro && <p className="pe-intro">{est.intro}</p>}
        </div>

        {approved && (
          <div className="pe-approved-banner">
            <CheckCircle2 size={18} /> Selections approved — {est.company_name || 'the sender'} has been notified.
          </div>
        )}

        {(est.sections || []).map(sec => (
          <div className="pe-section" key={sec.id}>
            <p className="pe-section-label">{sec.label}</p>
            {sec.sublabel && <p className="pe-section-sub">{sec.sublabel}</p>}

            {sec.kind === 'addons' ? (
              <div className="pe-addons">
                {(sec.options || []).map(o => {
                  const inc = (selections[sec.id] || []).includes(o.id)
                  return (
                    <button key={o.id} className={`pe-addon ${inc ? 'on' : ''}`} onClick={() => toggleAddon(sec.id, o.id)} disabled={approved}>
                      <span className="pe-addon-check">{inc && <Check size={14} />}</span>
                      <span className="pe-addon-name">{o.name}</span>
                      <span className="pe-addon-delta">{fmtDelta(o.delta)}</span>
                    </button>
                  )
                })}
              </div>
            ) : (
              <div className="pe-options">
                {(sec.options || []).map(o => {
                  const sel = selections[sec.id] === o.id
                  return (
                    <button key={o.id} className={`pe-option ${sel ? 'sel' : ''}`} onClick={() => pick(sec.id, o.id)} disabled={approved}>
                      {o.badge && <span className="pe-option-badge">{o.badge}</span>}
                      <span className="pe-option-name">{o.name}{sel && <Check size={14} />}</span>
                      {o.note && <span className="pe-option-note">{o.note}</span>}
                      <span className="pe-option-delta">{fmtDelta(o.delta)}</span>
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        ))}

        <div className="pe-total">
          <div>
            <p className="pe-total-label">Your total · updates live</p>
            <p className="pe-total-value">{money(total)}</p>
          </div>
          {approved ? (
            <span className="pe-approved-tag"><Check size={16} /> Approved</span>
          ) : (
            <button className="pe-approve" onClick={approve} disabled={saving}>
              {saving ? 'Submitting…' : 'Approve selections →'}
            </button>
          )}
        </div>

        <p className="pe-foot">Powered by FASS Flow</p>
      </div>
    </div>
  )
}
