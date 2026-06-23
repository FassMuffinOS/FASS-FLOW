import { useState, useEffect } from 'react'
import { Save, Check, IdCard, ShieldCheck, UserCheck, Megaphone, ExternalLink, Award } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'
import './Passport.css'

// The certification labels match Fill.jsx and OnboardingChecklist exactly
// so a status picked anywhere shows up everywhere — same profiles.certifications
// column, one source of truth.
const CERT_OPTIONS = [
  'Small Business', 'WOSB', 'EDWOSB', 'SDVOSB', 'VOSB', '8(a)', 'HUBZone', 'MBE/DBE',
]

// Where to actually go apply for each SBA-administered set-aside program.
// Shown for any cert the user has self-identified above on the passport.
const SBA_CERT_LINKS = {
  '8(a)': { url: 'https://www.sba.gov/federal-contracting/contracting-assistance-programs/8a-business-development-program', note: 'SBA 8(a) Business Development Program — apply through certify.sba.gov.' },
  HUBZone: { url: 'https://www.sba.gov/federal-contracting/contracting-assistance-programs/hubzone-program', note: 'HUBZone certification — tied to your principal office location and employee residency.' },
  WOSB: { url: 'https://certify.sba.gov/', note: 'WOSB self-certify or apply for third-party certification through certify.sba.gov.' },
  EDWOSB: { url: 'https://certify.sba.gov/', note: 'EDWOSB adds an economic-disadvantage requirement on top of WOSB — same certify.sba.gov portal.' },
  SDVOSB: { url: 'https://veterans.certify.sba.gov/', note: 'SDVOSB certification (VetCert) — required for most SDVOSB set-asides as of 2023.' },
  VOSB: { url: 'https://veterans.certify.sba.gov/', note: 'VOSB certification (VetCert) — same portal as SDVOSB, no service-connected disability required.' },
}

const FIELD_NOTES = {
  sam_uei: "A 12-character ID SAM.gov assigns when you register. Every federal solicitation, contract, and award is tied to it — contracting officers use it to confirm you're a real, eligible business before they'll even open your proposal.",
  cage_code: 'Assigned by the Defense Logistics Agency during SAM.gov registration. DoD systems and many civilian agencies use it to identify your business location. Not every business has one immediately — it can take a few extra days after UEI registration.',
  naics: "The codes that describe what your business does. Solicitations are tagged by NAICS, and small-business size standards (whether you qualify as 'small' for set-asides) are measured against the specific code for that contract.",
  certs: "Your self-certified set-aside status. This is what makes you eligible for set-aside solicitations (contracts reserved for businesses like yours) instead of competing against everyone, including large primes.",
  signer: "Federal contracting officers need to know — before they make an award — exactly who is legally authorized to sign and bind your company to the contract. Usually the owner, CEO, or someone with documented signing authority. List them here so you're not scrambling to find an answer the day you win.",
  dsbs: "SBA's Small Business Search (formerly DSBS) is free marketing — it's the directory contracting officers and large primes search when they need to find a small business to set work aside for or sub out to. It auto-populates from the marketing info you enter in SAM.gov, but it's easy to skip that step and never show up. Costs nothing, takes about 15 minutes.",
  repsCerts: "Representations & Certifications live inside your SAM.gov entity registration — they're where you formally certify things like your business size, ownership, and any set-aside status. Contracting officers rely on these being accurate; they expire/need review periodically (usually annually with your SAM renewal) and an outdated or missing cert can get a proposal disqualified before anyone reads it.",
}

