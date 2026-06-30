import { useState, useMemo, useEffect } from 'react'
import {
  Calculator, Plus, Trash2, MapPin, Info, Copy, Check,
  LayoutTemplate, Save, FolderOpen, Trash, Search, Package, Sparkles,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'
import { getSuggestions } from '../lib/estimatorCompleteness'
import { scopeTakeoff, aiEnabled } from '../lib/aiClient'
import './Estimator.css'

// ── National-average unit costs (illustrative ballpark figures, not a
// licensed cost database) ───────────────────────────────────────────
// low/high = $ per unit before any regional adjustment. laborPct is the
// rough share of that cost that's labor (vs materials/equipment) — used
// only to break the total back out for budgeting conversations with subs.
const TRADES = [
  { id: 'shell',     label: 'New construction / building shell', unit: 'sq ft', low: 140, high: 380, laborPct: 0.40 },
  { id: 'demo',      label: 'Demolition',                         unit: 'sq ft', low: 2,   high: 8,   laborPct: 0.70 },
  { id: 'concrete',  label: 'Concrete flatwork / slab',            unit: 'sq ft', low: 6,   high: 13,  laborPct: 0.45 },
  { id: 'framing',   label: 'Framing / carpentry',                 unit: 'sq ft', low: 7,   high: 17,  laborPct: 0.55 },
  { id: 'roofing',   label: 'Roofing (asphalt shingle)',           unit: 'sq ft', low: 4.5, high: 11,  laborPct: 0.50 },
  { id: 'electrical',label: 'Electrical rough-in & finish',        unit: 'sq ft', low: 4,   high: 9,   laborPct: 0.60 },
  { id: 'plumbing',  label: 'Plumbing rough-in & finish',          unit: 'sq ft', low: 4.5, high: 9.5, laborPct: 0.55 },
  { id: 'hvac',      label: 'HVAC install',                        unit: 'sq ft', low: 6,   high: 13,  laborPct: 0.50 },
  { id: 'drywall',   label: 'Drywall & finishing',                 unit: 'sq ft', low: 1.8, high: 3.8, laborPct: 0.60 },
  { id: 'paint',     label: 'Interior painting',                   unit: 'sq ft', low: 1.5, high: 3.5, laborPct: 0.70 },
  { id: 'flooring',  label: 'Flooring (mid-grade)',                unit: 'sq ft', low: 4,   high: 11,  laborPct: 0.40 },
  { id: 'masonry',   label: 'Masonry / CMU wall',                  unit: 'sq ft of wall', low: 10, high: 19, laborPct: 0.50 },
  { id: 'sitework',  label: 'Site work / earthwork',               unit: 'sq ft', low: 3,   high: 9,   laborPct: 0.50 },
  { id: 'landscape', label: 'Landscaping',                         unit: 'sq ft', low: 4,   high: 12,  laborPct: 0.45 },
]
const TRADE_MAP = Object.fromEntries(TRADES.map(t => [t.id, t]))

// ── Coarse regional multiplier by ZIP leading digit ─────────────────
// U.S. ZIP codes are assigned roughly west-to-east-then-back by leading
// digit; this is a deliberately coarse proxy for regional construction
// cost variance, not a per-ZIP index. Always disclosed as approximate.
const ZIP_REGIONS = {
  0: { label: 'Northeast (CT/MA/RI/NH/ME/VT/NJ/PR)', mult: 1.20 },
  1: { label: 'NY/PA/DE',                             mult: 1.15 },
  2: { label: 'Mid-Atlantic (VA/MD/DC/NC/SC/WV)',     mult: 1.05 },
  3: { label: 'Southeast (FL/GA/AL/TN/MS)',           mult: 0.95 },
  4: { label: 'East North Central (KY/IN/MI/OH)',     mult: 1.00 },
  5: { label: 'Upper Midwest (IA/MN/MT/ND/SD/WI)',    mult: 0.95 },
  6: { label: 'Central (IL/MO/KS/NE)',                mult: 0.95 },
  7: { label: 'South Central (TX/OK/AR/LA)',          mult: 0.90 },
  8: { label: 'Mountain (CO/WY/UT/AZ/NM/ID/NV)',      mult: 1.00 },
  9: { label: 'West Coast (CA/OR/WA/AK/HI)',          mult: 1.30 },
}

// ── Generic property templates (illustrative scope + typical sq ft only —
// not an appraisal or insurance-grade model) ────────────────────────
// Picking a template prefills a typical trade scope at an assumed sq ft so
// a GC/sub/independent estimator can start from "3 bed / 2 bath" instead of
// adding every trade line by hand, then adjust qty per line as needed.
const SCOPE_TRADES = {
  remodel: ['demo', 'framing', 'electrical', 'plumbing', 'hvac', 'drywall', 'paint', 'flooring'],
  newbuild: ['shell', 'concrete', 'roofing', 'electrical', 'plumbing', 'hvac', 'drywall', 'paint', 'flooring', 'sitework'],
  ti: ['demo', 'electrical', 'plumbing', 'hvac', 'drywall', 'paint', 'flooring'],
}

const PROPERTY_TEMPLATES = [
  { id: 'studio_1ba', label: 'Studio / 1 Bath (~600 sq ft)', sqft: 600, scope: 'remodel' },
  { id: '2bed_1ba', label: '2 Bed / 1 Bath (~950 sq ft)', sqft: 950, scope: 'remodel' },
  { id: '3bed_2ba', label: '3 Bed / 2 Bath (~1,500 sq ft)', sqft: 1500, scope: 'remodel' },
  { id: '4bed_2_5ba', label: '4 Bed / 2.5 Bath (~2,200 sq ft)', sqft: 2200, scope: 'remodel' },
  { id: '5bed_3ba', label: '5+ Bed / 3+ Bath new build (~3,000 sq ft)', sqft: 3000, scope: 'newbuild' },
  { id: 'commercial_ti', label: 'Small commercial tenant improvement (~2,000 sq ft)', sqft: 2000, scope: 'ti' },
]
const TEMPLATE_MAP = Object.fromEntries(PROPERTY_TEMPLATES.map(t => [t.id, t]))

function regionForZip(zip) {
  const d = zip?.trim()?.[0]
  if (d == null || !/[0-9]/.test(d)) return null
  return ZIP_REGIONS[Number(d)]
}

function fmt(n) {
  return `$${Math.round(n).toLocaleString()}`
}

export default function Estimator() {
  const { session } = useAuth()
  const [zip, setZip] = useState('')
  const [lines, setLines] = useState([])
  const [tradeId, setTradeId] = useState(TRADES[0].id)
  const [qty, setQty] = useState('')
  const [overheadPct, setOverheadPct] = useState(15)
  const [copied, setCopied] = useState(false)

  const [templateId, setTemplateId] = useState('')
  const [savedEstimates, setSavedEstimates] = useState([])
  const [savedLoading, setSavedLoading] = useState(true)
  const [saveName, setSaveName] = useState('')
  const [saving, setSaving] = useState(false)
  const [saveMsg, setSaveMsg] = useState('')

  // Link this estimate to a bid in the pipeline, so won work lives on the
  // same record as the opportunity. Prefilled when launched from a Pipeline
  // card (?proposalId=…), or pick one manually.
  const [proposals, setProposals] = useState([])
  const [linkProposalId, setLinkProposalId] = useState(
    () => new URLSearchParams(window.location.search).get('proposalId') || ''
  )

  // Materials mode: a shared catalog + the user's own items, searched and
  // added as real line items alongside the trade-based ballpark.
  const [catalog, setCatalog] = useState([])
  const [userMaterials, setUserMaterials] = useState([])
  const [matQuery, setMatQuery] = useState('')
  const [showCustom, setShowCustom] = useState(false)
  const [custom, setCustom] = useState({ name: '', category: '', unit: 'ea', price: '' })

  const region = useMemo(() => regionForZip(zip), [zip])
  const mult = region?.mult ?? 1

  useEffect(() => {
    if (!session?.user?.id) { setSavedLoading(false); return }
    let cancelled = false
    supabase
      .from('estimator_saved_estimates')
      .select('*')
      .eq('user_id', session.user.id)
      .order('created_at', { ascending: false })
      .then(({ data }) => { if (!cancelled) { setSavedEstimates(data || []); setSavedLoading(false) } })
    supabase
      .from('proposals')
      .select('id, title, stage, description, naics_code, agency')
      .eq('user_id', session.user.id)
      .order('created_at', { ascending: false })
      .then(({ data }) => { if (!cancelled) setProposals(data || []) })
    supabase
      .from('material_catalog')
      .select('*')
      .order('category', { ascending: true })
      .then(({ data }) => { if (!cancelled) setCatalog(data || []) })
    supabase
      .from('user_materials')
      .select('*')
      .eq('user_id', session.user.id)
      .order('created_at', { ascending: false })
      .then(({ data }) => { if (!cancelled) setUserMaterials(data || []) })
    return () => { cancelled = true }
  }, [session?.user?.id])

  function addLine(e) {
    e.preventDefault()
    const q = parseFloat(qty)
    if (!q || q <= 0) return
    setLines(prev => [...prev, { id: `${tradeId}-${Date.now()}`, tradeId, qty: q }])
    setQty('')
  }

  function removeLine(id) {
    setLines(prev => prev.filter(l => l.id !== id))
  }

  // Adjust qty on a material line in place (trade qty is set at add-time).
  function setLineQty(id, q) {
    setLines(prev => prev.map(l => l.id === id ? { ...l, qty: Math.max(0, Number(q) || 0) } : l))
  }

  function addMaterialLine(m) {
    setLines(prev => [...prev, {
      id: `m-${Date.now()}-${Math.random()}`,
      type: 'material',
      name: m.name,
      unit: m.unit || 'ea',
      price: Number(m.base_price ?? m.price) || 0,
      qty: 1,
    }])
    setMatQuery('')
  }

  // Save a user's own item to their private catalog AND drop it on the
  // estimate — never a dead end if it's not in our list.
  async function addCustomMaterial(e) {
    e.preventDefault()
    if (!custom.name.trim() || custom.price === '') return
    const row = {
      user_id: session.user.id,
      name: custom.name.trim(),
      category: custom.category.trim() || 'Custom',
      unit: custom.unit.trim() || 'ea',
      price: Number(custom.price) || 0,
    }
    const { data } = await supabase.from('user_materials').insert(row).select().single()
    if (data) setUserMaterials(prev => [data, ...prev])
    addMaterialLine(row)
    setCustom({ name: '', category: '', unit: 'ea', price: '' })
    setShowCustom(false)
  }

  // Prefills a typical trade scope at an assumed sq ft for the chosen
  // property size — a starting point to edit, not a final takeoff.
  function applyTemplate(id) {
    setTemplateId(id)
    const t = TEMPLATE_MAP[id]
    if (!t) return
    const scopeTrades = SCOPE_TRADES[t.scope] || []
    setLines(scopeTrades.map(tid => ({ id: `${tid}-${Date.now()}-${Math.random()}`, tradeId: tid, qty: t.sqft })))
  }

  async function saveEstimate() {
    if (!session?.user?.id || !saveName.trim() || !computed.length) return
    setSaving(true)
    setSaveMsg('')
    const payload = {
      user_id: session.user.id,
      name: saveName.trim(),
      zip,
      property_template: templateId || null,
      lines: lines.map(l => l.type === 'material'
        ? { type: 'material', name: l.name, unit: l.unit, price: l.price, qty: l.qty }
        : { tradeId: l.tradeId, qty: l.qty }),
      overhead_pct: overheadPct,
      proposal_id: linkProposalId || null,
      // Snapshot computed cost (subtotal, pre-overhead) + priced total so a
      // Client Proposal can pull real numbers for its Margin Guard later.
      subtotal_low: subtotalLow,
      subtotal_high: subtotalHigh,
      total_low: totalLow,
      total_high: totalHigh,
    }
    const { data, error } = await supabase.from('estimator_saved_estimates').insert(payload).select().single()
    setSaving(false)
    if (error) { setSaveMsg(error.message); return }
    setSavedEstimates(prev => [data, ...prev])
    setSaveName('')
    setSaveMsg('Saved')
    setTimeout(() => setSaveMsg(''), 2000)
  }

  function loadEstimate(est) {
    setZip(est.zip || '')
    setTemplateId(est.property_template || '')
    setOverheadPct(est.overhead_pct ?? 15)
    setLines((est.lines || []).map(l => l.type === 'material'
      ? { id: `m-${Date.now()}-${Math.random()}`, type: 'material', name: l.name, unit: l.unit, price: l.price, qty: l.qty }
      : { id: `${l.tradeId}-${Date.now()}-${Math.random()}`, tradeId: l.tradeId, qty: l.qty }))
  }

  async function deleteEstimate(id) {
    setSavedEstimates(prev => prev.filter(e => e.id !== id))
    await supabase.from('estimator_saved_estimates').delete().eq('id', id)
  }

  const computed = useMemo(() => lines.map(l => {
    if (l.type === 'material') {
      const amt = (Number(l.price) || 0) * (Number(l.qty) || 0)
      // Materials are priced as entered (region adj. applies to the trade
      // ballpark, not to a real unit price you set), and are 100% material.
      return { ...l, isMaterial: true, label: l.name, unit: l.unit || 'ea', low: amt, high: amt, laborPct: 0 }
    }
    const t = TRADE_MAP[l.tradeId]
    const low = t.low * l.qty * mult
    const high = t.high * l.qty * mult
    return { ...l, isMaterial: false, trade: t, label: t.label, unit: t.unit, low, high, laborPct: t.laborPct }
  }), [lines, mult])

  // Search across the user's own items first, then the shared catalog.
  const matMatches = useMemo(() => {
    const q = matQuery.trim().toLowerCase()
    if (!q) return []
    const own = userMaterials.map(m => ({ ...m, __custom: true }))
    return [...own, ...catalog]
      .filter(m => m.name.toLowerCase().includes(q) || (m.category || '').toLowerCase().includes(q))
      .slice(0, 8)
  }, [matQuery, catalog, userMaterials])

  // Completeness assistant — scope comes from the linked bid + the template.
  const projectContext = useMemo(() => {
    const p = proposals.find(x => x.id === linkProposalId)
    const t = PROPERTY_TEMPLATES.find(x => x.id === templateId)
    return [p?.title, t?.label].filter(Boolean).join(' ')
  }, [proposals, linkProposalId, templateId])

  const suggestions = useMemo(
    () => getSuggestions({ projectContext, lines, catalog }),
    [projectContext, lines, catalog]
  )
  const suggestionCount = suggestions.reduce((n, g) => n + g.items.length, 0)

  function addSuggestion(s) {
    addMaterialLine({ name: s.name, unit: s.unit, price: s.price })
  }
  function addAllSuggestions() {
    suggestions.forEach(g => g.items.forEach(addSuggestion))
  }

  // ── AI scope understanding (reads the real solicitation) ──────────
  const linkedProposal = proposals.find(p => p.id === linkProposalId) || null
  const [scopeLoading, setScopeLoading] = useState(false)
  const [scopeResult, setScopeResult] = useState(null)
  const [scopeError, setScopeError] = useState('')

  async function runScopeTakeoff() {
    if (!linkedProposal) return
    setScopeLoading(true); setScopeError(''); setScopeResult(null)
    try {
      const res = await scopeTakeoff({
        scopeText: linkedProposal.description || linkedProposal.title || '',
        title: linkedProposal.title || '',
        agency: linkedProposal.agency || '',
        naicsCode: linkedProposal.naics_code || '',
        userId: session?.user?.id,
      })
      setScopeResult(res)
    } catch (e) {
      setScopeError(e.message || 'Could not read the scope — try again.')
    } finally {
      setScopeLoading(false)
    }
  }

  // Map an AI-suggested material onto a catalog price if we can, else add
  // it at $0 for the user to fill in.
  function addAiMaterial(m) {
    const q = (m.name || '').toLowerCase()
    const match = catalog.find(c => q.includes(c.name.toLowerCase()) || c.name.toLowerCase().includes(q.slice(0, 14)))
    addMaterialLine({ name: m.name, unit: match?.unit || 'ea', price: match?.base_price ?? 0 })
  }

  const subtotalLow = computed.reduce((s, l) => s + l.low, 0)
  const subtotalHigh = computed.reduce((s, l) => s + l.high, 0)
  const overheadLow = subtotalLow * (overheadPct / 100)
  const overheadHigh = subtotalHigh * (overheadPct / 100)
  const totalLow = subtotalLow + overheadLow
  const totalHigh = subtotalHigh + overheadHigh

  const laborLow = computed.reduce((s, l) => s + l.low * l.laborPct, 0)
  const laborHigh = computed.reduce((s, l) => s + l.high * l.laborPct, 0)
  const materialLow = subtotalLow - laborLow
  const materialHigh = subtotalHigh - laborHigh

  function copySummary() {
    const lines_ = computed.map(l => l.isMaterial
      ? `${l.label} (${l.qty} ${l.unit} @ ${fmt(l.price)}): ${fmt(l.low)}`
      : `${l.label} (${l.qty} ${l.unit}): ${fmt(l.low)}–${fmt(l.high)}`)
    const text = [
      `FASS Flow Estimate — ZIP ${zip || '—'}${region ? ` (${region.label}, ${mult}x regional adj.)` : ''}`,
      ...lines_,
      `Overhead & profit (${overheadPct}%): ${fmt(overheadLow)}–${fmt(overheadHigh)}`,
      `TOTAL: ${fmt(totalLow)}–${fmt(totalHigh)}`,
      `Materials ~${fmt(materialLow)}–${fmt(materialHigh)} · Labor ~${fmt(laborLow)}–${fmt(laborHigh)}`,
      '(Ballpark estimate from national-average unit costs — confirm against actual sub/vendor quotes before bidding.)',
    ].join('\n')
    navigator.clipboard?.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="est">
      <div className="est-header">
        <div>
          <h1><Calculator size={22} /> Estimator</h1>
          <p>A quick, zip-code-adjusted cost estimate for general contractors and subs — add the trades on the job, get a line-item range in about 15–20 minutes.</p>
        </div>
      </div>

      <div className="est-card">
        <div className="est-zip-row">
          <MapPin size={16} />
          <input
            className="est-zip-input"
            placeholder="Project ZIP code"
            value={zip}
            maxLength={10}
            onChange={e => setZip(e.target.value.replace(/[^0-9]/g, ''))}
          />
          {region && <span className="est-region-tag">{region.label} · {region.mult}x</span>}
        </div>

        <div className="est-template-row">
          <LayoutTemplate size={15} />
          <select value={templateId} onChange={e => applyTemplate(e.target.value)}>
            <option value="">Start from a template…</option>
            {PROPERTY_TEMPLATES.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
          </select>
          <span className="est-template-hint">Prefills a typical scope at the listed sq ft — edit any line after.</span>
        </div>

        <form className="est-form-row" onSubmit={addLine}>
          <select value={tradeId} onChange={e => setTradeId(e.target.value)}>
            {TRADES.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
          </select>
          <input
            type="number"
            min="0"
            step="any"
            placeholder={`Qty (${TRADE_MAP[tradeId].unit})`}
            value={qty}
            onChange={e => setQty(e.target.value)}
          />
          <button className="est-btn est-btn-primary" type="submit"><Plus size={14} /> Add</button>
        </form>

        {/* Materials mode — search the catalog + your own items, or add a new one */}
        <div className="est-materials">
          <div className="est-mat-search">
            <Search size={15} className="est-mat-search-icon" />
            <input
              placeholder="Search materials — 2x4, drywall, concrete, caulk…"
              value={matQuery}
              onChange={e => setMatQuery(e.target.value)}
            />
            <button type="button" className="est-btn" onClick={() => setShowCustom(s => !s)}>
              <Plus size={14} /> Add your own
            </button>
          </div>

          {matQuery && (
            <div className="est-mat-results">
              {matMatches.length === 0 && (
                <p className="est-mat-none">No match — use “Add your own” to add it.</p>
              )}
              {matMatches.map(m => (
                <button
                  key={(m.__custom ? 'u-' : 'c-') + m.id}
                  type="button"
                  className="est-mat-result"
                  onClick={() => addMaterialLine(m)}
                >
                  <span className="est-mat-name">
                    <Package size={13} /> {m.name}
                    {m.__custom && <span className="est-line-tag">your item</span>}
                  </span>
                  <span className="est-mat-cat">{m.category} · {fmt(m.base_price ?? m.price)}/{m.unit}</span>
                </button>
              ))}
            </div>
          )}

          {showCustom && (
            <form className="est-mat-custom" onSubmit={addCustomMaterial}>
              <input
                placeholder="Item name *"
                value={custom.name}
                onChange={e => setCustom(c => ({ ...c, name: e.target.value }))}
              />
              <input
                placeholder="Category"
                value={custom.category}
                onChange={e => setCustom(c => ({ ...c, category: e.target.value }))}
              />
              <input
                placeholder="Unit"
                value={custom.unit}
                onChange={e => setCustom(c => ({ ...c, unit: e.target.value }))}
              />
              <input
                type="number" min="0" step="any" placeholder="Price *"
                value={custom.price}
                onChange={e => setCustom(c => ({ ...c, price: e.target.value }))}
              />
              <button className="est-btn est-btn-primary" type="submit" disabled={!custom.name.trim() || custom.price === ''}>
                Save &amp; add
              </button>
            </form>
          )}
        </div>

        {!computed.length && <p className="est-empty-note">Add a trade for the ballpark, or search materials for a real line-item takeoff — framing, drywall, caulk, whatever's in play. The estimate builds line by line.</p>}

        {!!computed.length && (
          <div className="est-line-list">
            {computed.map(l => (
              <div className="est-line" key={l.id}>
                <div className="est-line-main">
                  <div className="est-line-title">
                    {l.label}
                    {l.isMaterial && <span className="est-line-tag">material</span>}
                  </div>
                  <div className="est-line-meta">
                    {l.isMaterial
                      ? <>
                          <input
                            className="est-line-qty"
                            type="number" min="0" step="any"
                            value={l.qty}
                            onChange={e => setLineQty(l.id, e.target.value)}
                          /> {l.unit} · {fmt(l.price)}/unit
                        </>
                      : <>{l.qty} {l.unit} · ${l.trade.low}–${l.trade.high}/unit{mult !== 1 ? ` × ${mult} regional` : ''}</>}
                  </div>
                </div>
                <div className="est-line-amount">{l.isMaterial ? fmt(l.low) : `${fmt(l.low)}–${fmt(l.high)}`}</div>
                <button className="est-icon-btn" onClick={() => removeLine(l.id)}><Trash2 size={15} /></button>
              </div>
            ))}
          </div>
        )}
      </div>

      {aiEnabled() && linkedProposal && (
        <div className="est-card est-scope">
          <div className="est-complete-head">
            <Sparkles size={18} className="est-complete-icon" />
            <h2>Understand this job</h2>
            <button className="est-btn est-scope-run" onClick={runScopeTakeoff} disabled={scopeLoading}>
              {scopeLoading ? 'Reading the solicitation…' : scopeResult ? 'Re-read' : 'Read the solicitation'}
            </button>
          </div>
          <p className="est-complete-sub">
            Reads the real solicitation text on <strong>{linkedProposal.title}</strong>, classifies what kind of job it is, and only suggests materials that fit — so an inspection job doesn't get construction materials.
          </p>

          {scopeError && <p className="est-scope-error">{scopeError}</p>}

          {scopeResult && (
            <div className="est-scope-result">
              <div className="est-scope-type">
                <span className="est-scope-badge">{scopeResult.job_type}</span>
                {scopeResult.job_type_reason && <span className="est-scope-reason">{scopeResult.job_type_reason}</span>}
              </div>
              {scopeResult.scope_summary && <p className="est-scope-summary">{scopeResult.scope_summary}</p>}

              {scopeResult.scope_items?.length > 0 && (
                <div className="est-scope-block">
                  <p className="est-scope-label">Scope of work</p>
                  <ul className="est-scope-list">
                    {scopeResult.scope_items.map((s, i) => <li key={i}>{s}</li>)}
                  </ul>
                </div>
              )}

              {scopeResult.materials?.length > 0 && (
                <div className="est-scope-block">
                  <p className="est-scope-label">Materials this scope actually needs</p>
                  {scopeResult.materials.map((m, i) => (
                    <div className="est-complete-item" key={i}>
                      <div className="est-complete-item-main">
                        <div className="est-complete-item-name">
                          {m.name}{m.category && <span className="est-line-tag">{m.category}</span>}
                        </div>
                        <div className="est-complete-item-why">
                          {m.why && <><span className="est-complete-k">Why:</span> {m.why} </>}
                          {m.for_item && <><span className="est-complete-k">For:</span> {m.for_item} </>}
                          {m.qty_basis && <>· <span className="est-complete-k">Qty:</span> {m.qty_basis}</>}
                        </div>
                      </div>
                      <div className="est-complete-item-side">
                        <button className="est-btn" onClick={() => addAiMaterial(m)}><Plus size={13} /> Add</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {scopeResult.excluded?.length > 0 && (
                <div className="est-scope-excluded">
                  <p className="est-scope-label">Deliberately ruled out (so we don't over-order)</p>
                  <ul className="est-scope-list">
                    {scopeResult.excluded.map((s, i) => <li key={i}>{s}</li>)}
                  </ul>
                </div>
              )}

              <p className="est-complete-foot">AI read of the solicitation text — confirm against the real documents before bidding.{scopeResult.model ? ` (${scopeResult.model})` : ''}</p>
            </div>
          )}
        </div>
      )}

      {suggestionCount > 0 && !scopeResult && (
        <div className="est-card est-complete">
          <div className="est-complete-head">
            <Sparkles size={18} className="est-complete-icon" />
            <h2>Completeness check</h2>
            <span className="est-complete-count">{suggestionCount} likely missing</span>
          </div>
          <p className="est-complete-sub">
            Based on {projectContext ? <strong>{projectContext}</strong> : 'this job'} and your line items, here's what jobs like this usually need that you haven't added — with why, and what for.
          </p>

          {suggestions.map((g, gi) => (
            <div className="est-complete-group" key={gi}>
              <div className="est-complete-group-head">
                <span className="est-complete-group-name">{g.group}</span>
                {g.note && <span className="est-complete-group-note">{g.note}</span>}
              </div>
              {g.items.map((s, si) => (
                <div className="est-complete-item" key={si}>
                  <div className="est-complete-item-main">
                    <div className="est-complete-item-name">{s.name}</div>
                    <div className="est-complete-item-why">
                      <span className="est-complete-k">Why:</span> {s.why}. <span className="est-complete-k">For:</span> {s.forItem}.
                    </div>
                  </div>
                  <div className="est-complete-item-side">
                    <span className="est-complete-price">{fmt(s.price)}/{s.unit}</span>
                    <button className="est-btn" onClick={() => addSuggestion(s)}><Plus size={13} /> Add</button>
                  </div>
                </div>
              ))}
            </div>
          ))}

          <button className="est-btn est-btn-primary est-complete-all" onClick={addAllSuggestions}>
            <Check size={14} /> Add all {suggestionCount}
          </button>
          <p className="est-complete-foot">Suggestions from the project scope + your line items — sanity-check quantities against the real plans.</p>
        </div>
      )}

      {!!computed.length && (
        <div className="est-card">
          <div className="est-row">
            <h2>Overhead &amp; profit</h2>
            <div className="est-overhead-control">
              <input
                type="range" min="0" max="30" step="1"
                value={overheadPct}
                onChange={e => setOverheadPct(Number(e.target.value))}
              />
              <span>{overheadPct}%</span>
            </div>
          </div>

          <div className="est-summary-grid">
            <div className="est-summary-item"><label>Subtotal</label><span>{fmt(subtotalLow)}–{fmt(subtotalHigh)}</span></div>
            <div className="est-summary-item"><label>Overhead &amp; profit</label><span>{fmt(overheadLow)}–{fmt(overheadHigh)}</span></div>
            <div className="est-summary-item est-summary-total"><label>Total estimate</label><span>{fmt(totalLow)}–{fmt(totalHigh)}</span></div>
          </div>
          <div className="est-split-row">
            <span>Materials ~{fmt(materialLow)}–{fmt(materialHigh)}</span>
            <span>Labor ~{fmt(laborLow)}–{fmt(laborHigh)}</span>
          </div>

          <button className="est-btn" onClick={copySummary}>
            {copied ? <><Check size={14} /> Copied</> : <><Copy size={14} /> Copy summary</>}
          </button>

          {session?.user?.id && (
            <div className="est-save-row">
              <input
                type="text"
                placeholder="Name this estimate (e.g. 123 Main St — kitchen remodel)"
                value={saveName}
                onChange={e => setSaveName(e.target.value)}
              />
              {proposals.length > 0 && (
                <select
                  className="est-link-select"
                  value={linkProposalId}
                  onChange={e => setLinkProposalId(e.target.value)}
                  title="Link this estimate to a bid in your pipeline"
                >
                  <option value="">Link to a bid (optional)…</option>
                  {proposals.map(p => (
                    <option key={p.id} value={p.id}>{p.title}</option>
                  ))}
                </select>
              )}
              <button className="est-btn est-btn-primary" onClick={saveEstimate} disabled={saving || !saveName.trim()}>
                <Save size={14} /> {saving ? 'Saving…' : 'Save estimate'}
              </button>
              {saveMsg && <span className="est-save-msg">{saveMsg}</span>}
            </div>
          )}
        </div>
      )}

      {session?.user?.id && (
        <div className="est-card">
          <div className="est-row">
            <h2><FolderOpen size={16} /> Saved estimates</h2>
          </div>
          {savedLoading && <p className="est-empty-note">Loading…</p>}
          {!savedLoading && savedEstimates.length === 0 && (
            <p className="est-empty-note">Nothing saved yet — build an estimate above and save it to reload later.</p>
          )}
          {!savedLoading && savedEstimates.length > 0 && (
            <div className="est-saved-list">
              {savedEstimates.map(est => (
                <div className="est-saved-item" key={est.id}>
                  <div className="est-saved-main">
                    <div className="est-saved-name">{est.name}</div>
                    <div className="est-saved-meta">
                      {est.zip ? `ZIP ${est.zip}` : 'No ZIP'}
                      {est.property_template && TEMPLATE_MAP[est.property_template] ? ` · ${TEMPLATE_MAP[est.property_template].label}` : ''}
                      {' · '}{(est.lines || []).length} line{(est.lines || []).length === 1 ? '' : 's'}
                    </div>
                  </div>
                  <button className="est-btn" onClick={() => loadEstimate(est)}>Load</button>
                  <button className="est-icon-btn" onClick={() => deleteEstimate(est.id)}><Trash size={15} /></button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="est-disclaimer">
        <Info size={14} />
        <p>These are ballpark figures from national-average unit costs with a coarse regional adjustment based on your ZIP code's leading digit — not a licensed cost database (like RSMeans) and not a substitute for actual quotes from your subs and vendors. Use it to sanity-check pricing before you bid, not as your final number.</p>
      </div>
    </div>
  )
}
