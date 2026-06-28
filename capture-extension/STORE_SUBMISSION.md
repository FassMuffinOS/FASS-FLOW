# Chrome Web Store submission package — FASS Flow Solicitation Capture

Everything below is ready to paste into the Chrome Web Store Developer Dashboard.
The only things that can't be done from this side: creating the $5 one-time
developer account, and clicking submit (Google requires that to be a real
human action by the account owner).

## 1. One-time developer account

1. Go to https://chrome.google.com/webstore/devconsole
2. Sign in with the Google account you want to own this extension (recommend
   a FASS Flow company account, not a personal one — you can transfer
   ownership later but it's easier to start right).
3. Pay the one-time $5 registration fee if you haven't registered before.

## 2. Build and grab the package

From `fass-flow-frontend/`:

```
npm run build:extension
```

This regenerates `capture-extension/icons/*.png` and zips the whole
`capture-extension/` folder into `public/fass-capture-extension.zip`. Upload
**that zip file** to the dashboard (not the unzipped folder, and not the
`capture-extension/` source folder directly).

## 3. "Item" tab — listing copy

**Title** (max 75 chars):
```
FASS Flow — Solicitation Capture
```

**Summary** (max 132 chars, shown in search results):
```
Capture a solicitation from your procurement portal straight into your FASS Flow pipeline, matched by BPM ID.
```

**Description** (long-form, shown on the listing page):
```
FASS Flow Solicitation Capture reads the solicitation you're already viewing
in your government procurement portal (eMMA, SAM.gov, and similar vendor
portals) and sends it directly into your FASS Flow pipeline — automatically
matched to the right opportunity by BPM ID.

Why it exists: most procurement portals don't give small businesses a clean
copy of solicitation text, NAICS codes, or document links to work with. This
extension closes that gap without screen-scraping or screenshots — it reads
the same rendered page you're looking at, the moment you click Capture, and
nothing else.

How it works:
1. Log into your procurement portal as usual.
2. Open the solicitation's detail page.
3. Click the FASS Flow extension icon, then "Capture this page."
4. The solicitation lands in your FASS Flow pipeline, already matched and
   backfilled with NAICS and scope where available.

Requires a free FASS Flow account (flow.fass.systems) and your personal
capture key, found under Inbox → Auto-capture.

This extension only acts when you click the capture button. It does not run
in the background, does not track your browsing, and does not take
screenshots.
```

**Category:** Productivity

**Language:** English

## 4. "Privacy practices" tab

**Single purpose description:**
```
Reads the solicitation page the user is actively viewing in their government
procurement portal, only when the user clicks "Capture this page," and sends
it to the user's own FASS Flow account so it can be matched into their bid
pipeline.
```

**Permission justifications** (paste one per permission Chrome asks about):

| Permission | Justification |
|---|---|
| `activeTab` | Needed to read the solicitation text of the tab the user is actively viewing, and only when they click Capture. |
| `scripting` | Needed to run the page-text extraction function in the active tab when the user clicks Capture. |
| `storage` | Needed to remember the user's FASS Flow capture key and backend address locally, so they don't have to re-enter it every time. |
| Host permission (`web-production-1af97.up.railway.app`) | This is the FASS Flow backend the captured solicitation is sent to — the only network destination the extension ever talks to. |

**Data usage disclosure** — check these boxes / answer these prompts:
- Does this extension collect or transmit user data? **Yes.**
- What data: **Website content** (the captured page's visible text and
  document links — only on explicit user action).
- Is data sold to third parties? **No.**
- Is data used for purposes unrelated to the extension's core function?
  **No.**
- Privacy policy URL:
  ```
  https://flow.fass.systems/extension-privacy
  ```

## 5. Screenshots / promo images

Chrome requires at least one screenshot (1280×800 or 640×400). These have to
be real screenshots of the popup in action — take one of:
- The popup with Settings open showing the capture-key field (blur/replace
  the real key first), and
- The popup after a successful capture showing the green confirmation
  message.

There's no way to generate these from outside a live browser session — grab
them yourself from `chrome://extensions` with the unpacked extension loaded
(see InstallExtension page steps 2–3), then upload here.

## 6. Submit

Click "Submit for review" on the dashboard. Typical review time for a
straightforward extension like this is a few hours to a few days. You'll get
an email when it's approved or if Google asks for changes — if they do,
flag it back to me and I'll adjust the manifest/copy/permissions to match.
