import Reveal from './Reveal'
import './Footer.css'

export default function Footer() {
  return (
    <footer className="footer">
      <div className="container footer-inner">
        <Reveal as="div" className="footer-brand reveal-fade">
          <a href="/" className="footer-logo">
            <span className="footer-logo-icon">⬡</span>
            <span>FASS <strong>Flow</strong></span>
          </a>
          <p className="footer-tagline">
            The complete government contracting platform for small businesses.
          </p>
          <p className="footer-company">
            FASS Technologies LLC · Baltimore, MD
          </p>
          <a href="mailto:admin@fass.systems" className="footer-email">
            admin@fass.systems
          </a>
        </Reveal>

        <Reveal as="div" className="footer-links-group reveal-fade" delay={100}>
          <div className="footer-col">
            <h4>Platform</h4>
            <ul>
              <li><a href="/masterclass">Masterclass</a></li>
              <li><a href="/bd-partner">BD Partner</a></li>
              <li><a href="/signin">Wardog</a></li>
              <li><a href="/signin">Wallet</a></li>
              <li><a href="/signin">Procure</a></li>
              <li><a href="/signin">Fill</a></li>
              <li><a href="/signin">Witness</a></li>
            </ul>
          </div>
          <div className="footer-col">
            <h4>Company</h4>
            <ul>
              <li><a href="/about">About</a></li>
              <li><a href="/blog">Blog</a></li>
              <li><a href="/updates">Updates</a></li>
              <li><a href="/releases">Releases</a></li>
              <li><a href="/careers">Careers</a></li>
              <li><a href="/press">Press</a></li>
              <li><a href="/support">Support FASS</a></li>
            </ul>
          </div>
          <div className="footer-col">
            <h4>Legal</h4>
            <ul>
              <li><a href="/privacy-policy">Privacy Policy</a></li>
              <li><a href="/terms-of-service">Terms of Service</a></li>
              <li><a href="/cookie-policy">Cookie Policy</a></li>
            </ul>
          </div>
        </Reveal>
      </div>

      <div className="footer-bottom">
        <div className="container">
          <span>© {new Date().getFullYear()} FASS Technologies LLC. All rights reserved.</span>
          <span className="footer-bottom-badge">Made in Baltimore, MD 🇺🇸</span>
        </div>
      </div>
    </footer>
  )
}
