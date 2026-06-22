import { useState, useEffect, useCallback } from 'react'
import { Search, RefreshCw, ExternalLink, Calendar, Building2, Tag } from 'lucide-react'
import './Wardog.css'

const SAM_API_KEY = import.meta.env.VITE_SAM_API_KEY || ''

// ── Realistic mock data — mirrors real SAM.gov response shape ──
const MOCK_OPPS = [
  {
    noticeId: 'mock-001',
    title: 'Janitorial and Custodial Services — Social Security Administration Baltimore Field Office',
    type: 'Solicitation',
    typeOfSetAside: 'SBA',
    department: 'Social Security Administration',
    fullParentPathName: 'Social Security Administration',
    naicsCode: '561720',
    responseDeadLine: new Date(Date.now() + 9 * 86400000).toISOString(),
    description: 'The Social Security Administration requires janitorial and custodial services for its Baltimore field office located at 300 N. Greene Street. Services include daily cleaning of approximately 12,000 sq ft of office space, restroom sanitation, trash removal, and periodic floor care.',
  },
  {
    noticeId: 'mock-002',
    title: 'Facilities Operations and Maintenance Support — Fort Meade, MD',
    type: 'Sources Sought',
    typeOfSetAside: 'SDVOSB',
    department: 'Department of Defense',
    fullParentPathName: 'Dept of Defense — Army',
    naicsCode: '561210',
    responseDeadLine: new Date(Date.now() + 5 * 86400000).toISOString(),
    description: 'Sources sought for facilities operations and maintenance support services at Fort Meade, Maryland. Includes HVAC maintenance, plumbing, electrical, grounds keeping, and general facility upkeep. Small business set-aside anticipated.',
  },
  {
    noticeId: 'mock-003',
    title: 'Temporary Administrative and Light Labor Staffing — GSA National Capital Region',
    type: 'Solicitation',
    typeOfSetAside: 'WOSB',
    department: 'General Services Administration',
    fullParentPathName: 'General Services Administration',
    naicsCode: '561320',
    responseDeadLine: new Date(Date.now() + 18 * 86400000).toISOString(),
    description: 'GSA National Capital Region seeks temporary staffing support for administrative and light labor positions across multiple federal buildings in Maryland and DC. Contract includes placement of qualified personnel within 48 hours of request.',
  },
  {
    noticeId: 'mock-004',
    title: 'Food Service Contractor — USDA Headquarters Cafeteria, Washington DC',
    type: 'Solicitation',
    typeOfSetAside: 'SBA',
    department: 'Dept of Agriculture',
    fullParentPathName: 'US Department of Agriculture',
    naicsCode: '722310',
    responseDeadLine: new Date(Date.now() + 3 * 86400000).toISOString(),
    description: 'Full food service contractor needed for USDA HQ cafeteria operations, Monday-Friday. Services include breakfast and lunch preparation, catering for agency events, and daily kitchen sanitation. Estimated 400 meals per day.',
  },
  {
    noticeId: 'mock-005',
    title: 'Event Support and Logistics — National Institutes of Health Campus Events',
    type: 'Solicitation',
    typeOfSetAside: 'HZC',
    department: 'Dept of Health and Human Services',
    fullParentPathName: 'HHS — National Institutes of Health',
    naicsCode: '711310',
    responseDeadLine: new Date(Date.now() + 22 * 86400000).toISOString(),
    description: 'NIH seeks event support and logistics services for campus-wide events including setup/teardown, equipment transport, vendor coordination, and post-event cleanup. Bethesda, MD campus. Estimated 40 events annually.',
  },
]

const NAICS_OPTIONS = [
  { code: '561720', label: '561720 — Janitorial Services' },
  { code: '561210', label: '561210 — Facilities Support Services' },
  { code: '561320', label: '561320 — Temporary Staffing Services' },
  { code: '722310', label: '722310 — Food Service Contractors' },
  { code: '484110', label: '484110 — General Freight Trucking, Local' },
  { code: '561730', label: '561730 — Landscaping Services' },
  { code: '561790', label: '561790 — Other Building Services' },
  { code: '711310', label: '711310 — Event / Promoters Support' },
]

const SET_ASIDE_LABELS = {
  'SBA': 'Small Business',
  'SBP': 'Small Business Set-Aside (Partial)',
  '8A': '8(a)',
  'SDVOSB': 'SDVOSB',
  'WOSB': 'WOSB',
  'HZC': 'HUBZone',
  'VO': 'Veteran-Owned',
  'EDWOSB': 'EDWOSB',
}

