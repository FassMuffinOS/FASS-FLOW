import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { BookOpen, Compass, X } from 'lucide-react'
import Wardog from './Wardog'
import './Dashboard.css'

const TOOLS = [
  { name: 'WARDOG', sub: 'Opportunity intelligence', status: 'live', desc: 'Live SAM.gov sweep matching your NAICS codes and geography, plus a curated directory of FedConnect, Unison, DIBBS, eMMA, and local/university procurement sources.', href: '#wardog' },
  { name: 'R-E-A-D', sub: 'Bid discipline', status: 'live', desc: 'Six-question bid/no-bid scoring for every flagged opportunity.', href: '/read' },
  { name: 'PIPELINE', sub: 'CRM & tracking', status: 'live', desc: 'Kanban + list view of every bid in motion. Drag, drop, and monitor.', href: '/pipeline' },
  { name: 'FASS FILL', sub: 'Execution capacity', status: 'live', desc: 'Paste a solicitation, get an instant compliance matrix, outline, and capability statement.', href: '/fill' },
  { name: 'CLASSROOM', sub: '10-Night Masterclass', status: 'live', desc: 'Work through the full Government Contracting Masterclass, night by night, with progress tracking.', href: '/classroom' },
  { name: 'WITNESS', sub: 'Closeout proof', status: 'coming', desc: 'Past-performance evidence collection after every completed contract.', href: null },
]

export default function Dashboard() {
  const { session } = useAuth()
  const navigate = useNavigate()
  const [isNewStudent, setIsNewStudent] = useState(false)
  const [bannerDismissed, setBannerDismissed] = useState(
    () => localStorage.getItem('fass_welcome_dismissed') === '1'
  )

  // Scroll to WARDOG when arriving via a #wardog link from another page
  // (e.g. the sidebar's WARDOG entry, which always routes through here).
  useEffect(() => {
    if (window.location.hash === '#wardog') {
      const t = setTimeout(() => {
        document.querySelector('#wardog')?.scrollIntoView({ behavior: 'smooth' })
      }, 150)
      return () => clearTimeout(t)
    }
  }, [])

  // First-login detection: no masterclass progress yet and no proposals
  // in the pipeline means this is very likely a brand-new student.
  useEffect(() => {
    if (!session?.user?.id) return
    let cancelled = false
    async function checkNewStudent() {
      const [{ count: progressCount }, { count: proposalCount }] = await Promise.all([
        supabase.from('masterclass_progress').select('*', { count: 'exact', head: true }).eq('user_id', session.user.id),
        supabase.from('proposals').select('*', { count: 'exact', head: true }).eq('user_id', session.user.id),
      ])
      if (!cancelled) setIsNewStudent(!progressCount && !proposalCount)
    }
    checkNewStudent()
    return () => { cancelled = true }
  }, [session?.user?.id])

  function dismissBanner() {
    setBannerDismissed(true)
    localStorage.setItem('fass_welcome_dismissed', '1')
  }

  return (
    <div className="dash">
      <main className="dash-main">
        <div className="dash-container">

          {isNewStudent && !bannerDismissed && (
            <div className="dash-welcome-banner">
              <button className="dash-welcome-close" onClick={dismissBanner} aria-label="Dismiss">
                <X size={14} />
              </button>
              <h3>Welcome to FASS Flow — let's get you oriented.</h3>
              <p>New here? Two good places to start: work through Night 1 of the Masterclass to learn the fundamentals, or jump straight into WARDOG below to see live opportunities matching your NAICS codes.</p>
              <div className="dash-welcome-actions">
                <button className="btn-primary" onClick={() => navigate('/classroom')}>
                  <BookOpen size={15} /> Start Classroom — Night 1
                </button>
                <button className="btn-outline" onClick={() => document.querySelector('#wardog')?.scrollIntoView({ behavior: 'smooth' })}>
                  <Compass size={15} /> Browse WARDOG
                </button>
              </div>
            </div>
          )}

          {/* Tool nav */}
          <div className="dash-tool-nav">
            {TOOLS.map(tool => (
              <div
                key={tool.name}
                className={`dash-tool-tab ${tool.status === 'coming' ? 'dash-tab-coming' : ''}`}
                onClick={() => {
                  if (!tool.href) return
                  if (tool.href.startsWith('/')) navigate(tool.href)
                  else document.querySelector(tool.href)?.scrollIntoView({ behavior: 'smooth' })
                }}
              >
                <span className="dash-tab-name">{tool.name}</span>
                <span className={`dash-tool-badge ${tool.status === 'live' ? 'badge-live' : 'badge-coming'}`}>
                  {tool.status === 'live' ? 'Live' : 'Soon'}
                </span>
              </div>
            ))}
          </div>

          {/* WARDOG */}
          <section id="wardog" className="dash-section">
            <Wardog />
          </section>

          <div className="dash-support">
            <p>Questions about your engagement or pipeline?</p>
            <a href="mailto:admin@fass.systems" className="btn-outline">
              Contact admin@fass.systems
            </a>
          </div>
        </div>
      </main>
    </div>
  )
}
