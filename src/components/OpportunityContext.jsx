import { useEffect, useState } from 'react'
import { Calendar, FileText, Camera, HardHat, Users, FlaskConical, ArrowRight } from 'lucide-react'
import { supabase } from '../lib/supabase'
import './OpportunityContext.css'

// "Show me everything about Fort Stewart" — the unified workspace panel.
// Every table here already exists and is already keyed by proposal_id
// (Witness, Contractor Camera, Foreman, Restoration each query it that way
// today); this just reads the same tables from one place instead of making
// someone hop between five tools to reconstruct the picture themselves.
// Read-only by design — every section links out to the real tool to act.
function statusTone(status) {
  const s = (status || '').toLowerCase()
  if (['done', 'complete', 'completed', 'approved', 'closed'].includes(s)) return 'oc-tone-done'
  if (['overdue', 'rejected', 'denied'].includes(s)) return 'oc-tone-bad'
  return 'oc-tone-open'
}

export default function OpportunityContext({ proposalId }) {
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState(null)

  useEffect(() => {
    if (!proposalId) return
    let cancelled = false
    async function load() {
      setLoading(true)
      const [
        milestones, documents, captures, vendors,
        sov, payApps, rfis, submittals, tmTickets, dailyLogs,
        restoration,
      ] = await Promise.all([
        supabase.from('witness_milestones').select('id, title, due_date, status').eq('proposal_id', proposalId).order('due_date'),
        supabase.from('witness_documents').select('id, name, category, url').eq('proposal_id', proposalId),
        supabase.from('site_captures').select('id, area, kind, media_url, note, created_at').eq('proposal_id', proposalId).order('created_at', { ascending: false }).limit(6),
        supabase.from('vendor_team_assignments').select('id, role, vendor_id, network_vendors(name)').eq('proposal_id', proposalId),
        supabase.from('foreman_sov_items').select('id').eq('proposal_id', proposalId),
        supabase.from('foreman_pay_apps').select('id, app_number, status, amount_requested').eq('proposal_id', proposalId).order('app_number', { ascending: false }),
        supabase.from('foreman_rfis').select('id, status').eq('proposal_id', proposalId),
        supabase.from('foreman_submittals').select('id, status').eq('proposal_id', proposalId),
        supabase.from('foreman_tm_tickets').select('id, status').eq('proposal_id', proposalId),
        supabase.from('foreman_daily_logs').select('id, log_date').eq('proposal_id', proposalId).order('log_date', { ascending: false }).limit(1),
        supabase.from('restoration_projects').select('id, name, status').eq('proposal_id', proposalId),
      ])
      if (cancelled) return
      setData({
        milestones: milestones.data || [],
        documents: documents.data || [],
        captures: captures.data || [],
        vendors: vendors.data || [],
        sovCount: (sov.data || []).length,
        payApps: payApps.data || [],
        rfiOpen: (rfis.data || []).filter(r => statusTone(r.status) === 'oc-tone-open').length,
        rfiTotal: (rfis.data || []).length,
        submittalOpen: (submittals.data || []).filter(s => statusTone(s.status) === 'oc-tone-open').length,
        submittalTotal: (submittals.data || []).length,
        tmOpen: (tmTickets.data || []).filter(t => statusTone(t.status) === 'oc-tone-open').length,
        tmTotal: (tmTickets.data || []).length,
        lastLogDate: dailyLogs.data?.[0]?.log_date || null,
        restoration: restoration.data || [],
      })
      setLoading(false)
    }
    load()
    return () => { cancelled = true }
  }, [proposalId])

  if (loading) {
    return <div className="oc-loading">Pulling together everything on this contract…</div>
  }

  const hasExecution = data.sovCount > 0 || data.payApps.length > 0 || data.rfiTotal > 0 || data.submittalTotal > 0 || data.tmTotal > 0 || data.lastLogDate
  const hasAnything = data.milestones.length > 0 || data.documents.length > 0 || data.captures.length > 0
    || data.vendors.length > 0 || hasExecution || data.restoration.length > 0

  if (!hasAnything) {
    return (
      <div className="oc-empty">
        <p>Nothing tracked here yet. Once this opportunity is awarded, milestones, photos, payment apps, and the rest will show up here automatically — no separate setup.</p>
      </div>
    )
  }

  return (
    <div className="oc-wrap">
      {data.milestones.length > 0 && (
        <section className="oc-section">
          <h3><Calendar size={15} /> Milestones</h3>
          <ul className="oc-list">
            {data.milestones.map(m => (
              <li key={m.id}>
                <span className={`oc-dot ${statusTone(m.status)}`} />
                <span className="oc-item-text">{m.title}</span>
                {m.due_date && <span className="oc-item-meta">{new Date(m.due_date).toLocaleDateString()}</span>}
              </li>
            ))}
          </ul>
          <a className="oc-link" href="/witness">Open Witness <ArrowRight size={12} /></a>
        </section>
      )}

      {data.documents.length > 0 && (
        <section className="oc-section">
          <h3><FileText size={15} /> Documents</h3>
          <ul className="oc-list">
            {data.documents.map(d => (
              <li key={d.id}>
                <a href={d.url} target="_blank" rel="noreferrer" className="oc-item-text oc-doc-link">{d.name}</a>
                {d.category && <span className="oc-item-meta">{d.category}</span>}
              </li>
            ))}
          </ul>
        </section>
      )}

      {data.captures.length > 0 && (
        <section className="oc-section">
          <h3><Camera size={15} /> Site photos</h3>
          <div className="oc-photo-grid">
            {data.captures.map(c => (
              <a key={c.id} href={c.media_url} target="_blank" rel="noreferrer" className="oc-photo" title={c.note || c.area || ''}>
                <img src={c.media_url} alt={c.note || 'Site capture'} loading="lazy" />
              </a>
            ))}
          </div>
          <a className="oc-link" href="/camera">Open Contractor Camera <ArrowRight size={12} /></a>
        </section>
      )}

      {data.vendors.length > 0 && (
        <section className="oc-section">
          <h3><Users size={15} /> Team & subs</h3>
          <ul className="oc-list">
            {data.vendors.map(v => (
              <li key={v.id}>
                <span className="oc-item-text">{v.network_vendors?.name || 'Vendor'}</span>
                {v.role && <span className="oc-item-meta">{v.role}</span>}
              </li>
            ))}
          </ul>
        </section>
      )}

      {hasExecution && (
        <section className="oc-section">
          <h3><HardHat size={15} /> Execution (Foreman)</h3>
          <div className="oc-stat-row">
            {data.sovCount > 0 && <span className="oc-stat">{data.sovCount} SOV line{data.sovCount === 1 ? '' : 's'}</span>}
            {data.payApps.length > 0 && (
              <span className="oc-stat">
                Pay app #{data.payApps[0].app_number}{data.payApps[0].status ? ` — ${data.payApps[0].status}` : ''}
              </span>
            )}
            {data.rfiTotal > 0 && <span className="oc-stat">{data.rfiOpen} of {data.rfiTotal} RFIs open</span>}
            {data.submittalTotal > 0 && <span className="oc-stat">{data.submittalOpen} of {data.submittalTotal} submittals open</span>}
            {data.tmTotal > 0 && <span className="oc-stat">{data.tmOpen} of {data.tmTotal} T&M tickets open</span>}
            {data.lastLogDate && <span className="oc-stat">Last daily log {new Date(data.lastLogDate).toLocaleDateString()}</span>}
          </div>
          <a className="oc-link" href="/foreman">Open Foreman <ArrowRight size={12} /></a>
        </section>
      )}

      {data.restoration.length > 0 && (
        <section className="oc-section">
          <h3><FlaskConical size={15} /> Restoration</h3>
          <ul className="oc-list">
            {data.restoration.map(r => (
              <li key={r.id}>
                <span className={`oc-dot ${statusTone(r.status)}`} />
                <span className="oc-item-text">{r.name}</span>
              </li>
            ))}
          </ul>
          <a className="oc-link" href="/restoration">Open Restoration <ArrowRight size={12} /></a>
        </section>
      )}
    </div>
  )
}
