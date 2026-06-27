import { useNavigate } from 'react-router-dom'
import { Megaphone, ArrowRight } from 'lucide-react'
import Reveal from './Reveal'
import { setPostAuthRedirect } from '../lib/postAuthRedirect'
import './AffiliateBand.css'

// Homepage CTA for the creator affiliate program — account-first: clicking
// sends everyone straight into sign-up/sign-in (no pitch page in between),
// and once they have an account they land directly on the affiliate
// dashboard, which shows the pitch inline if they haven't joined yet.
export default function AffiliateBand() {
  const navigate = useNavigate()
  function start() {
    setPostAuthRedirect('/affiliates/dashboard')
    navigate('/signin')
  }
  return (
    <section className="ab-band">
      <div className="container">
        <Reveal as="div" className="ab-card">
          <div className="ab-icon"><Megaphone size={22} /></div>
          <div className="ab-copy">
            <h3>Earn 30% promoting FASS Flow + FASS Wallet</h3>
            <p>Content creator? Get a referral link, share it, earn a commission on every signup it brings in — no minimum followers, no application.</p>
          </div>
          <button className="btn-primary ab-cta" onClick={start}>
            Become an affiliate <ArrowRight size={16} />
          </button>
        </Reveal>
      </div>
    </section>
  )
}
