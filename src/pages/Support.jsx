import { useState } from 'react'
import { Heart, DollarSign, FileSearch, ArrowRight, BookOpen, Sparkles, Loader2, PlayCircle } from 'lucide-react'
import ScribeEmbed from '../components/ScribeEmbed'
import './Support.css'

const API_BASE = import.meta.env.VITE_API_URL || ''

// Interactive Scribe walkthroughs. Add new ones here — they stay current
// with the source guide automatically.
const GUIDES = [
  {
    title: 'Create & manage bids using FASS Flow',
    src: 'https://scribehow.com/embed/How_To_Create_And_Manage_Bids_Using_FASS_Flow__jjo7twpkTNy8G2i8_Kmevw',
  },
]

const TIP_OPTIONS = [
  {
    name: 'Cash App',
    handle: '$fassmuffinos',
    href: 'https://cash.app/$fassmuffinos',
  },
  {
    name: 'Venmo',
    handle: '@munchiesgourmets',
    href: 'https://venmo.com/munchiesgourmets',
  },
]

const SYNTHESIS_CATEGORY_LABELS = {
  eligibility: 'Registration & Eligibility',
  requirements: 'Experience & Mandatory Requirements',
  availability: 'Availability & Capacity',
  deadlines: 'Deadlines & Timing',
  economics: 'Economics & Margin',
  documentation: 'Documentation & Substantiation',
}

