import './Legal.css'

// Working draft, not a substitute for review by a lawyer before relying on
// it for compliance purposes.
export default function CookiePolicy() {
  return (
    <div className="legal">
      <div className="legal-card">
        <h1>Cookie Policy</h1>
        <p className="legal-updated">Last updated: June 28, 2026</p>

        <p>
          This page explains the cookies and similar storage technologies FASS Flow (flow.fass.systems) uses.
          It's a companion to our <a href="/privacy-policy">Privacy Policy</a>.
        </p>

        <h2>Essential — Authentication</h2>
        <p>
          We use Supabase Auth to keep you signed in, which relies on a session token stored in your browser.
          This is strictly necessary for the platform to function — without it, you'd be signed out on every
          page load. There's no way to opt out of this and still use FASS Flow.
        </p>

        <h2>Functional — Affiliate Attribution</h2>
        <p>
          If you arrive at FASS Flow through an affiliate or referral link (a URL with a <code>?ref=</code>{' '}
          parameter), we store that code in your browser's local storage for up to 30 days. If you sign up within
          that window, the referring affiliate is credited. This data stays on your device and our backend; it
          isn't shared with any advertising network.
        </p>

        <h2>What We Don't Use</h2>
        <p>
          We don't currently use third-party advertising cookies, cross-site tracking pixels, or ad-retargeting
          tools. If that changes, we'll update this page.
        </p>

        <h2>Managing Cookies and Local Storage</h2>
        <p>
          Most browsers let you block or delete cookies and local storage through their settings. Because the
          session token is essential, clearing it will sign you out and clearing the affiliate code will end
          that attribution window. Blocking cookies entirely may prevent you from signing in at all.
        </p>

        <h2>Changes to This Policy</h2>
        <p>
          We may update this policy as the product changes. Material changes will be reflected by updating the
          "Last updated" date above.
        </p>

        <h2>Contact</h2>
        <p>
          FASS Technologies LLC · Baltimore, MD ·{' '}
          <a href="mailto:admin@fass.systems">admin@fass.systems</a>
        </p>
      </div>
    </div>
  )
}
