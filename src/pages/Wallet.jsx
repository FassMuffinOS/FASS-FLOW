import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Wallet as WalletIcon, Download, Lock, Palette, Image, Eye, EyeOff, Check, Search, MapPin } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'
import { getBusinessProfile, saveBusinessProfile } from '../lib/businessProfile'
import './Passport.css'

const API_BASE = import.meta.env.VITE_API_URL || ''

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

// Pulled out of Passport.jsx into its own page/tab — FASS Wallet had been
// buried inside the Passport form, which made it easy to miss and meant
// every wallet feature was coupled to the onboarding flow. This page is
// self-contained: search for the business once, then design + claim/
// upgrade the card right here. Same backend endpoints as before
// (wallet/mine, wallet/free, wallet/checkout, wallet/customize).
export default function Wallet() {
  const { session } = useAuth()
  const [searchParams, setSearchParams] = useSearchParams()

  const [bizQuery, setBizQuery] = useState('')
  const [bizLoading, setBizLoading] = useState(false)
  const [bizResult, setBizResult] = useState(null)
  const [bizError, setBizError] = useState('')

  // Whatever card this user already has on file — loaded on mount so
  // returning users see their real card immediately, no re-search needed.
  const [savedBusiness, setSavedBusiness] = useState(null)

  const [walletSlug, setWalletSlug] = useState(null)
  const [walletPurchased, setWalletPurchased] = useState(false)
  const [claimingFree, setClaimingFree] = useState(false)
  const [walletCheckingOut, setWalletCheckingOut] = useState(false)
  const [walletError, setWalletError] = useState('')

  const [cardBgColor, setCardBgColor] = useState('#240e41')
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
  const [loadingMine, setLoadingMine] = useState(true)

  useEffect(() => {
    if (!session?.user?.id || !API_BASE) { setLoadingMine(false); return }
    let cancelled = false
    async function loadMine() {
      try {
        const res = await fetch(`${API_BASE}/api/v1/wallet/mine?user_id=${session.user.id}`)
        if (!res.ok) {
          // No wallet card yet — fall back to the shared business profile in
          // case identity was captured some other way (e.g. a future tool
          // writes it before Wallet ever does), so the search box can still
          // prefill instead of starting from a totally blank slate.
          const profile = await getBusinessProfile(session.user.id)
          if (!cancelled && profile?.business_name) {
            setSavedBusiness({
              name: profile.business_name,
              address: profile.address,
              naics_guess: profile.naics,
              website: profile.website,
              phone: profile.phone,
            })
          }
          return
        }
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
      } catch { /* no existing card — fine */ } finally {
        if (!cancelled) setLoadingMine(false)
      }
    }
    loadMine()
    return () => { cancelled = true }
  }, [session?.user?.id])

  // Coming back from Stripe after an unlock.
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
      next.delete('slug')
      return next
    }, { replace: true })
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function findMyBusiness() {
    if (!bizQuery.trim() || !API_BASE) return
    setBizLoading(true)
    setBizError('')
    setBizResult(null)
    setWalletSlug(null)
    setWalletPurchased(false)
    setWalletError('')
    try {
      const res = await fetch(`${API_BASE}/api/v1/business/lookup?query=${encodeURIComponent(bizQuery.trim())}`)
      if (!res.ok) {
        setBizError(res.status === 503 ? 'Business lookup isn’t turned on yet — try again later.' : 'Couldn’t look that up right now — try again.')
        return
      }
      const data = await res.json()
      if (!data.found) {
        setBizError('No match found — try the exact business name.')
        return
      }
      setBizResult(data)
    } catch {
      setBizError('Couldn’t look that up right now — try again.')
    } finally {
      setBizLoading(false)
    }
  }

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

  function resolveCardHex() {
    if (cardStyle === 'custom') return cardBgColor
    return CARD_STYLES.find(s => s.id === cardStyle)?.hex || '#240e41'
  }

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
    } catch { /* keep local preview either way */ } finally {
      setCardSaving(false)
    }
  }

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
      // Push the identity Wallet just captured into the shared profile so
      // Start Business / Rewards can prefill from it instead of asking
      // again. Fire-and-forget — the free card itself already succeeded.
      saveBusinessProfile(session.user.id, {
        business_name: biz.name,
        address: biz.address,
        naics: biz.naics_guess,
        website: biz.website,
        phone: biz.phone,
      })
    } catch {
      setWalletError('Could not create your free card. Try again in a moment.')
    } finally {
      setClaimingFree(false)
    }
  }

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
      if (data?.url) {
        saveBusinessProfile(session.user.id, {
          business_name: biz.name,
          address: biz.address,
          naics: biz.naics_guess,
          website: biz.website,
          phone: biz.phone,
        })
        window.location.href = data.url
        return
      }
      setWalletError('Could not start checkout. Try again in a moment.')
    } catch {
      setWalletError('Could not start checkout. Try again in a moment.')
    } finally {
      setWalletCheckingOut(false)
    }
  }

  if (loadingMine) return null

  const walletBusiness = bizResult || savedBusiness

  return (
    <div className="pp">
      <div className="pp-container">
        <div className="pp-head">
          <WalletIcon size={22} className="pp-head-icon" />
          <div>
            <h1>FASS Wallet</h1>
            <p>Design a real, signed Apple Wallet business card — free to start, no watermark once you upgrade.</p>
          </div>
        </div>

        <div className="pp-card">
          <div className="pp-card-head">
            <Search size={16} /> <span>Find my business</span>
          </div>
          <p className="pp-note pp-note-block">Search your business name and we'll pull your info from Google to build the card.</p>
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
              <p className="pp-note"><Check size={12} /> Loaded into the card below — customize and claim it whenever you're ready.</p>
            </div>
          )}
        </div>

        {walletBusiness && (
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
        )}

        {walletBusiness && (
          <div className="pp-card">
            <div className="pp-card-head">
              <WalletIcon size={16} /> <span>FASS Wallet</span>
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
                    <a className="btn-primary" href={`${API_BASE}/api/v1/wallet/pass?slug=${walletSlug}`}>
                      <Download size={14} /> Add to Apple Wallet
                    </a>
                  </>
                ) : walletSlug ? (
                  <div className="pp-wallet-actions">
                    <p className="pp-note pp-note-block">Your free card is real and signed — add it to Apple Wallet and test it on your phone right now. It carries a small "Created with FASS" watermark until you upgrade.</p>
                    <a className="btn-primary" href={`${API_BASE}/api/v1/wallet/pass?slug=${walletSlug}`}>
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
        )}
      </div>
    </div>
  )
}
