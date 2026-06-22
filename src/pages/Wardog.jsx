import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { Search, RefreshCw, ExternalLink, Calendar, Building2, Tag, ClipboardList } from 'lucide-react'
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

const SET_ASIDE_OPTIONS = Object.entries(SET_ASIDE_LABELS).map(([code, label]) => ({ code, label }))

const PROCUREMENT_TYPES = ['Solicitation', 'Sources Sought', 'Combined Synopsis/Solicitation', 'Presolicitation', 'Award Notice']

const DUE_WITHIN_OPTIONS = [
  { value: '', label: 'Any time' },
  { value: '7', label: 'Within 7 days' },
  { value: '14', label: 'Within 14 days' },
  { value: '30', label: 'Within 30 days' },
]

const ALL_STATES = [
  ['', 'All States'], ['AL','Alabama'], ['AK','Alaska'], ['AZ','Arizona'], ['AR','Arkansas'],
  ['CA','California'], ['CO','Colorado'], ['CT','Connecticut'], ['DE','Delaware'], ['DC','Washington DC'],
  ['FL','Florida'], ['GA','Georgia'], ['HI','Hawaii'], ['ID','Idaho'], ['IL','Illinois'],
  ['IN','Indiana'], ['IA','Iowa'], ['KS','Kansas'], ['KY','Kentucky'], ['LA','Louisiana'],
  ['ME','Maine'], ['MD','Maryland'], ['MA','Massachusetts'], ['MI','Michigan'], ['MN','Minnesota'],
  ['MS','Mississippi'], ['MO','Missouri'], ['MT','Montana'], ['NE','Nebraska'], ['NV','Nevada'],
  ['NH','New Hampshire'], ['NJ','New Jersey'], ['NM','New Mexico'], ['NY','New York'], ['NC','North Carolina'],
  ['ND','North Dakota'], ['OH','Ohio'], ['OK','Oklahoma'], ['OR','Oregon'], ['PA','Pennsylvania'],
  ['RI','Rhode Island'], ['SC','South Carolina'], ['SD','South Dakota'], ['TN','Tennessee'], ['TX','Texas'],
  ['UT','Utah'], ['VT','Vermont'], ['VA','Virginia'], ['WA','Washington'], ['WV','West Virginia'],
  ['WI','Wisconsin'], ['WY','Wyoming'],
]