function formatDate(str) {
  if (!str) return '—'
  return new Date(str).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function daysUntil(str) {
  if (!str) return null
  const diff = Math.ceil((new Date(str) - new Date()) / (1000 * 60 * 60 * 24))
  return diff
}

function DueChip({ date }) {
  const days = daysUntil(date)
  if (days === null) return null
  const cls = days <= 7 ? 'chip-urgent' : days <= 14 ? 'chip-soon' : 'chip-ok'
  return <span className={`wd-chip ${cls}`}>{days <= 0 ? 'Closed' : `${days}d left`}</span>
}

export default function Wardog() {
  const [opps, setOpps] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [lastFetch, setLastFetch] = useState(null)

  // Filters
  const [naics, setNaics] = useState('561720')
  const [state, setState] = useState('MD')
  const [keyword, setKeyword] = useState('')

  const fetchOpps = useCallback(async () => {
    setLoading(true)
    setError('')

    // Use mock data when no API key is configured
    if (!SAM_API_KEY) {
      await new Promise(r => setTimeout(r, 600)) // simulate network
      const filtered = MOCK_OPPS.filter(o => {
        const matchNaics = !naics || o.naicsCode === naics
        const matchKeyword = !keyword.trim() || o.title.toLowerCase().includes(keyword.toLowerCase()) || o.description.toLowerCase().includes(keyword.toLowerCase())
        return matchNaics && matchKeyword
      })
      setOpps(filtered)
      setLastFetch(new Date())
      setLoading(false)
      return
    }

    try {
      const params = new URLSearchParams({
        api_key: SAM_API_KEY,
        limit: '25',
        postedFrom: formatPostedFrom(),
        naics: naics,
        state: state,
        active: 'true',
      })

      if (keyword.trim()) params.set('q', keyword.trim())

      const res = await fetch(`https://api.sam.gov/opportunities/v2/search?${params}`)
      if (!res.ok) throw new Error(`SAM.gov API error: ${res.status}`)

      const data = await res.json()
      setOpps(data.opportunitiesData || [])
      setLastFetch(new Date())
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [naics, state, keyword])

  function formatPostedFrom() {
    const d = new Date()
    d.setDate(d.getDate() - 30)
    return `${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}/${d.getFullYear()}`
  }

  useEffect(() => {
    fetchOpps()
  }, []) // eslint-disable-line

  return (
    <div className="wd">
      <div className="wd-top">
        <div>
          <h1 className="wd-title">WARDOG</h1>
          <p className="wd-sub">Live SAM.gov opportunities matching your profile · {lastFetch ? `Updated ${lastFetch.toLocaleTimeString()}` : 'Not yet fetched'}</p>
        </div>
        <button className="wd-refresh btn-outline" onClick={fetchOpps} disabled={loading}>
          <RefreshCw size={15} className={loading ? 'spin' : ''} />
          {loading ? 'Fetching…' : 'Refresh'}
        </button>
      </div>

      {/* Filters */}
      <div className="wd-filters">
        <div className="wd-filter-group">
          <label>NAICS Code</label>
          <select value={naics} onChange={e => setNaics(e.target.value)}>
            {NAICS_OPTIONS.map(n => (
              <option key={n.code} value={n.code}>{n.label}</option>
            ))}
          </select>
        </div>

        <div className="wd-filter-group">
          <label>State</label>
          <select value={state} onChange={e => setState(e.target.value)}>
            <option value="MD">Maryland</option>
            <option value="DC">Washington DC</option>
            <option value="VA">Virginia</option>
            <option value="">All States</option>
          </select>
        </div>

        <div className="wd-filter-group wd-filter-search">
          <label>Keyword</label>
          <div className="wd-search-wrap">
            <Search size={15} className="wd-search-icon" />
            <input
              type="text"
              placeholder="janitorial, catering, staffing…"
              value={keyword}
              onChange={e => setKeyword(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && fetchOpps()}
            />
          </div>
        </div>

        <button className="btn-primary wd-search-btn" onClick={fetchOpps} disabled={loading}>
          Search
        </button>
      </div>

      {/* Demo banner */}
      {!SAM_API_KEY && (
        <div className="wd-demo-banner">
          ⚡ Demo mode — showing sample opportunities. Live SAM.gov feed activates once API key is configured.
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="wd-error">
          <strong>Error:</strong> {error}
        </div>
      )}

      {/* Results */}
      {!error && (
        <div className="wd-results">
          {loading && opps.length === 0 && (
            <div className="wd-loading">
              <RefreshCw size={20} className="spin" />
              <span>Sweeping SAM.gov…</span>
            </div>
          )}

          {!loading && opps.length === 0 && (
            <div className="wd-empty">
              No active opportunities found for this filter. Try a different NAICS or state.
            </div>
          )}

          {opps.map(opp => (
            <div key={opp.noticeId} className="wd-card">
              <div className="wd-card-top">
                <div className="wd-card-meta">
                  {opp.type && <span className="wd-chip chip-type">{opp.type}</span>}
                  {opp.typeOfSetAside && (
                    <span className="wd-chip chip-setaside">
                      {SET_ASIDE_LABELS[opp.typeOfSetAside] || opp.typeOfSetAside}
                    </span>
                  )}
                  <DueChip date={opp.responseDeadLine} />
                </div>
                <a
                  href={`https://sam.gov/opp/${opp.noticeId}/view`}
                  target="_blank"
                  rel="noreferrer"
                  className="wd-view-link"
                >
                  View on SAM.gov <ExternalLink size={13} />
                </a>
              </div>

              <h3 className="wd-card-title">{opp.title}</h3>

              <div className="wd-card-details">
                <span><Building2 size={13} /> {opp.fullParentPathName || opp.department || '—'}</span>
                <span><Tag size={13} /> NAICS {opp.naicsCode || naics}</span>
                <span><Calendar size={13} /> Due {formatDate(opp.responseDeadLine)}</span>
              </div>

              {opp.description && (
                <p className="wd-card-desc">
                  {opp.description.slice(0, 220)}{opp.description.length > 220 ? '…' : ''}
                </p>
              )}

              <div className="wd-card-actions">
                <a
                  href={`/read?opp=${opp.noticeId}&title=${encodeURIComponent(opp.title)}`}
                  className="btn-primary wd-bid-btn"
                >
                  Run R-E-A-D →
                </a>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
