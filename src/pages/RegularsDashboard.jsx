import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Wallet, Stamp, Gift, Megaphone, MessageCircle, Sparkles } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { regularsStatus } from '../lib/regularsClient'
import './RegularsDashboard.css'

const TOOLS = [
  { name: 'Wallet', icon: Wallet, desc: 'Your branded Apple Wallet business pass — the foundation every customer adds first.', href: '/wallet' },
  { name: 'Rewards', icon: Stamp, desc: 'Set up a digital punch card. Customers join with a link or QR, no app download.', href: '/rewards' },
  { name: 'Gift Cards', icon: Gift, desc: 'Sell prepaid gift cards online or in person, redeemed with any phone camera.', href: '/giftcards' },
  { name: 'Campaigns', icon: Megaphone, desc: 'Push an offer straight onto every customer’s existing Wallet pass.', href: '/campaigns' },
  { name: 'Messages', icon: MessageCircle, desc: 'Two-way SMS with your customers — reminders, confirmations, replies.', href: '/comms' },
]

export default function RegularsDashboard() {
  const { session } = useAuth()
  const navigate = useNavigate()
  const [status, setStatus] = useState(null)

  useEffect(() => {
    let cancelled = false
    if (!session?.user?.id) return
    async function poll() {
      const s = await regularsStatus(session.user.id)
      if (!cancelled) setStatus(s)
    }
    poll()
    // Right after the Stripe redirect the webhook may take a few seconds —
    // poll briefly instead of leaving a stale "activating" state forever.
    const id = setInterval(poll, 3000)
    return () => { cancelled = true; clearInterval(id) }
  }, [session?.user?.id])

  const activating = status && !status.active

  return (
    <div className="rgd">
      <div className="rgd-container">
        <header className="rgd-header">
          <span className="rgd-eyebrow">Regulars</span>
          <h1 className="rgd-title">Welcome — let's set up your first pass</h1>
          <p className="rgd-sub">Start with Wallet to create your business's branded pass, then add Rewards or Gift Cards.</p>
        </header>

        {activating && (
          <div className="rgd-activating">
            <Sparkles size={14} className="rgd-spin" /> Activating your subscription — this usually takes a few seconds.
          </div>
        )}

        <div className="rgd-grid">
          {TOOLS.map(tool => {
            const Icon = tool.icon
            return (
              <button key={tool.name} type="button" className="rgd-card" onClick={() => navigate(tool.href)}>
                <Icon size={20} className="rgd-card-icon" />
                <div className="rgd-card-name">{tool.name}</div>
                <div className="rgd-card-desc">{tool.desc}</div>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
