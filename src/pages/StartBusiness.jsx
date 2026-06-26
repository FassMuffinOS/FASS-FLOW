import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Rocket, Check, ExternalLink, Package, Wrench, Landmark, DollarSign,
  Megaphone, ArrowRight, IdCard, Wallet as WalletIcon,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import './StartBusiness.css'

// Foundation steps apply no matter what's being sold — structure, state
// registration, EIN, a separate bank account, basic bookkeeping. These are
// generic, state-agnostic pointers to the right official source rather than
// state-specific legal text, since requirements (fees, registered-agent
// rules, timelines) vary by state and change — we'd rather route someone to
// the authoritative page than maintain 50 states of content here.
const FOUNDATION_STEPS = [
  {
    id: 'structure',
    title: 'Pick a business structure',
    body: "Sole proprietorship costs nothing and is the default if you do nothing — you're personally on the hook for business debts. An LLC costs a state filing fee but separates your personal assets from the business. Most people starting out pick one of these two.",
    linkLabel: 'SBA: choose a business structure',
    linkHref: 'https://www.sba.gov/business-guide/launch-your-business/choose-business-structure',
  },
  {
    id: 'register',
    title: 'Register with your state',
    body: "Sole proprietors using their own legal name often don't have to register at all. An LLC (or a sole prop using a different business name) usually files with your Secretary of State and may need a registered agent — a person or service that accepts legal mail on your behalf. Rules and fees vary by state.",
    linkLabel: 'SBA: register your business',
    linkHref: 'https://www.sba.gov/business-guide/launch-your-business/register-your-business',
  },
  {
    id: 'ein',
    title: 'Get a free EIN from the IRS',
    body: "An Employer Identification Number is your business's SSN — most banks want one to open a business account, and it lets you keep your personal SSN off invoices and forms. It's free and takes about 10 minutes directly on IRS.gov.",
    linkLabel: 'IRS: apply for an EIN',
    linkHref: 'https://www.irs.gov/businesses/small-businesses-self-employed/apply-for-an-employer-identification-number-ein-online',
  },
  {
    id: 'bank',
    title: 'Open a separate business bank account',
    body: 'Mixing personal and business money is the single most common reason small-business bookkeeping (and an LLC\'s liability protection) falls apart. Many banks and online business accounts have no minimum opening deposit.',
    linkLabel: null,
    linkHref: null,
  },
  {
    id: 'bookkeeping',
    title: 'Set up basic bookkeeping now',
    body: "A simple spreadsheet tracking what came in and what went out is enough on day one — the habit matters more than the tool. It's far easier to start clean than to reconstruct a year of receipts at tax time.",
    linkLabel: null,
    linkHref: null,
  },
]

const PRODUCT_STEPS = [
  {
    id: 'channel',
    title: 'Pick your first sales channel',
    body: "Facebook Marketplace and local buy/sell groups are free and let you test whether people actually want what you're selling before you've spent on anything else. Etsy or Shopify make sense once you're ready to sell beyond your local area.",
    linkLabel: 'Facebook Marketplace',
    linkHref: 'https://www.facebook.com/marketplace',
  },
  {
    id: 'permit',
    title: 'Check if you need a seller\'s permit',
    body: 'Most states require collecting sales tax on physical goods, which usually means registering for a seller\'s permit with your state\'s revenue department first.',
    linkLabel: 'SBA: licenses & permits',
    linkHref: 'https://www.sba.gov/business-guide/launch-your-business/apply-licenses-permits',
  },
  {
    id: 'source',
    title: 'Source your product and set your price',
    body: 'Know your full cost per unit (materials, packaging, your time) before you set a price — a common early mistake is pricing off what feels fair instead of cost-plus-margin.',
    linkLabel: null,
    linkHref: null,
  },
  {
    id: 'sop',
    title: 'Write your one-page fulfillment SOP',
    body: 'Order comes in → confirm/payment → fulfill → ship or hand off → follow up for a review. Writing it down once means you (or anyone helping you) can repeat it the same way every time.',
    linkLabel: null,
    linkHref: null,
  },
]

const SERVICE_STEPS = [
  {
    id: 'offer',
    title: 'Write your one-line offer and price list',
    body: "Before your first client conversation, know exactly what you do, for whom, and what it costs — a clear, simple offer closes more first jobs than a long list of everything you could possibly do.",
    linkLabel: null,
    linkHref: null,
  },
  {
    id: 'license',
    title: 'Check if your service needs a license',
    body: 'Contracting, cosmetology, food handling, childcare, and many other services require a state or local professional license before you can legally charge for the work.',
    linkLabel: 'SBA: licenses & permits',
    linkHref: 'https://www.sba.gov/business-guide/launch-your-business/apply-licenses-permits',
  },
  {
    id: 'insurance',
    title: 'Look into basic liability insurance',
    body: 'Once you have paying clients, general liability insurance is worth pricing out — costs vary a lot by trade and state, so get a quote rather than assuming it\'s out of reach.',
    linkLabel: null,
    linkHref: null,
  },
  {
    id: 'sop',
    title: 'Write your one-page client SOP',
    body: 'Inquiry comes in → quote → contract/invoice → deliver the work → ask for a review or referral. Writing it down once means every client gets the same experience.',
    linkLabel: null,
    linkHref: null,
  },
]

