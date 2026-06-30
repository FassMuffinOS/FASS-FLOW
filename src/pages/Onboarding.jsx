import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { saveBusinessProfile } from '../lib/businessProfile'
import { TRACKS, setTrack, trackById, TRACK_TO_VIEW } from '../lib/track'
import { loadSidebarConfig, saveSidebarConfig } from '../lib/sidebarViews'
import {
  Building2, Radar, HardHat, Rocket, ArrowRight, ArrowLeft, Check, Loader2, Compass, ClipboardCheck, PenSquare,
} from 'lucide-react'
import './Onboarding.css'

const STRUCTURES = ['Sole proprietor', 'LLC', 'Corporation', 'Partnership', 'Not formed yet']
const TRACK_ICON = { govcon: Radar, commercial: HardHat, startup: Rocket }

// What each track lights up — shown on the confirm screen so the choice
// feels consequential, not cosmetic.
const TRACK_PERKS = {
  govcon: ['WARDOG, R-E-A-D, FASS FILL & Proposal Editor up front', 'AI tuned to federal RFPs, set-asides & compliance', 'Guided path: Passport → find work → score → draft'],
  commercial: ['Estimator, Client Proposals & job tools up front', 'AI tuned to private bids, estimates & proposals', 'Guided path: profile → estimate → proposal → capture'],
  startup: ['Start-a-Business, Classroom & fundamentals up front', 'AI tuned to formation, registration & learning', 'Guided path: set up → Passport → learn → browse work'],
}

export default function Onboarding() {
  const { session } = useAuth()
  const navigate = useNavigate()
  const userId = session?.user?.id

  const [step, setStep] = useState(1)
  const [company, setCompany] = useState('')
  const [structure, setStructure] = useState('')
  const [naics, setNaics] = useState('')
  const [track, setTrackId] = useState('govcon')
  const [saving, setSaving] = useState(false)

  async function finish() {
    setSaving(true)
    // 1) Initialize the Passport / business profile.
    if (userId) {
      await saveBusinessProfile(userId, {
        company_name: company.trim() || null,
        structure: structure || null,
        naics_codes: naics.trim() ? naics.split(',').map(s => s.trim()).filter(Boolean) : undefined,
      })
    }
    // 2) Set the track (drives guided path + AI) and the matching sidebar view.
    setTrack(track)
    try {
      const cfg = loadSidebarConfig()
      saveSidebarConfig({ ...cfg, activeView: TRACK_TO_VIEW[track] || 'all' })
      localStorage.setItem('fass_onboarded', '1')
    } catch { /* ignore */ }
    // 3) Into the guided hub.
    navigate('/get-started', { replace: true })
  }

  const canNext1 = company.trim().length > 0

  return (
    <div className="ob">
      <div className="ob-card">
        <div className="ob-brand"><span className="ob-hex">⬡</span> FASS <strong>Flow</strong></div>

        {/* Progress dots */}
        <div className="ob-dots">
          {[1, 2, 3].map(n => <span key={n} className={`ob-dot ${step >= n ? 'is-on' : ''}`} />)}
        </div>

        {/* ── Screen 1: Business ── */}
        {step === 1 && (
          <div className="ob-screen">
            <div className="ob-ic"><Building2 size={26} /></div>
            <h1>Let's set up your business</h1>
            <p className="ob-sub">This becomes your Passport — the identity that flows into every estimate, proposal, and contract automatically.</p>
            <label className="ob-label">Business name</label>
            <input className="ob-input" value={company} onChange={e => setCompany(e.target.value)} placeholder="e.g. Munchie's Facility Services LLC" autoFocus />
            <label className="ob-label">Business structure</label>
            <div className="ob-chips">
              {STRUCTURES.map(s => (
                <button key={s} className={`ob-chip ${structure === s ? 'is-on' : ''}`} onClick={() => setStructure(s)}>{s}</button>
              ))}
            </div>
            <label className="ob-label">NAICS code(s) <span className="ob-opt">optional · comma-separated</span></label>
            <input className="ob-input" value={naics} onChange={e => setNaics(e.target.value)} placeholder="e.g. 561720, 722310" />
            <div className="ob-actions">
              <span />
              <button className="ob-next" disabled={!canNext1} onClick={() => setStep(2)}>Continue <ArrowRight size={16} /></button>
            </div>
          </div>
        )}

        {/* ── Screen 2: Track ── */}
        {step === 2 && (
          <div className="ob-screen">
            <div className="ob-ic"><Compass size={26} /></div>
            <h1>What kind of work do you do?</h1>
            <p className="ob-sub">This tailors your whole app — the tools in your sidebar, your guided path, and how the AI thinks about your business. You can switch anytime.</p>
            <div className="ob-tracks">
              {TRACKS.map(t => {
                const Icon = TRACK_ICON[t.id] || Radar
                return (
                  <button key={t.id} className={`ob-track ${track === t.id ? 'is-on' : ''}`} onClick={() => setTrackId(t.id)}>
                    <span className="ob-track-ic"><Icon size={22} /></span>
                    <span className="ob-track-body">
                      <span className="ob-track-name">{t.name}</span>
                      <span className="ob-track-tag">{t.tagline}</span>
                    </span>
                    {track === t.id && <Check size={18} className="ob-track-check" />}
                  </button>
                )
              })}
            </div>
            <div className="ob-actions">
              <button className="ob-back" onClick={() => setStep(1)}><ArrowLeft size={15} /> Back</button>
              <button className="ob-next" onClick={() => setStep(3)}>Continue <ArrowRight size={16} /></button>
            </div>
          </div>
        )}

        {/* ── Screen 3: Confirm ── */}
        {step === 3 && (
          <div className="ob-screen">
            <div className="ob-ic"><ClipboardCheck size={26} /></div>
            <h1>You're set, {company.trim().split(' ')[0] || 'let\'s go'}.</h1>
            <p className="ob-sub">Here's what your <strong>{trackById(track).name}</strong> track turns on:</p>
            <ul className="ob-perks">
              {(TRACK_PERKS[track] || []).map((perk, i) => (
                <li key={i}><Check size={15} /> {perk}</li>
              ))}
            </ul>
            <div className="ob-actions">
              <button className="ob-back" onClick={() => setStep(2)}><ArrowLeft size={15} /> Back</button>
              <button className="ob-next ob-finish" onClick={finish} disabled={saving}>
                {saving ? <Loader2 size={16} className="ob-spin" /> : <PenSquare size={16} />} Enter FASS Flow
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