// ── Other gov contracting sources without a public live-data API ──
// SAM.gov is the only source above pulled live. These don't expose a
// public developer API (FedConnect/Unison are vendor portals; DIBBS has
// no sanctioned API; state/local/university procurement is fragmented
// across 50+ independent systems) — so they're listed as a curated
// directory of direct links rather than faked as "live."
const OTHER_SOURCES = [
  {
    name: 'FedConnect',
    tag: 'Federal',
    url: 'https://www.fedconnect.net',
    desc: 'Buyer-seller portal used by NASA, DHS, and other agencies for solicitations and Q&A. Many notices cross-post to SAM.gov, but some agency-specific attachments only live here.',
  },
  {
    name: 'Unison Marketplace',
    tag: 'Federal / GSA',
    url: 'https://www.unisonmarketplace.com',
    desc: 'GSA-affiliated reverse-auction and bid platform federal buyers use for simplified acquisitions, often under the micro-purchase and simplified acquisition thresholds.',
  },
  {
    name: 'DIBBS (DLA)',
    tag: 'Defense',
    url: 'https://www.dibbs.bsm.dla.mil',
    desc: "Defense Logistics Agency's bid board for spare parts, supplies, and DoD material RFQs. High volume, fast turnaround, good for manufacturers and suppliers.",
  },
  {
    name: 'eMMA (Maryland)',
    tag: 'State — MD',
    url: 'https://emma.maryland.gov',
    desc: "Maryland's state procurement portal. Required registration for bidding on MD state contracts and grants.",
  },
  {
    name: 'Baltimore City Procurement',
    tag: 'Local — MD',
    url: 'https://bids.baltimorecity.gov',
    desc: 'City of Baltimore open solicitations — smaller dollar value, less competition than federal opportunities.',
  },
  {
    name: 'University Procurement (UMD / Johns Hopkins)',
    tag: 'University',
    url: 'https://www.iam.umd.edu/procurement/',
    desc: 'Public and private universities run their own bid boards for facilities, food service, IT, and event contracts — often overlooked but lower-barrier-to-entry.',
  },
]

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
  const [naicsText, setNaicsText] = useState('')
  const [state, setState] = useState('MD')
  const [keyword, setKeyword] = useState('')
  const [setAsides, setSetAsides] = useState([])
  const [procType, setProcType] = useState('')
  const [dueWithin, setDueWithin] = useState('')
  const [showSetAsideMenu, setShowSetAsideMenu] = useState(false)
  const [showSources, setShowSources] = useState(false)

  function toggleSetAside(code) {
    setSetAsides(prev => prev.includes(code) ? prev.filter(c => c !== code) : [...prev, code])
  }

  function passesPostFilters(o) {
    if (setAsides.length && !setAsides.includes(o.typeOfSetAside)) return false
    if (procType && o.type !== procType) return false
    if (dueWithin) {
      const days = daysUntil(o.responseDeadLine)
      if (days === null || days < 0 || days > Number(dueWithin)) return false
    }
    return true
  }

  const fetchOpps = useCallback(async () => {
    setLoading(true)
    setError('')

    const effectiveNaics = naicsText.trim() || naics

    // Use mock data when no API key is configured
    if (!SAM_API_KEY) {
      await new Promise(r => setTimeout(r, 600)) // simulate network
      const filtered = MOCK_OPPS.filter(o => {
        const matchNaics = !effectiveNaics || o.naicsCode === effectiveNaics
        const matchKeyword = !keyword.trim() || o.title.toLowerCase().includes(keyword.toLowerCase()) || o.description.toLowerCase().includes(keyword.toLowerCase())
        return matchNaics && matchKeyword && passesPostFilters(o)
      })
      setOpps(filtered)
      setLastFetch(new Date())
      setLoading(false)
      return
    }

    try {
      const params = new URLSearchParams({
        api_key: SAM_API_KEY,
        limit: '50',
        postedFrom: formatPostedFrom(),
        naics: effectiveNaics,
        state: state,
        active: 'true',
      })

      if (keyword.trim()) params.set('q', keyword.trim())

      const res = await fetch(`https://api.sam.gov/opportunities/v2/search?${params}`)
      if (!res.ok) throw new Error(`SAM.gov API error: ${res.status}`)

      const data = await res.json()
      setOpps((data.opportunitiesData || []).filter(passesPostFilters))
      setLastFetch(new Date())
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [naics, naicsText, state, keyword, setAsides, procType, dueWithin])

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
          <p className="wd-sub">Live SAM.gov opportunities, plus federal/state/local source directory below · {lastFetch ? `Updated ${lastFetch.toLocaleTimeString()}` : 'Not yet fetched'}</p>
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
          <label>NAICS (custom)</label>
          <input
            type="text"
            placeholder="e.g. 541512"
            value={naicsText}
            onChange={e => setNaicsText(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && fetchOpps()}
          />
        </div>

        <div className="wd-filter-group">
          <label>State</label>
          <select value={state} onChange={e => setState(e.target.value)}>
            {ALL_STATES.map(([code, label]) => (
              <option key={code || 'all'} value={code}>{label}</option>
            ))}
          </select>
        </div>

        <div className="wd-filter-group">
          <label>Procurement Type</label>
          <select value={procType} onChange={e => setProcType(e.target.value)}>
            <option value="">Any type</option>
            {PROCUREMENT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>

        <div className="wd-filter-group">
          <label>Due</label>
          <select value={dueWithin} onChange={e => setDueWithin(e.target.value)}>
            {DUE_WITHIN_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>

        <div className="wd-filter-group wd-filter-setaside">
          <label>Set-Aside</label>
          <button
            type="button"
            className="wd-setaside-trigger"
            onClick={() => setShowSetAsideMenu(v => !v)}
          >
            {setAsides.length ? `${setAsides.length} selected` : 'Any set-aside'}
          </button>
          {showSetAsideMenu && (
            <div className="wd-setaside-menu">
              {SET_ASIDE_OPTIONS.map(o => (
                <label key={o.code} className="wd-setaside-option">
                  <input
                    type="checkbox"
                    checked={setAsides.includes(o.code)}
                    onChange={() => toggleSetAside(o.code)}
                  />
                  {o.label}
                </label>
              ))}
            </div>
          )}
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
                <Link
                  to={`/fill?new=1&title=${encodeURIComponent(opp.title)}&agency=${encodeURIComponent(opp.fullParentPathName || opp.department || '')}&solnum=${encodeURIComponent(opp.noticeId)}`}
                  className="btn-outline wd-bid-btn"
                >
                  <ClipboardList size={13} /> Send to FASS FILL
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Other sources directory */}
      <div className="wd-other-sources">
        <button className="wd-other-toggle" onClick={() => setShowSources(v => !v)}>
          {showSources ? '− Hide' : '+ Show'} other government contracting sources (not live-pulled)
        </button>
        {showSources && (
          <>
            <p className="wd-other-note">
              SAM.gov is the only feed above pulled live — it's the only one of these with a public API.
              The sources below don't offer one (vendor-only portals, or — in DIBBS' case — no sanctioned
              developer access), so they're listed here as direct links instead of faked as real-time data.
              Found something on one of these? Copy the solicitation text and bring it straight into FASS
              FILL — same compliance matrix either way, the source just doesn't matter.
            </p>
            <div className="wd-source-grid">
              {OTHER_SOURCES.map(s => (
                <div key={s.name} className="wd-source-card">
                  <div className="wd-source-top">
                    <span className="wd-source-name">{s.name}</span>
                    <span className="wd-source-tag">{s.tag}</span>
                  </div>
                  <p className="wd-source-desc">{s.desc}</p>
                  <div className="wd-source-actions">
                    <a href={s.url} target="_blank" rel="noreferrer" className="wd-source-link">
                      Visit site <ExternalLink size={12} />
                    </a>
                    <Link
                      to={`/fill?new=1&source=${encodeURIComponent(s.name)}`}
                      className="wd-source-link wd-source-fill-link"
                    >
                      <ClipboardList size={12} /> Paste into FASS FILL
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
