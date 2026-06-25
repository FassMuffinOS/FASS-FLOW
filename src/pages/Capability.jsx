import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { MapPin, Globe, Phone, ShieldCheck, Loader } from 'lucide-react'
import './Capability.css'

const API_BASE = import.meta.env.VITE_API_URL || ''

// Same NAICS labels as Passport.jsx — kept in sync with
// business_lookup.py's GOOGLE_TYPE_TO_NAICS values.
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

// Public, no-auth capability page — this is the QR target baked into every
// real FASS Wallet .pkpass (wallet.py's barcode_url is always
// flow.fass.systems/c/{slug}). Whoever scans the pass lands here with no
// account, no login wall — that's the entire point of carrying the card.
export default function Capability() {
  const { slug } = useParams()
  const [biz, setBiz] = useState(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    if (!slug || !API_BASE) { setNotFound(true); setLoading(false); return }
    let cancelled = false
    async function load() {
      try {
        const res = await fetch(`${API_BASE}/api/v1/wallet/public/${encodeURIComponent(slug)}`)
        if (!res.ok) {
          if (!cancelled) { setNotFound(true); setLoading(false) }
          return
        }
        const data = await res.json()
        if (!cancelled) { setBiz(data); setLoading(false) }
      } catch {
        if (!cancelled) { setNotFound(true); setLoading(false) }
      }
    }
    load()
    return () => { cancelled = true }
  }, [slug])

  if (loading) return <div className="cap-state"><Loader className="cap-spin" size={18} /> Loading…</div>
  if (notFound || !biz) return <div className="cap-state">This card isn't recognized — the link may be out of date.</div>

  return (
    <div className="cap">
      <div className="cap-wrap">
        <div className="cap-badge">
          <ShieldCheck size={14} /> Verified via FASS Wallet
        </div>
        <h1 className="cap-name">{biz.business_name}</h1>
        {biz.naics && (
          <p className="cap-naics">{NAICS_LABELS[biz.naics] || `NAICS ${biz.naics}`}</p>
        )}

        <div className="cap-card">
          {biz.address && (
            <div className="cap-row">
              <MapPin size={16} />
              <span>{biz.address}</span>
            </div>
          )}
          {biz.phone && (
            <div className="cap-row">
              <Phone size={16} />
              <a href={`tel:${biz.phone}`}>{biz.phone}</a>
            </div>
          )}
          {biz.website && (
            <div className="cap-row">
              <Globe size={16} />
              <a href={biz.website.startsWith('http') ? biz.website : `https://${biz.website}`} target="_blank" rel="noreferrer">
                {biz.website}
              </a>
            </div>
          )}
        </div>

        <p className="cap-foot">This page reflects the business information on file with FASS Wallet at the time this card was issued.</p>
        <p className="cap-foot cap-foot-brand">Powered by FASS Flow</p>
      </div>
    </div>
  )
}
