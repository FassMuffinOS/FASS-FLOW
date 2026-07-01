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
        <p className="legal-updated">Last updated: July 1, 2026</p>

        <p>
          These Terms govern your use of FASS Flow (flow.fass.systems), Regulars (regulars.fass.systems), and any
          affiliated or white-labeled instance of either, all operated by FASS Technologies LLC ("FASS Flow," "we,"
          "us"). By creating an account or using any of these products, you agree to these Terms.
        </p>

        <h2>1. The Service</h2>
        <p>
          FASS Flow is a platform that helps small businesses find, evaluate, win, execute, and get paid on
          government contracting work, plus related tools (WARDOG opportunity intelligence and WARDOG Intel
          reports, FASS Wallet loyalty/gift cards, FASS Academy masterclass, AI credit packs, BD Partner services,
          and others). <strong>Regulars</strong> is a related but separate product for non-government local
          businesses (loyalty cards, gift cards, campaigns) — a Regulars account is billed and managed
          independently of a FASS Flow GovCon account. Some FASS Flow and Regulars customers may also participate
          in our <strong>affiliate program</strong>, earning commission for referrals to either product. Features
          and pricing may change over time.
        </p>

        <h2>2. Accounts</h2>
        <p>
          You must be at least 18 years old and able to form a binding contract to use FASS Flow or Regulars.
          You're responsible for the accuracy of information you provide and for keeping your account credentials
          secure. You're responsible for activity that happens under your account. Signing in on one FASS Flow or
          Regulars subdomain may keep you signed in across our other subdomains for convenience; access to each
          product's actual features still depends on your account type and plan.
        </p>

        <h2>3. Subscriptions, Purchases, and Refunds</h2>
        <p>
          Recurring plans (FASS Flow and Regulars subscriptions, BD Partner service) are billed through Stripe on
          the terms presented at checkout and renew automatically until cancelled. You can cancel at any time from
          your billing portal; cancellation stops future billing but doesn't refund amounts already charged unless
          required by law. FASS Flow and Regulars subscriptions are billed and cancelled independently of each
          other if you have both.
        </p>
        <p>
          One-time digital purchases — AI credit packs, WARDOG Intel à la carte reports, the FASS Academy
          masterclass, and similar — are delivered to your account immediately or shortly after purchase and are
          non-refundable once delivered, except as required by law or where a purchased item (like a WARDOG Intel
          report) was never actually generated due to an error on our end, in which case contact{' '}
          <a href="mailto:admin@fass.systems">admin@fass.systems</a> for a resolution.
        </p>
        <p>
          Businesses that accept payments through FASS Wallet or Regulars gift cards, or issue gift cards for
          sale, may be required to complete Stripe Connect onboarding, which is governed by Stripe's own terms as
          well as these; FASS Flow may retain a platform fee on gift card purchases routed through a connected
          account, disclosed at the time you complete onboarding.
        </p>

        <h2>3a. White Label / Enterprise Instances</h2>
        <p>
          We may provide an enterprise client with a separately branded instance of FASS Flow or Regulars tools
          ("White Label"), managed by us, by the client, or by an authorized enterprise partner. Use of a White
          Label instance is governed by these Terms plus any separate order form or agreement executed with that
          client; where the two conflict, the separate agreement controls. A White Label instance does not create
          a separate legal entity, and end users of a White Label instance are still subject to these Terms.
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
