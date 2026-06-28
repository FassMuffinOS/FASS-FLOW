import './ExtensionPrivacy.css'

// Public, no-login policy page — this is the URL the Chrome Web Store
// listing's "Privacy practices" field points to. Must be reachable without
// signing in (reviewers and prospective installers won't have an account).
export default function ExtensionPrivacy() {
  return (
    <div className="ep">
      <div className="ep-card">
        <h1>FASS Flow — Solicitation Capture: Privacy Policy</h1>
        <p className="ep-updated">Last updated: June 27, 2026</p>

        <p>
          This extension exists to do one thing: when you click <strong>Capture this page</strong> on a
          solicitation you're already viewing in your own logged-in procurement portal, it reads that
          page and sends it to your FASS Flow account so it can be matched to the right opportunity in
          your pipeline. It does not run in the background, and it does not act unless you click the
          capture button.
        </p>

        <h2>What it reads</h2>
        <p>
          Only when you click <strong>Capture this page</strong>, the extension reads the visible text and
          document links of the active browser tab — the same content already rendered on your screen.
          It looks for a BPM ID, a solicitation title, and PDF/document links within that text.
        </p>

        <h2>What it sends, and where</h2>
        <p>
          The captured page text, any BPM ID and document links found in it, the page URL, and your
          personal FASS Flow capture key are sent over HTTPS to FASS Flow's backend
          (<code>web-production-1af97.up.railway.app</code>), which is the same backend that powers
          flow.fass.systems. The capture key identifies your account so the solicitation lands in your
          pipeline and no one else's. Nothing is sent to any third party.
        </p>

        <h2>What it does not do</h2>
        <p>
          The extension does not take screenshots, does not record your browsing history, does not run
          on pages until you click the button, and does not collect data from any site other than the
          tab you actively capture. It only has access to the active tab at the moment you click capture
          (the <code>activeTab</code> permission), plus local storage on your own machine to remember
          your capture key and backend address (the <code>storage</code> permission) and the ability to
          read that one tab's text when asked (the <code>scripting</code> permission).
        </p>

        <h2>Storage and retention</h2>
        <p>
          Captured solicitation data is stored in your own FASS Flow account, under the same data
          handling practices as the rest of the FASS Flow platform. You can delete a captured
          opportunity or your account at any time from inside the app. Your capture key can be
          regenerated from your Inbox if it's ever exposed.
        </p>

        <h2>Contact</h2>
        <p>
          Questions about this extension or your data: <a href="mailto:admin@fass.systems">admin@fass.systems</a>.
        </p>
      </div>
    </div>
  )
}
