import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import {
  BookOpen, Compass, GraduationCap, X, Radar, ClipboardCheck, Calculator,
  ClipboardList, Kanban, Camera, ShieldCheck, HardHat, Flame, DollarSign,
  Award, MessageCircle, IdCard, Store,
} from 'lucide-react'
import OnboardingChecklist from '../components/OnboardingChecklist'
import MilestoneBadges from '../components/MilestoneBadges'
import BusinessHealth from '../components/BusinessHealth'
import GrowthChallengeWidget from '../components/GrowthChallengeWidget'
import EngagementPulse from '../components/EngagementPulse'
import DailyFeed from '../components/DailyFeed'
import FunnelTracker from '../components/FunnelTracker'
import SolicitationTicker from '../components/SolicitationTicker'
import GetStarted from '../components/GetStarted'
import './Dashboard.css'

// Grouped the same way AppShell's sidebar groups its nav — so the launcher
// grid on the dashboard reads as the same map the sidebar teaches, not a
// second, inconsistent taxonomy. Each group carries one accent (teal / amber
// / navy, all existing brand tokens — no new hues) used on the icon chip only,
// so the cards themselves stay one visual language, just categorized.
const TOOL_GROUPS = [
  { label: 'Find work', accent: 'teal', items: [
    { name: 'WARDOG', icon: Radar, sub: 'Opportunity intelligence', desc: 'Live SAM.gov sweep matching your NAICS codes and geography, plus a curated directory of FedConnect, Unison, DIBBS, eMMA, BidNet, InstantMarkets, and local/university procurement sources.', href: '/wardog' },
  ] },
  { label: 'Bid', accent: 'amber', items: [
    { name: 'R-E-A-D', icon: ClipboardCheck, sub: 'Bid discipline', desc: 'Six-question bid/no-bid scoring for every flagged opportunity.', href: '/read' },
    { name: 'ESTIMATOR', icon: Calculator, sub: 'Zip-coded cost ranges', desc: 'Build a line-item cost estimate by trade in 15-20 minutes, with a regional adjustment based on the project ZIP code.', href: '/estimator' },
    { name: 'FASS FILL', icon: ClipboardList, sub: 'Execution capacity', desc: 'Paste a solicitation, get an instant compliance matrix, outline, and capability statement.', href: '/fill' },
    { name: 'PIPELINE', icon: Kanban, sub: 'CRM & tracking', desc: 'Kanban + list view of every bid in motion. Drag, drop, and monitor.', href: '/pipeline' },
  ] },
  { label: 'Do the work', accent: 'navy', items: [
    { name: 'CONTRACTOR CAMERA', icon: Camera, sub: 'Walk the site, capture it', desc: 'Open it on your phone, walk the job, and snap photos with a spoken or typed note on each one — every capture maps back to the bid and feeds Witness, Foreman, and Restoration. Installs to your home screen.', href: '/camera' },
    { name: 'WITNESS', icon: ShieldCheck, sub: 'Execute the award', desc: 'Milestones, documents, vendors, and insurance/bonding resources for every awarded contract from Pipeline.', href: '/witness' },
    { name: 'FOREMAN', icon: HardHat, sub: 'Construction management', desc: 'Schedule of values, AIA payment applications, RFIs, submittals, T&M tickets, and daily logs for every awarded contract.', href: '/foreman' },
    { name: 'RESTORATION', icon: Flame, sub: 'Loss & claims documentation', desc: 'Room-by-room itemized loss list for fire/water/storm jobs — item, quantity, cost to replace, and a photo for verification, with status tracking as repairs happen.', href: '/restoration' },
  ] },
  { label: 'Grow', accent: 'teal', items: [
    { name: 'FUNDING', icon: DollarSign, sub: 'Award calculator', desc: 'Punch in an award amount and see what\'s left after FASS Flow and any subs, plus a realistic timeline for when the cash actually lands under Net 15/30/45 terms.', href: '/money' },
    { name: 'AFFILIATES', icon: Award, sub: 'Earn 30% commission', desc: 'Your referral link, click/signup stats, and a content calendar of post ideas — earn 30% on everyone who signs up through your link.', href: '/affiliates/dashboard' },
    { name: 'COMMS HUB', icon: MessageCircle, sub: 'Text reminders & replies', desc: 'A CRM-style message timeline per contact, sent and received through your own iMessage/SMS relay — deadline reminders, confirmations, and two-way replies in one place.', href: '/comms' },
  ] },
  { label: 'Learn', accent: 'amber', items: [
    { name: 'CLASSROOM', icon: BookOpen, sub: '10 Missions · Masterclass', desc: 'Work through the full Government Contracting Masterclass, mission by mission, with progress tracking.', href: '/classroom' },
    { name: 'GLOSSARY', icon: GraduationCap, sub: 'Learn the language', desc: 'New to govcon? Plain-English explanations of RFQs, RFPs, set-asides, DIBBS, NAICS codes, and every other term you\'ll hit in a solicitation. Free to browse.', href: '/glossary' },
  ] },
  { label: 'Account', accent: 'navy', items: [
    { name: 'PASSPORT', icon: IdCard, sub: 'Your business ID', desc: 'UEI, CAGE code, small-business/set-aside status, and who\'s authorized to sign — the one page you\'ll reference every day.', href: '/passport' },
    { name: 'STORE', icon: Store, sub: 'Credits, WARDOG Intel & more', desc: 'AI credit packs, WARDOG Intel à la carte reports, the govcon ebook, and Masterclass — everything you can buy, in one place.', href: '/store' },
  ] },
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

          {/* Zero-history accounts get GetStarted as the whole dashboard —
              everything below (funnel, checklist, badges, the 12-tool grid)
              is expansion that only earns its place once there's a first
              proposal or some masterclass progress to show. Per V2MOM:
              "win the one workflow... everything else is expansion, it
              waits." Existing users see the dashboard exactly as before. */}
          {!isNewStudent && (
            <>
              <DailyFeed />

              <BusinessHealth />

              <GrowthChallengeWidget />

              <EngagementPulse />

              <FunnelTracker />

              <OnboardingChecklist />

              <MilestoneBadges />

              {!bannerDismissed && (
                <div className="dash-welcome-banner">
                  <button className="dash-welcome-close" onClick={dismissBanner} aria-label="Dismiss">
                    <X size={14} />
                  </button>
                  <h3>Welcome to FASS Flow — let's get you oriented.</h3>
                  <p>New here? Work through Mission 1 of the Masterclass to learn the fundamentals, jump into WARDOG to see live opportunities matching your NAICS codes, or check the Glossary first if the jargon's the holdup.</p>
                  <div className="dash-welcome-actions">
                    <button className="btn-primary" onClick={() => navigate('/classroom')}>
                      <BookOpen size={15} /> Start Classroom — Mission 1
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

              {/* Tool launcher — grouped the same way the sidebar is, each
                  tile routes to its own page. */}
              <div className="dash-launcher">
                {TOOL_GROUPS.map(group => (
                  <div className="dash-launcher-group" key={group.label}>
                    <span className="dash-launcher-label">{group.label}</span>
                    <div className="dash-tool-grid">
                      {group.items.map(tool => {
                        const Icon = tool.icon
                        return (
                          <div
                            key={tool.name}
                            className="dash-tool-card"
                            onClick={() => navigate(tool.href)}
                          >
                            <span className={`dash-tool-icon dash-tool-icon-${group.accent}`}>
                              <Icon size={18} />
                            </span>
                            <div className="dash-tab-top">
                              <span className="dash-tab-name">{tool.name}</span>
                            </div>
                            <span className="dash-tab-sub">{tool.sub}</span>
                            <p className="dash-tab-desc">{tool.desc}</p>
                          </div>
                        )
                      })}
                    </div>
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
            </>
          )}
        </div>
      </main>
    </div>
  )
}
