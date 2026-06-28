import { useEffect, useMemo } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import { ClipboardCheck, ClipboardList, Building2, Calendar, Hash } from 'lucide-react'
import Read from './Read'
import Fill from './Fill'
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

  const panel = searchParams.get('panel') === 'draft' ? 'draft' : 'decide'

  const title = searchParams.get('title') || 'Untitled Opportunity'
  const agency = searchParams.get('agency') || ''
  const naics = searchParams.get('naics') || ''
  const due = searchParams.get('due') || ''

  const daysUntilDue = useMemo(() => {
    if (!due) return null
    const d = Math.ceil((new Date(due).getTime() - Date.now()) / 86400000)
    return Number.isNaN(d) ? null : d
  }, [due])

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
        </nav>
      </header>

      <div className="ow-panel">
        {panel === 'decide' ? <Read embedded /> : <Fill embedded />}
      </div>
    </div>
  )
}
