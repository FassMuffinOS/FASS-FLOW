// FASS Flow capture extension — popup logic.
// Runs inside the user's logged-in portal session: reads the rendered page
// text + document links directly (far more accurate than a screenshot/OCR),
// then POSTs to the unified ingest spine, which maps it by BPM ID and
// backfills the opportunity in the pipeline.

const DEFAULT_BACKEND = 'https://web-production-1af97.up.railway.app';

const keyInput = document.getElementById('key');
const backendInput = document.getElementById('backend');
const captureBtn = document.getElementById('capture');
const saveBtn = document.getElementById('save');
const settings = document.getElementById('settings');
const statusEl = document.getElementById('status');

function showStatus(msg, kind) {
  statusEl.textContent = msg;
  statusEl.className = kind;
}

// Restore saved settings; open the Settings drawer if no key is set yet.
chrome.storage.local.get(['captureKey', 'backendUrl'], (s) => {
  keyInput.value = s.captureKey || '';
  backendInput.value = s.backendUrl || DEFAULT_BACKEND;
  if (!s.captureKey) settings.open = true;
});

saveBtn.addEventListener('click', () => {
  chrome.storage.local.set(
    { captureKey: keyInput.value.trim(), backendUrl: (backendInput.value.trim() || DEFAULT_BACKEND) },
    () => showStatus('Settings saved.', 'ok')
  );
});

// Injected into the active tab. Must be fully self-contained (it's serialized
// and run in the page context, with no access to popup scope).
function extractFromPage() {
  const text = document.body ? document.body.innerText : '';
  const bpmMatch = text.match(/BPM\s*ID[:#]?\s*(\d{3,})/i);
  const rfxMatch = text.match(/RFx name:\s*([^\n]+)/i);
  const pdfLinks = Array.from(document.querySelectorAll('a'))
    .map((a) => a.href)
    .filter((h) => /\.pdf(\?|$)/i.test(h) || /download|attachment|document/i.test(h))
    .filter((h, i, arr) => arr.indexOf(h) === i)
    .slice(0, 50);
  return {
    text: text.slice(0, 200000),
    bpm: bpmMatch ? bpmMatch[1] : null,
    title: rfxMatch ? rfxMatch[1].trim() : document.title || null,
    pdfLinks,
    link: location.href,
  };
}

captureBtn.addEventListener('click', async () => {
  const key = keyInput.value.trim();
  const backend = (backendInput.value.trim() || DEFAULT_BACKEND).replace(/\/$/, '');
  if (!key) {
    settings.open = true;
    showStatus('Add your capture key first (from FASS Flow → Inbox).', 'err');
    return;
  }

  captureBtn.disabled = true;
  showStatus('Reading the page…', 'ok');

  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    const [{ result }] = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: extractFromPage,
    });

    if (!result || !result.text || result.text.length < 50) {
      showStatus("Couldn't read meaningful text from this page. Open the solicitation detail page and try again.", 'err');
      captureBtn.disabled = false;
      return;
    }

    const res = await fetch(`${backend}/api/v1/ingest/solicitation`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Ingest-Key': key },
      body: JSON.stringify({
        bpm_id: result.bpm,
        title: result.title,
        text: result.text,
        link: result.link,
        pdf_links: result.pdfLinks,
        source: 'extension',
      }),
    });

    if (!res.ok) {
      const detail = await res.json().catch(() => ({}));
      throw new Error(detail.detail || `Capture failed (${res.status})`);
    }

    const data = await res.json();
    const where = data.matched ? 'matched to your existing opportunity' : 'created a new opportunity';
    const naics = data.naics ? ` · NAICS ${data.naics}` : '';
    const backfill = data.backfilled_proposal ? ' · pipeline card backfilled' : '';
    showStatus(`Captured — BPM ${data.bpm_id}, ${where}${naics}${backfill}.`, 'ok');
  } catch (err) {
    showStatus(err.message || 'Capture failed.', 'err');
  } finally {
    captureBtn.disabled = false;
  }
});
