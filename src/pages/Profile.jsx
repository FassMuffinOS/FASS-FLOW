import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ShieldCheck, MapPin, Phone, Globe, ExternalLink, Loader, ArrowLeft, Award, Handshake, Wallet as WalletIcon, FileText } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import './Profile.css'

const API_BASE = import.meta.env.VITE_API_URL || ''

// Discoverable Business Profile — the "reputation" layer for Community.
// Backed entirely by GET /profiles/{user_id} (app/routers/profiles.py),
// which fans out across business_profiles, wallet_passes, affiliates, and
// proposals/reward_cards rather than a new denormalized table — see that
// router's docstring for why. Linked to from chat's verified-profile panel,
// people search, and Team Up cards (see ShareToChatButton/SharedObjectCard
// siblings) so it's actually reachable, not just a standalone route.
export default function Profile() {
  const { userId: targetId } = useParams()
  const navigate = useNavigate()
  const { session } = useAuth()
  const isOwnProfile = session?.user?.id === targetId

  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    if (!targetId || !API_BASE) { setNotFound(true); setLoading(false); return }
    let cancelled = false
    async function load() {
      try {
        const res = await fetch(`${API_BASE}/api/v1/profiles/${targetId}`)
        if (!res.ok) {
          if (!cancelled) { setNotFound(true); setLoading(false) }
          return
        }
        const json = await res.json()
        if (!cancelled) { setData(json); setLoading(false) }
      } catch {
        if (!cancelled) { setNotFound(true); setLoading(false) }
      }
    }
    load()
    return () => { cancelled = true }
  }, [targetId])

  if (loading) return <div className="prof-state"><Loader className="prof-spin" size={18} /> Loading profile…</div>
  if (notFound || !data) return <div className="prof-state">This profile isn't available.</div>

  const { full_name, company_name, business, has_card, card, gamification, stats } = data
  const biz = business || card // business_profiles preferred; wallet card as fallback identity
  const name = full_name || company_name || 'FASS Flow member'
  const website = biz?.website
  const websiteHref = website ? (website.startsWith('http') ? website : `https://${website}`) : null

  return (
    <div className="prof">
      <div className="prof-wrap">
        <button className="prof-back" onClick={() => navigate(-1)}><ArrowLeft size={15} /> Back</button>

        <div className="prof-head">
          <span className="prof-avatar">{initials(name)}</span>
          <div>
            <h1 className="prof-name">{name}</h1>
            {company_name && full_name && <p className="prof-company">{company_name}</p>}
            {has_card && <span className="prof-badge"><ShieldCheck size={13} /> Verified via FASS Wallet</span>}
          </div>
        </div>

        {gamification && (
          <div className="prof-rank-row">
            <Award size={15} />
            <span className="prof-rank-title">{gamification.rank}</span>
            <span className="prof-rank-level">Level {gamification.level}</span>
          </div>
        )}

        {biz && (biz.address || biz.phone || website || biz.naics) && (
          <div className="prof-card">
            {biz.business_name && <div className="prof-biz-name">{biz.business_name}</div>}
            {biz.naics && <div className="prof-row">NAICS {biz.naics}</div>}
            {biz.address && <div className="prof-row"><MapPin size={14} /> {biz.address}</div>}
            {biz.phone && <div className="prof-row"><Phone size={14} /> <a href={`tel:${biz.phone}`}>{biz.phone}</a></div>}
            {website && (
              <div className="prof-row">
                <Globe size={14} /> <a href={websiteHref} target="_blank" rel="noreferrer">{website}</a>
              </div>
            )}
            {card?.slug && (
              <button type="button" className="prof-link" onClick={() => window.open(`/c/${card.slug}`, '_blank')}>
                Open full capability statement <ExternalLink size={12} />
              </button>
            )}
          </div>
        )}

        <div className="prof-stats">
          <StatTile icon={Handshake} label="Businesses Helped" value={stats.businesses_helped} />
          <StatTile icon={FileText} label="Contracts Won" value={stats.contracts_won} sub={stats.contracts_won_value > 0 ? money(stats.contracts_won_value) : null} />
          <StatTile icon={WalletIcon} label="Wallet Members" value={stats.wallet_members} />
          {gamification && <StatTile icon={Award} label="Creator XP" value={gamification.xp} />}
        </div>

        {isOwnProfile && (
          <p className="prof-foot">This is how other members see you. Fill out Passport / FASS Wallet and the affiliate program to fill in more of this page.</p>
        )}
      </div>
    </div>
  )
}

function StatTile({ icon: Icon, label, value, sub }) {
  return (
    <div className="prof-stat-tile">
      <Icon size={16} />
      <div className="prof-stat-value">{value ?? 0}{sub && <span className="prof-stat-sub"> · {sub}</span>}</div>
      <div className="prof-stat-label">{label}</div>
    </div>
  )
}

function initials(name) {
  if (!name) return '?'
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0][0].toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

function money(v) {
  const n = Number(v)
  if (Number.isNaN(n)) return null
  return n >= 1_000_000 ? `$${(n / 1_000_000).toFixed(1)}M` : `$${n.toLocaleString()}`
}
