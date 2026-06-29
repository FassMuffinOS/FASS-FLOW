import useSeo from '../hooks/useSeo'
import './Legal.css'

// Working draft, not a substitute for review by a lawyer before relying on
// it for compliance purposes.
export default function TermsOfService() {
  useSeo({
    title: 'Terms of Service',
    description: 'The terms governing your use of FASS Flow, operated by FASS Technologies LLC.',
    path: '/terms-of-service',
    markdownUrl: '/llms/terms-of-service.md',
  })
  return (
    <div className="legal">
      <div className="legal-card">
        <h1>Terms of Service</h1>
        <p className="legal-updated">Last updated: June 28, 2026</p>

        <p>
          These Terms govern your use of FASS Flow (flow.fass.systems), operated by FASS Technologies LLC ("FASS
          Flow," "we," "us"). By creating an account or using the platform, you agree to these Terms.
        </p>

        <h2>1. The Service</h2>
        <p>
          FASS Flow is a platform that helps small businesses find, evaluate, win, execute, and get paid on
          government contracting work, plus related tools (FASS Wallet loyalty/gift cards, FASS Academy
          masterclass, BD Partner services, and others). Features and pricing may change over time.
        </p>

        <h2>2. Accounts</h2>
        <p>
          You must be at least 18 years old and able to form a binding contract to use FASS Flow. You're
          responsible for the accuracy of information you provide and for keeping your account credentials
          secure. You're responsible for activity that happens under your account.
        </p>

        <h2>3. Subscriptions and Payments</h2>
        <p>
          Paid plans, the FASS Academy masterclass, and BD Partner service are billed through Stripe on the terms
          presented at checkout. Subscriptions renew automatically until cancelled. You can cancel at any time;
          cancellation stops future billing but doesn't refund amounts already charged unless required by law.
          Businesses that accept payments through FASS Wallet gift cards or rewards may be required to complete
          Stripe Connect onboarding, which is governed by Stripe's own terms as well as these.
        </p>

        <h2>4. Acceptable Use</h2>
        <p>You agree not to:</p>
        <ul>
          <li>Use the platform for any unlawful purpose or to violate any applicable law or regulation</li>
          <li>Misrepresent your business, certifications, or eligibility for any contract or set-aside</li>
          <li>Scrape, reverse-engineer, or systematically extract data from the platform outside normal use</li>
          <li>Abuse AI-powered features (e.g. to generate fraudulent proposals or spam)</li>
          <li>Attempt to manipulate affiliate, referral, or rewards tracking dishonestly</li>
          <li>Interfere with the platform's operation or other users' use of it</li>
        </ul>

        <h2>5. AI Features and Public Data</h2>
        <p>
          Features like R-E-A-D, FASS FILL, and the AI Chief-of-Staff use AI models to analyze opportunities and
          draft content. AI output can be inaccurate or incomplete — you're responsible for reviewing anything
          before relying on it or submitting it as part of an actual bid. Opportunity data sourced from SAM.gov is
          public federal data; we don't guarantee its accuracy or completeness. Nothing in FASS Flow is legal,
          tax, or professional contracting advice — for anything that materially affects a bid or contract, use
          your own judgment or consult a qualified professional.
        </p>

        <h2>6. Your Content</h2>
        <p>
          You retain ownership of the content you submit (proposals, photos, business information, messages).
          You grant us a license to host, process, and display that content as needed to operate the platform
          (e.g. storing a proposal draft, sending a message to its recipient, generating a Wallet pass).
        </p>

        <h2>7. Affiliate and BD Partner Programs</h2>
        <p>
          If you participate in the affiliate or BD Partner program, commissions are calculated and paid
          according to the terms presented in your dashboard at the time you join. We may adjust commission
          structures going forward and may withhold or reverse commissions obtained through fraud, abuse, or
          violation of these Terms.
        </p>

        <h2>8. Termination</h2>
        <p>
          You may stop using FASS Flow and delete your account at any time. We may suspend or terminate your
          account if you violate these Terms, misuse the platform, or for nonpayment, with notice where
          practical.
        </p>

        <h2>9. Disclaimers and Limitation of Liability</h2>
        <p>
          FASS Flow is provided "as is" without warranties of any kind, express or implied. We don't guarantee
          you'll win any contract, that any opportunity data is complete or current, or that the service will be
          uninterrupted or error-free. To the fullest extent permitted by law, FASS Technologies LLC's total
          liability for any claim relating to the service is limited to the amount you paid us in the 12 months
          before the claim arose.
        </p>

        <h2>10. Indemnification</h2>
        <p>
          You agree to indemnify FASS Technologies LLC against claims arising from your misuse of the platform,
          violation of these Terms, or violation of applicable law.
        </p>

        <h2>11. Governing Law</h2>
        <p>
          These Terms are governed by the laws of the State of Maryland, without regard to conflict-of-law rules.
        </p>

        <h2>12. Changes to These Terms</h2>
        <p>
          We may update these Terms as the product changes. Continued use after an update means you accept the
          revised Terms.
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
