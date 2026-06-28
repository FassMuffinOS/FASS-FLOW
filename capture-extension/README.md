# FASS Flow — Solicitation Capture (Chrome extension)

Captures the solicitation you're viewing on a procurement portal (eMMA, SAM.gov,
etc.) and sends it to FASS Flow. It reads the page's actual text and document
links from inside your logged-in session — no screenshot/OCR — and the backend
maps it to your pipeline by **BPM ID**, backfilling the opportunity so R-E-A-D,
FASS FILL, and the Estimator have the real solicitation to work from.

## Install (unpacked, for your own use)

1. Open `chrome://extensions` in Chrome.
2. Turn on **Developer mode** (top-right).
3. Click **Load unpacked** and select this `capture-extension/` folder.
4. Pin the extension (puzzle-piece icon → pin).

## Connect it

1. In FASS Flow, open **Inbox** and copy your **Capture key**.
2. Click the extension → **Settings** → paste the key → **Save settings**.
   (Backend URL is pre-filled; only change it if you self-host.)

## Use it

1. In your portal, open the solicitation detail page (the one showing the BPM ID).
2. Click the extension → **Capture this page**.
3. It confirms whether it matched an existing opportunity or created a new one,
   and whether it backfilled the pipeline card.

## Notes

- Only acts on the current tab, and only when you click Capture (`activeTab`).
- If a solicitation's content is locked inside an embedded PDF viewer, open the
  PDF in its own tab and capture there, or download it and use the manual upload.
- Sharing this with other vendors later means publishing to the Chrome Web Store
  (a review step); unpacked install is for your own machine.
