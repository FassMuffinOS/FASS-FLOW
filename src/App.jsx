import { Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import Nav from './components/Nav'
import Hero from './components/Hero'
import HomeBand from './components/HomeBand'
import HowItWorks from './components/HowItWorks'
import Pricing from './components/Pricing'
import Footer from './components/Footer'
import Masterclass from './pages/Masterclass'
import Support from './pages/Support'
import BDPartner from './pages/BDPartner'
import ThankYou from './pages/ThankYou'
import SignIn from './pages/SignIn'
import Dashboard from './pages/Dashboard'
import Wardog from './pages/Wardog'
import Read from './pages/Read'
import Pipeline from './pages/Pipeline'
import Awarded from './pages/Awarded'
import Fill from './pages/Fill'
import Classroom from './pages/Classroom'
import Glossary from './pages/Glossary'
import Passport from './pages/Passport'
import ShowMeTheMoney from './pages/ShowMeTheMoney'
import Admin from './pages/Admin'
import JoinNetwork from './pages/JoinNetwork'
import Network from './pages/Network'
import Inbox from './pages/Inbox'
import Witness from './pages/Witness'
import Estimator from './pages/Estimator'
import Foreman from './pages/Foreman'
import Restoration from './pages/Restoration'
import ContractorCamera from './pages/ContractorCamera'
import CapturesGallery from './pages/CapturesGallery'
import AppShell from './components/AppShell'
import './index.css'
import './App.css'

function Landing() {
  return (
    <>
      <Hero />
      <HomeBand />
      <HowItWorks />
    </>
  )
}

function ProtectedRoute({ children }) {
  const { session, loading } = useAuth()
  if (loading) return null
  if (!session) return <Navigate to="/signin" replace />
  return <AppShell>{children}</AppShell>
}

// Masterclass / Support / BD Partner are sales pages a logged-out visitor
// can land on directly, but they're also real product surfaces a signed-in
// customer clicks into from the Dashboard. Previously those routes always
// rendered the public marketing Nav+Footer, which meant a signed-in user
// lost the app sidebar (WARDOG, Pipeline, Inbox, etc.) the moment they
// opened one of these — no way back in except browser-back. Now: signed-in
// users get the same AppShell sidebar every other authenticated page uses;
// logged-out visitors still get the public marketing chrome.
function AuthAwarePage({ children }) {
  const { session, loading } = useAuth()
  if (loading) return null
  if (session) return <AppShell>{children}</AppShell>
  return <><Nav /><main>{children}</main><Footer /></>
}

function AppRoutes() {
  return (
    <Routes>
      {/* Public routes with Nav + Footer */}
      <Route path="/" element={<><Nav /><main><Landing /></main><Footer /></>} />
      <Route path="/masterclass" element={<AuthAwarePage><Masterclass /></AuthAwarePage>} />
      <Route path="/support" element={<AuthAwarePage><Support /></AuthAwarePage>} />
      <Route path="/bd-partner" element={<AuthAwarePage><BDPartner /></AuthAwarePage>} />
      <Route path="/thank-you" element={<><Nav /><main><ThankYou /></main><Footer /></>} />
      <Route path="/join-network" element={<><Nav /><main><JoinNetwork /></main><Footer /></>} />
      <Route path="/pricing" element={<><Nav /><main><Pricing /></main><Footer /></>} />

      {/* Auth routes — no Nav/Footer */}
      <Route path="/signin" element={<SignIn />} />

      {/* Admin-only — gated by ADMIN_SECRET on the backend, not by Supabase
          session, since you may be onboarding someone before they have an
          account at all. Not linked anywhere in nav. */}
      <Route path="/admin" element={<Admin />} />

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
