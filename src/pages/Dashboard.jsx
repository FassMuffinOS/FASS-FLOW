import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { BookOpen, Compass, GraduationCap, X } from 'lucide-react'
import OnboardingChecklist from '../components/OnboardingChecklist'
import MilestoneBadges from '../components/MilestoneBadges'
import FunnelTracker from '../components/FunnelTracker'
import SolicitationTicker from '../components/SolicitationTicker'
import GetStarted from '../components/GetStarted'
import './Dashboard.css'

const TOOLS = [
  { name: 'WARDOG', sub: 'Opportunity intelligence', status: 'live', desc: 'Live SAM.gov sweep matching your NAICS codes and geography, plus a curated directory of FedConnect, Unison, DIBBS, eMMA, BidNet, InstantMarkets, and local/university procurement sources.', href: '/wardog' },
  { name: 'PASSPORT', sub: 'Your business ID', status: 'live', desc: 'UEI, CAGE code, small-business/set-aside status, and who\'s authorized to sign — the one page you\'ll reference every day.', href: '/passport' },
  { name: 'FUNDING', sub: 'Award calculator', status: 'live', desc: 'Punch in an award amount and see what\'s left after FASS Flow and any subs, plus a realistic timeline for when the cash actually lands under Net 15/30/45 terms.', href: '/money' },
  { name: 'GLOSSARY', sub: 'Learn the language', status: 'live', desc: 'New to govcon? Plain-English explanations of RFQs, RFPs, set-asides, DIBBS, NAICS codes, and every other term you\'ll hit in a solicitation. Free to browse.', href: '/glossary' },
  { name: 'R-E-A-D', sub: 'Bid discipline', status: 'live', desc: 'Six-question bid/no-bid scoring for every flagged opportunity.', href: '/read' },
  { name: 'PIPELINE', sub: 'CRM & tracking', status: 'live', desc: 'Kanban + list view of every bid in motion. Drag, drop, and monitor.', href: '/pipeline' },
  { name: 'FASS FILL', sub: 'Execution capacity', status: 'live', desc: 'Paste a solicitation, get an instant compliance matrix, outline, and capability statement.', href: '/fill' },
  { name: 'CLASSROOM', sub: '10-Night Masterclass', status: 'live', desc: 'Work through the full Government Contracting Masterclass, night by night, with progress tracking.', href: '/classroom' },
  { name: 'WITNESS', sub: 'Execute the award', status: 'live', desc: 'Milestones, documents, vendors, and insurance/bonding resources for every awarded contract from Pipeline.', href: '/witness' },
  { name: 'ESTIMATOR', sub: 'Zip-coded cost ranges', status: 'live', desc: 'Build a line-item cost estimate by trade in 15-20 minutes, with a regional adjustment based on the project ZIP code.', href: '/estimator' },
  { name: 'FOREMAN', sub: 'Construction management', status: 'live', desc: 'Schedule of values, AIA payment applications, RFIs, submittals, T&M tickets, and daily logs for every awarded contract.', href: '/foreman' },
  { name: 'RESTORATION', sub: 'Loss & claims documentation', status: 'live', desc: 'Room-by-room itemized loss list for fire/water/storm jobs — item, quantity, cost to replace, and a photo for verification, with status tracking as repairs happen.', href: '/restoration' },
  { name: 'CONTRACTOR CAMERA', sub: 'Walk the site, capture it', status: 'live', desc: 'Open it on your phone, walk the job, and snap photos with a spoken or typed note on each one — every capture maps back to the bid and feeds Witness, Foreman, and Restoration. Installs to your home screen.', href: '/camera' },
]

export default function Dashboard() {
  const { session } = useAuth()
  const navigate = useNavigate()
  const [isNewStudent, setIsNewStudent] = useState(false)
  const [bannerDismissed, setBannerDismissed] = useState(
    () => localStorage.getItem('fass_welcome_dismissed') === '1'
  )

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

          <SolicitationTicker />

          <GetStarted />

          <FunnelTracker />

          <OnboardingChecklist />

          <MilestoneBadges />

          {isNewStudent && !bannerDismissed && (
            <div className="dash-welcome-banner">
              <button className="dash-welcome-close" onClick={dismissBanner} aria-label="Dismiss">
                <X size={14} />
              </button>
              <h3>Welcome to FASS Flow — let's get you oriented.</h3>
              <p>New here? Work through Night 1 of the Masterclass to learn the fundamentals, jump into WARDOG to see live opportunities matching your NAICS codes, or check the Glossary first if the jargon's the holdup.</p>
              <div className="dash-welcome-actions">
                <button className="btn-primary" onClick={() => navigate('/classroom')}>
                  <BookOpen size={15} /> Start Classroom — Night 1
                </button>
                <button className="btn-outline" onClick={() => navigate('/wardog')}>
                  <Compass size={15} /> Browse WARDOG
                </button>
                <button className="btn-outline" onClick={() => navigate('/glossary')}>
                  <GraduationCap size={15} /> Learn the terms
                </button>
              </div>
            </div>
          )}

          {/* Tool launcher — each tile routes to its own page now */}
          <div className="dash-tool-grid">
            {TOOLS.map(tool => (
              <div
                key={tool.name}
                className={`dash-tool-card ${tool.status === 'coming' ? 'dash-tab-coming' : ''}`}
                onClick={() => tool.href && navigate(tool.href)}
              >
                <div className="dash-tab-top">
                  <span className="dash-tab-name">{tool.name}</span>
                  <span className={`dash-tool-badge ${tool.status === 'live' ? 'badge-live' : 'badge-coming'}`}>
                    {tool.status === 'live' ? 'Live' : 'Soon'}
                  </span>
                </div>
                <span className="dash-tab-sub">{tool.sub}</span>
                <p className="dash-tab-desc">{tool.desc}</p>
              </div>
            ))}
          </div>

          <div className="dash-support">
            <p>Questions about your engagement or pipeline?</p>
            <a href="mailto:admin@fass.systems" className="btn-outline">
              Contact admin@fass.systems
            </a>
            <a href="/support" className="btn-outline">
              Support FASS
            </a>
          </div>
        </div>
      </main>
    </div>
  )
}