export default function Passport() {
  const { session } = useAuth()
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    if (!session?.user?.id) return
    let cancelled = false
    async function load() {
      const { data } = await supabase.from('profiles').select('*').eq('id', session.user.id).single()
      if (!cancelled) {
        setProfile(data || {})
        setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [session?.user?.id])

  function set(field, value) {
    setSaved(false)
    setProfile(prev => ({ ...prev, [field]: value }))
  }

  function toggleCert(cert) {
    setSaved(false)
    setProfile(prev => {
      const list = prev.certifications || []
      return { ...prev, certifications: list.includes(cert) ? list.filter(c => c !== cert) : [...list, cert] }
    })
  }

  function toggleDone(field) {
    setSaved(false)
    setProfile(prev => ({ ...prev, [field]: prev[field] ? null : new Date().toISOString() }))
  }

  async function save() {
    if (!session?.user?.id) return
    setSaving(true)
    const { error } = await supabase.from('profiles').update({
      company_name: profile.company_name,
      full_name: profile.full_name,
      sam_uei: profile.sam_uei,
      cage_code: profile.cage_code,
      naics_codes: profile.naics_codes,
      certifications: profile.certifications,
      signer_name: profile.signer_name,
      signer_title: profile.signer_title,
      signer_email: profile.signer_email,
      signer_phone: profile.signer_phone,
      dsbs_completed_at: profile.dsbs_completed_at,
      reps_certs_completed_at: profile.reps_certs_completed_at,
    }).eq('id', session.user.id)
    setSaving(false)
    if (!error) setSaved(true)
  }

  if (loading || !profile) return null

  const naicsStr = (profile.naics_codes || []).join(', ')

  return (
    <div className="pp">
      <div className="pp-container">
        <div className="pp-head">
          <IdCard size={22} className="pp-head-icon" />
          <div>
            <h1>Business Passport</h1>
            <p>The one page you'll use every day — your registered identity, your status, and who's authorized to sign if you win.</p>
          </div>
        </div>

        <div className="pp-card">
          <div className="pp-card-head">
            <ShieldCheck size={16} /> <span>Identity</span>
          </div>
          <div className="pp-grid">
            <label className="pp-field">
              <span className="pp-label">Company name</span>
              <input value={profile.company_name || ''} onChange={e => set('company_name', e.target.value)} placeholder="Munchies Gourmets LLC" />
            </label>
            <label className="pp-field">
              <span className="pp-label">Primary contact</span>
              <input value={profile.full_name || ''} onChange={e => set('full_name', e.target.value)} placeholder="Your name" />
            </label>
            <label className="pp-field">
              <span className="pp-label">SAM UEI</span>
              <input value={profile.sam_uei || ''} onChange={e => set('sam_uei', e.target.value)} placeholder="12-character ID" />
              <span className="pp-note">{FIELD_NOTES.sam_uei}</span>
            </label>
            <label className="pp-field">
              <span className="pp-label">CAGE code</span>
              <input value={profile.cage_code || ''} onChange={e => set('cage_code', e.target.value)} placeholder="5-character code" />
              <span className="pp-note">{FIELD_NOTES.cage_code}</span>
            </label>
            <label className="pp-field pp-field-wide">
              <span className="pp-label">NAICS codes</span>
              <input
                value={naicsStr}
                onChange={e => set('naics_codes', e.target.value.split(',').map(s => s.trim()).filter(Boolean))}
                placeholder="561720, 561210, …"
              />
              <span className="pp-note">{FIELD_NOTES.naics}</span>
            </label>
          </div>
        </div>

        <div className="pp-card">
          <div className="pp-card-head">
            <ShieldCheck size={16} /> <span>Small business / set-aside status</span>
          </div>
          <p className="pp-note pp-note-block">{FIELD_NOTES.certs}</p>
          <div className="pp-chips">
            {CERT_OPTIONS.map(c => (
              <button
                key={c}
                type="button"
                className={`pp-chip ${(profile.certifications || []).includes(c) ? 'active' : ''}`}
                onClick={() => toggleCert(c)}
              >
                {(profile.certifications || []).includes(c) && <Check size={12} />} {c}
              </button>
            ))}
          </div>
        </div>

        {(profile.certifications || []).some(c => SBA_CERT_LINKS[c]) && (
          <div className="pp-card">
            <div className="pp-card-head">
              <Award size={16} /> <span>Get certified (SBA.gov)</span>
            </div>
            <p className="pp-note pp-note-block">
              Self-certifying gets you started, but most contracting officers and primes will look for the official SBA certification before they count on a set-aside. Here's where to apply for the ones you've flagged above.
            </p>
            <div className="pp-checklist">
              {(profile.certifications || [])
                .filter(c => SBA_CERT_LINKS[c])
                .map(c => (
                  <div key={c} className="pp-check-item">
                    <div className="pp-check-body">
                      <div className="pp-check-top">
                        <span className="pp-check-title">{c}</span>
                        <a href={SBA_CERT_LINKS[c].url} target="_blank" rel="noreferrer" className="pp-check-link">
                          Apply <ExternalLink size={11} />
                        </a>
                      </div>
                      <p className="pp-note">{SBA_CERT_LINKS[c].note}</p>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        )}

        <div className="pp-card">
          <div className="pp-card-head">
            <Megaphone size={16} /> <span>Free marketing & certifications</span>
          </div>
          <div className="pp-checklist">
            <div className={`pp-check-item ${profile.dsbs_completed_at ? 'done' : ''}`}>
              <button type="button" className="pp-check-box" onClick={() => toggleDone('dsbs_completed_at')} aria-label="Mark DSBS / Small Business Search complete">
                {profile.dsbs_completed_at && <Check size={13} />}
              </button>
              <div className="pp-check-body">
                <div className="pp-check-top">
                  <span className="pp-check-title">SBA Small Business Search (DSBS)</span>
                  <a href="https://dsbs.sba.gov/" target="_blank" rel="noreferrer" className="pp-check-link">
                    Open <ExternalLink size={11} />
                  </a>
                </div>
                <p className="pp-note">{FIELD_NOTES.dsbs}</p>
              </div>
            </div>
            <div className={`pp-check-item ${profile.reps_certs_completed_at ? 'done' : ''}`}>
              <button type="button" className="pp-check-box" onClick={() => toggleDone('reps_certs_completed_at')} aria-label="Mark Reps & Certs complete">
                {profile.reps_certs_completed_at && <Check size={13} />}
              </button>
              <div className="pp-check-body">
                <div className="pp-check-top">
                  <span className="pp-check-title">Reps & Certs (SAM.gov)</span>
                  <a href="https://sam.gov" target="_blank" rel="noreferrer" className="pp-check-link">
                    Open <ExternalLink size={11} />
                  </a>
                </div>
                <p className="pp-note">{FIELD_NOTES.repsCerts}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="pp-card">
          <div className="pp-card-head">
            <UserCheck size={16} /> <span>Who can sign if you win</span>
          </div>
          <p className="pp-note pp-note-block">{FIELD_NOTES.signer}</p>
          <div className="pp-grid">
            <label className="pp-field">
              <span className="pp-label">Name</span>
              <input value={profile.signer_name || ''} onChange={e => set('signer_name', e.target.value)} placeholder="Full name" />
            </label>
            <label className="pp-field">
              <span className="pp-label">Title</span>
              <input value={profile.signer_title || ''} onChange={e => set('signer_title', e.target.value)} placeholder="Owner, CEO, President…" />
            </label>
            <label className="pp-field">
              <span className="pp-label">Email</span>
              <input type="email" value={profile.signer_email || ''} onChange={e => set('signer_email', e.target.value)} placeholder="name@company.com" />
            </label>
            <label className="pp-field">
              <span className="pp-label">Phone</span>
              <input type="tel" value={profile.signer_phone || ''} onChange={e => set('signer_phone', e.target.value)} placeholder="(555) 555-5555" />
            </label>
          </div>
        </div>

        <div className="pp-save-row">
          <button className="btn-primary" onClick={save} disabled={saving}>
            <Save size={15} /> {saving ? 'Saving…' : 'Save passport'}
          </button>
          {saved && <span className="pp-saved"><Check size={14} /> Saved</span>}
        </div>
      </div>
    </div>
  )
}
