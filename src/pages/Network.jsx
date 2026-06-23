import { useState, useEffect, useMemo } from 'react'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'
import {
  Network as NetworkIcon, Search, Mail, Phone, MapPin, Plus,
  FileText, Send, CheckCircle2, X, Users,
} from 'lucide-react'
import './Network.css'

const API_BASE = import.meta.env.VITE_API_URL || ''

const STATUS_LABELS = {
  invited: 'Invited',
  contacted: 'Contacted',
  contract_sent: 'Contract sent',
  signed: 'Signed',
  active: 'Active',
  declined: 'Declined',
}

const STATUS_ORDER = ['invited', 'contacted', 'contract_sent', 'signed', 'active', 'declined']

export default function Network() {
  const { session } = useAuth()
  const [vendors, setVendors] = useState([])
  const [proposals, setProposals] = useState([])
  const [assignments, setAssignments] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [tradeFilter, setTradeFilter] = useState('')
  const [selectedProposalId, setSelectedProposalId] = useState('')
  const [addingVendorId, setAddingVendorId] = useState(null)
  const [contractBusyId, setContractBusyId] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => { loadAll() }, [])

  async function loadAll() {
    setLoading(true)
    const [{ data: v }, { data: p }, { data: a }] = await Promise.all([
      supabase.from('network_vendors').select('*').order('created_at', { ascending: false }),
      supabase.from('proposals').select('id, title, agency, stage').eq('user_id', session.user.id).order('created_at', { ascending: false }),
      supabase.from('vendor_team_assignments').select('*, vendor_contracts(*)').eq('user_id', session.user.id),
    ])
    setVendors(v || [])
    setProposals(p || [])
    setAssignments(a || [])
    if (!selectedProposalId && p?.length) setSelectedProposalId(p[0].id)
    setLoading(false)
  }

  const trades = useMemo(
    () => [...new Set(vendors.map(v => v.trade_category))].sort(),
    [vendors]
  )

  const filteredVendors = useMemo(() => {
    return vendors.filter(v => {
      const matchesTrade = !tradeFilter || v.trade_category === tradeFilter
      const matchesSearch = !search.trim() ||
        `${v.company_name} ${v.city} ${v.state}`.toLowerCase().includes(search.toLowerCase())
      return matchesTrade && matchesSearch
    })
  }, [vendors, tradeFilter, search])

  // This count is the actual pitch — not "search public records," but
  // "X real vendors have signed up directly with us."
  const activeCount = vendors.filter(v => v.status === 'active').length
  const last30Count = vendors.filter(
    v => Date.now() - new Date(v.created_at).getTime() < 30 * 86400000
  ).length

  const teamForSelected = assignments.filter(a => a.proposal_id === selectedProposalId)

  async function addToTeam(vendorId) {
    if (!selectedProposalId) return
    setAddingVendorId(vendorId)
    const { data, error: insertError } = await supabase
      .from('vendor_team_assignments')
      .insert({ proposal_id: selectedProposalId, vendor_id: vendorId, user_id: session.user.id })
      .select('*, vendor_contracts(*)')
      .single()
    setAddingVendorId(null)
    if (insertError) setError(insertError.message)
    else setAssignments(prev => [...prev, data])
  }

  async function updateAssignmentStatus(assignmentId, status) {
    setAssignments(prev => prev.map(a => a.id === assignmentId ? { ...a, status } : a))
    await supabase.from('vendor_team_assignments').update({ status, updated_at: new Date().toISOString() }).eq('id', assignmentId)
  }

  async function removeFromTeam(assignmentId) {
    setAssignments(prev => prev.filter(a => a.id !== assignmentId))
    await supabase.from('vendor_team_assignments').delete().eq('id', assignmentId)
  }

  // Generates the subcontractor agreement PDF via the backend, then marks
  // the relationship "contract_sent" — this is the literal "send out
  // contracts to subs" ask. No third-party e-signature is wired up yet;
  // signature status below is tracked manually until that's built.
  async function sendContract(assignment) {
    const vendor = vendors.find(v => v.id === assignment.vendor_id)
    const proposal = proposals.find(p => p.id === assignment.proposal_id)
    if (!vendor || !proposal) return
    setContractBusyId(assignment.id)
    setError('')
    try {
      const res = await fetch(`${API_BASE}/api/v1/network/subcontractor-agreement`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vendor_name: vendor.company_name,
          vendor_contact_email: vendor.contact_email,
          trade_category: vendor.trade_category,
          proposal_title: proposal.title,
          proposal_agency: proposal.agency || '',
          role: assignment.role || vendor.trade_category,
        }),
      })
      if (!res.ok) throw new Error(`Agreement generation failed (${res.status})`)
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `Subcontractor-Agreement-${vendor.company_name.replace(/\s+/g, '-')}.pdf`
      a.click()
      URL.revokeObjectURL(url)

      const { data: contract } = await supabase.from('vendor_contracts').insert({
        assignment_id: assignment.id,
        user_id: session.user.id,
        status: 'sent',
        sent_at: new Date().toISOString(),
      }).select().single()

      await updateAssignmentStatus(assignment.id, 'contract_sent')
      setAssignments(prev => prev.map(a2 =>
        a2.id === assignment.id ? { ...a2, status: 'contract_sent', vendor_contracts: [...(a2.vendor_contracts || []), contract] } : a2
      ))
    } catch (err) {
      setError(err.message || 'Could not generate the agreement.')
    } finally {
      setContractBusyId(null)
    }
  }

  async function markSigned(assignment) {
    const contract = assignment.vendor_contracts?.[assignment.vendor_contracts.length - 1]
    if (contract) {
      await supabase.from('vendor_contracts').update({ status: 'signed', signed_at: new Date().toISOString() }).eq('id', contract.id)
    }
    await updateAssignmentStatus(assignment.id, 'signed')
  }

  if (loading) return <div className="net-loading">Loading your network…</div>

  return (
    <div className="net">
      <div className="net-header">
        <div>
          <h1><NetworkIcon size={22} /> FASS Network</h1>
          <p>Subs and suppliers who've signed up directly with FASS Flow — find them, build a team, send the agreement.</p>
        </div>
        <a href="/join-network" target="_blank" rel="noreferrer" className="btn-outline net-invite-link">
          Share the sign-up link
        </a>
      </div>

      <div className="net-stats">
        <div className="net-stat">
          <span className="net-stat-num">{vendors.length}</span>
          <span className="net-stat-label">Vendors in network</span>
        </div>
        <div className="net-stat">
          <span className="net-stat-num">{last30Count}</span>
          <span className="net-stat-label">Joined in the last 30 days</span>
        </div>
        <div className="net-stat">
          <span className="net-stat-num">{activeCount}</span>
          <span className="net-stat-label">Active on a contract</span>
        </div>
        <div className="net-stat">
          <span className="net-stat-num">{trades.length}</span>
          <span className="net-stat-label">Trades covered</span>
        </div>
      </div>

      {error && <p className="net-error">{error}</p>}

      <div className="net-layout">
        <div className="net-directory">
          <div className="net-directory-controls">
            <div className="net-search">
              <Search size={15} />
              <input
                type="text"
                placeholder="Search company, city, state…"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
            <select value={tradeFilter} onChange={e => setTradeFilter(e.target.value)} className="net-trade-select">
              <option value="">All trades</option>
              {trades.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>

          {filteredVendors.length === 0 && (
            <p className="net-empty">No vendors match yet — share the sign-up link to start growing the network.</p>
          )}

          <div className="net-vendor-list">
            {filteredVendors.map(v => {
              const alreadyOnTeam = teamForSelected.some(a => a.vendor_id === v.id)
              return (
                <div key={v.id} className="net-vendor-card">
                  <div className="net-vendor-main">
                    <span className="net-vendor-name">{v.company_name}</span>
                    <span className="net-vendor-trade">{v.trade_category}</span>
                    {(v.city || v.state) && (
                      <span className="net-vendor-loc"><MapPin size={11} /> {[v.city, v.state].filter(Boolean).join(', ')}</span>
                    )}
                  </div>
                  {v.certifications && <p className="net-vendor-certs">{v.certifications}</p>}
                  <div className="net-vendor-contact">
                    <a href={`mailto:${v.contact_email}`}><Mail size={12} /> {v.contact_email}</a>
                    {v.contact_phone && <span><Phone size={12} /> {v.contact_phone}</span>}
                  </div>
                  <button
                    type="button"
                    className="btn-outline net-add-btn"
                    disabled={!selectedProposalId || alreadyOnTeam || addingVendorId === v.id}
                    onClick={() => addToTeam(v.id)}
                  >
                    <Plus size={13} />
                    {alreadyOnTeam ? 'On this team' : addingVendorId === v.id ? 'Adding…' : 'Add to team'}
                  </button>
                </div>
              )
            })}
          </div>
        </div>

        <div className="net-team">
          <div className="net-team-header">
            <Users size={16} />
            <span>Team for</span>
            <select
              value={selectedProposalId}
              onChange={e => setSelectedProposalId(e.target.value)}
              className="net-proposal-select"
            >
              {proposals.length === 0 && <option value="">No proposals yet</option>}
              {proposals.map(p => <option key={p.id} value={p.id}>{p.title}</option>)}
            </select>
          </div>

          {teamForSelected.length === 0 && (
            <p className="net-empty">Add vendors from the directory to start building this team.</p>
          )}

          <div className="net-team-list">
            {teamForSelected.map(a => {
              const vendor = vendors.find(v => v.id === a.vendor_id)
              if (!vendor) return null
              return (
                <div key={a.id} className="net-team-card">
                  <div className="net-team-card-top">
                    <div>
                      <span className="net-vendor-name">{vendor.company_name}</span>
                      <span className="net-vendor-trade">{vendor.trade_category}</span>
                    </div>
                    <button type="button" className="net-remove-btn" onClick={() => removeFromTeam(a.id)}>
                      <X size={14} />
                    </button>
                  </div>

                  <div className="net-status-row">
                    {STATUS_ORDER.map(s => (
                      <button
                        key={s}
                        type="button"
                        className={`net-status-chip ${a.status === s ? 'net-status-active' : ''}`}
                        onClick={() => updateAssignmentStatus(a.id, s)}
                      >
                        {STATUS_LABELS[s]}
                      </button>
                    ))}
                  </div>

                  <div className="net-team-actions">
                    <button
                      type="button"
                      className="btn-outline net-action-btn"
                      onClick={() => sendContract(a)}
                      disabled={contractBusyId === a.id}
                    >
                      <FileText size={13} />
                      {contractBusyId === a.id ? 'Generating…' : 'Send agreement'}
                    </button>
                    {a.status === 'contract_sent' && (
                      <button type="button" className="btn-primary net-action-btn" onClick={() => markSigned(a)}>
                        <CheckCircle2 size={13} /> Mark signed
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
