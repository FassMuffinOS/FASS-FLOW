import { useState, useMemo } from 'react'
import {
  Calculator, Plus, Trash2, MapPin, Info, Copy, Check,
} from 'lucide-react'
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

function regionForZip(zip) {
  const d = zip?.trim()?.[0]
  if (d == null || !/[0-9]/.test(d)) return null
  return ZIP_REGIONS[Number(d)]
}

function fmt(n) {
  return `$${Math.round(n).toLocaleString()}`
}

export default function Estimator() {
  const [zip, setZip] = useState('')
  const [lines, setLines] = useState([])
  const [tradeId, setTradeId] = useState(TRADES[0].id)
  const [qty, setQty] = useState('')
  const [overheadPct, setOverheadPct] = useState(15)
  const [copied, setCopied] = useState(false)

  const region = useMemo(() => regionForZip(zip), [zip])
  const mult = region?.mult ?? 1

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
        </div>
      )}

      <div className="est-disclaimer">
        <Info size={14} />
        <p>These are ballpark figures from national-average unit costs with a coarse regional adjustment based on your ZIP code's leading digit — not a licensed cost database (like RSMeans) and not a substitute for actual quotes from your subs and vendors. Use it to sanity-check pricing before you bid, not as your final number.</p>
      </div>
    </div>
  )
}
