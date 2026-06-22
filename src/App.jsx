import { Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import Nav from './components/Nav'
import Hero from './components/Hero'
import HowItWorks from './components/HowItWorks'
import Footer from './components/Footer'
import Masterclass from './pages/Masterclass'
import BDPartner from './pages/BDPartner'
import ThankYou from './pages/ThankYou'
import SignIn from './pages/SignIn'
import Dashboard from './pages/Dashboard'
import Read from './pages/Read'
import Pipeline from './pages/Pipeline'
import Fill from './pages/Fill'
import Classroom from './pages/Classroom'
import './index.css'
import './App.css'

function Landing() {
  return (
    <>
      <Hero />
      <HowItWorks />
    </>
  )
}

function ProtectedRoute({ children }) {
  const { session, loading } = useAuth()
  if (loading) return null
  if (!session) return <Navigate to="/signin" replace />
  return children
}

function AppRoutes() {
  return (
    <Routes>
      {/* Public routes with Nav + Footer */}
      <Route path="/" element={<><Nav /><main><Landing /></main><Footer /></>} />
      <Route path="/masterclass" element={<><Nav /><main><Masterclass /></main><Footer /></>} />
      <Route path="/bd-partner" element={<><Nav /><main><BDPartner /></main><Footer /></>} />
      <Route path="/thank-you" element={<><Nav /><main><ThankYou /></main><Footer /></>} />

      {/* Auth routes — no Nav/Footer */}
      <Route path="/signin" element={<SignIn />} />

      {/* Protected routes — no Nav/Footer (dashboard has its own header) */}
      <Route path="/dashboard" element={
        <ProtectedRoute><Dashboard /></ProtectedRoute>
      } />
      <Route path="/read" element={
        <ProtectedRoute><Read /></ProtectedRoute>
      } />
      <Route path="/pipeline" element={
        <ProtectedRoute><Pipeline /></ProtectedRoute>
      } />
      <Route path="/fill" element={
        <ProtectedRoute><Fill /></ProtectedRoute>
      } />
      <Route path="/classroom" element={
        <ProtectedRoute><Classroom /></ProtectedRoute>
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