const BUDGET_ITEMS = [
  { label: 'State LLC filing fee (skip if sole proprietor)', range: '$0 – $500' },
  { label: 'EIN (IRS.gov, direct)', range: 'Free' },
  { label: 'Registered agent (if you don\'t act as your own)', range: '$0 – $150/yr' },
  { label: 'Business license / permit (if your state or service requires one)', range: '$0 – $200' },
  { label: 'Logo & basic website (free tools exist for both)', range: '$0 – $150' },
  { label: 'First inventory, tools, or supplies', range: 'Varies — price it before you commit' },
  { label: 'FASS Wallet card + capability page', range: 'Free to start' },
]

function loadChecklist(userId) {
  if (!userId) return {}
  try {
    return JSON.parse(localStorage.getItem(`fass_start_checklist_${userId}`) || '{}')
  } catch {
    return {}
  }
}

export default function StartBusiness() {
  const { session } = useAuth()
  const navigate = useNavigate()
  const userId = session?.user?.id

  const [path, setPath] = useState(null) // 'product' | 'service' | null
  const [done, setDone] = useState({})

  useEffect(() => {
    if (!userId) return
    setPath(localStorage.getItem(`fass_start_path_${userId}`) || null)
    setDone(loadChecklist(userId))
  }, [userId])

  function choosePath(p) {
    setPath(p)
    if (userId) localStorage.setItem(`fass_start_path_${userId}`, p)
  }

  function toggleDone(id) {
    setDone(prev => {
      const next = { ...prev, [id]: !prev[id] }
      if (userId) localStorage.setItem(`fass_start_checklist_${userId}`, JSON.stringify(next))
      return next
    })
  }

  function renderStep(step) {
    return (
      <div key={step.id} className={`pp-check-item ${done[step.id] ? 'done' : ''}`}>
        <button type="button" className="pp-check-box" onClick={() => toggleDone(step.id)} aria-label="Toggle done">
          {done[step.id] && <Check size={13} />}
        </button>
        <div className="pp-check-body">
          <div className="pp-check-top">
            <span className="pp-check-title">{step.title}</span>
            {step.linkHref && (
              <a className="pp-check-link" href={step.linkHref} target="_blank" rel="noreferrer">
                {step.linkLabel} <ExternalLink size={12} />
              </a>
            )}
          </div>
          <p className="pp-note">{step.body}</p>
        </div>
      </div>
    )
  }

  const branchSteps = path === 'product' ? PRODUCT_STEPS : path === 'service' ? SERVICE_STEPS : null

  return (
    <div className="pp">
      <div className="pp-container">
        <div className="pp-head">
          <Rocket size={22} className="pp-head-icon" />
          <div>
            <h1>Start your business</h1>
            <p>Not registered yet? Start here. This is general information to point you to the right official source — not legal or tax advice, and requirements vary by state, so confirm specifics for your situation.</p>
          </div>
        </div>

        <div className="pp-card">
          <div className="pp-card-head">
            <Package size={16} /> <span>What are you starting?</span>
          </div>
          <p className="pp-note pp-note-block">Pick one — the checklist below adjusts to match.</p>
          <div className="sb-path-grid">
            <button type="button" className={`sb-path-btn ${path === 'product' ? 'active' : ''}`} onClick={() => choosePath('product')}>
              <Package size={20} />
              <span>I sell a product</span>
              <span className="sb-path-sub">Something you make, source, or resell</span>
            </button>
            <button type="button" className={`sb-path-btn ${path === 'service' ? 'active' : ''}`} onClick={() => choosePath('service')}>
              <Wrench size={20} />
              <span>I offer a service</span>
              <span className="sb-path-sub">Your time, skill, or labor</span>
            </button>
          </div>
        </div>

        <div className="pp-card">
          <div className="pp-card-head">
            <Landmark size={16} /> <span>The foundation — do this no matter what you sell</span>
          </div>
          <div className="pp-checklist">
            {FOUNDATION_STEPS.map(renderStep)}
          </div>
        </div>

        {branchSteps && (
          <div className="pp-card">
            <div className="pp-card-head">
              {path === 'product' ? <Package size={16} /> : <Wrench size={16} />}
              <span>{path === 'product' ? 'Selling a product — start here' : 'Offering a service — start here'}</span>
            </div>
            <div className="pp-checklist">
              {branchSteps.map(renderStep)}
            </div>
          </div>
        )}

        <div className="pp-card">
          <div className="pp-card-head">
            <DollarSign size={16} /> <span>Starting for under $1,000</span>
          </div>
          <p className="pp-note pp-note-block">Rough ranges, not quotes — your state and category change these. Price each one for your situation before you commit.</p>
          <div className="sb-budget">
            {BUDGET_ITEMS.map(item => (
              <div key={item.label} className="sb-budget-row">
                <span className="sb-budget-label">{item.label}</span>
                <span className="sb-budget-range">{item.range}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="pp-card">
          <div className="pp-card-head">
            <Megaphone size={16} /> <span>Start promoting today</span>
          </div>
          <p className="pp-note pp-note-block">You don't have to wait until every box above is checked — make your free Wallet card and capability page now, so you have something to hand or text people the moment someone asks what you do.</p>
          <div className="sb-cta-row">
            <button type="button" className="btn-primary" onClick={() => navigate('/wallet')}>
              <WalletIcon size={15} /> Make my free Wallet card <ArrowRight size={13} />
            </button>
            <button type="button" className="btn-outline" onClick={() => navigate('/passport')}>
              <IdCard size={15} /> Set up my Passport <ArrowRight size={13} />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
