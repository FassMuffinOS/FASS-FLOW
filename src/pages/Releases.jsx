import { Rocket, CheckCircle2 } from 'lucide-react'
import Reveal from '../components/Reveal'
import useSeo from '../hooks/useSeo'
import './Releases.css'

// Real shipped work, grouped into releases by feature area — newest first.
// Each "Shipped" line traces to an actually-completed build. No invented
// version numbers, commit counts, or performance stats: those would need a
// real CI feed we don't have wired up yet, so we don't fake them here.
const RELEASES = [
  {
    lane: 'Win Work',
    title: 'AI-Scored Opportunities',
    shipped: [
      'AI win-likelihood score and Win-Delta badge on every WARDOG opportunity',
      'Full solicitation text and PDF attachments captured automatically on save',
      'Searchable NAICS code picker with a larger, paginated result set',
    ],
    impact: 'Less time spent reading the wrong contracts — the platform tells you which ones are worth opening first.',
  },
  {
    lane: 'Grow Customers',
    title: 'FASS Wallet: Gift Cards & Payouts',
    shipped: [
      'Digital gift cards delivered as real Apple Wallet passes',
      'Public no-login storefront for customers to buy a gift card',
      'Stripe Connect payouts straight to the business’s own account',
    ],
    impact: 'Businesses can sell gift cards online without building a storefront or a payments integration themselves.',
  },
  {
    lane: 'Grow Customers',
    title: 'Wallet Campaigns & Rewards',
    shipped: [
      'Push loyalty offers and updated rewards directly to a customer’s Apple Wallet pass',
      'Digital stamp cards with tap-to-join and in-person staff redemption',
      'Customer list / CRM panel with targeted and bonus-stamp sends',
    ],
    impact: 'No separate loyalty app — the offer updates on a pass customers already have on their phone.',
  },
  {
    lane: 'Execute Jobs',
    title: 'Messenger v2',
    shipped: [
      'File attachments, emoji reactions, message editing, and read receipts',
      'Real browser push notifications and online/typing presence',
      'Opportunities, R-E-A-D analyses, and Passport cards shareable as live cards in chat',
    ],
    impact: 'One inbox for teaming conversations instead of texts, email, and DMs spread across apps.',
  },
  {
    lane: 'Execute Jobs',
    title: 'Teaming & Business Profiles',
    shipped: [
      'Group/teaming threads with three or more participants',
      'Capability-based people search by NAICS code, certification, or past performance',
      'Public, discoverable Business Profile pages with verified capabilities',
    ],
    impact: 'Finding a subcontractor or teaming partner is a search, not a round of cold outreach.',
  },
  {
    lane: 'Grow Customers',
    title: 'Comms Hub & Team Up',
    shipped: [
      'A single threaded inbox for customer SMS conversations, with nudge alerts',
      'Team Up partner-network board with built-in chat for GovCon teaming',
    ],
    impact: 'Customer and partner conversations live in FASS Flow instead of a personal phone.',
  },
  {
    lane: 'Grow Customers',
    title: 'Affiliate Program',
    shipped: [
      'Referral signup flow with commission tracking on every real payment',
      'Gamified Affiliate Dashboard with levels, XP, and sub-affiliate recruiting',
      'Shareable social cards for affiliates to post their own referral link',
    ],
    impact: 'Businesses (and partners) can earn by referring other businesses, with the payout math handled automatically.',
  },
  {
    lane: 'Win Work',
    title: 'Smarter Dashboard',
    shipped: [
      'Business Health score built from real account activity',
      'AI-written daily brief summarizing what changed and what needs attention',
      'AI Chief-of-Staff query box for asking the dashboard direct questions',
    ],
    impact: 'Opening the dashboard answers "what should I do today" instead of just showing raw numbers.',
  },
  {
    lane: 'Company',
    title: 'Careers & Growth Challenge',
    shipped: [
      'Public Careers page with real open roles and an in-app application flow',
      'Growth Challenge: gamified milestones (first bid, first win, first referral) with automatic rewards',
    ],
    impact: 'Hiring and account growth both get the same in-product, milestone-driven treatment.',
  },
  {
    lane: 'Company',
    title: 'New Public Site',
    shipped: [
      'Rebuilt landing page, About, Press, and Blog',
      'Beta-launch messaging and founding-member pricing offer',
      'SEO/AEO foundation: sitemap, robots.txt, llms.txt, and per-page structured data',
    ],
    impact: 'The site now explains what FASS Flow actually does instead of leaning on placeholder marketing.',
  },
]

export default function Releases() {
  useSeo({
    title: 'Releases',
    description: 'A structured release log of what we’ve shipped on FASS Flow, grouped by feature area — real builds, real impact, no filler.',
    path: '/releases',
    markdownUrl: '/llms/releases.md',
    jsonLd: {
      '@context': 'https://schema.org',
      '@type': 'CollectionPage',
      name: 'FASS Flow Releases',
      description: 'A structured release log of features shipped on FASS Flow.',
    },
  })

  return (
    <div className="releases">
      <section className="releases-hero">
        <div className="container">
          <Reveal as="div" className="releases-hero-inner">
            <span className="section-label">Releases</span>
            <h1 className="releases-title">Shipped, Grouped, Real</h1>
            <p className="releases-sub">
              The same changelog as <a href="/updates">/updates</a>, organized by release instead of by date — what
              shipped, and why it actually matters to the business using it.
            </p>
          </Reveal>
        </div>
      </section>

      <section className="releases-section">
        <div className="container releases-container">
          <div className="releases-grid">
            {RELEASES.map((r, i) => (
              <Reveal as="article" key={r.title} className="release-card" delay={Math.min(i * 50, 400)}>
                <span className="release-lane">{r.lane}</span>
                <h2 className="release-title">{r.title}</h2>
                <ul className="release-shipped">
                  {r.shipped.map((s, j) => (
                    <li key={j}>
                      <CheckCircle2 size={14} className="release-check" />
                      <span>{s}</span>
                    </li>
                  ))}
                </ul>
                <div className="release-impact">
                  <Rocket size={13} />
                  <span>{r.impact}</span>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>
    </div>
  )
}
