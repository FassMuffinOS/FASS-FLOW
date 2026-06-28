import { Briefcase, FileText, Handshake, Wallet as WalletIcon, ExternalLink } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import './SharedObjectCard.css'

// Renders the card for a chat message that carries shared_object_type/
// shared_object_snapshot (see messenger_shared_objects.sql + chat.py's
// /threads/{id}/share). One component shared by Messages.jsx and
// ChatDock.jsx so the four object types (opportunity_live, proposal,
// partner_post, passport) render identically in both surfaces.
const TYPE_META = {
  opportunity_live: { icon: Briefcase, label: 'Opportunity', accent: 'soc-accent-opp' },
  opportunity: { icon: Briefcase, label: 'Opportunity', accent: 'soc-accent-opp' },
  proposal: { icon: FileText, label: 'Proposal', accent: 'soc-accent-proposal' },
  partner_post: { icon: Handshake, label: 'Team Up post', accent: 'soc-accent-partner' },
  passport: { icon: WalletIcon, label: 'Capability statement', accent: 'soc-accent-passport' },
}

function money(v) {
  if (v === null || v === undefined || v === '') return null
  const n = Number(v)
  if (Number.isNaN(n)) return null
  return n >= 1_000_000 ? `$${(n / 1_000_000).toFixed(1)}M` : `$${n.toLocaleString()}`
}

export default function SharedObjectCard({ type, snapshot }) {
  const navigate = useNavigate()
  if (!type || !snapshot) return null
  const meta = TYPE_META[type] || { icon: Briefcase, label: type, accent: '' }
  const Icon = meta.icon

  let title = snapshot.title || snapshot.business_name || 'Shared item'
  let lines = []
  let goTo = null

  if (type === 'opportunity_live' || type === 'opportunity') {
    if (snapshot.agency) lines.push(snapshot.agency)
    const tags = [snapshot.naics_code && `NAICS ${snapshot.naics_code}`, snapshot.set_aside, money(snapshot.value_estimate)].filter(Boolean)
    if (tags.length) lines.push(tags.join(' · '))
    if (snapshot.response_date) lines.push(`Due ${snapshot.response_date}`)
    goTo = () => navigate('/wardog')
  } else if (type === 'proposal') {
    if (snapshot.status) lines.push(`Status: ${snapshot.status}`)
    goTo = () => navigate('/pipeline')
  } else if (type === 'partner_post') {
    if (snapshot.what_i_bring) lines.push(`Brings: ${snapshot.what_i_bring}`)
    if (snapshot.what_i_need) lines.push(`Needs: ${snapshot.what_i_need}`)
    if (snapshot.naics_code) lines.push(`NAICS ${snapshot.naics_code}`)
    goTo = () => navigate('/teamup')
  } else if (type === 'passport') {
    const tags = [snapshot.naics && `NAICS ${snapshot.naics}`, snapshot.phone, snapshot.website].filter(Boolean)
    if (tags.length) lines.push(tags.join(' · '))
    goTo = snapshot.slug ? () => window.open(`/c/${snapshot.slug}`, '_blank') : null
  }

  return (
    <div className={`soc-card ${meta.accent}`}>
      <div className="soc-card-head">
        <Icon size={14} />
        <span className="soc-card-kind">{meta.label}</span>
      </div>
      <div className="soc-card-title">{title}</div>
      {lines.map((l, i) => <div key={i} className="soc-card-line">{l}</div>)}
      {goTo && (
        <button type="button" className="soc-card-link" onClick={goTo}>
          Open <ExternalLink size={12} />
        </button>
      )}
    </div>
  )
}
