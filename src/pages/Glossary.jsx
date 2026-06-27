import { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { Search, BookOpen, ExternalLink, Download, Check, Lock } from 'lucide-react'
import './Glossary.css'

const FREE_INCLUDES = [
  'The full searchable glossary on this page — every term, no login wall',
  'A free downloadable Opportunity Response Worksheet (one page, one opportunity)',
  'Browsing WARDOG\'s live opportunity feed and curated platform directory',
]

const MASTERCLASS_UNLOCKS = [
  'All 10 Missions of the curriculum — entity setup through closeout, in order',
  'The full R-E-A-D bid/no-bid workflow, walked through step by step',
  'A worked capabilities-statement example and the complete Proposal Assembly Checklist',
  'Direct instructor access (live cohort) or the self-paced ebook on your own schedule',
]

// ── Govcon nomenclature, grouped by what a brand-new bidder actually
// runs into first: where the work is posted, what the posting is called,
// who gets priority, and the acronyms buried inside every solicitation.
// Written for someone who has never touched a federal bid before — this
// is the "demystify it" layer that sits in front of WARDOG/R-E-A-D/FILL.
const GROUPS = [
  {
    id: 'platforms',
    label: 'Where work gets posted',
    terms: [
      {
        term: 'SAM.gov',
        short: 'System for Award Management',
        body: 'The federal government\'s primary, free, public bid board. Every contractor who wants to bid on federal work has to register here first. WARDOG pulls live from SAM.gov — it\'s the only source on this page with a public, no-cost API.',
        link: 'https://sam.gov',
      },
      {
        term: 'DIBBS',
        short: 'DLA Internet Bid Board System',
        body: 'A web-based application run by the Defense Logistics Agency (DLA) for searching, viewing, and submitting secure quotes on Requests for Quotations (RFQs) for DLA items of supply. Also used to view Requests for Proposals (RFPs), Invitations for Bid (IFBs), awards, and other DLA procurement info. High volume, fast turnaround — built for parts and supply manufacturers, not services contractors.',
        link: 'https://www.dibbs.bsm.dla.mil',
      },
      {
        term: 'FedConnect',
        short: 'Buyer-seller portal',
        body: 'Used by NASA, DHS, and several other agencies to post solicitations and run Q&A. Many notices cross-post to SAM.gov, but some agency-specific attachments only live here — worth checking if an agency mentions it in a notice.',
        link: 'https://www.fedconnect.net',
      },
      {
        term: 'Unison Marketplace',
        short: 'GSA-affiliated reverse auction platform',
        body: 'Federal buyers use this for simplified acquisitions, often under the micro-purchase or simplified acquisition thresholds — smaller, faster buys than a full RFP process.',
        link: 'https://www.unisonmarketplace.com',
      },
      {
        term: 'GSA eBuy',
        short: 'GSA Schedule order portal',
        body: 'Where federal buyers solicit quotes against existing GSA Schedule contracts. You generally need to already hold a GSA Schedule to bid here — it\'s a tool for contract holders, not open-market bidders.',
        link: 'https://www.ebuy.gsa.gov',
      },
      {
        term: 'State & local portals',
        short: 'eMMA (MD), city/county bid boards',
        body: 'Every state runs its own procurement portal (Maryland\'s is eMMA), and most cities/counties run their own too. Lower competition than federal work, but registration and bonding requirements vary by jurisdiction.',
        link: 'https://emma.maryland.gov',
      },
      {
        term: 'University procurement',
        short: 'Campus bid boards',
        body: 'Public and private universities run their own solicitations for facilities, food service, IT, and event contracts. Often overlooked, frequently lower barrier to entry than federal or state work.',
      },
    ],
  },
  {
    id: 'documents',
    label: 'What the posting is called',
    terms: [
      {
        term: 'RFQ',
        short: 'Request for Quotation',
        body: 'The buyer wants a price quote for a specific, well-defined item or service. Usually the fastest-moving, lowest-friction document type — common on DIBBS and for simplified acquisitions.',
      },
      {
        term: 'RFP',
        short: 'Request for Proposal',
        body: 'The buyer wants a full proposal — technical approach, past performance, staffing, and price — not just a number. Slower-moving and more competitive than an RFQ; this is what most of FASS FILL\'s compliance-matrix tooling is built around.',
      },
      {
        term: 'IFB',
        short: 'Invitation for Bid',
        body: 'A sealed-bid process where price is usually the only deciding factor among bidders who meet the minimum requirements. Less common than RFQ/RFP for services, more common for construction and supply.',
      },
      {
        term: 'RFI',
        short: 'Request for Information',
        body: 'The agency is still figuring out what it wants. No award comes from an RFI directly — it\'s market research. Responding well here can shape the eventual RFP and put your name in front of the contracting officer early.',
      },
      {
        term: 'Sources Sought',
        short: 'Market research notice',
        body: 'Similar intent to an RFI: the agency is checking whether enough qualified small businesses exist to justify a set-aside. Responding signals capability and can influence whether the eventual solicitation is set aside for small business.',
      },
      {
        term: 'Presolicitation',
        short: 'Advance notice',
        body: 'A heads-up that a full solicitation is coming, sometimes with a draft scope attached. Worth tracking so you\'re not caught flat-footed when the real RFP/RFQ drops.',
      },
      {
        term: 'Combined Synopsis/Solicitation',
        short: 'Notice + solicitation in one',
        body: 'A simplified-acquisition format that combines the public notice and the actual solicitation into a single document — common for smaller-dollar buys where the agency wants to move fast.',
      },
      {
        term: 'Award Notice',
        short: 'Who won',
        body: 'Published after the contract is awarded. Useful for competitive intelligence — see who\'s winning similar work, at what price, and how often a given agency re-competes.',
      },
    ],
  },
  {
    id: 'setasides',
    label: 'Who gets priority',
    terms: [
      {
        term: 'Small Business Set-Aside (SBA)',
        short: 'Open only to small businesses',
        body: 'The single most common set-aside. Eligibility is based on size standards tied to your NAICS code — revenue or employee count thresholds vary by industry.',
      },
      {
        term: '8(a)',
        short: 'SBA 8(a) Business Development Program',
        body: 'For small businesses owned by socially and economically disadvantaged individuals. Requires SBA program certification; sole-source awards are possible up to certain dollar thresholds.',
      },
      {
        term: 'SDVOSB',
        short: 'Service-Disabled Veteran-Owned Small Business',
        body: 'At least 51% owned and controlled by one or more service-disabled veterans. Self-certify or use the VA\'s VetCert verification depending on the awarding agency.',
      },
      {
        term: 'WOSB / EDWOSB',
        short: 'Women-Owned / Economically Disadvantaged Women-Owned Small Business',
        body: 'At least 51% owned and controlled by women. EDWOSB adds an economic disadvantage requirement and unlocks a wider set of eligible NAICS codes.',
      },
      {
        term: 'HUBZone',
        short: 'Historically Underutilized Business Zone',
        body: 'For small businesses located in and employing residents of designated economically distressed areas. Certification is tied to your principal office location and employee residency.',
      },
      {
        term: 'Veteran-Owned (VO)',
        short: 'Veteran-Owned Small Business',
        body: 'At least 51% owned and controlled by one or more veterans (no service-connected disability requirement, unlike SDVOSB).',
      },
    ],
  },
  {
    id: 'core',
    label: 'Terms inside every solicitation',
    terms: [
      {
        term: 'NAICS Code',
        short: 'North American Industry Classification System',
        body: 'A 6-digit code that classifies what industry a contract falls under. Every solicitation has one (sometimes several) — it determines your small-business size standard eligibility and is the main filter WARDOG searches on.',
      },
      {
        term: 'PWS / SOW / SOO',
        short: 'Performance Work Statement / Statement of Work / Statement of Objectives',
        body: 'The section describing what work actually needs to get done. A PWS focuses on outcomes and performance standards, a SOW spells out specific tasks, and a SOO leaves the "how" entirely to the bidder\'s proposed approach.',
      },
      {
        term: 'CO / COR',
        short: 'Contracting Officer / Contracting Officer\'s Representative',
        body: 'The CO has legal authority to bind the government to a contract — they\'re who you negotiate with. The COR manages day-to-day technical performance once the contract is awarded but can\'t change contract terms.',
      },
      {
        term: 'CLIN',
        short: 'Contract Line Item Number',
        body: 'Each separately priced piece of a contract gets its own CLIN — think of it as a line item on an invoice, but defined in the contract itself.',
      },
      {
        term: 'FAR / DFARS',
        short: 'Federal Acquisition Regulation / Defense FAR Supplement',
        body: 'The FAR is the rulebook governing all federal procurement. DFARS adds Defense Department-specific rules on top of it. Solicitations cite specific FAR/DFARS clauses you\'re agreeing to by bidding.',
      },
      {
        term: 'Period of Performance (PoP)',
        short: 'Contract duration',
        body: 'The timeframe the contract covers, often structured as a base year plus several option years the government can exercise (or not) at its discretion.',
      },
      {
        term: 'IDIQ',
        short: 'Indefinite Delivery, Indefinite Quantity',
        body: 'A contract vehicle where the exact quantity and timing of orders isn\'t fixed up front — the government issues task orders against it as needs arise, up to a ceiling value.',
      },
      {
        term: 'GSA Schedule',
        short: 'Multiple Award Schedule (MAS)',
        body: 'A pre-negotiated, pre-vetted contract vehicle that lets federal buyers purchase from you without running a full competition each time. Getting on a Schedule is its own application process, separate from bidding individual solicitations.',
      },
      {
        term: 'Micro-Purchase / Simplified Acquisition Threshold',
        short: 'Dollar thresholds that simplify the process',
        body: 'Below the micro-purchase threshold, a CO can often buy directly with a card, no competition required. Below the (higher) simplified acquisition threshold, agencies can use streamlined procedures instead of a full, formal solicitation process.',
      },
    ],
  },
  {
    id: 'money',
    label: 'Getting paid & teaming up',
    terms: [
      {
        term: 'FAR 32.009 / Accelerated Payments to Small Business Subs',
        short: 'The "net 15" rule, sort of',
        body: 'FAR clause 52.232-40 sets a goal — not a hard deadline — for prime contractors to pay small-business subcontractors within 15 days after the prime itself receives an accelerated payment from the government, once it has a proper invoice in hand. It doesn\'t create new Prompt Payment Act rights and doesn\'t change the PPA\'s late-payment interest rules. In practice: it\'s leverage for a sub to ask "why hasn\'t the prime passed this through yet," not a guaranteed 15-day check.',
        link: 'https://www.acquisition.gov/far/subpart-32.9',
      },
      {
        term: 'Teaming Partner vs. Joint Venture',
        short: 'Two ways to team up, very different commitment levels',
        body: 'A teaming arrangement is a contract between two separate companies — one usually bids as prime, the other as sub — that stays in effect for that specific pursuit. Each company keeps its own legal identity, financials, and past performance; the relationship can be as simple as a teaming agreement signed before proposal submission. A joint venture (JV) is a new, separate legal entity the partners create together, sharing in the revenue, risk, and (for small-business programs like the SBA\'s All Small Mentor-Protégé Program) sometimes the ability to bid as if it were a single small business even when one partner is larger. JVs take more paperwork and SBA approval to set up but unlock bigger or set-aside opportunities a single small partner couldn\'t win alone. Default to teaming for a one-off bid; consider a JV when you expect to pursue the same lane repeatedly with the same partner.',
      },
    ],
  },
]

export default function Glossary() {
  const [query, setQuery] = useState('')
  const [activeGroup, setActiveGroup] = useState('all')

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return GROUPS
      .filter(g => activeGroup === 'all' || g.id === activeGroup)
      .map(g => ({
        ...g,
        terms: g.terms.filter(t =>
          !q ||
          t.term.toLowerCase().includes(q) ||
          t.short.toLowerCase().includes(q) ||
          t.body.toLowerCase().includes(q)
        ),
      }))
      .filter(g => g.terms.length > 0)
  }, [query, activeGroup])

  const totalShown = filtered.reduce((n, g) => n + g.terms.length, 0)

  return (
    <div className="gloss">
      <div className="gloss-top">
        <div>
          <h1 className="gloss-title">Govcon Glossary</h1>
          <p className="gloss-sub">
            Plain-English explanations of the platforms, document types, and jargon you'll see in every
            solicitation. No login walls, no quiz — just look things up while you browse WARDOG.
          </p>
        </div>
        <BookOpen size={28} className="gloss-icon" />
      </div>

      <div className="gloss-controls">
        <div className="gloss-search-wrap">
          <Search size={15} className="gloss-search-icon" />
          <input
            type="text"
            placeholder="Search a term, e.g. &quot;set-aside&quot; or &quot;DIBBS&quot;…"
            value={query}
            onChange={e => setQuery(e.target.value)}
          />
        </div>
        <div className="gloss-pills">
          <button
            className={`gloss-pill ${activeGroup === 'all' ? 'active' : ''}`}
            onClick={() => setActiveGroup('all')}
          >
            All
          </button>
          {GROUPS.map(g => (
            <button
              key={g.id}
              className={`gloss-pill ${activeGroup === g.id ? 'active' : ''}`}
              onClick={() => setActiveGroup(g.id)}
            >
              {g.label}
            </button>
          ))}
        </div>
      </div>

      {totalShown === 0 && (
        <div className="gloss-empty">No terms match "{query}". Try a different word.</div>
      )}

      {filtered.map(group => (
        <div key={group.id} className="gloss-group">
          <h2 className="gloss-group-label">{group.label}</h2>
          <div className="gloss-grid">
            {group.terms.map(t => (
              <div key={t.term} className="gloss-card">
                <div className="gloss-card-top">
                  <span className="gloss-term">{t.term}</span>
                  {t.link && (
                    <a href={t.link} target="_blank" rel="noreferrer" className="gloss-link">
                      <ExternalLink size={12} />
                    </a>
                  )}
                </div>
                <span className="gloss-short">{t.short}</span>
                <p className="gloss-body">{t.body}</p>
              </div>
            ))}
          </div>
        </div>
      ))}

      <div className="gloss-value">
        <div className="gloss-value-col">
          <span className="gloss-value-label">Free, right now</span>
          <ul className="gloss-value-list">
            {FREE_INCLUDES.map(item => (
              <li key={item}><Check size={14} className="gloss-value-icon gloss-value-icon-free" />{item}</li>
            ))}
          </ul>
          <a
            href="/downloads/FASS-Opportunity-Response-Worksheet.pdf"
            download
            className="btn-outline gloss-download-btn"
          >
            <Download size={15} /> Download the free worksheet (PDF)
          </a>
        </div>
        <div className="gloss-value-col gloss-value-col-locked">
          <span className="gloss-value-label gloss-value-label-locked">What the Masterclass unlocks</span>
          <ul className="gloss-value-list">
            {MASTERCLASS_UNLOCKS.map(item => (
              <li key={item}><Lock size={13} className="gloss-value-icon gloss-value-icon-locked" />{item}</li>
            ))}
          </ul>
        </div>
      </div>

      <div className="gloss-cta">
        <div>
          <h3>Ready to stop looking terms up and start using them?</h3>
          <p>
            The 10-Mission Masterclass walks through bid strategy, compliance, and pricing mission by mission —
            or grab the self-paced ebook and work through it on your own schedule. Founding pricing is
            currently $175 (50% off $350) while we scale to our first 100 students.
          </p>
        </div>
        <div className="gloss-cta-actions">
          <Link to="/classroom" className="btn-primary">Start the Masterclass</Link>
          <Link to="/masterclass" className="btn-outline">Get the ebook</Link>
        </div>
      </div>
    </div>
  )
}
