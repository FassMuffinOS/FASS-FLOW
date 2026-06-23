import { useState, useEffect, useMemo } from 'react'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'
import {
  HardHat, MessageSquareWarning, FileStack, Table2, Receipt, ClipboardList,
  Plus, Trash2, CheckCircle2, AlertTriangle, Info,
} from 'lucide-react'
import './Foreman.css'

// CSI MasterFormat divisions — used to tag submittals & schedule-of-values
// line items. Reference data only, not a licensed dataset.
const CSI_DIVISIONS = [
  '01 - General Requirements', '02 - Existing Conditions', '03 - Concrete',
  '04 - Masonry', '05 - Metals', '06 - Wood, Plastics & Composites',
  '07 - Thermal & Moisture Protection', '08 - Openings', '09 - Finishes',
  '10 - Specialties', '11 - Equipment', '12 - Furnishings',
  '21 - Fire Suppression', '22 - Plumbing', '23 - HVAC',
  '26 - Electrical', '27 - Communications', '28 - Electronic Safety & Security',
  '31 - Earthwork', '32 - Exterior Improvements', '33 - Utilities',
]

const TABS = [
  { id: 'sov', label: 'Schedule of Values', icon: Table2 },
  { id: 'payapp', label: 'AIA Pay App', icon: Receipt },
  { id: 'rfi', label: 'RFIs', icon: MessageSquareWarning },
  { id: 'submittals', label: 'Submittals', icon: FileStack },
  { id: 'tm', label: 'T&M Tickets', icon: ClipboardList },
  { id: 'daily', label: 'Daily Log', icon: ClipboardList },
]

