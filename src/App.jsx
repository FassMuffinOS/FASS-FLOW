import { useState, useEffect } from 'react'
import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import { isAffiliateAllowedPath, useAffiliateOnly } from './lib/affiliateGate'
import { isWalletAllowedPath, useWalletOnly } from './lib/regularsGate'
import { hostProduct } from './lib/hostProduct'
import Nav from './components/Nav'
import Hero from './components/Hero'
import HomeBand from './components/HomeBand'
import AffiliateBand from './components/AffiliateBand'
import HowItWorks from './components/HowItWorks'
import Pricing from './components/Pricing'
import Footer from './components/Footer'
import Careers from './pages/Careers'
import About from './pages/About'
import Press from './pages/Press'
import Trust from './pages/Trust'
import Blog from './pages/Blog'
import Updates from './pages/Updates'
import Releases from './pages/Releases'
import PrivacyPolicy from './pages/PrivacyPolicy'
import TermsOfService from './pages/TermsOfService'
import CookiePolicy from './pages/CookiePolicy'
import Masterclass from './pages/Masterclass'
import Support from './pages/Support'
import BDPartner from './pages/BDPartner'
import BDPartnerDashboard from './pages/BDPartnerDashboard'
import ThankYou from './pages/ThankYou'
import SignIn from './pages/SignIn'
import AuthCallback from './pages/AuthCallback'
import Dashboard from './pages/Dashboard'
import GetStartedHub from './pages/GetStartedHub'
import Onboarding from './pages/Onboarding'
import Wardog from './pages/Wardog'
import Read from './pages/Read'
import OpportunityWorkspace from './pages/OpportunityWorkspace'
import Pipeline from './pages/Pipeline'
import Awarded from './pages/Awarded'
import Fill from './pages/Fill'
import ProposalEditor from './pages/ProposalEditor'
import Templates from './pages/Templates'
import Classroom from './pages/Classroom'
import Notebook from './pages/Notebook'
import Glossary from './pages/Glossary'
import Passport from './pages/Passport'
import ShowMeTheMoney from './pages/ShowMeTheMoney'
import Admin from './pages/Admin'
import SecurityDashboard from './pages/SecurityDashboard'
import WhiteLabelAdmin from './pages/WhiteLabelAdmin'
import BDPartnerAdmin from './pages/BDPartnerAdmin'
import AffiliateProgram from './pages/AffiliateProgram'
import AffiliateApply from './pages/AffiliateApply'
import AffiliateDashboard from './pages/AffiliateDashboard'
import AffiliateAdmin from './pages/AffiliateAdmin'
import JoinNetwork from './pages/JoinNetwork'
import Network from './pages/Network'
import Inbox from './pages/Inbox'
import InstallExtension from './pages/InstallExtension'
import ExtensionPrivacy from './pages/ExtensionPrivacy'
import Witness from './pages/Witness'
import Estimator from './pages/Estimator'
import Foreman from './pages/Foreman'
import Restoration from './pages/Restoration'
import ContractorCamera from './pages/ContractorCamera'
import CapturesGallery from './pages/CapturesGallery'
import ClientProposals from './pages/ClientProposals'
import PublicEstimate from './pages/PublicEstimate'
import Capability from './pages/Capability'
import Profile from './pages/Profile'
import Activity from './pages/Activity'
import Feed from './pages/Feed'
import Rewards from './pages/Rewards'
import RewardsJoin from './pages/RewardsJoin'
import WalletCampaigns from './pages/WalletCampaigns'
import TeamUp from './pages/TeamUp'
import Messages from './pages/Messages'
import CommsHub from './pages/CommsHub'
import RedeemScan from './pages/RedeemScan'
import GiftCards from './pages/GiftCards'
import GiftCardScan from './pages/GiftCardScan'
import GiftCardPurchase from './pages/GiftCardPurchase'
import Wallet from './pages/Wallet'
import StartBusiness from './pages/StartBusiness'
import Payouts from './pages/Payouts'
import Resize from './pages/Resize'
import GrowthChallenge from './pages/GrowthChallenge'
import SettingsPage from './pages/Settings'
import RegularsSignup from './pages/RegularsSignup'
import RegularsDashboard from './pages/RegularsDashboard'
import Store from './pages/Store'
import AppShell from './components/AppShell'
import SmoothScroll from './components/SmoothScroll'
import useSeo from './hooks/useSeo'
import { apiFetch } from './lib/apiClient'
import './index.css'
import './styles/primitives.css'
import './App.css'

