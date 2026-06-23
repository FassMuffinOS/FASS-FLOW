import { useState, useMemo, useEffect, useRef } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { DollarSign, Calculator, Clock, TrendingUp, Info, Link2, Sparkles, AlertTriangle, Gauge } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { aiEnabled, costBreakdown } from '../lib/aiClient'
import { useAuth } from '../context/AuthContext'
import './ShowMeTheMoney.css'

// FASS Flow's own pricing — kept in sync with Classroom.jsx ($99/mo flow
// subscription) and BDPartner.jsx ($500/mo BD Partner add-on).
const FASS_FLOW_MONTHLY = 99
const BD_PARTNER_MONTHLY = 500

const PAYMENT_TERMS = [
  { id: 15, label: 'Net 15', note: 'Accelerated terms under FAR 52.232-40 — common goal for paying small-business subs.' },
  { id: 30, label: 'Net 30', note: 'Standard commercial/government invoice terms.' },
  { id: 45, label: 'Net 45', note: 'Slower terms — seen on some state/local and larger prime pass-throughs.' },
]

function formatMoney(n) {
  if (!isFinite(n)) return '$0'
  return n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })
}

export default function ShowMeTheMoney() {
  const [searchParams] = useSearchParams()
  const proposalId = searchParams.get('proposalId')
  const { session } = useAuth()

  const [award, setAward] = useState('250000')
  const [months, setMonths] = useState('12')
  const [netDays, setNetDays] = useState(30)
  const [useBdPartner, setUseBdPartner] = useState(false)
  const [subPercent, setSubPercent] = useState('0')
  const [linkedProposal, setLinkedProposal] = useState(null)
  const hydratedFromProposal = useRef(false)

  // AI scope breakdown — cost estimate, complexity read, risk flags, all
  // sourced from whatever scope text the proposal already has rather than
  // a new paste box.
  const [aiResult, setAiResult] = useState(null)
  const [aiLoading, setAiLoading] = useState(false)
  const [aiError, setAiError] = useState(null)

  // When arriving from a real opportunity (Pipeline/WARDOG/R-E-A-D all pass
  // ?proposalId=), pull that proposal's title and any previously-saved
  // estimated value instead of always starting from the generic $250k
  // placeholder — this is what makes the calculator feel attached to a real
  // deal instead of a standalone demo.
  useEffect(() => {
    if (!proposalId) return
    let cancelled = false
    supabase
      .from('proposals')
      .select('id, title, agency, estimated_value, description')
      .eq('id', proposalId)
      .single()
      .then(({ data, error }) => {
        if (cancelled || error || !data) return
        setLinkedProposal(data)
        if (data.estimated_value != null) {
          setAward(String(data.estimated_value))
        }
        hydratedFromProposal.current = true
      })
    return () => { cancelled = true }
  }, [proposalId])

  async function runAiBreakdown() {
    if (!linkedProposal?.description) return
    setAiLoading(true)
    setAiError(null)
    try {
      const result = await costBreakdown({
        scopeText: linkedProposal.description,
        title: linkedProposal.title,
        agency: linkedProposal.agency,
        awardAmount: parseFloat(award) || null,
        userId: session?.user?.id,
      })
      setAiResult(result)
    } catch (err) {
      setAiError(err.message || 'Could not generate a breakdown right now.')
    } finally {
      setAiLoading(false)
    }
  }

  // Persist whatever award amount the user settles on back onto the
  // proposal so the next visit (or another tool reading this proposal)
  // sees the real number instead of losing it the moment this tab closes.
  useEffect(() => {
    if (!proposalId || !hydratedFromProposal.current) return
    const awardNum = parseFloat(award)
    if (!isFinite(awardNum)) return
    const timer = setTimeout(() => {
      supabase.from('proposals').update({ estimated_value: awardNum }).eq('id', proposalId)
    }, 600)
    return () => clearTimeout(timer)
  }, [award, proposalId])

  const calc = useMemo(() => {
    const awardNum = parseFloat(award) || 0
    const monthsNum = Math.max(parseFloat(months) || 1, 1)
    const subPct = Math.min(Math.max(parseFloat(subPercent) || 0, 0), 100)

    const monthlyAward = awardNum / monthsNum
    const fassMonthly = FASS_FLOW_MONTHLY + (useBdPartner ? BD_PARTNER_MONTHLY : 0)
    const fassTotalCost = fassMonthly * monthsNum
    const subAmount = awardNum * (subPct / 100)
    const netAfterSoftware = awardNum - fassTotalCost
    const netAfterSoftwareAndSubs = netAfterSoftware - subAmount
    const softwarePctOfAward = awardNum > 0 ? (fassTotalCost / awardNum) * 100 : 0

    // Rough cash-timing walkthrough: contract starts, first invoice typically
    // submitted ~30 days into a billing cycle, then payment lands netDays
    // after that invoice is received.
    const daysToFirstCash = 30 + netDays
    const subFlowDownDays = 15 // FAR 32.009 goal once the prime is paid

    return {
      awardNum, monthsNum, monthlyAward, fassMonthly, fassTotalCost,
      subAmount, netAfterSoftware, netAfterSoftwareAndSubs, softwarePctOfAward,
      daysToFirstCash, subFlowDownDays,
    }
  }, [award, months, netDays, useBdPartner, subPercent])

  return (
    <div className="smm">
      <div className="smm-container">
        <div className="smm-head">
          <DollarSign size={22} className="smm-head-icon" />
          <div>
            <h1>Show Me The Money</h1>
            <p>Punch in a contract award and see, in real numbers, what's left after running it through FASS Flow — plus a realistic timeline for when cash actually lands.</p>
          </div>
        </div>

        {proposalId && (
          <div className="smm-linked-banner">
            <Link2 size={14} />
            <span>
              {linkedProposal
                ? <>Editing financials for <strong>{linkedProposal.title || 'this opportunity'}</strong>{linkedProposal.agency ? ` — ${linkedProposal.agency}` : ''}. Changes save back to Pipeline automatically.</>
                : 'Loading linked opportunity…'}
            </span>
            <Link to={`/pipeline?proposalId=${proposalId}`} className="smm-linked-back">View in Pipeline →</Link>
          </div>
        )}

        <div className="smm-card">
          <div className="smm-card-head">
            <Calculator size={16} /> <span>The award</span>
          </div>
          <div className="smm-grid">
            <label className="smm-field">
              <span className="smm-label">Total award amount</span>
              <div className="smm-input-prefix">
                <span>$</span>
                <input type="number" min="0" value={award} onChange={e => setAward(e.target.value)} placeholder="250000" />
              </div>
            </label>
            <label className="smm-field">
              <span className="smm-label">Period of performance (months)</span>
              <input type="number" min="1" value={months} onChange={e => setMonths(e.target.value)} placeholder="12" />
            </label>
            <label className="smm-field">
              <span className="smm-label">% you'll pass through to subs</span>
              <div className="smm-input-suffix">
                <input type="number" min="0" max="100" value={subPercent} onChange={e => setSubPercent(e.target.value)} placeholder="0" />
                <span>%</span>
              </div>
            </label>
            <label className="smm-field">
              <span className="smm-label">Prime/agency payment terms</span>
              <div className="smm-pills">
                {PAYMENT_TERMS.map(t => (
                  <button
                    key={t.id}
                    type="button"
                    className={`smm-pill ${netDays === t.id ? 'active' : ''}`}
                    onClick={() => setNetDays(t.id)}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </label>
          </div>
          <label className="smm-checkbox-row">
            <input type="checkbox" checked={useBdPartner} onChange={e => setUseBdPartner(e.target.checked)} />
            <span>Include BD Partner add-on ($500/mo) in the breakdown</span>
          </label>
        </div>

        <div className="smm-card smm-result-card">
          <div className="smm-card-head">
            <TrendingUp size={16} /> <span>The breakdown</span>
          </div>
          <div className="smm-rows">
            <div className="smm-row">
              <span>Total award</span>
              <span className="smm-row-val">{formatMoney(calc.awardNum)}</span>
            </div>
            <div className="smm-row">
              <span>Average monthly revenue ({calc.monthsNum}-month PoP)</span>
              <span className="smm-row-val">{formatMoney(calc.monthlyAward)}</span>
            </div>
            <div className="smm-row smm-row-sub">
              <span>− FASS Flow cost over the full contract ({formatMoney(calc.fassMonthly)}/mo)</span>
              <span className="smm-row-val smm-row-neg">−{formatMoney(calc.fassTotalCost)}</span>
            </div>
            {calc.subAmount > 0 && (
              <div className="smm-row smm-row-sub">
                <span>− Subcontractor pass-through ({subPercent || 0}%)</span>
                <span className="smm-row-val smm-row-neg">−{formatMoney(calc.subAmount)}</span>
              </div>
            )}
            <div className="smm-row smm-row-total">
              <span>Net retained after software{calc.subAmount > 0 ? ' + subs' : ''}</span>
              <span className="smm-row-val">{formatMoney(calc.netAfterSoftwareAndSubs)}</span>
            </div>
          </div>
          <p className="smm-note">
            FASS Flow runs {calc.softwarePctOfAward < 0.1 ? '< 0.1' : calc.softwarePctOfAward.toFixed(1)}% of this award's total value — sourcing, scoring, drafting, and tracking the bid that won it in the first place.
          </p>
        </div>

        {aiEnabled() && proposalId && (
          <div className="smm-card">
            <div className="smm-card-head">
              <Sparkles size={16} /> <span>AI scope breakdown</span>
            </div>

            {!linkedProposal?.description && (
              <p className="smm-note">No scope text saved on this opportunity yet — pull it through WARDOG, the Inbox, or FASS FILL first, then come back here.</p>
            )}

            {linkedProposal?.description && !aiResult && !aiLoading && (
              <>
                <p className="smm-note">Run the scope of work for {linkedProposal.title || 'this opportunity'} through AI for a rough cost split, a complexity read, and any red flags worth pricing in before you bid.</p>
                <button type="button" className="smm-pill active" onClick={runAiBreakdown}>
                  <Sparkles size={13} style={{ marginRight: 6, verticalAlign: '-2px' }} />
                  Run AI breakdown
                </button>
              </>
            )}

            {aiLoading && <p className="smm-note">Reading the scope of work…</p>}

            {aiError && (
              <p className="smm-note smm-note-flex">
                <Info size={13} />
                <span>{aiError}</span>
              </p>
            )}

            {aiResult && !aiLoading && (
              <>
                <div className="smm-rows">
                  <div className="smm-row">
                    <span><Gauge size={13} style={{ marginRight: 6, verticalAlign: '-2px' }} />Complexity</span>
                    <span className="smm-row-val">{aiResult.complexity?.level || '—'}</span>
                  </div>
                  {aiResult.complexity?.crew_size && (
                    <div className="smm-row smm-row-sub">
                      <span>Estimated crew</span>
                      <span className="smm-row-val">{aiResult.complexity.crew_size}</span>
                    </div>
                  )}
                  {aiResult.complexity?.estimated_duration && (
                    <div className="smm-row smm-row-sub">
                      <span>Estimated duration</span>
                      <span className="smm-row-val">{aiResult.complexity.estimated_duration}</span>
                    </div>
                  )}
                  {(aiResult.cost_estimate?.total_low != null || aiResult.cost_estimate?.total_high != null) && (
                    <div className="smm-row smm-row-total">
                      <span>Rough cost range</span>
                      <span className="smm-row-val">
                        {aiResult.cost_estimate.total_low != null ? formatMoney(aiResult.cost_estimate.total_low) : '?'}
                        {' – '}
                        {aiResult.cost_estimate.total_high != null ? formatMoney(aiResult.cost_estimate.total_high) : '?'}
                      </span>
                    </div>
                  )}
                  {[
                    ['Labor', aiResult.cost_estimate?.labor_pct],
                    ['Materials', aiResult.cost_estimate?.materials_pct],
                    ['Equipment', aiResult.cost_estimate?.equipment_pct],
                    ['Overhead + profit', aiResult.cost_estimate?.overhead_profit_pct],
                  ].filter(([, pct]) => pct != null).map(([label, pct]) => (
                    <div className="smm-row smm-row-sub" key={label}>
                      <span>{label}</span>
                      <span className="smm-row-val">{Math.round(pct)}%</span>
                    </div>
                  ))}
                </div>

                {aiResult.complexity?.rationale && (
                  <p className="smm-note">{aiResult.complexity.rationale}</p>
                )}
                {aiResult.cost_estimate?.basis && (
                  <p className="smm-note">{aiResult.cost_estimate.basis}</p>
                )}

                {aiResult.risk_flags?.length > 0 && (
                  <div className="smm-rows" style={{ marginTop: 12 }}>
                    {aiResult.risk_flags.map((flag, i) => (
                      <div className="smm-row smm-row-sub" key={i}>
                        <span><AlertTriangle size={13} style={{ marginRight: 6, verticalAlign: '-2px' }} />{flag}</span>
                      </div>
                    ))}
                  </div>
                )}

                <p className="smm-note smm-note-flex">
                  <Info size={13} />
                  <span>Rough order-of-magnitude read to start your own estimate with — not a bid price. Re-run anytime the scope text changes.</span>
                </p>
                <button type="button" className="smm-pill" onClick={runAiBreakdown}>Run again</button>
              </>
            )}
          </div>
        )}

        <div className="smm-card">
          <div className="smm-card-head">
            <Clock size={16} /> <span>When the cash actually lands</span>
          </div>
          <div className="smm-timeline">
            <div className="smm-tl-step">
              <span className="smm-tl-day">Day 0</span>
              <span className="smm-tl-label">Contract awarded — period of performance begins</span>
            </div>
            <div className="smm-tl-step">
              <span className="smm-tl-day">~Day 30</span>
              <span className="smm-tl-label">First invoice typically submitted, end of first billing cycle</span>
            </div>
            <div className="smm-tl-step">
              <span className="smm-tl-day">~Day {calc.daysToFirstCash}</span>
              <span className="smm-tl-label">First payment received from the government/prime, under {PAYMENT_TERMS.find(t => t.id === netDays)?.label} terms</span>
            </div>
            {calc.subAmount > 0 && (
              <div className="smm-tl-step">
                <span className="smm-tl-day">~Day {calc.daysToFirstCash + calc.subFlowDownDays}</span>
                <span className="smm-tl-label">Subcontractor flow-down goal under FAR 32.009 (within 15 days of you receiving an accelerated payment)</span>
              </div>
            )}
          </div>
          <p className="smm-note smm-note-flex">
            <Info size={13} />
            <span>{PAYMENT_TERMS.find(t => t.id === netDays)?.note} The 15-day sub flow-down is a goal under clause 52.232-40, not a guaranteed deadline — plan your own cash cushion accordingly.</span>
          </p>
        </div>
      </div>
    </div>
  )
}
