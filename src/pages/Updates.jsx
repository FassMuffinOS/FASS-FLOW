import { Sparkles } from 'lucide-react'
import Reveal from '../components/Reveal'
import useSeo from '../hooks/useSeo'
import './Updates.css'

// Real, shipped product updates only — customer-facing outcomes, not internal
// engineering detail. Ordered newest-first. No fabricated dates or stats:
// each entry traces back to a feature that actually shipped on FASS Flow.
const UPDATES = [
  {
    tag: 'GovCon Tools',
    title: 'AI deal scoring on every opportunity',
    body: "WARDOG and the Opportunity Workspace now show an AI-generated win-likelihood score and a 'Win-Delta' badge on every contract, so you can tell at a glance which opportunities are worth your time before you open them.",
  },
  {
    tag: 'GovCon Tools',
    title: 'Full solicitation text, captured automatically',
    body: 'Saving an opportunity now pulls the complete solicitation description and attached PDFs into FASS Flow directly, so R-E-A-D and FASS FILL work from the real requirements instead of just the listing summary.',
  },
  {
    tag: 'GovCon Tools',
    title: 'Wider NAICS search + more results per search',
    body: "WARDOG's opportunity search now supports a searchable NAICS code picker and pulls a larger result set per search with load-more pagination, so fewer relevant contracts get missed.",
  },
  {
    tag: 'Company',
    title: 'Careers page launched — FASS is hiring',
    body: 'We opened a public Careers page with real open roles and an in-app application flow, plus an admin view for reviewing applicants.',
  },
  {
    tag: 'Growth',
    title: 'Growth Challenge: gamified milestones for your business',
    body: 'A new Growth Challenge dashboard tracks real account milestones — first bid, first win, first referral — and rewards progress automatically as you use the platform.',
  },
  {
    tag: 'Networking',
    title: 'Group and teaming threads in Messenger',
    body: 'Messenger now supports threads with three or more participants, so subcontracting and teaming conversations can happen in one place instead of scattered DMs.',
  },
  {
    tag: 'Networking',
    title: 'Capability-based people search',
    body: 'Search across FASS Flow by NAICS code, certification, or past performance to find teaming partners and subcontractors who actually match what you need.',
  },
  {
    tag: 'Networking',
    title: 'Business Profiles — discoverable reputation pages',
    body: 'Every business now has a public profile page showing verified capabilities, certifications, and activity — shareable from chat, search, or Team Up.',
  },
  {
    tag: 'Messenger',
    title: 'Messenger v2: attachments, reactions, and push notifications',
    body: 'Messenger now supports file attachments, emoji reactions, message editing, read receipts, typing indicators, and real browser push notifications — so you never miss a reply.',
  },
  {
    tag: 'Messenger',
    title: 'Share opportunities, proposals, and posts straight into chat',
    body: 'WARDOG opportunities, R-E-A-D analyses, Team Up posts, and Passport cards can now be shared directly into a Messenger conversation as a live, clickable card.',
  },
  {
    tag: 'Wallet',
    title: 'Digital gift cards with Apple Wallet passes',
    body: 'Businesses can now sell digital gift cards through a public storefront page, with each card delivered as a real Apple Wallet pass and a full redemption history.',
  },
  {
    tag: 'Wallet',
    title: 'Push loyalty offers and rewards straight to Apple Wallet',
    body: 'FASS Wallet campaigns let businesses send offers and updated rewards directly to a customer’s Apple Wallet pass — no app required, no separate download.',
  },
  {
    tag: 'Wallet',
    title: 'Stamp cards and rewards programs, redeemable in person',
    body: 'Businesses can launch a digital stamp/rewards card, customers join with a tap, and staff redeem stamps and rewards right from a phone.',
  },
  {
    tag: 'Payments',
    title: 'Stripe Connect payouts for gift cards and wallet sales',
    body: 'Businesses can connect their own Stripe account so gift card and wallet purchases pay out directly to them, with FASS Flow handling the checkout flow.',
  },
  {
    tag: 'Operations',
    title: 'Comms Hub: one inbox for customer texts',
    body: 'Comms Hub centralizes customer SMS conversations into a single threaded inbox, with nudge alerts so no message sits unanswered.',
  },
  {
    tag: 'Operations',
    title: 'Team Up: a partner network and live chat for GovCon teaming',
    body: 'Team Up gives businesses a board for posting teaming opportunities and a built-in chat to coordinate with potential partners and subcontractors.',
  },
  {
    tag: 'Affiliates',
    title: 'Affiliate Program with a gamified dashboard',
    body: 'Refer other businesses to FASS Flow and track commissions, levels, and recruiting through a dedicated Affiliate Dashboard with shareable social cards.',
  },
  {
    tag: 'Dashboard',
    title: 'Business Health score and an AI daily brief',
    body: 'The Dashboard now surfaces a Business Health score from your real activity and an AI-written daily brief summarizing what changed and what needs attention.',
  },
  {
    tag: 'Company',
    title: 'New site, new look — built for first impressions',
    body: 'We rebuilt the public site from the ground up: a new animated landing page, an About page, a Press page, and this Blog — with real beta-launch offers instead of placeholder marketing.',
  },
]

export default function Updates() {
  useSeo({
    title: 'Product Updates',
    description: 'A running changelog of what we’ve shipped on FASS Flow — real features, in plain language, as we build them.',
    path: '/updates',
    markdownUrl: '/llms/updates.md',
    jsonLd: {
      '@context': 'https://schema.org',
      '@type': 'CollectionPage',
      name: 'FASS Flow Product Updates',
      description: 'A running changelog of features shipped on FASS Flow.',
    },
  })

  return (
    <div className="updates">
      <section className="updates-hero">
        <div className="container">
          <Reveal as="div" className="updates-hero-inner">
            <span className="section-label">Product Updates</span>
            <h1 className="updates-title">What We've Shipped</h1>
            <p className="updates-sub">
              FASS Flow is built in the open. This is a running list of real features we've
              shipped — newest first, no fluff, no fake metrics.
            </p>
          </Reveal>
        </div>
      </section>

      <section className="updates-section">
        <div className="container updates-container">
          <div className="updates-list">
            {UPDATES.map((u, i) => (
              <Reveal as="article" key={i} className="updates-item" delay={Math.min(i * 40, 400)}>
                <div className="updates-item-marker">
                  <Sparkles size={14} />
                </div>
                <div className="updates-item-body">
                  <span className="updates-item-tag">{u.tag}</span>
                  <h2 className="updates-item-title">{u.title}</h2>
                  <p className="updates-item-text">{u.body}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>
    </div>
  )
}
