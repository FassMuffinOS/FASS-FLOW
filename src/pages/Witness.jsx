import { useState, useEffect, useMemo } from 'react'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'
import {
  ShieldCheck, Trophy, Calendar, FileText, Users, Plus, Trash2,
  ExternalLink, Sparkles, Building2, Search, ShieldAlert, Landmark,
} from 'lucide-react'
import './Witness.css'

const MILESTONE_STATUS = [
  { id: 'pending', label: 'Pending' },
  { id: 'in_progress', label: 'In progress' },
  { id: 'done', label: 'Done' },
  { id: 'at_risk', label: 'At risk' },
]

const DOC_CATEGORIES = [
  { id: 'contract', label: 'Contract' },
  { id: 'compliance', label: 'Compliance' },
  { id: 'insurance', label: 'Insurance' },
  { id: 'bonding', label: 'Bonding' },
  { id: 'invoice', label: 'Invoice' },
  { id: 'correspondence', label: 'Correspondence' },
  { id: 'other', label: 'Other' },
]

function formatDate(str) {
  if (!str) return '—'
  return new Date(str).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function fmtMoney(n) {
  if (n == null) return '—'
  return `$${Number(n).toLocaleString()}`
}

// Rule-based milestone generator — no AI call needed. Spaces four standard
// post-award checkpoints between today and the award's due_date (or 90 days
// out if no due_date is on file), and tacks on a FAR 32.009-aligned net-15
// invoicing/closeout milestone after the end date.
function generateMilestonePlan(award) {
  const start = new Date()
  const end = award.due_date ? new Date(award.due_date) : new Date(start.getTime() + 90 * 86400000)
  const span = Math.max(end - start, 14 * 86400000)
  const at = (frac) => new Date(start.getTime() + span * frac).toISOString().slice(0, 10)

  return [
    { title: 'Kickoff & contract review', due_date: at(0.05), description: 'Confirm scope, key personnel, and reporting requirements with the contracting officer.' },
    { title: 'Insurance & bonding in place', due_date: at(0.1), description: 'Certificates of insurance and any required performance/payment bonds filed before mobilization.' },
    { title: 'Mid-point progress review', due_date: at(0.5), description: 'Check deliverables, spend, and subcontractor performance against the award terms.' },
    { title: 'Final deliverable / performance period ends', due_date: end.toISOString().slice(0, 10), description: 'Award due date — confirm final delivery or period of performance close-out.' },
    { title: 'Final invoice & closeout documentation', due_date: new Date(end.getTime() + 15 * 86400000).toISOString().slice(0, 10), description: 'Submit final invoice (FAR 32.009 net-15) and file closeout/past-performance documentation.' },
  ]
}

export default function Witness() {
  const { session } = useAuth()
  const [awards, setAwards] = useState([])
  const [selectedId, setSelectedId] = useState('')
  const [milestones, setMilestones] = useState([])
  const [documents, setDocuments] = useState([])
  const [vendors, setVendors] = useState([])
  const [assignments, setAssignments] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [generating, setGenerating] = useState(false)

  const [msTitle, setMsTitle] = useState('')
  const [msDue, setMsDue] = useState('')
  const [docName, setDocName] = useState('')
  const [docCategory, setDocCategory] = useState('contract')
  const [docUrl, setDocUrl] = useState('')
  const [vendorSearch, setVendorSearch] = useState('')
  const [tradeFilter, setTradeFilter] = useState('')

  useEffect(() => { loadAwards() }, [])
  useEffect(() => { if (selectedId) loadAwardDetail(selectedId) }, [selectedId])

  async function loadAwards() {
    setLoading(true)
    const { data, error: err } = await supabase
      .from('proposals')
      .select('id, title, agency, stage, due_date, estimated_value, naics_code, description, read_score')
      .eq('user_id', session.user.id)
      .eq('stage', 'awarded')
      .order('due_date', { ascending: true })
    if (err) setError(err.message)
    setAwards(data || [])
    if (data?.length) setSelectedId(data[0].id)
    setLoading(false)
  }

  async function loadAwardDetail(proposalId) {
    const [{ data: m }, { data: d }, { data: v }, { data: a }] = await Promise.all([
      supabase.from('witness_milestones').select('*').eq('proposal_id', proposalId).order('due_date', { ascending: true }),
      supabase.from('witness_documents').select('*').eq('proposal_id', proposalId).order('created_at', { ascending: false }),
      supabase.from('network_vendors').select('*').order('created_at', { ascending: false }),
      supabase.from('vendor_team_assignments').select('*').eq('proposal_id', proposalId),
    ])
    setMilestones(m || [])
    setDocuments(d || [])
    setVendors(v || [])
    setAssignments(a || [])
  }

  const selectedAward = useMemo(() => awards.find(a => a.id === selectedId), [awards, selectedId])

  const trades = useMemo(() => [...new Set(vendors.map(v => v.trade_category))].sort(), [vendors])
  const filteredVendors = useMemo(() => vendors.filter(v => {
    const matchesTrade = !tradeFilter || v.trade_category === tradeFilter
    const matchesSearch = !vendorSearch.trim() ||
      `${v.company_name} ${v.city} ${v.state}`.toLowerCase().includes(vendorSearch.toLowerCase())
    return matchesTrade && matchesSearch
  }), [vendors, tradeFilter, vendorSearch])

  async function generateMilestones() {
    if (!selectedAward) return
    setGenerating(true)
    const plan = generateMilestonePlan(selectedAward)
    const rows = plan.map((p, i) => ({
      user_id: session.user.id,
      proposal_id: selectedAward.id,
      title: p.title,
      description: p.description,
      due_date: p.due_date,
      sort_order: i,
      auto_generated: true,
    }))
    const { data, error: err } = await supabase.from('witness_milestones').insert(rows).select('*')
    if (err) setError(err.message)
    else setMilestones(prev => [...prev, ...data].sort((a, b) => (a.due_date || '').localeCompare(b.due_date || '')))
    setGenerating(false)
  }

  async function addMilestone(e) {
    e.preventDefault()
    if (!msTitle.trim() || !selectedAward) return
    const { data, error: err } = await supabase
      .from('witness_milestones')
      .insert({ user_id: session.user.id, proposal_id: selectedAward.id, title: msTitle.trim(), due_date: msDue || null })
      .select('*').single()
    if (err) setError(err.message)
    else setMilestones(prev => [...prev, data].sort((a, b) => (a.due_date || '').localeCompare(b.due_date || '')))
    setMsTitle(''); setMsDue('')
  }

  async function updateMilestoneStatus(id, status) {
    setMilestones(prev => prev.map(m => m.id === id ? { ...m, status } : m))
    await supabase.from('witness_milestones').update({ status }).eq('id', id)
  }

  async function deleteMilestone(id) {
    setMilestones(prev => prev.filter(m => m.id !== id))
    await supabase.from('witness_milestones').delete().eq('id', id)
  }

  async function addDocument(e) {
    e.preventDefault()
    if (!docName.trim() || !selectedAward) return
    const { data, error: err } = await supabase
      .from('witness_documents')
      .insert({ user_id: session.user.id, proposal_id: selectedAward.id, name: docName.trim(), category: docCategory, url: docUrl || null })
      .select('*').single()
    if (err) setError(err.message)
    else setDocuments(prev => [data, ...prev])
    setDocName(''); setDocUrl('')
  }

  async function deleteDocument(id) {
    setDocuments(prev => prev.filter(d => d.id !== id))
    await supabase.from('witness_documents').delete().eq('id', id)
  }

  async function addVendorToTeam(vendorId) {
    if (!selectedAward) return
    const { data, error: err } = await supabase
      .from('vendor_team_assignments')
      .insert({ proposal_id: selectedAward.id, vendor_id: vendorId, user_id: session.user.id, role: vendors.find(v => v.id === vendorId)?.trade_category })
      .select('*').single()
    if (err) setError(err.message)
    else setAssignments(prev => [...prev, data])
  }

  async function removeFromTeam(assignmentId) {
    setAssignments(prev => prev.filter(a => a.id !== assignmentId))
    await supabase.from('vendor_team_assignments').delete().eq('id', assignmentId)
  }

  if (loading) return <div className="wit"><div className="wit-loading">Loading Witness…</div></div>

  if (!awards.length) {
    return (
      <div className="wit">
        <div className="wit-header">
          <div>
            <h1><ShieldCheck size={22} /> Witness</h1>
            <p>Execute the award. Witness picks up the moment a proposal in Pipeline is marked Awarded — milestones, documents, your team, and the past-performance record that wins the next one.</p>
          </div>
        </div>
        <div className="wit-empty">
          <h3>No awarded contracts yet</h3>
          <p>Mark a proposal "Awarded" in Pipeline and it'll show up here automatically — here's what you'll get the moment it does:</p>
          <div className="wit-resource-grid" style={{ marginTop: 18, textAlign: 'left' }}>
            <div className="wit-resource">
              <h3><Trophy size={15} /> Award review</h3>
              <p>Agency, value, NAICS, and period-of-performance pulled straight from the proposal — one place to see what you actually signed up for.</p>
            </div>
            <div className="wit-resource">
              <h3><Calendar size={15} /> Milestones</h3>
              <p>One click generates a kickoff-to-closeout milestone plan from the award's due date, or build your own and track status as you go.</p>
            </div>
            <div className="wit-resource">
              <h3><FileText size={15} /> Document organization</h3>
              <p>Keep the contract, compliance paperwork, insurance certs, and invoices sorted by category in one place.</p>
            </div>
            <div className="wit-resource">
              <h3><Users size={15} /> Vendors &amp; support</h3>
              <p>Search your Network directory and build the team for this specific award without leaving the page.</p>
            </div>
            <div className="wit-resource">
              <h3><ShieldAlert size={15} /> Insurance &amp; bonding</h3>
              <p>Bonding-threshold flags, the SBA Surety Bond Guarantee Program, and net-15 invoicing guidance tailored to the award's value.</p>
            </div>
          </div>
          <a href="/pipeline" className="wit-btn wit-btn-primary" style={{ marginTop: 18, display: 'inline-flex' }}>Go to Pipeline →</a>
        </div>
      </div>
    )
  }

  const teamForSelected = assignments
  const valueNum = selectedAward?.estimated_value
  const bondingLikely = valueNum && valueNum >= 150000

  return (
    <div className="wit">
      <div className="wit-header">
        <div>
          <h1><ShieldCheck size={22} /> Witness</h1>
          <p>Execute the award — review the contract, track milestones, organize documents, and pull in vendors before performance starts.</p>
        </div>
      </div>

      {error && <p className="wit-error">{error}</p>}

      <div className="wit-award-select">
        <label>Awarded contract</label>
        <select value={selectedId} onChange={e => setSelectedId(e.target.value)}>
          {awards.map(a => (
            <option key={a.id} value={a.id}>{a.title}{a.agency ? ` — ${a.agency}` : ''}</option>
          ))}
        </select>
      </div>

      {selectedAward && (
        <>
          <div className="wit-card">
            <h2><Trophy size={18} /> Award review</h2>
            <div className="wit-review-grid">
              <div className="wit-review-item"><label>Agency</label><span>{selectedAward.agency || '—'}</span></div>
              <div className="wit-review-item"><label>NAICS</label><span>{selectedAward.naics_code || '—'}</span></div>
              <div className="wit-review-item"><label>Est. value</label><span>{fmtMoney(selectedAward.estimated_value)}</span></div>
              <div className="wit-review-item"><label>Period ends</label><span>{formatDate(selectedAward.due_date)}</span></div>
            </div>
            {selectedAward.description && <p className="wit-review-desc">{selectedAward.description}</p>}
          </div>

          <div className="wit-card">
            <div className="wit-row">
              <h2><Calendar size={18} /> Milestones</h2>
              <button className="wit-btn wit-btn-primary" onClick={generateMilestones} disabled={generating}>
                <Sparkles size={14} /> {generating ? 'Generating…' : 'Generate from award'}
              </button>
            </div>
            {!milestones.length && <p className="wit-empty-note">No milestones yet — generate a starter plan from the award terms, or add your own below.</p>}
            <div className="wit-milestone-list">
              {milestones.map(m => (
                <div className="wit-milestone" key={m.id}>
                  <div className="wit-milestone-main">
                    <div className="wit-milestone-title">{m.title}</div>
                    <div className="wit-milestone-meta">Due {formatDate(m.due_date)}{m.auto_generated ? ' · auto-generated' : ''}</div>
                  </div>
                  <select
                    className={`wit-status-select wit-status-${m.status}`}
                    value={m.status}
                    onChange={e => updateMilestoneStatus(m.id, e.target.value)}
                  >
                    {MILESTONE_STATUS.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
                  </select>
                  <button className="wit-icon-btn" onClick={() => deleteMilestone(m.id)}><Trash2 size={15} /></button>
                </div>
              ))}
            </div>
            <form className="wit-form-row" onSubmit={addMilestone}>
              <input placeholder="Add a milestone…" value={msTitle} onChange={e => setMsTitle(e.target.value)} />
              <input type="date" value={msDue} onChange={e => setMsDue(e.target.value)} />
              <button className="wit-btn" type="submit"><Plus size={14} /> Add</button>
            </form>
          </div>

          <div className="wit-card">
            <h2><FileText size={18} /> Documents</h2>
            {!documents.length && <p className="wit-empty-note">Keep the contract, compliance paperwork, insurance certs, and invoices in one place.</p>}
            <div className="wit-doc-list">
              {documents.map(d => (
                <div className="wit-doc" key={d.id}>
                  <div className="wit-doc-main">
                    <div className="wit-doc-name">{d.name}</div>
                    <div className="wit-doc-meta">
                      {DOC_CATEGORIES.find(c => c.id === d.category)?.label || d.category}
                      {d.url && <> · <a href={d.url} target="_blank" rel="noreferrer">Open <ExternalLink size={11} style={{ display: 'inline' }} /></a></>}
                    </div>
                  </div>
                  <button className="wit-icon-btn" onClick={() => deleteDocument(d.id)}><Trash2 size={15} /></button>
                </div>
              ))}
            </div>
            <form className="wit-form-row" onSubmit={addDocument}>
              <input placeholder="Document name…" value={docName} onChange={e => setDocName(e.target.value)} />
              <select value={docCategory} onChange={e => setDocCategory(e.target.value)}>
                {DOC_CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
              </select>
              <input placeholder="Link (optional)" value={docUrl} onChange={e => setDocUrl(e.target.value)} />
              <button className="wit-btn" type="submit"><Plus size={14} /> Add</button>
            </form>
          </div>

          <div className="wit-card">
            <h2><Users size={18} /> Support &amp; vendors</h2>
            <div className="wit-two-col">
              <div>
                <div className="wit-vendor-search">
                  <input placeholder="Search vendors…" value={vendorSearch} onChange={e => setVendorSearch(e.target.value)} />
                  <select value={tradeFilter} onChange={e => setTradeFilter(e.target.value)}>
                    <option value="">All trades</option>
                    {trades.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div className="wit-vendor-list">
                  {filteredVendors.map(v => (
                    <div className="wit-vendor-item" key={v.id}>
                      <div>
                        <div className="wit-vendor-name">{v.company_name}</div>
                        <div className="wit-vendor-trade">{v.trade_category} · {v.city}{v.state ? `, ${v.state}` : ''}</div>
                      </div>
                      <button
                        className="wit-btn"
                        onClick={() => addVendorToTeam(v.id)}
                        disabled={teamForSelected.some(a => a.vendor_id === v.id)}
                      >
                        {teamForSelected.some(a => a.vendor_id === v.id) ? 'Added' : <><Plus size={13} /> Add</>}
                      </button>
                    </div>
                  ))}
                  {!filteredVendors.length && <p className="wit-empty-note">No vendors match yet — try the full directory in Network.</p>}
                </div>
                <a href="/network" className="wit-btn" style={{ marginTop: 10, display: 'inline-flex' }}><Building2 size={14} /> Open full Network directory →</a>
              </div>
              <div>
                <p className="wit-empty-note" style={{ marginBottom: 8, fontWeight: 700, color: 'var(--navy)' }}>Team on this award</p>
                <div className="wit-team-list">
                  {teamForSelected.map(a => {
                    const v = vendors.find(ve => ve.id === a.vendor_id)
                    return (
                      <div className="wit-team-item" key={a.id}>
                        <div>
                          <div className="wit-vendor-name">{v?.company_name || 'Vendor'}</div>
                          <div className="wit-vendor-trade">{a.status}</div>
                        </div>
                        <button className="wit-icon-btn" onClick={() => removeFromTeam(a.id)}><Trash2 size={15} /></button>
                      </div>
                    )
                  })}
                  {!teamForSelected.length && <p className="wit-empty-note">No vendors added to this award yet.</p>}
                </div>
                <a href="/support" className="wit-btn" style={{ marginTop: 10, display: 'inline-flex' }}><Search size={14} /> Get help on Support →</a>
              </div>
            </div>
          </div>

          <div className="wit-card">
            <h2><ShieldAlert size={18} /> Insurance &amp; bonding resources</h2>
            <div className="wit-resource-grid">
              <div className="wit-resource">
                <h3><ShieldCheck size={15} /> General liability &amp; workers' comp</h3>
                <p>Most federal awards require proof of commercial general liability insurance, and workers' comp if you have employees on the job. Check your award's clauses (FAR 52.228) for minimums.</p>
              </div>
              <div className="wit-resource">
                <h3><Landmark size={15} /> SBA Surety Bond Guarantee Program</h3>
                <p>{bondingLikely ? 'This award is at or above the $150k threshold where performance/payment bonds (Miller Act) are typically required.' : 'Below $150k bonds usually aren\'t required, but some agencies still ask for them — confirm with the CO.'}</p>
                <a href="https://www.sba.gov/funding-programs/surety-bonds" target="_blank" rel="noreferrer">SBA bonding program <ExternalLink size={12} /></a>
              </div>
              <div className="wit-resource">
                <h3><FileText size={15} /> Net-15 invoicing</h3>
                <p>FAR 32.009 generally requires small-business primes to pay subs within 15 days of receiving payment — use this when invoicing the agency and paying your team.</p>
                <a href="/glossary">Review in Glossary <ExternalLink size={12} /></a>
              </div>
              <div className="wit-resource">
                <h3><Building2 size={15} /> Certifications on file</h3>
                <p>Keep your set-aside certifications current for the life of the award — recertification gaps can jeopardize past-performance credit.</p>
                <a href="/passport">Check Business Passport <ExternalLink size={12} /></a>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
