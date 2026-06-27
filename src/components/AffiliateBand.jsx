import { useNavigate } from 'react-router-dom'
import { Megaphone, ArrowRight } from 'lucide-react'
import Reveal from './Reveal'
import './AffiliateBand.css'

// Homepage CTA for the creator affiliate program — kept to one short band,
// not a full pitch (that's /affiliates). Goal is just to get a content
// creator curious enough to click through.
export default function AffiliateBand() {
  const navigate = useNavigate()
  return (
    <section className="ab-band">
      <div className="container">
        <Reveal as="div" className="ab-card">
          <div className="ab-icon"><Megaphone size={22} /></div>
          <div className="ab-copy">
            <h3>Earn 30% promoting FASS Flow + FASS Wallet</h3>
            <p>Content creator? Get a referral link, share it, earn a commission on every signup it brings in — no minimum followers, no application.</p>
          </div>
          <button className="btn-primary ab-cta" onClick={() => navigate('/affiliates')}>
            Become an affiliate <ArrowRight size={16} />
          </button>
        </Reveal>
      </div>
    </section>
  )
}