function Landing() {
  // Lenis smooth scroll is scoped to the public landing page only — it
  // never wraps ProtectedRoute/AppShell, so dashboard scroll behavior
  // (tables, modals, etc.) stays native.
  useSeo({
    title: 'The Operating System for Government Contracting',
    description: 'FASS Flow helps small businesses find winnable government contracts, decide whether to bid, cut proposal work from weeks to hours, and get paid. Now in public beta.',
    path: '/',
    markdownUrl: '/llms/home.md',
  })
  return (
    <SmoothScroll>
      <Hero />
      <HomeBand />
      <AffiliateBand />
      <HowItWorks />
    </SmoothScroll>
  )
}

function ProtectedRoute({ children }) {
  const { session, loading } = useAuth()
  const location = useLocation()
  const affiliateOnly = useAffiliateOnly(session)
  const walletOnly = useWalletOnly(session)
  if (loading) return null
  if (!session) return <Navigate to="/signin" replace />
  // Route-level wall: an affiliate-only account typing a GovCon URL directly
  // gets bounced, not just left without a matching sidebar item. See
  // src/lib/affiliateGate.js. Same idea for Regulars (profiles.is_wallet_only)
  // accounts — see src/lib/regularsGate.js.
  if (affiliateOnly === null || walletOnly === null) return null
  if (affiliateOnly && !isAffiliateAllowedPath(location.pathname)) {
    return <Navigate to="/affiliates/dashboard" replace />
  }
  if (walletOnly && !isWalletAllowedPath(location.pathname)) {
    return <Navigate to="/regulars/dashboard" replace />
  }
  return <AppShell>{children}</AppShell>
}

// Authenticated but chrome-free — for the full-screen onboarding wizard,
// which shouldn't render the sidebar it's about to set up. Always GovCon —
// an affiliate-only account has no business to onboard, so it never applies.
function AuthOnly({ children }) {
  const { session, loading } = useAuth()
  const affiliateOnly = useAffiliateOnly(session)
  if (loading) return null
  if (!session) return <Navigate to="/signin" replace />
  if (affiliateOnly === null) return null
  if (affiliateOnly) return <Navigate to="/affiliates/dashboard" replace />
  return children
}

// Support / BD Partner are sales pages a logged-out visitor can land on
// directly, but they're also real product surfaces a signed-in customer
// clicks into from the Dashboard. Previously those routes always rendered
// the public marketing Nav+Footer, which meant a signed-in user lost the
// app sidebar (WARDOG, Pipeline, Inbox, etc.) the moment they opened one
// of these — no way back in except browser-back. Now: signed-in users get
// the same AppShell sidebar every other authenticated page uses;
// logged-out visitors still get the public marketing chrome.
function AuthAwarePage({ children }) {
  const { session, loading } = useAuth()
  const location = useLocation()
  const affiliateOnly = useAffiliateOnly(session)
  const walletOnly = useWalletOnly(session)
  if (loading) return null
  if (session) {
    if (affiliateOnly === null || walletOnly === null) return null
    // /support and /affiliates are on the affiliate allow-list; /resize and
    // /trust are GovCon-adjacent utilities an affiliate-only account has no
    // use for, so those bounce same as any other GovCon route. /support is
    // also on the Regulars allow-list.
    if (affiliateOnly && !isAffiliateAllowedPath(location.pathname)) {
      return <Navigate to="/affiliates/dashboard" replace />
    }
    if (walletOnly && !isWalletAllowedPath(location.pathname)) {
      return <Navigate to="/regulars/dashboard" replace />
    }
    return <AppShell>{children}</AppShell>
  }
  return <><Nav /><main>{children}</main><Footer /></>
}

