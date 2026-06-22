import { useState } from 'react'
import { Menu, X } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import './Nav.css'

export default function Nav() {
  const [open, setOpen] = useState(false)
  const { session, signOut } = useAuth()

  async function handleSignOut() {
    await signOut()
    window.location.href = '/'
  }

  return (
    <nav className="nav">
      <div className="container nav-inner">
        {/* Logo */}
        <a href="/" className="nav-logo">
          <span className="logo-icon">⬡</span>
          <span className="logo-text">FASS <strong>Flow</strong></span>
        </a>

        {/* Desktop links */}
        <ul className="nav-links">
          <li><a href="#how-it-works">Features</a></li>
          <li><a href="/masterclass">Masterclass</a></li>
          <li><a href="/bd-partner">BD Partner</a></li>
        </ul>

        {/* CTA */}
        <div className="nav-cta">
          {session ? (
            <>
              <a href="/dashboard" className="btn-outline nav-signin">Dashboard</a>
              <button className="btn-outline nav-signin" onClick={handleSignOut} style={{ marginLeft: 8 }}>Sign Out</button>
            </>
          ) : (
            <a href="/signin" className="btn-outline nav-signin">Sign In</a>
          )}
        </div>

        {/* Mobile toggle */}
        <button className="nav-toggle" onClick={() => setOpen(o => !o)} aria-label="Toggle menu">
          {open ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>

      {/* Mobile drawer */}
      {open && (
        <div className="nav-drawer">
          <a href="#how-it-works" onClick={() => setOpen(false)}>Features</a>
          <a href="/masterclass" onClick={() => setOpen(false)}>Masterclass</a>
          <a href="/bd-partner" onClick={() => setOpen(false)}>BD Partner</a>
          {session ? (
            <>
              <a href="/dashboard" className="btn-primary" style={{ marginTop: 8 }}>Dashboard</a>
              <button onClick={handleSignOut} style={{ marginTop: 8, background: 'none', border: '1px solid #ccc', borderRadius: 8, padding: '10px 16px', cursor: 'pointer' }}>Sign Out</button>
            </>
          ) : (
            <a href="/signin" className="btn-primary" style={{ marginTop: 8 }}>Sign In</a>
          )}
        </div>
      )}
    </nav>
  )
}