function fmt(n) {
  return `$${Number(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}
function fmtDate(s) {
  if (!s) return '—'
  return new Date(s).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

export default function Foreman() {
  const { session } = useAuth()
  const [projects, setProjects] = useState([])
  const [selectedId, setSelectedId] = useState('')
  const [tab, setTab] = useState('sov')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [sovItems, setSovItems] = useState([])
  const [payApps, setPayApps] = useState([])
  const [rfis, setRfis] = useState([])
  const [submittals, setSubmittals] = useState([])
  const [tmTickets, setTmTickets] = useState([])
  const [dailyLogs, setDailyLogs] = useState([])

  useEffect(() => { loadProjects() }, [])
  useEffect(() => { if (selectedId) loadDetail(selectedId) }, [selectedId])

  async function loadProjects() {
    setLoading(true)
    const { data, error: err } = await supabase
      .from('proposals')
      .select('id, title, agency, due_date, estimated_value')
      .eq('user_id', session.user.id)
      .eq('stage', 'awarded')
      .order('due_date', { ascending: true })
    if (err) setError(err.message)
    setProjects(data || [])
    if (data?.length) setSelectedId(data[0].id)
    setLoading(false)
  }

  async function loadDetail(proposalId) {
    const [sov, apps, rfiRes, subRes, tmRes, dailyRes] = await Promise.all([
      supabase.from('foreman_sov_items').select('*').eq('proposal_id', proposalId).order('sort_order'),
      supabase.from('foreman_pay_apps').select('*').eq('proposal_id', proposalId).order('app_number'),
      supabase.from('foreman_rfis').select('*').eq('proposal_id', proposalId).order('number'),
      supabase.from('foreman_submittals').select('*').eq('proposal_id', proposalId).order('number'),
      supabase.from('foreman_tm_tickets').select('*').eq('proposal_id', proposalId).order('ticket_number'),
      supabase.from('foreman_daily_logs').select('*').eq('proposal_id', proposalId).order('log_date', { ascending: false }),
    ])
    setSovItems(sov.data || [])
    setPayApps(apps.data || [])
    setRfis(rfiRes.data || [])
    setSubmittals(subRes.data || [])
    setTmTickets(tmRes.data || [])
    setDailyLogs(dailyRes.data || [])
  }

  const project = projects.find(p => p.id === selectedId)

  if (loading) return <div className="frm"><p>Loading…</p></div>

  if (!projects.length) {
    return (
      <div className="frm">
        <div className="frm-empty">
          <h3>No awarded contracts yet</h3>
          <p>Mark a proposal "Awarded" in Pipeline and it'll show up here — here's what Foreman gives you once it does:</p>
          <div className="frm-resource-grid">
            <div className="frm-resource"><h3><Table2 size={15} /> Schedule of Values</h3><p>Break the contract into CSI-coded line items with scheduled values — the foundation for every pay app.</p></div>
            <div className="frm-resource"><h3><Receipt size={15} /> AIA Pay App (G702/G703)</h3><p>Generate the actual payment application — previous billed, this period, retainage, balance to finish. This is how you get paid, not an invoice.</p></div>
            <div className="frm-resource"><h3><MessageSquareWarning size={15} /> RFIs</h3><p>Log requests for information with cost/schedule impact flags and status tracking.</p></div>
            <div className="frm-resource"><h3><FileStack size={15} /> Submittals</h3><p>Track shop drawings, product data, and samples by CSI division through approval.</p></div>
            <div className="frm-resource"><h3><ClipboardList size={15} /> T&M Tickets</h3><p>Capture time & material work with labor, materials, equipment, and markup.</p></div>
            <div className="frm-resource"><h3><ClipboardList size={15} /> Daily Logs</h3><p>Weather, crew count, work performed, and delays — dated and ready if a dispute comes up.</p></div>
          </div>
          <a href="/pipeline" className="frm-btn frm-btn-primary">Go to Pipeline →</a>
        </div>
      </div>
    )
  }

  return (
    <div className="frm">
      <div className="frm-header">
        <div>
          <h1><HardHat size={22} /> Foreman</h1>
          <p>Construction management for the awarded contract — RFIs, submittals, schedule of values, T&amp;M tickets, daily logs, and the AIA payment application that actually gets you paid.</p>
        </div>
        {projects.length > 1 && (
          <select className="frm-project-select" value={selectedId} onChange={e => setSelectedId(e.target.value)}>
            {projects.map(p => <option key={p.id} value={p.id}>{p.title}</option>)}
          </select>
        )}
      </div>

      <div className="frm-tabs">
        {TABS.map(t => {
          const Icon = t.icon
          return (
            <button key={t.id} className={`frm-tab ${tab === t.id ? 'frm-tab-active' : ''}`} onClick={() => setTab(t.id)}>
              <Icon size={14} /> {t.label}
            </button>
          )
        })}
      </div>

      {tab === 'sov' && <SovPanel proposalId={selectedId} userId={session.user.id} items={sovItems} setItems={setSovItems} />}
      {tab === 'payapp' && <PayAppPanel proposalId={selectedId} userId={session.user.id} sovItems={sovItems} payApps={payApps} setPayApps={setPayApps} />}
      {tab === 'rfi' && <RfiPanel proposalId={selectedId} userId={session.user.id} rfis={rfis} setRfis={setRfis} />}
      {tab === 'submittals' && <SubmittalPanel proposalId={selectedId} userId={session.user.id} submittals={submittals} setSubmittals={setSubmittals} />}
      {tab === 'tm' && <TmPanel proposalId={selectedId} userId={session.user.id} tickets={tmTickets} setTickets={setTmTickets} />}
      {tab === 'daily' && <DailyPanel proposalId={selectedId} userId={session.user.id} logs={dailyLogs} setLogs={setDailyLogs} />}
    </div>
  )
}

// ── Schedule of Values ──────────────────────────────────────────────
function SovPanel({ proposalId, userId, items, setItems }) {
  const [desc, setDesc] = useState('')
  const [csi, setCsi] = useState(CSI_DIVISIONS[0])
  const [value, setValue] = useState('')

  const total = items.reduce((s, i) => s + Number(i.scheduled_value), 0)

  async function addItem(e) {
    e.preventDefault()
    if (!desc.trim() || !value) return
    const { data } = await supabase.from('foreman_sov_items').insert({
      user_id: userId, proposal_id: proposalId, description: desc.trim(),
      csi_division: csi, scheduled_value: Number(value), sort_order: items.length,
    }).select().single()
    if (data) setItems(prev => [...prev, data])
    setDesc(''); setValue('')
  }

  async function removeItem(id) {
    await supabase.from('foreman_sov_items').delete().eq('id', id)
    setItems(prev => prev.filter(i => i.id !== id))
  }

  return (
    <div className="frm-card">
      <h2>Schedule of Values</h2>
      <p className="frm-sub">Break the contract value into CSI-coded line items. This feeds the AIA pay app's G703 continuation sheet directly.</p>
      <form className="frm-form-row" onSubmit={addItem}>
        <select value={csi} onChange={e => setCsi(e.target.value)}>
          {CSI_DIVISIONS.map(d => <option key={d} value={d}>{d}</option>)}
        </select>
        <input placeholder="Line item description" value={desc} onChange={e => setDesc(e.target.value)} />
        <input type="number" min="0" step="any" placeholder="Scheduled value" value={value} onChange={e => setValue(e.target.value)} />
        <button className="frm-btn frm-btn-primary" type="submit"><Plus size={14} /> Add</button>
      </form>
      <div className="frm-list">
        {items.map(i => (
          <div className="frm-row" key={i.id}>
            <div className="frm-row-main">
              <div className="frm-row-title">{i.description}</div>
              <div className="frm-row-meta">{i.csi_division}</div>
            </div>
            <div className="frm-row-amount">{fmt(i.scheduled_value)}</div>
            <button className="frm-icon-btn" onClick={() => removeItem(i.id)}><Trash2 size={15} /></button>
          </div>
        ))}
        {!items.length && <p className="frm-empty-note">No line items yet — add the first one above.</p>}
      </div>
      {!!items.length && <div className="frm-total-row">Contract sum: <strong>{fmt(total)}</strong></div>}
    </div>
  )
}

// ── AIA Pay App (G702/G703) ─────────────────────────────────────────
function PayAppPanel({ proposalId, userId, sovItems, payApps, setPayApps }) {
  const [activeAppId, setActiveAppId] = useState(payApps[0]?.id || '')
  const [retainagePct, setRetainagePct] = useState(10)
  const [lines, setLines] = useState([])
  const [priorBilled, setPriorBilled] = useState({})

  useEffect(() => {
    if (!activeAppId && payApps.length) setActiveAppId(payApps[0].id)
  }, [payApps])

  useEffect(() => {
    if (activeAppId) loadLines(activeAppId)
  }, [activeAppId])

  async function loadLines(appId) {
    const { data } = await supabase.from('foreman_pay_app_lines').select('*').eq('pay_app_id', appId)
    setLines(data || [])
  }

  async function newPayApp() {
    if (!sovItems.length) return
    // "previous billed" per SOV line = sum of this_period_billed across all
    // prior pay apps for that line — standard G703 running total.
    const { data: priorLines } = await supabase
      .from('foreman_pay_app_lines')
      .select('sov_item_id, this_period_billed')
      .in('pay_app_id', payApps.map(a => a.id).length ? payApps.map(a => a.id) : ['00000000-0000-0000-0000-000000000000'])
    const priorTotals = {}
    for (const l of priorLines || []) {
      priorTotals[l.sov_item_id] = (priorTotals[l.sov_item_id] || 0) + Number(l.this_period_billed)
    }

    const nextNumber = (payApps.reduce((m, a) => Math.max(m, a.app_number), 0)) + 1
    const { data: app } = await supabase.from('foreman_pay_apps').insert({
      user_id: userId, proposal_id: proposalId, app_number: nextNumber, retainage_pct: retainagePct,
    }).select().single()
    if (!app) return

    const newLines = sovItems.map(item => ({
      user_id: userId, pay_app_id: app.id, sov_item_id: item.id,
      previous_billed: priorTotals[item.id] || 0, this_period_billed: 0, materials_stored: 0,
    }))
    const { data: insertedLines } = await supabase.from('foreman_pay_app_lines').insert(newLines).select()

    setPayApps(prev => [...prev, app])
    setActiveAppId(app.id)
    setLines(insertedLines || [])
  }

  async function updateLine(lineId, field, val) {
    const num = Number(val) || 0
    setLines(prev => prev.map(l => l.id === lineId ? { ...l, [field]: num } : l))
    await supabase.from('foreman_pay_app_lines').update({ [field]: num }).eq('id', lineId)
  }

  const activeApp = payApps.find(a => a.id === activeAppId)
  const sovMap = Object.fromEntries(sovItems.map(i => [i.id, i]))

  const rows = lines.map(l => {
    const sov = sovMap[l.sov_item_id]
    const scheduled = Number(sov?.scheduled_value || 0)
    const completedToDate = Number(l.previous_billed) + Number(l.this_period_billed) + Number(l.materials_stored)
    const pct = scheduled ? (completedToDate / scheduled) * 100 : 0
    const balance = scheduled - completedToDate
    return { ...l, sov, scheduled, completedToDate, pct, balance }
  })

  const totalScheduled = rows.reduce((s, r) => s + r.scheduled, 0)
  const totalPrevious = rows.reduce((s, r) => s + Number(r.previous_billed), 0)
  const totalThisPeriod = rows.reduce((s, r) => s + Number(r.this_period_billed), 0)
  const totalStored = rows.reduce((s, r) => s + Number(r.materials_stored), 0)
  const totalCompleted = totalPrevious + totalThisPeriod + totalStored
  const totalBalance = totalScheduled - totalCompleted
  const retainage = totalCompleted * ((activeApp?.retainage_pct ?? retainagePct) / 100)
  const totalEarnedLessRetainage = totalCompleted - retainage
  const priorAppRetainagePaid = 0 // v1: simplified — no carried prior-payment-to-date tracking yet
  const currentPaymentDue = totalEarnedLessRetainage - priorAppRetainagePaid - totalPrevious + 0
  // Current payment due, G702-style: (total completed & stored to date - retainage) - previous certificates for payment
  const previousCertificates = totalPrevious - (totalPrevious * ((activeApp?.retainage_pct ?? retainagePct) / 100))
  const currentDue = totalEarnedLessRetainage - previousCertificates

  return (
    <div className="frm-card">
      <h2>AIA Payment Application</h2>
      <p className="frm-sub">G702/G703-style application for payment, built straight from your schedule of values. This — not an emailed invoice — is the document that gets contractors paid on most commercial and public work.</p>

      <div className="frm-form-row">
        {!!payApps.length && (
          <select value={activeAppId} onChange={e => setActiveAppId(e.target.value)}>
            {payApps.map(a => <option key={a.id} value={a.id}>Application #{a.app_number} — {fmtDate(a.created_at)}</option>)}
          </select>
        )}
        <label className="frm-inline-label">
          Retainage %
          <input type="number" min="0" max="50" value={retainagePct} onChange={e => setRetainagePct(Number(e.target.value))} style={{ width: 70 }} />
        </label>
        <button className="frm-btn frm-btn-primary" onClick={newPayApp} disabled={!sovItems.length}>
          <Plus size={14} /> New application
        </button>
      </div>

      {!sovItems.length && <p className="frm-empty-note">Add schedule-of-values line items first — the pay app is generated from them.</p>}

      {!!rows.length && (
        <>
          <div className="frm-table-wrap">
            <table className="frm-table">
              <thead>
                <tr>
                  <th>Description</th>
                  <th>Scheduled value</th>
                  <th>Previous app.</th>
                  <th>This period</th>
                  <th>Materials stored</th>
                  <th>Completed to date</th>
                  <th>%</th>
                  <th>Balance to finish</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(r => (
                  <tr key={r.id}>
                    <td>{r.sov?.description}</td>
                    <td>{fmt(r.scheduled)}</td>
                    <td>{fmt(r.previous_billed)}</td>
                    <td><input type="number" min="0" step="any" value={r.this_period_billed} onChange={e => updateLine(r.id, 'this_period_billed', e.target.value)} /></td>
                    <td><input type="number" min="0" step="any" value={r.materials_stored} onChange={e => updateLine(r.id, 'materials_stored', e.target.value)} /></td>
                    <td>{fmt(r.completedToDate)}</td>
                    <td>{r.pct.toFixed(1)}%</td>
                    <td>{fmt(r.balance)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="frm-summary-grid">
            <div className="frm-summary-item"><label>Original contract sum</label><span>{fmt(totalScheduled)}</span></div>
            <div className="frm-summary-item"><label>Total completed &amp; stored to date</label><span>{fmt(totalCompleted)}</span></div>
            <div className="frm-summary-item"><label>Retainage ({activeApp?.retainage_pct ?? retainagePct}%)</label><span>{fmt(retainage)}</span></div>
            <div className="frm-summary-item"><label>Total earned less retainage</label><span>{fmt(totalEarnedLessRetainage)}</span></div>
            <div className="frm-summary-item"><label>Less previous certificates for payment</label><span>{fmt(previousCertificates)}</span></div>
            <div className="frm-summary-item frm-summary-total"><label>Current payment due</label><span>{fmt(currentDue)}</span></div>
          </div>
        </>
      )}
    </div>
  )
}

// ── RFIs ─────────────────────────────────────────────────────────────
function RfiPanel({ proposalId, userId, rfis, setRfis }) {
  const [subject, setSubject] = useState('')
  const [question, setQuestion] = useState('')

  async function addRfi(e) {
    e.preventDefault()
    if (!subject.trim() || !question.trim()) return
    const nextNumber = (rfis.reduce((m, r) => Math.max(m, r.number), 0)) + 1
    const { data } = await supabase.from('foreman_rfis').insert({
      user_id: userId, proposal_id: proposalId, number: nextNumber, subject: subject.trim(), question: question.trim(),
    }).select().single()
    if (data) setRfis(prev => [...prev, data])
    setSubject(''); setQuestion('')
  }

  async function updateStatus(id, status) {
    setRfis(prev => prev.map(r => r.id === id ? { ...r, status } : r))
    await supabase.from('foreman_rfis').update({ status, answered_date: status === 'answered' ? new Date().toISOString().slice(0, 10) : null }).eq('id', id)
  }

  async function removeRfi(id) {
    await supabase.from('foreman_rfis').delete().eq('id', id)
    setRfis(prev => prev.filter(r => r.id !== id))
  }

  return (
    <div className="frm-card">
      <h2>RFIs</h2>
      <p className="frm-sub">Requests for information, numbered and tracked through to a response.</p>
      <form className="frm-form-col" onSubmit={addRfi}>
        <input placeholder="Subject" value={subject} onChange={e => setSubject(e.target.value)} />
        <textarea placeholder="Question" value={question} onChange={e => setQuestion(e.target.value)} rows={2} />
        <button className="frm-btn frm-btn-primary" type="submit"><Plus size={14} /> Log RFI</button>
      </form>
      <div className="frm-list">
        {rfis.map(r => (
          <div className="frm-row frm-row-stacked" key={r.id}>
            <div className="frm-row-main">
              <div className="frm-row-title">RFI #{r.number} — {r.subject}</div>
              <div className="frm-row-meta">{r.question}</div>
              <div className="frm-row-meta">Submitted {fmtDate(r.submitted_date)}{r.answered_date ? ` · Answered ${fmtDate(r.answered_date)}` : ''}</div>
            </div>
            <select value={r.status} onChange={e => updateStatus(r.id, e.target.value)} className={`frm-status-select frm-status-${r.status}`}>
              <option value="open">Open</option>
              <option value="answered">Answered</option>
              <option value="closed">Closed</option>
            </select>
            <button className="frm-icon-btn" onClick={() => removeRfi(r.id)}><Trash2 size={15} /></button>
          </div>
        ))}
        {!rfis.length && <p className="frm-empty-note">No RFIs logged yet.</p>}
      </div>
    </div>
  )
}

// ── Submittals ───────────────────────────────────────────────────────
function SubmittalPanel({ proposalId, userId, submittals, setSubmittals }) {
  const [desc, setDesc] = useState('')
  const [csi, setCsi] = useState(CSI_DIVISIONS[0])
  const [type, setType] = useState('shop_drawing')

  async function addSubmittal(e) {
    e.preventDefault()
    if (!desc.trim()) return
    const nextNumber = (submittals.reduce((m, s) => Math.max(m, s.number), 0)) + 1
    const { data } = await supabase.from('foreman_submittals').insert({
      user_id: userId, proposal_id: proposalId, number: nextNumber, description: desc.trim(), csi_division: csi, submittal_type: type,
    }).select().single()
    if (data) setSubmittals(prev => [...prev, data])
    setDesc('')
  }

  async function updateStatus(id, status) {
    setSubmittals(prev => prev.map(s => s.id === id ? { ...s, status } : s))
    await supabase.from('foreman_submittals').update({ status, returned_date: status === 'pending' ? null : new Date().toISOString().slice(0, 10) }).eq('id', id)
  }

  async function removeSubmittal(id) {
    await supabase.from('foreman_submittals').delete().eq('id', id)
    setSubmittals(prev => prev.filter(s => s.id !== id))
  }

  return (
    <div className="frm-card">
      <h2>Submittals</h2>
      <p className="frm-sub">Shop drawings, product data, and samples — tracked by CSI division through approval.</p>
      <form className="frm-form-row" onSubmit={addSubmittal}>
        <select value={csi} onChange={e => setCsi(e.target.value)}>
          {CSI_DIVISIONS.map(d => <option key={d} value={d}>{d}</option>)}
        </select>
        <select value={type} onChange={e => setType(e.target.value)}>
          <option value="shop_drawing">Shop drawing</option>
          <option value="product_data">Product data</option>
          <option value="sample">Sample</option>
          <option value="other">Other</option>
        </select>
        <input placeholder="Description" value={desc} onChange={e => setDesc(e.target.value)} />
        <button className="frm-btn frm-btn-primary" type="submit"><Plus size={14} /> Add</button>
      </form>
      <div className="frm-list">
        {submittals.map(s => (
          <div className="frm-row frm-row-stacked" key={s.id}>
            <div className="frm-row-main">
              <div className="frm-row-title">#{s.number} — {s.description}</div>
              <div className="frm-row-meta">{s.csi_division} · {s.submittal_type.replace('_', ' ')} · Submitted {fmtDate(s.submitted_date)}</div>
            </div>
            <select value={s.status} onChange={e => updateStatus(s.id, e.target.value)} className={`frm-status-select frm-status-${s.status}`}>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="approved_as_noted">Approved as noted</option>
              <option value="revise_resubmit">Revise &amp; resubmit</option>
              <option value="rejected">Rejected</option>
            </select>
            <button className="frm-icon-btn" onClick={() => removeSubmittal(s.id)}><Trash2 size={15} /></button>
          </div>
        ))}
        {!submittals.length && <p className="frm-empty-note">No submittals logged yet.</p>}
      </div>
    </div>
  )
}

// ── T&M Tickets ──────────────────────────────────────────────────────
function TmPanel({ proposalId, userId, tickets, setTickets }) {
  const [desc, setDesc] = useState('')
  const [hours, setHours] = useState('')
  const [rate, setRate] = useState('')
  const [materials, setMaterials] = useState('')
  const [equipment, setEquipment] = useState('')
  const [markup, setMarkup] = useState('15')
  const [signedBy, setSignedBy] = useState('')

  async function addTicket(e) {
    e.preventDefault()
    if (!desc.trim()) return
    const nextNumber = (tickets.reduce((m, t) => Math.max(m, t.ticket_number), 0)) + 1
    const { data } = await supabase.from('foreman_tm_tickets').insert({
      user_id: userId, proposal_id: proposalId, ticket_number: nextNumber, description: desc.trim(),
      labor_hours: Number(hours) || 0, labor_rate: Number(rate) || 0,
      materials_cost: Number(materials) || 0, equipment_cost: Number(equipment) || 0,
      markup_pct: Number(markup) || 0, signed_by: signedBy.trim() || null,
    }).select().single()
    if (data) setTickets(prev => [...prev, data])
    setDesc(''); setHours(''); setRate(''); setMaterials(''); setEquipment(''); setSignedBy('')
  }

  async function removeTicket(id) {
    await supabase.from('foreman_tm_tickets').delete().eq('id', id)
    setTickets(prev => prev.filter(t => t.id !== id))
  }

  function ticketTotal(t) {
    const base = (Number(t.labor_hours) * Number(t.labor_rate)) + Number(t.materials_cost) + Number(t.equipment_cost)
    return base * (1 + Number(t.markup_pct) / 100)
  }

  return (
    <div className="frm-card">
      <h2>Time &amp; Material Tickets</h2>
      <p className="frm-sub">For out-of-scope or unforeseen-condition work billed outside the schedule of values.</p>
      <form className="frm-form-col" onSubmit={addTicket}>
        <input placeholder="Description of work" value={desc} onChange={e => setDesc(e.target.value)} />
        <div className="frm-form-row">
          <input type="number" min="0" step="any" placeholder="Labor hours" value={hours} onChange={e => setHours(e.target.value)} />
          <input type="number" min="0" step="any" placeholder="Labor rate ($/hr)" value={rate} onChange={e => setRate(e.target.value)} />
          <input type="number" min="0" step="any" placeholder="Materials cost" value={materials} onChange={e => setMaterials(e.target.value)} />
          <input type="number" min="0" step="any" placeholder="Equipment cost" value={equipment} onChange={e => setEquipment(e.target.value)} />
          <input type="number" min="0" step="any" placeholder="Markup %" value={markup} onChange={e => setMarkup(e.target.value)} />
          <input placeholder="Signed by" value={signedBy} onChange={e => setSignedBy(e.target.value)} />
        </div>
        <button className="frm-btn frm-btn-primary" type="submit"><Plus size={14} /> Log ticket</button>
      </form>
      <div className="frm-list">
        {tickets.map(t => (
          <div className="frm-row frm-row-stacked" key={t.id}>
            <div className="frm-row-main">
              <div className="frm-row-title">Ticket #{t.ticket_number} — {t.description}</div>
              <div className="frm-row-meta">{t.labor_hours}h @ {fmt(t.labor_rate)} · Materials {fmt(t.materials_cost)} · Equip {fmt(t.equipment_cost)} · Markup {t.markup_pct}%{t.signed_by ? ` · Signed by ${t.signed_by}` : ''}</div>
            </div>
            <div className="frm-row-amount">{fmt(ticketTotal(t))}</div>
            <button className="frm-icon-btn" onClick={() => removeTicket(t.id)}><Trash2 size={15} /></button>
          </div>
        ))}
        {!tickets.length && <p className="frm-empty-note">No T&amp;M tickets yet.</p>}
      </div>
    </div>
  )
}

// ── Daily Logs ───────────────────────────────────────────────────────
function DailyPanel({ proposalId, userId, logs, setLogs }) {
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10))
  const [weather, setWeather] = useState('')
  const [crew, setCrew] = useState('')
  const [work, setWork] = useState('')
  const [delays, setDelays] = useState('')

  async function addLog(e) {
    e.preventDefault()
    if (!work.trim()) return
    const { data } = await supabase.from('foreman_daily_logs').insert({
      user_id: userId, proposal_id: proposalId, log_date: date, weather: weather.trim() || null,
      crew_count: crew ? Number(crew) : null, work_performed: work.trim(), delays: delays.trim() || null,
    }).select().single()
    if (data) setLogs(prev => [data, ...prev])
    setWeather(''); setCrew(''); setWork(''); setDelays('')
  }

  async function removeLog(id) {
    await supabase.from('foreman_daily_logs').delete().eq('id', id)
    setLogs(prev => prev.filter(l => l.id !== id))
  }

  return (
    <div className="frm-card">
      <h2>Daily Log</h2>
      <p className="frm-sub">Weather, crew, work performed, and delays — dated, in case a dispute ever needs a paper trail.</p>
      <form className="frm-form-col" onSubmit={addLog}>
        <div className="frm-form-row">
          <input type="date" value={date} onChange={e => setDate(e.target.value)} />
          <input placeholder="Weather" value={weather} onChange={e => setWeather(e.target.value)} />
          <input type="number" min="0" placeholder="Crew on site" value={crew} onChange={e => setCrew(e.target.value)} />
        </div>
        <textarea placeholder="Work performed" value={work} onChange={e => setWork(e.target.value)} rows={2} />
        <textarea placeholder="Delays / issues (optional)" value={delays} onChange={e => setDelays(e.target.value)} rows={2} />
        <button className="frm-btn frm-btn-primary" type="submit"><Plus size={14} /> Log entry</button>
      </form>
      <div className="frm-list">
        {logs.map(l => (
          <div className="frm-row frm-row-stacked" key={l.id}>
            <div className="frm-row-main">
              <div className="frm-row-title">{fmtDate(l.log_date)}{l.weather ? ` — ${l.weather}` : ''}{l.crew_count != null ? ` · Crew: ${l.crew_count}` : ''}</div>
              <div className="frm-row-meta">{l.work_performed}</div>
              {l.delays && <div className="frm-row-meta frm-row-warning"><AlertTriangle size={12} /> {l.delays}</div>}
            </div>
            <button className="frm-icon-btn" onClick={() => removeLog(l.id)}><Trash2 size={15} /></button>
          </div>
        ))}
        {!logs.length && <p className="frm-empty-note">No daily log entries yet.</p>}
      </div>
    </div>
  )
}