// There's no checkout on this page, by design — every offer here is fulfilled
// the same trust-based way the Cash App/Venmo tips are: pay, then email, and a
// human (or this on-page tool) follows through. The "free use" tracked below
// is the same honor-system pattern, not a real paywall — it just gives buyers
// of the ebook bundle a clear, single included run before any per-use pricing
// applies, without us standing up real billing for a $5 AI call.
function AISynthesisTool() {
  const [text, setText] = useState('')
  const [title, setTitle] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState(null)
  const [freeUseSpent, setFreeUseSpent] = useState(
    () => localStorage.getItem('fass_support_ai_free_used') === '1'
  )

  async function runSynthesis() {
    if (!text.trim()) return
    setLoading(true)
    setError('')
    setResult(null)
    try {
      const res = await fetch(`${API_BASE}/api/v1/ai/read-synthesis`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ solicitation_text: text, title }),
      })
      if (!res.ok) throw new Error(`Request failed (${res.status})`)
      const json = await res.json()
      setResult(json.synthesis || {})
      if (!freeUseSpent) {
        localStorage.setItem('fass_support_ai_free_used', '1')
        setFreeUseSpent(true)
      }
    } catch (err) {
      setError(err.message || 'Could not run the synthesis — try again in a moment.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="sup-ai-tool">
      <div className="sup-ai-tool-header">
        <Sparkles size={18} />
        <span>AI Solicitation Synthesis</span>
      </div>
      <p className="sup-ai-tool-sub">
        {freeUseSpent
          ? "You've used your included free run on this browser — additional runs are $5 each. Cash App/Venmo above, then run another."
          : 'Paste the solicitation text below. First run is free.'}
      </p>
      <input
        type="text"
        placeholder="Solicitation title (optional)"
        value={title}
        onChange={e => setTitle(e.target.value)}
        className="sup-ai-tool-title"
      />
      <textarea
        placeholder="Paste the solicitation's Section L/M, PWS/SOW, or any excerpt you want broken down…"
        value={text}
        onChange={e => setText(e.target.value)}
        rows={6}
        className="sup-ai-tool-textarea"
      />
      <button
        type="button"
        className="btn-primary sup-ai-tool-btn"
        onClick={runSynthesis}
        disabled={loading || !text.trim()}
      >
        {loading ? <Loader2 size={15} className="sup-spin" /> : <Sparkles size={15} />}
        {loading ? 'Reading the solicitation…' : 'Run synthesis'}
      </button>
      {error && <p className="sup-ai-tool-error">{error}</p>}
      {result && Object.keys(result).length > 0 && (
        <div className="sup-ai-tool-results">
          {Object.entries(result).map(([cat, text]) => (
            <div key={cat} className="sup-ai-tool-result">
              <span className="sup-ai-tool-result-label">{SYNTHESIS_CATEGORY_LABELS[cat] || cat}</span>
              <p>{text}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default function Support() {
  return (
    <div className="sup">
      <section className="sup-hero">
        <div className="container sup-hero-inner">
          <Heart size={28} className="sup-hero-icon" />
          <h1>Support FASS Flow</h1>
          <p>
            FASS Flow is a small team building tools to get more small businesses into government contracting.
            If this has helped your business and you want to chip in, here's how — no pressure, ever.
          </p>
        </div>
      </section>

      <section className="sup-section">
        <div className="container">
          <h2 className="sup-section-title"><PlayCircle size={20} style={{ verticalAlign: '-3px', marginRight: 8 }} />Step-by-step guides</h2>
          <p className="sup-section-sub">
            Interactive walkthroughs of FASS Flow — they update automatically as the app changes, so they never go stale.
          </p>
          <div className="sup-guides">
            {GUIDES.map(g => (
              <div className="sup-guide" key={g.src}>
                <h3 className="sup-guide-title">{g.title}</h3>
                <ScribeEmbed src={g.src} title={g.title} />
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="sup-section">
        <div className="container">
          <h2 className="sup-section-title">Send a tip directly</h2>
          <p className="sup-section-sub">
            Goes straight to the team — no processing fees, no middleman.
          </p>
          <div className="sup-tip-grid">
            {TIP_OPTIONS.map(opt => (
              <a key={opt.name} href={opt.href} target="_blank" rel="noreferrer" className="sup-tip-card">
                <span className="sup-tip-name">{opt.name}</span>
                <span className="sup-tip-handle">{opt.handle}</span>
                <span className="sup-tip-go">
                  Open {opt.name} <ArrowRight size={14} />
                </span>
              </a>
            ))}
          </div>
        </div>
      </section>

      <section className="sup-section sup-section-alt">
        <div className="container">
          <div className="sup-offer-card">
            <FileSearch size={22} className="sup-offer-icon" />
            <div className="sup-offer-body">
              <span className="sup-offer-badge">Pay-per-solicitation</span>
              <h2 className="sup-section-title sup-offer-title">Want a second set of eyes on one solicitation?</h2>
              <p>
                If you don't want a subscription or the full Masterclass, we'll review a single solicitation
                with you directly — scope, eligibility, evaluation criteria, and a straight answer on
                bid/no-bid — for a flat <strong>$10 per solicitation</strong>.
              </p>
              <div className="sup-offer-promo">
                <DollarSign size={16} />
                <span><strong>First month special:</strong> get $10 back on your first solicitation review. Your first one is effectively on us.</span>
              </div>
              <a href="mailto:admin@fass.systems?subject=Solicitation Review Request" className="btn-primary sup-offer-cta">
                Request a review — admin@fass.systems
              </a>
            </div>
          </div>
        </div>
      </section>

      <section className="sup-section">
        <div className="container">
          <h2 className="sup-section-title">Self-paced ebook</h2>
          <p className="sup-section-sub">
            Same content as the Masterclass, in book form, on your own schedule.
          </p>
          <div className="sup-offer-grid">
            <div className="sup-offer-card sup-offer-card-stack">
              <BookOpen size={22} className="sup-offer-icon" />
              <div className="sup-offer-body">
                <span className="sup-offer-badge">Instant download</span>
                <h3 className="sup-offer-title">Ebook — $9, instant</h3>
                <p>
                  <strong>$9</strong> gets you the full self-paced ebook — same content as the
                  Masterclass, in book form — delivered the moment you pay. It also includes{' '}
                  <strong>one free run</strong> of the AI Solicitation Synthesis tool below, the same
                  grounded breakdown R-E-A-D uses on a real solicitation. Got value from it? Pass your
                  copy to a partner or a friend bidding their first contract.
                </p>
                <a
                  href="https://buy.stripe.com/3cI3co4Rc6c69UIco3fnO0e"
                  target="_blank"
                  rel="noreferrer"
                  className="btn-primary sup-offer-cta"
                >
                  Buy the ebook — $9
                </a>
                <a
                  href="mailto:admin@fass.systems?subject=Ebook Purchase (%249)&body=Paid via Cash App/Venmo — here's my email:"
                  className="sup-offer-altlink"
                >
                  Prefer Cash App/Venmo? Pay above, then email us
                </a>
              </div>
            </div>

            <div className="sup-offer-card sup-offer-card-stack">
              <Sparkles size={22} className="sup-offer-icon" />
              <div className="sup-offer-body">
                <span className="sup-offer-badge">AI only · no ebook · no human</span>
                <h3 className="sup-offer-title">Just want the AI's take? — $5 per solicitation</h3>
                <p>
                  Skip the ebook and the $10 human review — run the same AI synthesis on a single
                  solicitation yourself, instantly, below. Your first run on this browser is free either
                  way; after that it's a flat <strong>$5</strong> per solicitation via Cash App/Venmo above.
                </p>
                <a href="#sup-ai-tool" className="btn-outline sup-offer-cta">
                  Scroll to the tool ↓
                </a>
              </div>
            </div>
          </div>

          <div id="sup-ai-tool" className="sup-ai-tool-wrap">
            <AISynthesisTool />
          </div>
        </div>
      </section>

      <section className="sup-section">
        <div className="container sup-bottom">
          <p>
            Prefer to support us by using the product? The best way is still the
            {' '}<a href="/masterclass">Masterclass</a>{' '} or the self-paced ebook — every purchase funds
            the next feature.
          </p>
        </div>
      </section>
    </div>
  )
}
