import './Footer.css'

export default function Footer() {
  return (
    <footer className="footer">
      <div className="container footer-inner">
        <div className="footer-brand">
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
        </div>

        <div className="footer-links-group">
          <div className="footer-col">
            <h4>Platform</h4>
            <ul>
              <li><a href="/masterclass">Masterclass</a></li>
              <li><a href="/bd-partner">BD Partner</a></li>
              <li><a href="#how-it-works">Wardog</a></li>
              <li><a href="#how-it-works">Procure</a></li>
              <li><a href="#how-it-works">Fill</a></li>
              <li><a href="#how-it-works">Witness</a></li>
            </ul>
          </div>
          <div className="footer-col">
            <h4>Company</h4>
            <ul>
              <li><a href="#">About</a></li>
              <li><a href="#">Blog</a></li>
              <li><a href="#">Careers</a></li>
              <li><a href="#">Press</a></li>
              <li><a href="/support">Support FASS</a></li>
            </ul>
          </div>
          <div className="footer-col">
            <h4>Legal</h4>
            <ul>
              <li><a href="#">Privacy Policy</a></li>
              <li><a href="#">Terms of Service</a></li>
              <li><a href="#">Cookie Policy</a></li>
            </ul>
          </div>
        </div>
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
