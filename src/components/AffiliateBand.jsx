import { useNavigate } from 'react-router-dom'
import { Megaphone, ArrowRight } from 'lucide-react'
import Reveal from './Reveal'
import './AffiliateBand.css'

// Homepage CTA for the creator affiliate program — sends every visitor
// (almost never an existing FASS Flow customer) into the dedicated external
// application flow (AffiliateApply.jsx), which provisions a separate
// affiliate-only account and hands back a live referral code instantly —
// no waiting on review to start sharing. Existing customers still have the
// zero-step self-serve join via /affiliates -> sign in -> dashboard.
export default function AffiliateBand() {
  const navigate = useNavigate()
  function start() {
    navigate('/affiliates/apply')
  }
  return (
    <section className="ab-band">
      <div className="container">
        <Reveal as="div" className="ab-card">
          <div className="ab-icon"><Megaphone size={22} /></div>
          <div className="ab-copy">
            <h3>Earn 30% promoting FASS Flow + FASS Wallet</h3>
            <p>Content creator? Apply in a minute, get your unique referral code instantly, and start earning 30% recurring commission — no follower minimum.</p>
          </div>
          <button className="btn-primary ab-cta" onClick={start}>
            Become an affiliate <ArrowRight size={16} />
          </button>
        </Reveal>
      </div>
    </section>
  )
}