// Masterclass is the pre-purchase sales pitch — it should only ever sell to
// someone who hasn't bought yet. A signed-in user clicking "Masterclass"
// already paid (or is logging into the app they own); showing them the
// $175 enroll CTA inside their own sidebar reads as if the product doesn't
// know they're a customer. So: logged out -> public sales page. Logged in
// -> straight into the real class (Classroom), which is where the actual
// 10 nights, worksheets, and certificate live.
function MasterclassRoute() {
  const { session, loading } = useAuth()
  const affiliateOnly = useAffiliateOnly(session)
  if (loading) return null
  if (session) {
    if (affiliateOnly === null) return null
    // An affiliate-only account has no Classroom access (it isn't a GovCon
    // customer) — send it to its own dashboard instead of /classroom.
    return <Navigate to={affiliateOnly ? '/affiliates/dashboard' : '/classroom'} replace />
  }
  return <><Nav /><main><Masterclass /></main><Footer /></>
}

// BD Partner is the $500/mo white-glove service — same family of bug as
// Masterclass, but with one key difference: logged-in does NOT mean "has
// access" here (Masterclass's redirect-only pattern would be wrong). There
// is no per-business phone-number table for this yet, but there IS a real
// bd_partner_clients row once someone's been activated, so we ask the
// backend instead of guessing from session alone:
//   logged out             -> sales page, public Nav/Footer chrome
//   logged in, active client -> BDPartnerDashboard (the real tool/log), AppShell
//   logged in, not a client  -> sales page as an upsell, but inside AppShell
//                                (not pure marketing chrome — they're a user)
const API_BASE = import.meta.env.VITE_API_URL || ''

function BDPartnerRoute() {
  const { session, loading } = useAuth()
  const affiliateOnly = useAffiliateOnly(session)
  const [checking, setChecking] = useState(true)
  const [active, setActive] = useState(false)

  useEffect(() => {
    let cancelled = false
    async function checkStatus() {
      if (!session?.user?.id || !API_BASE || affiliateOnly) {
        if (!cancelled) setChecking(false)
        return
      }
      try {
        const res = await apiFetch(`/api/v1/bd-partner/status?user_id=${session.user.id}`)
        if (res.ok) {
          const data = await res.json()
          if (!cancelled) setActive(!!data.active)
        }
      } catch (err) {
        console.error('BDPartnerRoute: failed to check status', err)
      } finally {
        if (!cancelled) setChecking(false)
      }
    }
    checkStatus()
    return () => { cancelled = true }
  }, [session, affiliateOnly])

  if (loading || (session && affiliateOnly === null)) return null
  if (!session) return <><Nav /><main><BDPartner /></main><Footer /></>
  // BD Partner ($500/mo white-glove service) is a GovCon product surface —
  // an affiliate-only account has no client record and no use for it.
  if (affiliateOnly) return <Navigate to="/affiliates/dashboard" replace />
  if (checking) return null
  return <AppShell>{active ? <BDPartnerDashboard /> : <BDPartner />}</AppShell>
}

// 2026-07-01, subdomain rollout: the root "/" needs to show a different
// landing page depending on which FASS subdomain served it —
// regulars.fass.systems should land on the Regulars pitch, not the GovCon
// homepage, same for affiliates.fass.systems. hostProduct() returns null
// everywhere today (no DNS for these subdomains yet), so this is a
// complete no-op until Vercel/DNS is actually pointed at them — every
// visitor keeps seeing exactly what they see today.
function RootRoute() {
  const product = hostProduct()
  if (product === 'regulars') return <Navigate to="/regulars" replace />
  if (product === 'affiliates') return <Navigate to="/affiliates" replace />
  return <><Nav /><main><Landing /></main><Footer /></>
}

