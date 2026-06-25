import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Save, Check, IdCard, ShieldCheck, UserCheck, Megaphone, ExternalLink, Award, ArrowRight, Settings, Search, MapPin, Sparkles, Wallet, Download, Lock, Palette, Image, Eye, EyeOff } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'
import './Passport.css'

const API_BASE = import.meta.env.VITE_API_URL || ''

// Maps the backend's NAICS guess to a human label for the confirmation
// card — keep this in sync with business_lookup.py's GOOGLE_TYPE_TO_NAICS
// values (not the keys; we never see Google's raw type strings here).
const NAICS_LABELS = {
  '722310': 'Food service',
  '238220': 'Plumbing & HVAC',
  '238210': 'Electrical contracting',
  '238160': 'Roofing',
  '238320': 'Painting',
  '236220': 'Commercial construction',
  '484210': 'Moving services',
  '484110': 'General trucking',
  '561730': 'Landscaping services',
  '561720': 'Janitorial services',
  '561612': 'Security guard services',
  '561320': 'Temporary staffing',
  '711310': 'Event production services',
  '561622': 'Locksmiths',
  '531130': 'Self-storage facilities',
}

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

// Canva-like style presets for the wallet card — each maps to a CSS class
// (Passport.css) with a real gradient/shimmer/foil treatment, plus a flat
// fallback hex since Apple Wallet's generic pass type only ever supports
// one solid backgroundColor (no gradients on the real signed .pkpass).
const CARD_STYLES = [
  { id: 'classic', label: 'Classic', hex: '#240e41' },
  { id: 'metallic-gold', label: 'Gold', hex: '#b8860b' },
  { id: 'metallic-silver', label: 'Silver', hex: '#9aa0a6' },
  { id: 'rose-gold', label: 'Rose Gold', hex: '#b76e79' },
  { id: 'icy', label: 'Icy', hex: '#9bd3ec' },
  { id: 'holographic', label: 'Holographic', hex: '#8ee6ff' },
  { id: 'carbon', label: 'Carbon', hex: '#1c1c1e' },
  { id: 'emerald', label: 'Emerald', hex: '#0f5132' },
]

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
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  // null until the profile loads, then set once based on whether this
  // looks like a brand-new account (no company name, no NAICS yet).
  // User can flip it manually after that — this only decides the
  // *first* view, never locks anyone into one mode.
  const [quickMode, setQuickMode] = useState(null)

  // "Find my business" — Google Places lookup state, scoped to quick mode.
  const [bizQuery, setBizQuery] = useState('')
  const [bizLoading, setBizLoading] = useState(false)
  const [bizResult, setBizResult] = useState(null) // null = not searched yet
  const [bizError, setBizError] = useState('')
  const [bizApplied, setBizApplied] = useState(false)

  // FASS Wallet — free preview renders the moment bizResult is found
  // above. walletSlug existing + !walletPurchased means a real, signed,
  // watermarked pass already exists (claimed via /free); walletPurchased
  // means it's been upgraded and the watermark is gone.
  const [walletSlug, setWalletSlug] = useState(null)
  const [walletPurchased, setWalletPurchased] = useState(false)
  const [claimingFree, setClaimingFree] = useState(false)
  const [walletCheckingOut, setWalletCheckingOut] = useState(false)
  const [walletError, setWalletError] = useState('')

  // Card customization — all free to design/preview; only the real signed
  // .pkpass download stays behind the Stripe paywall above. Lives in local
  // state; unlockWallet() ships it to /checkout the first time, and once a
  // slug exists, saveCardCustomization() can patch it any time afterward
  // (even after purchase — design changes never get re-paywalled).
  const [cardBgColor, setCardBgColor] = useState('#240e41')
  // Which Canva-like preset is active — 'custom' means "use the plain
  // color picker below (cardBgColor)" instead of one of CARD_STYLES.
  const [cardStyle, setCardStyle] = useState('classic')
  const [cardLogoUrl, setCardLogoUrl] = useState(null)
  const [cardLogoUploading, setCardLogoUploading] = useState(false)
  const [cardLogoError, setCardLogoError] = useState('')
  const [showAddress, setShowAddress] = useState(true)
  const [showNaics, setShowNaics] = useState(true)
  const [showPhone, setShowPhone] = useState(true)
  const [showWebsite, setShowWebsite] = useState(true)
  const [cardSaving, setCardSaving] = useState(false)
  const [cardSaved, setCardSaved] = useState(false)

  // The business behind whatever card is currently on screen — a fresh
  // Google match from "Find my business" if there is one, otherwise
  // whatever was already loaded from a previous visit (savedBusiness).
  // This is what lets the customization + wallet sections show up even
  // for returning users who aren't mid-search right now.
  const [savedBusiness, setSavedBusiness] = useState(null)

  useEffect(() => {
    if (!session?.user?.id) return
    let cancelled = false
    async function load() {
      const { data } = await supabase.from('profiles').select('*').eq('id', session.user.id).single()
      if (!cancelled) {
        const prof = data || {}
        setProfile(prof)
        // A first-time signup has neither a company name nor NAICS codes
        // saved yet — that's the only signal we need to default to the
        // 60-second version instead of the full multi-card form.
        setQuickMode(!prof.company_name && !(prof.naics_codes || []).length)
        setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [session?.user?.id])

  // Pick up any card this user already started — design, slug, and
  // purchase state — so the customization/wallet sections show their real
  // current card on every visit instead of resetting to a blank preview.
  useEffect(() => {
    if (!session?.user?.id || !API_BASE) return
    let cancelled = false
    async function loadMine() {
      try {
        const res = await fetch(`${API_BASE}/api/v1/wallet/mine?user_id=${session.user.id}`)
        if (!res.ok) return // 404 = never started a card yet, nothing to load
        const data = await res.json()
        if (cancelled) return
        setSavedBusiness({
          name: data.business_name,
          address: data.address,
          naics_guess: data.naics,
          website: data.website,
          phone: data.phone,
        })
        setWalletSlug(data.slug)
        setWalletPurchased(!!data.purchased)
        setCardBgColor(data.bg_color || '#240e41')
        setCardStyle(data.card_style || 'classic')
        setCardLogoUrl(data.logo_url || null)
        setShowAddress(data.show_address ?? true)
        setShowNaics(data.show_naics ?? true)
        setShowPhone(data.show_phone ?? true)
        setShowWebsite(data.show_website ?? true)
      } catch { /* no existing card — fine, leave the preview blank */ }
    }
    loadMine()
    return () => { cancelled = true }
  }, [session?.user?.id])

  // Coming back from Stripe after a wallet unlock — pick the slug back up
  // from the success redirect and confirm the webhook actually landed
  // before showing the real download (the webhook can lag the redirect
  // by a second or two).
  useEffect(() => {
    const wallet = searchParams.get('wallet')
    const slug = searchParams.get('slug')
    if (wallet !== 'success' || !slug || !API_BASE) return
    setWalletSlug(slug)
    let cancelled = false
    let attempts = 0
    async function poll() {
      attempts += 1
      try {
        const res = await fetch(`${API_BASE}/api/v1/wallet/purchase-status/${slug}`)
        if (res.ok) {
          const data = await res.json()
          if (data.purchased) {
            if (!cancelled) setWalletPurchased(true)
            return
          }
        }
      } catch { /* keep polling */ }
      if (!cancelled && attempts < 8) setTimeout(poll, 1500)
    }
    poll()
    setSearchParams(prev => {
      const next = new URLSearchParams(prev)
      next.delete('wallet')
      return next
    }, { replace: true })
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

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

  // The quick-start path only ever writes the three fields a brand-new
  // account actually needs before WARDOG can return anything useful —
  // it deliberately does not touch sam_uei/cage_code/signer fields, so
  // saving twice (quick now, full form later) never clobbers anything.
  async function saveQuickAndFindWork() {
    if (!session?.user?.id) return
    setSaving(true)
    const { error } = await supabase.from('profiles').update({
      company_name: profile.company_name,
      naics_codes: profile.naics_codes,
      certifications: profile.certifications,
    }).eq('id', session.user.id)
    setSaving(false)
    if (!error) navigate('/wardog')
  }

  // Looks up the typed business name against Google's Business Profile data
  // (proxied server-side — the API key never reaches this bundle) and shows
  // a confirmation card. If the backend hasn't been given a Google Places
  // key yet, this just fails quietly and the manual fields below still work.
  async function findMyBusiness() {
    if (!bizQuery.trim() || !API_BASE) return
    setBizLoading(true)
    setBizError('')
    setBizResult(null)
    setBizApplied(false)
    setWalletSlug(null)
    setWalletPurchased(false)
    setWalletError('')
    try {
      const res = await fetch(`${API_BASE}/api/v1/business/lookup?query=${encodeURIComponent(bizQuery.trim())}`)
      if (!res.ok) {
        setBizError(res.status === 503 ? 'Business lookup isn’t turned on yet — just fill in the fields below.' : 'Couldn’t look that up right now — fill in the fields below instead.')
        return
      }
      const data = await res.json()
      if (!data.found) {
        setBizError('No match found — try the exact business name, or just fill in the fields below.')
        return
      }
      setBizResult(data)
    } catch {
      setBizError('Couldn’t look that up right now — fill in the fields below instead.')
    } finally {
      setBizLoading(false)
    }
  }

  // Prefills company name + NAICS guess from the Google match. Never
  // touches certifications (Google has no concept of set-aside status) and
  // never auto-saves — the user still confirms with "Save & find work".
  function applyBizResult() {
    if (!bizResult) return
    setSaved(false)
    setProfile(prev => ({
      ...prev,
      company_name: bizResult.name || prev.company_name,
      naics_codes: bizResult.naics_guess ? [bizResult.naics_guess] : prev.naics_codes,
    }))
    setBizApplied(true)
  }

  // Logo upload — goes straight into the public wallet-logos Storage
  // bucket under this user's id, no resizing (no image library in the
  // backend), raw bytes used as-is for all three pkpass logo variants.
  async function uploadCardLogo(e) {
    const file = e.target.files?.[0]
    if (!file || !session?.user?.id) return
    setCardLogoUploading(true)
    setCardLogoError('')
    try {
      const ext = (file.name.split('.').pop() || 'png').toLowerCase()
      const path = `${session.user.id}/${Date.now()}.${ext}`
      const { error } = await supabase.storage.from('wallet-logos').upload(path, file, { upsert: true })
      if (error) {
        setCardLogoError('Could not upload that logo — try a smaller image.')
        return
      }
      const { data } = supabase.storage.from('wallet-logos').getPublicUrl(path)
      setCardLogoUrl(data?.publicUrl || null)
    } catch {
      setCardLogoError('Could not upload that logo — try a smaller image.')
    } finally {
      setCardLogoUploading(false)
    }
  }

  // Apple Wallet's generic pass type only supports one flat backgroundColor
  // — no gradients, no shimmer — so the real .pkpass always falls back to
  // a representative solid hex per preset. The rich CSS treatment is purely
  // a web-preview/Canva-like thing; card_style is saved alongside it so the
  // preset itself survives a reload even though the real pass can't show it.
  function resolveCardHex() {
    if (cardStyle === 'custom') return cardBgColor
    return CARD_STYLES.find(s => s.id === cardStyle)?.hex || '#240e41'
  }

  // Persists design changes against a card that already has a slug —
  // works whether or not it's been purchased yet, since generate_pkpass()
  // reads bg_color/logo_url/show_* fresh off the row every time a .pkpass
  // is downloaded. Customizing never gets re-paywalled after the unlock.
  async function saveCardCustomization() {
    if (!walletSlug || !API_BASE) return
    setCardSaving(true)
    setCardSaved(false)
    try {
      const res = await fetch(`${API_BASE}/api/v1/wallet/customize`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slug: walletSlug,
          bg_color: resolveCardHex(),
          card_style: cardStyle,
          logo_url: cardLogoUrl,
          show_address: showAddress,
          show_naics: showNaics,
          show_phone: showPhone,
          show_website: showWebsite,
        }),
      })
      if (res.ok) setCardSaved(true)
    } catch { /* keep the local preview either way */ } finally {
      setCardSaving(false)
    }
  }

  // Real, signed .pkpass — right now, no Stripe. The test-drive path: try
  // the actual card on your phone before paying anything. Stays watermarked
  // (handled server-side off the purchased flag) until upgraded below.
  async function claimFreeCard() {
    const biz = bizResult || savedBusiness
    if (!biz || !session?.user || !API_BASE) return
    setClaimingFree(true)
    setWalletError('')
    try {
      const res = await fetch(`${API_BASE}/api/v1/wallet/free`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: session.user.id,
          business_name: biz.name,
          address: biz.address,
          naics: biz.naics_guess,
          website: biz.website,
          phone: biz.phone,
          bg_color: resolveCardHex(),
          card_style: cardStyle,
          logo_url: cardLogoUrl,
          show_address: showAddress,
          show_naics: showNaics,
          show_phone: showPhone,
          show_website: showWebsite,
        }),
      })
      if (!res.ok) {
        setWalletError('Could not create your free card. Try again in a moment.')
        return
      }
      const data = await res.json()
      if (data?.slug) setWalletSlug(data.slug)
    } catch {
      setWalletError('Could not create your free card. Try again in a moment.')
    } finally {
      setClaimingFree(false)
    }
  }

  // Kicks off the one-time Stripe Checkout that removes the watermark —
  // same fetch/redirect pattern as Pricing.jsx's subscription checkout,
  // just mode="payment" on the backend instead of mode="subscription". If
  // a free card was already claimed, walletSlug is sent along so this
  // upgrades that same pass instead of minting a second one.
  async function unlockWallet() {
    const biz = bizResult || savedBusiness
    if (!biz || !session?.user || !API_BASE) return
    setWalletCheckingOut(true)
    setWalletError('')
    try {
      const res = await fetch(`${API_BASE}/api/v1/wallet/checkout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: session.user.id,
          email: session.user.email,
          business_name: biz.name,
          address: biz.address,
          naics: biz.naics_guess,
          website: biz.website,
          phone: biz.phone,
          bg_color: resolveCardHex(),
          card_style: cardStyle,
          logo_url: cardLogoUrl,
          show_address: showAddress,
          show_naics: showNaics,
          show_phone: showPhone,
          show_website: showWebsite,
          slug: walletSlug,
        }),
      })
      if (res.status === 503) {
        setWalletError('Wallet cards aren’t available for purchase yet — check back soon.')
        return
      }
      const data = await res.json()
      if (data?.url) { window.location.href = data.url; return }
      setWalletError('Could not start checkout. Try again in a moment.')
    } catch {
      setWalletError('Could not start checkout. Try again in a moment.')
    } finally {
      setWalletCheckingOut(false)
    }
  }

  if (loading || !profile || quickMode === null) return null

  const naicsStr = (profile.naics_codes || []).join(', ')
  const hasMinimum = (profile.company_name || '').trim().length > 0 && (profile.naics_codes || []).length > 0

  // Whatever business the customize/wallet sections below should reflect —
  // a fresh "Find my business" match takes priority, otherwise fall back
  // to whatever card this user already has on file.
  const walletBusiness = bizResult || savedBusiness

  const customizeCard = walletBusiness && (
    <div className="pp-card">
      <div className="pp-card-head">
        <Palette size={16} /> <span>Customize your card</span>
      </div>
      <p className="pp-note pp-note-block">Free to design — pick a finish, add your logo, and choose what shows. Only the real, signed Apple Wallet card is paywalled.</p>
      <div className="pp-customize">
        <div className="pp-style-row">
          <span className="pp-label"><Palette size={13} /> Card finish</span>
          <div className="pp-style-grid">
            {CARD_STYLES.map(s => (
              <button
                key={s.id}
                type="button"
                className={`pp-style-swatch pp-style-swatch--${s.id} ${cardStyle === s.id ? 'active' : ''}`}
                onClick={() => { setCardStyle(s.id); setCardSaved(false) }}
              >
                {s.label}
              </button>
            ))}
            <button
              type="button"
              className={`pp-style-swatch pp-style-swatch--custom ${cardStyle === 'custom' ? 'active' : ''}`}
              onClick={() => { setCardStyle('custom'); setCardSaved(false) }}
            >
              Custom
            </button>
          </div>
          {cardStyle === 'custom' && (
            <label className="pp-customize-row pp-custom-color-row">
              <span className="pp-label">Pick a color</span>
              <input type="color" value={cardBgColor} onChange={e => { setCardBgColor(e.target.value); setCardSaved(false) }} />
            </label>
          )}
          <p className="pp-note">Metallic, icy, and holographic finishes only show in this free preview and on your public capability page — Apple Wallet's real pass format only supports one flat color, so the signed card uses a close solid match automatically.</p>
        </div>
        <label className="pp-customize-row">
          <span className="pp-label"><Image size={13} /> Logo</span>
          <input type="file" accept="image/*" onChange={uploadCardLogo} disabled={cardLogoUploading} />
          {cardLogoUploading && <span className="pp-note">Uploading…</span>}
        </label>
        {cardLogoError && <p className="pp-note pp-biz-error">{cardLogoError}</p>}
        <div className="pp-customize-toggles">
          <button type="button" className={`pp-chip ${showAddress ? 'active' : ''}`} onClick={() => { setShowAddress(v => !v); setCardSaved(false) }}>
            {showAddress ? <Eye size={12} /> : <EyeOff size={12} />} Address
          </button>
          <button type="button" className={`pp-chip ${showNaics ? 'active' : ''}`} onClick={() => { setShowNaics(v => !v); setCardSaved(false) }}>
            {showNaics ? <Eye size={12} /> : <EyeOff size={12} />} NAICS
          </button>
          <button type="button" className={`pp-chip ${showPhone ? 'active' : ''}`} onClick={() => { setShowPhone(v => !v); setCardSaved(false) }}>
            {showPhone ? <Eye size={12} /> : <EyeOff size={12} />} Phone
          </button>
          <button type="button" className={`pp-chip ${showWebsite ? 'active' : ''}`} onClick={() => { setShowWebsite(v => !v); setCardSaved(false) }}>
            {showWebsite ? <Eye size={12} /> : <EyeOff size={12} />} Website
          </button>
        </div>
        {walletSlug && (
          <div className="pp-customize-save">
            <button type="button" className="btn-outline" onClick={saveCardCustomization} disabled={cardSaving}>
              {cardSaving ? 'Saving…' : 'Save changes to my card'}
            </button>
            {cardSaved && <span className="pp-saved"><Check size={14} /> Saved</span>}
          </div>
        )}
      </div>
    </div>
  )

  const walletCard = walletBusiness && (
    <div className="pp-card">
      <div className="pp-card-head">
        <Wallet size={16} /> <span>FASS Wallet</span>
      </div>
      <div className="pp-wallet-preview">
        <div
          className={`pp-wallet-card ${cardStyle !== 'custom' ? `pp-wallet-card--${cardStyle}` : ''}`}
          style={cardStyle === 'custom' ? { background: cardBgColor } : undefined}
        >
          {cardLogoUrl ? (
            <img src={cardLogoUrl} alt="" className="pp-wallet-card-logo" />
          ) : (
            <div className="pp-wallet-card-org">FASS Wallet</div>
          )}
          <div className="pp-wallet-card-name">{walletBusiness.name}</div>
          {walletBusiness.address && showAddress && <div className="pp-wallet-card-row">{walletBusiness.address}</div>}
          {walletBusiness.naics_guess && showNaics && <div className="pp-wallet-card-row">NAICS {walletBusiness.naics_guess}</div>}
          {walletBusiness.phone && showPhone && <div className="pp-wallet-card-row">{walletBusiness.phone}</div>}
          {walletBusiness.website && showWebsite && <div className="pp-wallet-card-row">{walletBusiness.website}</div>}
          <div className="pp-wallet-card-foot">
            {walletPurchased ? 'Your real FASS Wallet card' : walletSlug ? 'Real card — free, watermarked' : 'Preview — not a real pass'}
          </div>
        </div>
        <div className="pp-wallet-copy">
          {walletPurchased ? (
            <>
              <p className="pp-note pp-note-block">Your real, signed FASS Wallet card is ready — no watermark. Changed something above? Save it, then re-download — the link always reflects your current design.</p>
              <a
                className="btn-primary"
                href={`${API_BASE}/api/v1/wallet/pass?slug=${walletSlug}`}
              >
                <Download size={14} /> Add to Apple Wallet
              </a>
            </>
          ) : walletSlug ? (
            <div className="pp-wallet-actions">
              <p className="pp-note pp-note-block">Your free card is real and signed — add it to Apple Wallet and test it on your phone right now. It carries a small "Created with FASS" watermark until you upgrade.</p>
              <a
                className="btn-primary"
                href={`${API_BASE}/api/v1/wallet/pass?slug=${walletSlug}`}
              >
                <Download size={14} /> Add free card to Apple Wallet
              </a>
              <button type="button" className="btn-outline" onClick={unlockWallet} disabled={walletCheckingOut}>
                <Lock size={14} /> {walletCheckingOut ? 'Starting checkout…' : 'Upgrade — remove watermark'}
              </button>
              {walletError && <p className="pp-note pp-biz-error">{walletError}</p>}
            </div>
          ) : (
            <>
              <p className="pp-note pp-note-block">Get a real, signed Apple Wallet card for free right now — it carries a QR code linking to your public capability page and a small FASS watermark you can remove anytime by upgrading.</p>
              <button type="button" className="btn-primary" onClick={claimFreeCard} disabled={claimingFree}>
                <Download size={14} /> {claimingFree ? 'Creating your free card…' : 'Get my free Wallet card'}
              </button>
              {walletError && <p className="pp-note pp-biz-error">{walletError}</p>}
            </>
          )}
        </div>
      </div>
    </div>
  )

  if (quickMode) {
    return (
      <div className="pp">
        <div className="pp-container">
          <div className="pp-head">
            <IdCard size={22} className="pp-head-icon" />
            <div>
              <h1>Let's get you set up</h1>
              <p>Three things, about a minute, then straight into WARDOG to find real work.</p>
            </div>
          </div>

          <div className="pp-card">
            <div className="pp-card-head">
              <Search size={16} /> <span>Find my business</span>
            </div>
            <p className="pp-note pp-note-block">Search your business name and we'll pull your category from Google, guess a NAICS code, and show real opportunities — or skip straight to typing it in below.</p>
            <div className="pp-biz-search">
              <input
                value={bizQuery}
                onChange={e => setBizQuery(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); findMyBusiness() } }}
                placeholder="e.g. Munchies Gourmets LLC, Tampa FL"
              />
              <button type="button" className="btn-outline" onClick={findMyBusiness} disabled={bizLoading || !bizQuery.trim()}>
                {bizLoading ? 'Searching…' : 'Search'}
              </button>
            </div>
            {bizError && <p className="pp-note pp-biz-error">{bizError}</p>}
            {bizResult && (
              <div className="pp-biz-result">
                <div className="pp-biz-result-head">
                  <MapPin size={15} />
                  <div>
                    <div className="pp-biz-result-name">{bizResult.name}</div>
                    {bizResult.address && <div className="pp-note">{bizResult.address}</div>}
                  </div>
                </div>
                <div className="pp-biz-tags">
                  {bizResult.naics_guess && (
                    <span className="pp-chip active">{NAICS_LABELS[bizResult.naics_guess] || bizResult.naics_guess} · NAICS {bizResult.naics_guess}</span>
                  )}
                  {bizResult.suggested_plan && (
                    <span className="pp-chip">
                      <Sparkles size={12} /> Suggested plan: {bizResult.suggested_plan}
                    </span>
                  )}
                </div>
                {bizResult.matching_opportunities?.length > 0 && (
                  <p className="pp-note">{bizResult.matching_opportunities.length} open solicitation{bizResult.matching_opportunities.length === 1 ? '' : 's'} already match this NAICS code — they'll be waiting in WARDOG.</p>
                )}
                <p className="pp-note">The NAICS guess and plan suggestion are starting points based on your Google category, not a federal eligibility check — confirm them below and on Pricing whenever you're ready.</p>
                <button type="button" className="btn-primary" onClick={applyBizResult} disabled={bizApplied}>
                  {bizApplied ? <><Check size={14} /> Applied</> : 'Use this'}
                </button>
              </div>
            )}
          </div>

          {customizeCard}
          {walletCard}

          <div className="pp-card">
            <div className="pp-card-head">
              <ShieldCheck size={16} /> <span>The basics</span>
            </div>
            <div className="pp-grid">
              <label className="pp-field pp-field-wide">
                <span className="pp-label">Company name</span>
                <input value={profile.company_name || ''} onChange={e => set('company_name', e.target.value)} placeholder="Munchies Gourmets LLC" autoFocus />
              </label>
              <label className="pp-field pp-field-wide">
                <span className="pp-label">NAICS codes</span>
                <input
                  value={naicsStr}
                  onChange={e => set('naics_codes', e.target.value.split(',').map(s => s.trim()).filter(Boolean))}
                  placeholder="561720, 561210, …"
                />
                <span className="pp-note">{FIELD_NOTES.naics} Don't know yours yet? Browse the <a href="https://www.naics.com/search/" target="_blank" rel="noreferrer">NAICS lookup</a> or skip this — WARDOG defaults to a broad services code you can change anytime.</span>
              </label>
            </div>
            <p className="pp-note pp-note-block">Small business or set-aside status, if you have one — optional, you can also add this later.</p>
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

          <div className="pp-save-row">
            <button className="btn-primary" onClick={saveQuickAndFindWork} disabled={saving || !hasMinimum}>
              {saving ? 'Saving…' : 'Save & find work'} <ArrowRight size={15} />
            </button>
            <button className="btn-outline" onClick={() => setQuickMode(false)}>
              <Settings size={14} /> Full passport (UEI, CAGE, signer info)
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="pp">
      <div className="pp-container">
        <div className="pp-head">
          <IdCard size={22} className="pp-head-icon" />
          <div>
            <h1>Business Passport</h1>
            <p>The one page you'll use every day — your registered identity, your status, and who's authorized to sign if you win.</p>
          </div>
          <button className="btn-outline pp-quick-toggle" onClick={() => setQuickMode(true)}>
            60-second setup
          </button>
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

        {customizeCard}
        {walletCard}

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
