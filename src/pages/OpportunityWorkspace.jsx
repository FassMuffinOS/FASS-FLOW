import { useEffect, useMemo, useState } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import {
  ClipboardCheck, ClipboardList, Building2, Calendar, Hash, LayoutGrid,
  Sparkles, TrendingUp, Users, DollarSign, ShieldAlert, AlertTriangle,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'
import { aiEnabled, scoreOpportunity } from '../lib/aiClient'
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
      </header>

      <div className="ow-panel">
        {panel === 'decide' && <Read embedded />}
        {panel === 'draft' && <Fill embedded />}
        {panel === 'workspace' && <OpportunityContext proposalId={proposalId} />}
      </div>
    </div>
  )
}