function AppRoutes() {
  return (
    <Routes>
      {/* Public routes with Nav + Footer */}
      <Route path="/" element={<RootRoute />} />
      <Route path="/masterclass" element={<MasterclassRoute />} />
      <Route path="/support" element={<AuthAwarePage><Support /></AuthAwarePage>} />

      {/* Unified storefront — surfaces AI credit packs, WARDOG Intel à la
          carte, the ebook, Masterclass, subscriptions, and Regulars in one
          place. GovCon product surface (not on either allow-list), so
          AuthAwarePage's existing affiliate/wallet gates bounce those
          accounts to their own area same as any other GovCon-only route. */}
      <Route path="/store" element={<AuthAwarePage><Store /></AuthAwarePage>} />
      <Route path="/bd-partner" element={<BDPartnerRoute />} />

      {/* Free resize/reformat utility — the no-login "come back just for
          this" hook. Works fully signed-out; shows the app sidebar instead
          of marketing chrome for anyone who happens to be signed in. */}
      <Route path="/resize" element={<AuthAwarePage><Resize /></AuthAwarePage>} />
      <Route path="/thank-you" element={<><Nav /><main><ThankYou /></main><Footer /></>} />

      {/* Public interactive estimate — customer opens via share link, no account */}
      <Route path="/e/:token" element={<PublicEstimate />} />

      {/* Public FASS Wallet capability page — the QR target baked into every
          real .pkpass (see fass-flow-backend's wallet.py barcode_url). No
          account, no Nav/Footer chrome, just the business info. */}
      <Route path="/c/:slug" element={<Capability />} />

      {/* Public FASS Rewards join page — the link/QR a business hands
          customers (Rewards.jsx's "copy link"). No account, no chrome,
          claims a fresh stamp card and shows the Wallet download. */}
      <Route path="/rewards/join/:businessUserId" element={<RewardsJoin />} />
      {/* Public, no-login gift card storefront — the link a business shares
          so a customer can buy a card for themselves or someone else
          without the business issuing it by hand. Also handles the
          post-Stripe-Checkout success/cancelled redirect via query params. */}
      <Route path="/giftcards/buy/:businessUserId" element={<GiftCardPurchase />} />
      <Route path="/join-network" element={<><Nav /><main><JoinNetwork /></main><Footer /></>} />

      {/* Public, no-login privacy policy for the capture Chrome extension —
          this is the exact URL the Web Store listing's privacy policy field
          points to, so it must be reachable without an account. */}
      <Route path="/extension-privacy" element={<ExtensionPrivacy />} />
      <Route path="/pricing" element={<><Nav /><main><Pricing /></main><Footer /></>} />

      {/* Regulars — the standalone Wallet/loyalty product for non-govcon
          local businesses (gift cards, rewards punch cards, campaigns, SMS).
          /regulars is the public pricing + signup page (own full-bleed
          chrome, no GovCon Nav/Footer, same pattern as AffiliateApply.jsx).
          /regulars/dashboard is the trimmed, Wallet-only landing page for an
          already-signed-up account — protected like any other dashboard
          page; AppShell renders the stripped nav for is_wallet_only profiles. */}
      <Route path="/regulars" element={<RegularsSignup />} />
      <Route path="/regulars/dashboard" element={
        <ProtectedRoute><RegularsDashboard /></ProtectedRoute>
      } />

      {/* Public Careers page — applicants can submit without an account
          (job_applicants table, careers.py /careers/apply); on submit they're
          routed into /signin to create one. Plain Nav/Footer chrome, same as
          every other public marketing page. */}
      <Route path="/careers" element={<><Nav /><main><Careers /></main><Footer /></>} />

      {/* Public marketing/company pages — same plain Nav/Footer chrome as
          Careers, no account needed. */}
      <Route path="/about" element={<><Nav /><main><About /></main><Footer /></>} />
      <Route path="/press" element={<><Nav /><main><Press /></main><Footer /></>} />
      <Route path="/trust" element={<AuthAwarePage><Trust /></AuthAwarePage>} />
      <Route path="/blog" element={<><Nav /><main><Blog /></main><Footer /></>} />
      <Route path="/updates" element={<><Nav /><main><Updates /></main><Footer /></>} />
      <Route path="/releases" element={<><Nav /><main><Releases /></main><Footer /></>} />

      {/* Legal pages — no Nav/Footer here since the legal-card layout is
          full-bleed (matches /extension-privacy's pattern), but they're
          still public/no-login. */}
      <Route path="/privacy-policy" element={<PrivacyPolicy />} />
      <Route path="/terms-of-service" element={<TermsOfService />} />
      <Route path="/cookie-policy" element={<CookiePolicy />} />

      {/* Public affiliate pitch/join page — logged-out visitors see the
          pitch + a "sign in to get your link" CTA; logged-in visitors can
          join on the spot. Uses AuthAwarePage chrome rules. */}
      <Route path="/affiliates" element={<AuthAwarePage><AffiliateProgram /></AuthAwarePage>} />

      {/* External affiliate application — own full-bleed page, no Nav/Footer,
          deliberately separate from SignIn.jsx (see AffiliateApply.jsx). */}
      <Route path="/affiliates/apply" element={<AffiliateApply />} />

      {/* Auth routes — no Nav/Footer */}
      <Route path="/signin" element={<SignIn />} />
      <Route path="/auth/callback" element={<AuthCallback />} />

      {/* Admin-only — gated by ADMIN_SECRET on the backend, not by Supabase
          session, since you may be onboarding someone before they have an
          account at all. Not linked anywhere in nav. */}
      <Route path="/admin" element={<Admin />} />
      {/* Founder-side BD Partner console — see/manage every client (activate,
          pause, log activity) from one roster. Same admin-secret gate as
          /admin, not linked in nav. A client's own /bd-partner route never
          reads from here; it only ever queries by its own session user_id. */}
      <Route path="/admin/bd-partner" element={<BDPartnerAdmin />} />
      {/* Founder-side affiliate payout console — same admin-secret gate,
          not linked in nav. */}
      <Route path="/admin/affiliates" element={<AffiliateAdmin />} />
      {/* Founder-side Security Dashboard — runs scripts/security_scan.py via
          GET /admin/security-scan, same admin-secret gate, not linked in nav. */}
      <Route path="/admin/security" element={<SecurityDashboard />} />
      {/* Founder-side white-label portal — create/manage enterprise tenants
          (branding, enabled tools, management mode). Same admin-secret gate,
          not linked in nav. See app/routers/tenants.py. */}
      <Route path="/admin/white-label" element={<WhiteLabelAdmin />} />

      {/* Protected routes — no Nav/Footer (dashboard has its own header) */}
      <Route path="/dashboard" element={
        <ProtectedRoute><Dashboard /></ProtectedRoute>
      } />
      <Route path="/get-started" element={
        <ProtectedRoute><GetStartedHub /></ProtectedRoute>
      } />
      <Route path="/onboarding" element={
        <AuthOnly><Onboarding /></AuthOnly>
      } />
      <Route path="/wardog" element={
        <ProtectedRoute><Wardog /></ProtectedRoute>
      } />
      <Route path="/read" element={
        <ProtectedRoute><Read /></ProtectedRoute>
      } />
      <Route path="/opportunity/:proposalId" element={
        <ProtectedRoute><OpportunityWorkspace /></ProtectedRoute>
      } />
      <Route path="/pipeline" element={
        <ProtectedRoute><Pipeline /></ProtectedRoute>
      } />
      <Route path="/awarded" element={
        <ProtectedRoute><Awarded /></ProtectedRoute>
      } />
      <Route path="/fill" element={
        <ProtectedRoute><Fill /></ProtectedRoute>
      } />
      <Route path="/proposal-editor" element={
        <ProtectedRoute><ProposalEditor /></ProtectedRoute>
      } />
      <Route path="/templates" element={
        <ProtectedRoute><Templates /></ProtectedRoute>
      } />
      <Route path="/classroom" element={
        <ProtectedRoute><Classroom /></ProtectedRoute>
      } />
      <Route path="/notebook" element={
        <ProtectedRoute><Notebook /></ProtectedRoute>
      } />
      <Route path="/glossary" element={
        <ProtectedRoute><Glossary /></ProtectedRoute>
      } />
      <Route path="/passport" element={
        <ProtectedRoute><Passport /></ProtectedRoute>
      } />
      <Route path="/money" element={
        <ProtectedRoute><ShowMeTheMoney /></ProtectedRoute>
      } />
      <Route path="/network" element={
        <ProtectedRoute><Network /></ProtectedRoute>
      } />
      <Route path="/inbox" element={
        <ProtectedRoute><Inbox /></ProtectedRoute>
      } />
      <Route path="/install-extension" element={
        <ProtectedRoute><InstallExtension /></ProtectedRoute>
      } />
      <Route path="/witness" element={
        <ProtectedRoute><Witness /></ProtectedRoute>
      } />
      <Route path="/estimator" element={
        <ProtectedRoute><Estimator /></ProtectedRoute>
      } />
      <Route path="/proposals" element={
        <ProtectedRoute><ClientProposals /></ProtectedRoute>
      } />
      <Route path="/foreman" element={
        <ProtectedRoute><Foreman /></ProtectedRoute>
      } />
      <Route path="/restoration" element={
        <ProtectedRoute><Restoration /></ProtectedRoute>
      } />
      <Route path="/camera" element={
        <ProtectedRoute><ContractorCamera /></ProtectedRoute>
      } />
      <Route path="/captures" element={
        <ProtectedRoute><CapturesGallery /></ProtectedRoute>
      } />
      <Route path="/rewards" element={
        <ProtectedRoute><Rewards /></ProtectedRoute>
      } />
      <Route path="/campaigns" element={
        <ProtectedRoute><WalletCampaigns /></ProtectedRoute>
      } />
      <Route path="/teamup" element={
        <ProtectedRoute><TeamUp /></ProtectedRoute>
      } />
      <Route path="/messages" element={
        <ProtectedRoute><Messages /></ProtectedRoute>
      } />
      {/* Discoverable Business Profile — reputation stats (XP/rank, contracts
          won, wallet members, businesses helped) computed live off existing
          tables (see profiles.py). Linked from chat's verified-profile panel,
          people search, and Team Up cards. */}
      <Route path="/profile/:userId" element={
        <ProtectedRoute><Profile /></ProtectedRoute>
      } />
      {/* Activity tab — backs the persistent bottom nav's "Activity" item.
          Renders the existing business_events stream chronologically. */}
      <Route path="/activity" element={
        <ProtectedRoute><Activity /></ProtectedRoute>
      } />
      {/* Global business feed — LinkedIn+Slack-style posts/likes/comments
          across every member, manual + auto (milestone) posts. See feed.py. */}
      <Route path="/feed" element={
        <ProtectedRoute><Feed /></ProtectedRoute>
      } />
      <Route path="/comms" element={
        <ProtectedRoute><CommsHub /></ProtectedRoute>
      } />
      <Route path="/affiliates/dashboard" element={
        <ProtectedRoute><AffiliateDashboard /></ProtectedRoute>
      } />
      {/* Staff redemption confirm page — landed on after scanning a
          customer's EXISTING Wallet pass QR with the phone's normal camera
          app. Protected by the business's own login, same as every other
          dashboard page. */}
      <Route path="/rewards/scan/:slug" element={
        <ProtectedRoute><RedeemScan /></ProtectedRoute>
      } />
      <Route path="/giftcards" element={
        <ProtectedRoute><GiftCards /></ProtectedRoute>
      } />
      {/* Staff redemption confirm page for gift cards — landed on after
          scanning a customer's gift card QR with the phone's normal camera
          app. Protected by the business's own login, same pattern as
          /rewards/scan/:slug above. */}
      <Route path="/giftcards/scan/:slug" element={
        <ProtectedRoute><GiftCardScan /></ProtectedRoute>
      } />
      <Route path="/wallet" element={
        <ProtectedRoute><Wallet /></ProtectedRoute>
      } />
      <Route path="/start" element={
        <ProtectedRoute><StartBusiness /></ProtectedRoute>
      } />
      {/* Stripe Connect onboarding — lets a business link its own Stripe
          account so money can route directly to them. Stripe redirects
          back here (with ?return=1 or ?refresh=1) regardless of how
          onboarding ended, so the page re-checks real status itself. */}
      <Route path="/payouts" element={
        <ProtectedRoute><Payouts /></ProtectedRoute>
      } />
      {/* 30-Day Growth Challenge — full mission/achievement list backing the
          Dashboard's GrowthChallengeWidget summary card. See growth_challenge.py. */}
      <Route path="/growth-challenge" element={
        <ProtectedRoute><GrowthChallenge /></ProtectedRoute>
      } />
      {/* User control center — General/Account/Notifications/Billing &
          AI Credits/Connectors/Privacy & Security. See app/routers/
          settings.py for the new endpoints this backs onto. */}
      <Route path="/settings" element={
        <ProtectedRoute><SettingsPage /></ProtectedRoute>
      } />
    </Routes>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  )
}
