import { useState, useEffect, useCallback } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Search, RefreshCw, ExternalLink, Calendar, Building2, Tag, ClipboardList, Bookmark, BookmarkCheck, Lock } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'
import './Wardog.css'

// Maps the certification labels captured in onboarding / FASS FILL's
// capability statement (profiles.certifications) to the set-aside codes
// SAM.gov/WARDOG use. MBE/DBE has no federal set-aside code equivalent,
// so it's intentionally left out — it doesn't drive a WARDOG filter.
const CERT_TO_SET_ASIDE = {
  'Small Business': 'SBA',
  'WOSB': 'WOSB',
  'EDWOSB': 'EDWOSB',
  'SDVOSB': 'SDVOSB',
  'VOSB': 'VO',
  '8(a)': '8A',
  'HUBZone': 'HZC',
}

// The SAM.gov key lives only in the backend's environment now — calling
// api.sam.gov straight from the browser with a VITE_-prefixed key would
// ship it in the public JS bundle for anyone to read. WARDOG_LIVE just
// tracks whether the backend proxy is reachable/configured; the actual
// key never touches the frontend.
const API_BASE = import.meta.env.VITE_API_URL || ''

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
    name: 'BidNet Direct',
    tag: 'State / Local',
    url: 'https://www.bidnetdirect.com',
    desc: 'Aggregates state, county, and city bid opportunities across the country — strong coverage where SAM.gov has none (most local government work). No public API; free to search, some regional networks charge suppliers to respond.',
  },
  {
    name: 'InstantMarkets',
    tag: 'Federal / State / Local',
    url: 'https://www.instantmarkets.com',
    desc: 'Free aggregator search engine for bids, RFPs, and contract awards across federal, state, local, and even some private-sector buyers — useful as a second-opinion search when WARDOG or BidNet come up short.',
  },
  {
    name: 'USASpending.gov',
    tag: 'Federal — Award History',
    url: 'https://www.usaspending.gov',
    desc: 'Free, official record of every federal contract, grant, and award ever made. Not a bid board — use it before you bid to see who\'s winning a given NAICS code or agency, at what price, and how often a contract re-competes, so you can size up the competition and price smarter.',
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

// SAM.gov's live opportunities API sometimes returns a `description` field
// that's actually a URL pointing at a separate noticedesc endpoint, rather
// than the solicitation text itself — printing that raw as card body copy
// reads like a broken page, not a feature. "View on SAM.gov" already covers
// getting to the full text, so URL-shaped descriptions are simply skipped.
function isUrlLike(str) {
  return typeof str === 'string' && /^https?:\/\//i.test(str.trim())
}

function DueChip({ date }) {
  const days = daysUntil(date)
  if (days === null) return null
  const cls = days <= 7 ? 'chip-urgent' : days <= 14 ? 'chip-soon' : 'chip-ok'
  return <span className={`wd-chip ${cls}`}>{days <= 0 ? 'Closed' : `${days}d left`}</span>
}

export default function Wardog() {
  const { session } = useAuth()
  const navigate = useNavigate()
  const [opps, setOpps] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [lastFetch, setLastFetch] = useState(null)
  const [isLive, setIsLive] = useState(false)

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
  // Keyed by SAM.gov noticeId -> the proposals.id row it created. This is
  // the join key that lets R-E-A-D, Pipeline, and FASS FILL all converge
  // on the same record instead of each tool spawning its own copy of the
  // same opportunity.
  const [savedProposals, setSavedProposals] = useState({})
  const [savingId, setSavingId] = useState(null)
  // Flips true exactly once, the moment the profile prefill above changes
  // naicsText after the initial (default-NAICS) fetch already ran — that's
  // the signal to re-run the search so it reflects the user's real NAICS
  // instead of leaving the generic default results on screen.
  const [naicsPrefilled, setNaicsPrefilled] = useState(false)

  // Lite plan ($9.99/mo) is read-only: matches show up here, but saving
  // interest, running R-E-A-D, sending to FASS FILL, and the advanced
  // filters (set-aside/proc-type/due-within/custom NAICS) are gated behind
  // Core. Every other plan (starter/pro/team/promo) — and a profile fetch
  // that hasn't resolved yet — is treated as unrestricted.
  const [plan, setPlan] = useState(null)
  const isLite = plan === 'lite'

  useEffect(() => {
    if (!session?.user?.id) return
    let cancelled = false
    supabase
      .from('profiles')
      .select('plan')
      .eq('id', session.user.id)
      .single()
      .then(({ data }) => {
        if (!cancelled) setPlan(data?.plan || null)
      })
    return () => { cancelled = true }
  }, [session?.user?.id])

  function toggleSetAside(code) {
    setSetAsides(prev => prev.includes(code) ? prev.filter(c => c !== code) : [...prev, code])
  }

  // "Save interest" — flag an opportunity in Pipeline without running
  // the full R-E-A-D worksheet. Useful when a first pass doesn't have
  // time to score it yet but you don't want to lose track of it.
  async function saveInterest(opp) {
    if (isLite || !session?.user?.id || savedProposals[opp.noticeId] || savingId) return
    setSavingId(opp.noticeId)
    const uid = session.user.id

    // Record the sourced opportunity first (top of funnel). This is what
    // makes the funnel's "sourced" count real and gives every proposal a
    // lineage back to where it came from. Upsert by solicitation number so
    // re-saving the same notice doesn't spawn duplicates.
    let opportunityId = null
    if (opp.noticeId) {
      const { data: oppRow } = await supabase
        .from('opportunities')
        .upsert({
          user_id: uid,
          title: opp.title,
          agency: opp.fullParentPathName || opp.department || null,
          solicitation_number: opp.noticeId,
          naics_code: opp.naicsCode || naics || null,
          set_aside: SET_ASIDE_LABELS[opp.typeOfSetAside] || opp.typeOfSetAside || null,
          due_date: opp.responseDeadLine || null,
          status: 'sourced',
        }, { onConflict: 'user_id,solicitation_number' })
        .select()
        .single()
      opportunityId = oppRow?.id || null
    }

    const { data, error } = await supabase.from('proposals').insert({
      user_id: uid,
      opportunity_id: opportunityId,
      title: opp.title,
      stage: 'flagged',
      status: 'draft',
      agency: opp.fullParentPathName || opp.department || null,
      naics_code: opp.naicsCode || naics || null,
      due_date: opp.responseDeadLine || null,
      // Carrying the actual solicitation description onto the proposal row
      // is what lets R-E-A-D (and anything else reading this row) ground
      // its analysis in the real requirements instead of just title/NAICS.
      // Skip it when SAM.gov gave back a noticedesc URL instead of real
      // text — that would otherwise get fed straight into the AI synthesis
      // prompt as if it were the solicitation's actual content.
      description: (opp.description && !isUrlLike(opp.description)) ? opp.description : null,
    }).select().single()
    if (!error && data) setSavedProposals(prev => ({ ...prev, [opp.noticeId]: data.id }))
    setSavingId(null)
    return data?.id || null
  }

  // "Run R-E-A-D" used to be a plain link, which meant a user could land on
  // the worksheet for an opportunity that was never saved to a proposal row
  // — no proposalId, no description, nothing for R-E-A-D's AI synthesis to
  // read. This guarantees the row (and its description) exists first.
  async function goToRead(opp) {
    if (isLite) { navigate('/pricing'); return }
    let proposalId = savedProposals[opp.noticeId]
    if (!proposalId) {
      proposalId = await saveInterest(opp)
    }
    const params = new URLSearchParams({
      title: opp.title,
      agency: opp.fullParentPathName || opp.department || '',
      naics: opp.naicsCode || '',
      setaside: SET_ASIDE_LABELS[opp.typeOfSetAside] || opp.typeOfSetAside || '',
      due: opp.responseDeadLine || '',
    })
    if (proposalId) params.set('proposalId', proposalId)
    navigate(`/read?${params.toString()}`)
  }

  // Pre-fill the set-aside filter from the user's saved certifications
  // (captured in onboarding or FASS FILL) so they don't have to re-pick
  // it every visit. Only runs once, and only if no filter is set yet —
  // never overrides a filter the user is actively adjusting.
  useEffect(() => {
    if (!session?.user?.id) return
    let cancelled = false
    async function prefillFromProfile() {
      const { data } = await supabase
        .from('profiles')
        .select('certifications, naics_codes')
        .eq('id', session.user.id)
        .single()
      if (cancelled) return
      if (data?.certifications?.length) {
        const mapped = data.certifications
          .map(c => CERT_TO_SET_ASIDE[c])
          .filter(Boolean)
        if (mapped.length) setSetAsides(prev => prev.length ? prev : mapped)
      }
      // A user landing here straight from Passport's quick setup saved a
      // real NAICS code — search on that instead of the hardcoded default
      // (561720) so the very first WARDOG result actually matches them.
      if (data?.naics_codes?.length) {
        setNaicsText(prev => {
          if (prev) return prev
          setNaicsPrefilled(true)
          return data.naics_codes[0]
        })
      }
    }
    prefillFromProfile()
    return () => { cancelled = true }
  }, [session?.user?.id])

  // Light prefill from the Notebook: once the Masterclass AI assistant has
  // learned a student's niche keywords from their homework, surface that
  // here as a suggested search term — but only if the keyword field is
  // still untouched, same non-overriding rule as the NAICS prefill above.
  useEffect(() => {
    if (!session?.user?.id) return
    let cancelled = false
    fetch(`${API_BASE}/api/v1/business-profile/mine?user_id=${session.user.id}`)
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (cancelled || !data) return
        const kws = data.notebook_keywords
        if (Array.isArray(kws) && kws.length) {
          setKeyword(prev => prev ? prev : kws[0])
        }
      })
      .catch(() => {})
    return () => { cancelled = true }
  }, [session?.user?.id])

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

    function useMockFallback() {
      const filtered = MOCK_OPPS.filter(o => {
        const matchNaics = !effectiveNaics || o.naicsCode === effectiveNaics
        const matchKeyword = !keyword.trim() || o.title.toLowerCase().includes(keyword.toLowerCase()) || o.description.toLowerCase().includes(keyword.toLowerCase())
        return matchNaics && matchKeyword && passesPostFilters(o)
      })
      setOpps(filtered)
      setIsLive(false)
      setLastFetch(new Date())
    }

    try {
      const params = new URLSearchParams({
        limit: '50',
        naics: effectiveNaics,
        state: state,
      })
      if (keyword.trim()) params.set('keyword', keyword.trim())

      const res = await fetch(`${API_BASE}/api/v1/wardog/search?${params}`)

      if (res.status === 503) {
        // Backend proxy is up but no SAM.gov key configured yet — fall
        // back to demo data instead of treating this as an error.
        await new Promise(r => setTimeout(r, 400))
        useMockFallback()
        return
      }
      if (!res.ok) throw new Error(`WARDOG search error: ${res.status}`)

      const data = await res.json()
      setOpps((data.opportunities || []).filter(passesPostFilters))
      setIsLive(true)
      setLastFetch(new Date())
    } catch (err) {
      // Backend unreachable for some other reason — still fall back to
      // demo data so the page stays usable, but surface the error too.
      setError(err.message)
      useMockFallback()
    } finally {
      setLoading(false)
    }
  }, [naics, naicsText, state, keyword, setAsides, procType, dueWithin])

  useEffect(() => {
    fetchOpps()
  }, []) // eslint-disable-line

  // Re-run the search once the profile prefill lands a real NAICS code,
  // so a brand-new account doesn't sit looking at default-NAICS results.
  useEffect(() => {
    if (!naicsPrefilled) return
    setNaicsPrefilled(false)
    fetchOpps()
  }, [naicsPrefilled, fetchOpps])

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
            placeholder={isLite ? 'Core feature' : 'e.g. 541512'}
            value={naicsText}
            onChange={e => setNaicsText(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && fetchOpps()}
            disabled={isLite}
            title={isLite ? 'Custom NAICS search is a Core feature' : undefined}
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
          <select value={procType} onChange={e => setProcType(e.target.value)} disabled={isLite} title={isLite ? 'Advanced filters are a Core feature' : undefined}>
            <option value="">Any type</option>
            {PROCUREMENT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>

        <div className="wd-filter-group">
          <label>Due</label>
          <select value={dueWithin} onChange={e => setDueWithin(e.target.value)} disabled={isLite} title={isLite ? 'Advanced filters are a Core feature' : undefined}>
            {DUE_WITHIN_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>

        <div className="wd-filter-group wd-filter-setaside">
          <label>Set-Aside</label>
          <button
            type="button"
            className="wd-setaside-trigger"
            onClick={() => !isLite && setShowSetAsideMenu(v => !v)}
            disabled={isLite}
            title={isLite ? 'Set-aside filtering is a Core feature' : undefined}
          >
            {setAsides.length ? `${setAsides.length} selected` : 'Any set-aside'}
          </button>
          {showSetAsideMenu && !isLite && (
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

      {/* Lite plan banner — read-only matches, no saved interest / R-E-A-D / advanced filters */}
      {isLite && (
        <div className="wd-demo-banner">
          <Lock size={14} style={{ marginRight: 6, verticalAlign: '-2px' }} />
          Lite plan shows read-only matches. <Link to="/pricing">Upgrade to Core</Link> to save opportunities, run R-E-A-D, and unlock full filters.
        </div>
      )}

      {/* Demo banner */}
      {!loading && !isLive && (
        <div className="wd-demo-banner">
          ⚡ Demo mode — showing sample opportunities. Live SAM.gov feed activates once the API key is configured.
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

              {opp.description && !isUrlLike(opp.description) && (
                <p className="wd-card-desc">
                  {opp.description.slice(0, 220)}{opp.description.length > 220 ? '…' : ''}
                </p>
              )}

              <div className="wd-card-actions">
                {isLite ? (
                  <Link to="/pricing" className="btn-primary wd-bid-btn">
                    <Lock size={13} /> Upgrade to Core to act on this
                  </Link>
                ) : (
                  <>
                    <button
                      className={`wd-save-btn ${savedProposals[opp.noticeId] ? 'wd-save-btn-saved' : ''}`}
                      onClick={() => saveInterest(opp)}
                      disabled={!!savedProposals[opp.noticeId] || savingId === opp.noticeId}
                      title="Save to Pipeline without scoring it yet"
                    >
                      {savedProposals[opp.noticeId]
                        ? <><BookmarkCheck size={13} /> Saved</>
                        : <><Bookmark size={13} /> {savingId === opp.noticeId ? 'Saving…' : 'Save interest'}</>}
                    </button>
                    <button
                      type="button"
                      className="btn-primary wd-bid-btn"
                      onClick={() => goToRead(opp)}
                    >
                      Run R-E-A-D →
                    </button>
                    <Link
                      to={`/fill?new=1&title=${encodeURIComponent(opp.title)}&agency=${encodeURIComponent(opp.fullParentPathName || opp.department || '')}&solnum=${encodeURIComponent(opp.noticeId)}${savedProposals[opp.noticeId] ? `&proposalId=${savedProposals[opp.noticeId]}` : ''}`}
                      className="btn-outline wd-bid-btn"
                    >
                      <ClipboardList size={13} /> Send to FASS FILL
                    </Link>
                  </>
                )}
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
