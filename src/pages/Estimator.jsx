import { useState, useMemo, useEffect } from 'react'
import {
  Calculator, Plus, Trash2, MapPin, Info, Copy, Check,
  LayoutTemplate, Save, FolderOpen, Trash,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'
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
      lines: lines.map(l => ({ tradeId: l.tradeId, qty: l.qty })),
      overhead_pct: overheadPct,
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
    setLines((est.lines || []).map(l => ({ id: `${l.tradeId}-${Date.now()}-${Math.random()}`, tradeId: l.tradeId, qty: l.qty })))
  }

  async function deleteEstimate(id) {
    setSavedEstimates(prev => prev.filter(e => e.id !== id))
    await supabase.from('estimator_saved_estimates').delete().eq('id', id)
  }

  const computed = useMemo(() => lines.map(l => {
    const t = TRADE_MAP[l.tradeId]
    const low = t.low * l.qty * mult
    const high = t.high * l.qty * mult
    return { ...l, trade: t, low, high }
  }), [lines, mult])

  const subtotalLow = computed.reduce((s, l) => s + l.low, 0)
  const subtotalHigh = computed.reduce((s, l) => s + l.high, 0)
  const overheadLow = subtotalLow * (overheadPct / 100)
  const overheadHigh = subtotalHigh * (overheadPct / 100)
  const totalLow = subtotalLow + overheadLow
  const totalHigh = subtotalHigh + overheadHigh

  const laborLow = computed.reduce((s, l) => s + l.low * l.trade.laborPct, 0)
  const laborHigh = computed.reduce((s, l) => s + l.high * l.trade.laborPct, 0)
  const materialLow = subtotalLow - laborLow
  const materialHigh = subtotalHigh - laborHigh

  function copySummary() {
    const lines_ = computed.map(l => `${l.trade.label} (${l.qty} ${l.trade.unit}): ${fmt(l.low)}–${fmt(l.high)}`)
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

        {!computed.length && <p className="est-empty-note">Add a trade above for each scope on the job — framing, electrical, roofing, whatever's in play — and the estimate builds line by line.</p>}

        {!!computed.length && (
          <div className="est-line-list">
            {computed.map(l => (
              <div className="est-line" key={l.id}>
                <div className="est-line-main">
                  <div className="est-line-title">{l.trade.label}</div>
                  <div className="est-line-meta">{l.qty} {l.trade.unit} · ${l.trade.low}–${l.trade.high}/unit{mult !== 1 ? ` × ${mult} regional` : ''}</div>
                </div>
                <div className="est-line-amount">{fmt(l.low)}–{fmt(l.high)}</div>
                <button className="est-icon-btn" onClick={() => removeLine(l.id)}><Trash2 size={15} /></button>
              </div>
            ))}
          </div>
        )}
      </div>

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
