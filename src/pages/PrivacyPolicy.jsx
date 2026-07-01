import useSeo from '../hooks/useSeo'
import './Legal.css'

// Drafted to reflect FASS Flow's actual data practices (Supabase auth/DB,
// Stripe billing, Twilio SMS, Apple Wallet/APNs, AI features, affiliate ref
// tracking). This is a working draft, not a substitute for review by a
// lawyer before relying on it for compliance purposes.
export default function PrivacyPolicy() {
  useSeo({
    title: 'Privacy Policy',
    description: 'How FASS Flow (FASS Technologies LLC) collects, uses, and protects your information.',
    path: '/privacy-policy',
    markdownUrl: '/llms/privacy-policy.md',
  })
  return (
    <div className="legal">
      <div className="legal-card">
        <h1>Privacy Policy</h1>
        <p className="legal-updated">Last updated: July 1, 2026</p>

        <p>
          FASS Technologies LLC ("FASS Flow," "we," "us") operates flow.fass.systems, regulars.fass.systems, and
          affiliated or white-labeled instances of either (together, the "platform"). This policy explains what
          information we collect, how we use it, and the choices you have, across all of them.
        </p>

        <h2>Information We Collect</h2>
        <h3>Account information</h3>
        <p>
          When you sign up, we collect your name and email address, either directly or through an OAuth provider
          (Google, Microsoft, or LinkedIn) via Supabase Auth. If you sign up with an OAuth provider, we receive
          only the basic profile information that provider shares (name, email, photo) — we do not receive your
          work history, connections, or company data from LinkedIn or any other provider.
        </p>
        <h3>Business profile information</h3>
        <p>
          To match you with relevant contracts and power features like R-E-A-D, WARDOG, and FASS FILL, we collect
          business details you provide: company name, NAICS codes, certifications (small business, HUBZone, WOSB,
          SDVOSB, 8(a), etc.), past performance, and similar capability information.
        </p>
        <h3>Payment information</h3>
        <p>
          Payments are processed by Stripe. We do not store your full card number; Stripe handles that directly.
          We retain records of transactions (amount, date, plan/product purchased) to manage your account and
          provide support. Businesses that accept payments through FASS Wallet or gift cards may use Stripe
          Connect, which is governed by Stripe's own terms in addition to ours.
        </p>
        <h3>Content you provide</h3>
        <p>
          This includes proposal drafts, messages sent through Messenger/Comms Hub, photos and documents uploaded
          through Contractor Camera or proposal tools, and queries you send to AI features (R-E-A-D analysis,
          FASS FILL, the AI Chief-of-Staff, and the Classroom notebook AI). Those queries and the content needed
          to answer them are sent to our AI infrastructure provider for processing.
        </p>
        <h3>Communications</h3>
        <p>
          If you use Comms Hub to text customers, messages are sent via Twilio under your account. If you enable
          push notifications for FASS Wallet passes, we use Apple's Push Notification service (APNs) to deliver
          them — no contact information is shared with Apple beyond what's required to deliver the notification.
        </p>
        <h3>Usage and device data</h3>
        <p>
          We collect standard technical data (IP address, browser type, pages visited) to operate, secure, and
          improve the platform. IP addresses are also used directly for security purposes — rate-limiting requests
          and blocking abusive traffic — as described below.
        </p>
        <h3>White Label tenant information</h3>
        <p>
          If your business is set up with a white-labeled instance of FASS Flow or Regulars, we also hold the
          branding and contact information needed to operate that instance (business name, logo, brand colors,
          contact name/email) — this is separate from, and doesn't include, your end users' own account data,
          which is handled the same as any other FASS Flow or Regulars account under this policy.
        </p>

        <h2>Cookies and Local Storage</h2>
        <p>
          We use a session cookie (via Supabase Auth) to keep you signed in — scoped to fass.systems so that
          signing in on one of our subdomains (flow., regulars., affiliates.) keeps you signed in across the
          others, instead of requiring a separate login on each. If you arrive via an affiliate link, we store the
          referral code in your browser's local storage for up to 30 days so the right affiliate gets credit if
          you sign up. See our <a href="/cookie-policy">Cookie Policy</a> for details. We do not currently use
          third-party advertising trackers.
        </p>

        <h2>How We Use Information</h2>
        <ul>
          <li>To provide and operate the platform's features (WARDOG, R-E-A-D, FASS FILL, Witness, Wallet, etc.)</li>
          <li>To process payments and payouts</li>
          <li>To send service notifications, SMS (if enabled), and Wallet pass updates</li>
          <li>To track and pay affiliate and BD Partner commissions</li>
          <li>To improve the product and fix problems</li>
          <li>To comply with legal obligations</li>
        </ul>

        <h2>Who We Share Information With</h2>
        <p>
          We share information with the service providers that power the platform — Supabase (database, auth,
          file storage), Stripe (payments and payouts), Twilio (SMS), Apple (Wallet pass push notifications),
          Upstash (short-term caching, rate-limiting counters, and IP-based abuse prevention), and our AI
          infrastructure provider (for AI-powered features). We do not sell your personal information. We may
          disclose information if required by law or to protect the rights, safety, or property of FASS Flow or
          our users.
        </p>
        <p>
          Some opportunity data shown in WARDOG (e.g. solicitation listings) is pulled from SAM.gov, a public
          federal database — that data is public by nature and not something we control.
        </p>

        <h2>Data Retention and Deletion</h2>
        <p>
          We retain account and business data for as long as your account is active. You can delete a captured
          opportunity, a proposal, or your account at any time from inside the app, or by emailing
          <a href="mailto:admin@fass.systems"> admin@fass.systems</a>. Some records (e.g. transaction history) may
          be retained longer where required for legal, tax, or accounting purposes.
        </p>

        <h2>Children's Privacy</h2>
        <p>
          FASS Flow is intended for business use and is not directed at children. We do not knowingly collect
          information from anyone under 18.
        </p>

        <h2>Security</h2>
        <p>
          We use industry-standard measures (encryption in transit, access controls) to protect your data. No
          system is perfectly secure, and we can't guarantee absolute security.
        </p>

        <h2>Your Rights</h2>
        <p>
          You can access, correct, or delete your personal information, or ask what we hold about you, by
          emailing <a href="mailto:admin@fass.systems">admin@fass.systems</a>. Depending on where you live, you
          may have additional rights under local law.
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
