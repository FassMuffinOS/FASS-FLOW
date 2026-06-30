import { useEffect, useMemo, useState } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import {
  ClipboardCheck, ClipboardList, Building2, Calendar, Hash, LayoutGrid,
  Sparkles, TrendingUp, Users, DollarSign, ShieldAlert, AlertTriangle, Radar,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'
import { aiEnabled, scoreOpportunity } from '../lib/aiClient'
import {
  intelEnabled, getIncumbentHistory, forecastRecompete, listMyReports, startIntelReportCheckout,
} from '../lib/intelligenceClient'
import Read from './Read'
import Fill from './Fill'
import OpportunityContext from '../components/OpportunityContext'
import './OpportunityWorkspace.css'

// The Opportunity Workspace replaces the old WARDOG -> R-E-A-D -> FASS FILL
// hard-navigation hand-off with a single persistent shell: one pinned header
// for the opportunity's identity, and a Decide/Draft tab strip that swaps
// panels with local state instead of a route change. Read and Fill are
// rendered unchanged underneath (in "embedded" mode, which only hides their
// own duplicate header) — they keep reading the exact same query-string
// contract (title/agency/naics/setaside/due/proposalId/new) they always have,
// just from the /opportunity/:proposalId URL instead of /read or /fill.
//
// This is Phase 1 of the spec in docs/opportunity-workspace-spec.md: a thin
// wrapper, no shared-state refactor yet. Phase 2 lifts the proposal fetch
// into shared context so Read/Fill stop independently re-querying Supabase.
export default function OpportunityWorkspace() {
  const { proposalId } = useParams()
  const [searchParams, setSearchParams] = useSearchParams()
  const { user } = useAuth()

  const panelParam = searchParams.get('panel')
  const panel = panelParam === 'draft' ? 'draft' : panelParam === 'workspace' ? 'workspace' : 'decide'

  const title = searchParams.get('title') || 'Untitled Opportunity'
  const agency = searchParams.get('agency') || ''
  const naics = searchParams.get('naics') || ''
  const due = searchParams.get('due') || ''

  const daysUntilDue = useMemo(() => {
    if (!due) return null
    const d = Math.ceil((new Date(due).getTime() - Date.now()) / 86400000)
    return Number.isNaN(d) ? null : d
  }, [due])

  // Phase 2: the "first five seconds" read. The instant someone lands on a
  // found opportunity they get a real (LLM-grounded, never placeholder)
  // fit score, win probability, competition level, revenue range, required
  // certs, and a plain "why this opportunity" explanation — instead of the
  // bare title/agency/NAICS Phase 1 shipped with. Silently skipped if no
  // AI provider is configured (aiEnabled()) or there's no proposal/solici-
  // tation text yet to ground it in.
  const [score, setScore] = useState(null)
  const [scoreLoading, setScoreLoading] = useState(false)
  const [scoreError, setScoreError] = useState('')

  useEffect(() => {
    let cancelled = false
    if (!proposalId || !aiEnabled()) return
    setScore(null)
    setScoreError('')

    async function run() {
      setScoreLoading(true)
      try {
        const [{ data: proposal }, { data: profile }] = await Promise.all([
          supabase
            .from('proposals')
            .select('description, naics_code, estimated_value, due_date')
            .eq('id', proposalId)
            .single(),
          user?.id
            ? supabase
                .from('profiles')
                .select('company_name, naics_codes, certifications, past_performance')
                .eq('id', user.id)
                .single()
            : Promise.resolve({ data: null }),
        ])

        const solicitationText = proposal?.description || ''
        if (cancelled || !solicitationText.trim()) {
          setScoreLoading(false)
          return
        }

        const result = await scoreOpportunity({
          solicitationText,
          title,
          agency,
          solicitationNaics: proposal?.naics_code || naics,
          dueDate: proposal?.due_date || due,
          awardAmount: proposal?.estimated_value || null,
          businessName: profile?.company_name || '',
          businessNaics: Array.isArray(profile?.naics_codes) ? profile.naics_codes.join(', ') : (profile?.naics_codes || ''),
          businessCertifications: profile?.certifications || [],
          pastPerformance: profile?.past_performance || [],
          userId: user?.id,
        })
        if (!cancelled) setScore(result)
      } catch (e) {
        if (!cancelled) setScoreError(e.message || 'Could not score this opportunity')
      } finally {
        if (!cancelled) setScoreLoading(false)
      }
    }
    run()
    return () => { cancelled = true }
  }, [proposalId]) // eslint-disable-line

  // WARDOG Intel — Enterprise plan = unlimited access. Everyone else can
  // buy a single $39 report (see intelligence.py /checkout) — activeReportId
  // is that report's id, the thing that unlocks the panel for non-Enterprise
  // users. Gated server-side too either way, but checking profiles.plan
  // here first avoids firing a request that's just going to come back as
  // a paywall.
  const [enterprisePlan, setEnterprisePlan] = useState(false)
  const [intel, setIntel] = useState(null)
  const [intelLoading, setIntelLoading] = useState(false)
  const [intelError, setIntelError] = useState('')
  const [forecast, setForecast] = useState(null)
  const [forecastLoading, setForecastLoading] = useState(false)
  const [forecastError, setForecastError] = useState('')
  const [myReports, setMyReports] = useState([])
  const [activeReportId, setActiveReportId] = useState('')
  const [buyingReport, setBuyingReport] = useState(false)
  const [buyError, setBuyError] = useState('')

  useEffect(() => {
    let cancelled = false
    if (!user?.id || !intelEnabled()) return

    async function checkPlan() {
      const { data } = await supabase.from('profiles').select('plan').eq('id', user.id).single()
      if (!cancelled) setEnterprisePlan(data?.plan === 'enterprise')
    }
    checkPlan()
    return () => { cancelled = true }
  }, [user?.id])

  // Picks up the redirect back from Stripe Checkout (?intel_unlock=success
  // &report_id=...) and cleans the URL so a refresh doesn't re-trigger it.
  useEffect(() => {
    const unlock = searchParams.get('intel_unlock')
    const rid = searchParams.get('report_id')
    if (unlock === 'success' && rid) {
      setActiveReportId(rid)
      const next = new URLSearchParams(searchParams)
      next.delete('intel_unlock')
      next.delete('report_id')
      setSearchParams(next, { replace: true })
    }
  }, []) // eslint-disable-line

  // Non-Enterprise users: load their report inventory so an already-paid,
  // unused report can be spent without buying another one.
  useEffect(() => {
    let cancelled = false
    if (!user?.id || !intelEnabled() || enterprisePlan) return
    async function run() {
      try {
        const result = await listMyReports(user.id)
        if (!cancelled) setMyReports(result.reports || [])
      } catch {
        if (!cancelled) setMyReports([])
      }
    }
    run()
    return () => { cancelled = true }
  }, [user?.id, enterprisePlan, activeReportId])

  async function buyReport() {
    setBuyingReport(true)
    setBuyError('')
    try {
      const { url } = await startIntelReportCheckout(user.id, user.email)
      if (url) {
        window.location.href = url
        return
      }
      setBuyError('Could not start checkout. Try again in a moment.')
    } catch (e) {
      setBuyError(e.message || 'Could not start checkout.')
    } finally {
      setBuyingReport(false)
    }
  }

  const hasIntelAccess = enterprisePlan || !!activeReportId
  const unusedReports = myReports.filter(r => r.status === 'unused')

  useEffect(() => {
    let cancelled = false
    setIntel(null)
    setIntelError('')
    setForecast(null)
    setForecastError('')
    if (!hasIntelAccess || !naics || !user?.id) return

    async function run() {
      setIntelLoading(true)
      try {
        const result = await getIncumbentHistory({ naics, agency, userId: user.id, reportId: activeReportId })
        if (!cancelled) setIntel(result)
      } catch (e) {
        if (!cancelled) setIntelError(e.message || 'Could not pull award history')
      } finally {
        if (!cancelled) setIntelLoading(false)
      }
    }
    run()
    return () => { cancelled = true }
  }, [hasIntelAccess, naics, agency, user?.id, activeReportId])

  async function runForecast() {
    setForecastLoading(true)
    setForecastError('')
    try {
      const result = await forecastRecompete({
        naics, agency, title, awards: intel?.awards || [], userId: user.id, reportId: activeReportId,
      })
      setForecast(result)
    } catch (e) {
      setForecastError(e.message || 'Could not generate a forecast')
    } finally {
      setForecastLoading(false)
    }
  }

  // Make sure proposalId is always present in the query string so Read/Fill
  // (which read it via their own useSearchParams) stay attached to this
  // record no matter which panel is active.
  useEffect(() => {
    if (proposalId && searchParams.get('proposalId') !== proposalId) {
      const next = new URLSearchParams(searchParams)
      next.set('proposalId', proposalId)
      setSearchParams(next, { replace: true })
    }
  }, [proposalId]) // eslint-disable-line

  function setPanel(next) {
    const params = new URLSearchParams(searchParams)
    params.set('panel', next)
    setSearchParams(params, { replace: true })
  }

  return (
    <div className="ow">
      <header className="ow-header">
        <div className="ow-header-top">
          <span className="ow-eyebrow">Opportunity Workspace</span>
        </div>
        <div className="ow-header-main">
          <h1 className="ow-title">{title}</h1>
          <div className="ow-meta">
            {agency && <span className="ow-meta-item"><Building2 size={13} /> {agency}</span>}
            {naics && <span className="ow-meta-item"><Hash size={13} /> NAICS {naics}</span>}
            {daysUntilDue != null && (
              <span className={`ow-meta-item ${daysUntilDue <= 3 ? 'ow-meta-urgent' : ''}`}>
                <Calendar size={13} /> Due in {daysUntilDue}d
              </span>
            )}
          </div>
        </div>

        <nav className="ow-tabs">
          <button className={`ow-tab ${panel === 'decide' ? 'ow-tab-active' : ''}`} onClick={() => setPanel('decide')}>
            <ClipboardCheck size={15} /> Decide
          </button>
          <button className={`ow-tab ${panel === 'draft' ? 'ow-tab-active' : ''}`} onClick={() => setPanel('draft')}>
            <ClipboardList size={15} /> Draft
          </button>
          <button className={`ow-tab ${panel === 'workspace' ? 'ow-tab-active' : ''}`} onClick={() => setPanel('workspace')}>
            <LayoutGrid size={15} /> Workspace
          </button>
        </nav>

        {scoreLoading && (
          <div className="ow-score ow-score-loading">
            <Sparkles size={14} className="ow-spin" /> Reading the solicitation and scoring fit…
          </div>
        )}

        {!scoreLoading && score && (
          <div className="ow-score">
            <div className="ow-score-row">
              {score.fit_score != null && (
                <div className="ow-stat ow-stat-primary">
                  <span className="ow-stat-value">{Math.round(score.fit_score)}%</span>
                  <span className="ow-stat-label">{score.fit_label || 'Fit score'}</span>
                </div>
              )}
              {score.win_probability != null && (
                <div className="ow-stat">
                  <TrendingUp size={13} />
                  <span className="ow-stat-value">{Math.round(score.win_probability)}%</span>
                  <span className="ow-stat-label">Win probability</span>
                </div>
              )}
              {score.competition_level && (
                <div className="ow-stat">
                  <Users size={13} />
                  <span className="ow-stat-value ow-cap">{score.competition_level}</span>
                  <span className="ow-stat-label">Competition</span>
                </div>
              )}
              {(score.estimated_revenue?.low || score.estimated_revenue?.high) && (
                <div className="ow-stat">
                  <DollarSign size={13} />
                  <span className="ow-stat-value">
                    {score.estimated_revenue.low ? `$${Math.round(score.estimated_revenue.low / 1000)}k` : '?'}
                    {' – '}
                    {score.estimated_revenue.high ? `$${Math.round(score.estimated_revenue.high / 1000)}k` : '?'}
                  </span>
                  <span className="ow-stat-label">Est. revenue</span>
                </div>
              )}
            </div>

            {score.ai_summary && <p className="ow-score-summary">{score.ai_summary}</p>}

            {score.why_bullets?.length > 0 && (
              <ul className="ow-why">
                {score.why_bullets.map((b, i) => <li key={i}>{b}</li>)}
              </ul>
            )}

            {score.cert_gaps?.length > 0 && (
              <div className="ow-flag ow-flag-warn">
                <ShieldAlert size={13} /> Missing certification(s): {score.cert_gaps.join(', ')}
              </div>
            )}
            {score.risk_flags?.length > 0 && (
              <div className="ow-flag">
                <AlertTriangle size={13} /> {score.risk_flags[0]}
              </div>
            )}
          </div>
        )}

        {!scoreLoading && scoreError && (
          <div className="ow-score ow-score-error">{scoreError}</div>
        )}

        {!enterprisePlan && naics && !activeReportId && (
          <div className="ow-intel ow-intel-paywall">
            <div className="ow-intel-header">
              <Radar size={14} /> WARDOG Intel — incumbent &amp; award history
            </div>
            <p className="ow-score-summary">
              See who's held this NAICS/agency pair, what they were paid, and an AI re-compete read —
              $39 for this one report, or unlimited on Enterprise.
            </p>
            {unusedReports.length > 0 && (
              <button
                type="button"
                className="ow-intel-cta"
                onClick={() => setActiveReportId(unusedReports[0].id)}
              >
                Use a report you already bought ({unusedReports.length} available)
              </button>
            )}
            <button type="button" className="ow-intel-cta" disabled={buyingReport} onClick={buyReport}>
              {buyingReport ? 'Starting checkout…' : 'Buy this report — $39'}
            </button>
            {buyError && <div className="ow-score-error">{buyError}</div>}
          </div>
        )}

        {hasIntelAccess && (
          <div className="ow-intel">
            <div className="ow-intel-header">
              <Radar size={14} /> WARDOG Intel — incumbent &amp; award history
            </div>

            {intelLoading && (
              <div className="ow-score-loading">
                <Sparkles size={14} className="ow-spin" /> Pulling award history from USASpending.gov…
              </div>
            )}

            {!intelLoading && intelError && <div className="ow-score-error">{intelError}</div>}

            {!intelLoading && intel && intel.awards.length === 0 && (
              <p className="ow-score-summary">No prior prime awards found for this NAICS{agency ? ' / agency' : ''} pair — this looks like open ground.</p>
            )}

            {!intelLoading && intel && intel.awards.length > 0 && (
              <>
                <ul className="ow-intel-awards">
                  {intel.awards.slice(0, 5).map((a, i) => (
                    <li key={i}>
                      <span className="ow-intel-recipient">{a.recipient_name || 'Unknown recipient'}</span>
                      {a.award_amount != null && <span className="ow-intel-amount">${Math.round(a.award_amount).toLocaleString()}</span>}
                    </li>
                  ))}
                </ul>

                {!forecast && (
                  <button type="button" className="ow-intel-cta" disabled={forecastLoading} onClick={runForecast}>
                    {forecastLoading ? 'Reading the re-compete…' : 'Run re-compete forecast (1 AI credit)'}
                  </button>
                )}

                {forecastError && <div className="ow-score-error">{forecastError}</div>}

                {forecast && <p className="ow-score-summary ow-intel-forecast">{forecast.forecast}</p>}
              </>
            )}
          </div>
        )}
      </header>

      <div className="ow-panel">
        {panel === 'decide' && <Read embedded />}
        {panel === 'draft' && <Fill embedded />}
        {panel === 'workspace' && <OpportunityContext proposalId={proposalId} />}
      </div>
    </div>
  )
}
