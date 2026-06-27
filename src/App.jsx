import { useState, useEffect } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import Nav from './components/Nav'
import Hero from './components/Hero'
import HomeBand from './components/HomeBand'
import AffiliateBand from './components/AffiliateBand'
import HowItWorks from './components/HowItWorks'
import Pricing from './components/Pricing'
import Footer from './components/Footer'
import Masterclass from './pages/Masterclass'
import Support from './pages/Support'
import BDPartner from './pages/BDPartner'
import BDPartnerDashboard from './pages/BDPartnerDashboard'
import ThankYou from './pages/ThankYou'
import SignIn from './pages/SignIn'
import AuthCallback from './pages/AuthCallback'
import Dashboard from './pages/Dashboard'
import Wardog from './pages/Wardog'
import Read from './pages/Read'
import Pipeline from './pages/Pipeline'
import Awarded from './pages/Awarded'
import Fill from './pages/Fill'
import Classroom from './pages/Classroom'
import Notebook from './pages/Notebook'
import Glossary from './pages/Glossary'
import Passport from './pages/Passport'
import ShowMeTheMoney from './pages/ShowMeTheMoney'
import Admin from './pages/Admin'
import BDPartnerAdmin from './pages/BDPartnerAdmin'
import AffiliateProgram from './pages/AffiliateProgram'
import AffiliateDashboard from './pages/AffiliateDashboard'
import AffiliateAdmin from './pages/AffiliateAdmin'
import JoinNetwork from './pages/JoinNetwork'
import Network from './pages/Network'
import Inbox from './pages/Inbox'
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
import AppShell from './components/AppShell'
import SmoothScroll from './components/SmoothScroll'
import './index.css'
import './App.css'

function Landing() {
  // Lenis smooth scroll is scoped to the public landing page only — it
  // never wraps ProtectedRoute/AppShell, so dashboard scroll behavior
  // (tables, modals, etc.) stays native.
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
  if (loading) return null
  if (!session) return <Navigate to="/signin" replace />
  return <AppShell>{children}</AppShell>
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
  if (loading) return null
  if (session) return <AppShell>{children}</AppShell>
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
  if (loading) return null
  if (session) return <Navigate to="/classroom" replace />
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
  const [checking, setChecking] = useState(true)
  const [active, setActive] = useState(false)

  useEffect(() => {
    let cancelled = false
    async function checkStatus() {
      if (!session?.user?.id || !API_BASE) {
        if (!cancelled) setChecking(false)
        return
      }
      try {
        const res = await fetch(`${API_BASE}/api/v1/bd-partner/status?user_id=${session.user.id}`)
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
  }, [session])

  if (loading || (session && checking)) return null
  if (!session) return <><Nav /><main><BDPartner /></main><Footer /></>
  return <AppShell>{active ? <BDPartnerDashboard /> : <BDPartner />}</AppShell>
}

function AppRoutes() {
  return (
    <Routes>
      {/* Public routes with Nav + Footer */}
      <Route path="/" element={<><Nav /><main><Landing /></main><Footer /></>} />
      <Route path="/masterclass" element={<MasterclassRoute />} />
      <Route path="/support" element={<AuthAwarePage><Support /></AuthAwarePage>} />
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
      <Route path="/pricing" element={<><Nav /><main><Pricing /></main><Footer /></>} />

      {/* Public affiliate pitch/join page — logged-out visitors see the
          pitch + a "sign in to get your link" CTA; logged-in visitors can
          join on the spot. Uses AuthAwarePage chrome rules. */}
      <Route path="/affiliates" element={<AuthAwarePage><AffiliateProgram /></AuthAwarePage>} />

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

      {/* Protected routes — no Nav/Footer (dashboard has its own header) */}
      <Route path="/dashboard" element={
        <ProtectedRoute><Dashboard /></ProtectedRoute>
      } />
      <Route path="/wardog" element={
        <ProtectedRoute><Wardog /></ProtectedRoute>
      } />
      <Route path="/read" element={
        <ProtectedRoute><Read /></ProtectedRoute>
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
