import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { EXTENSION_ZIP_URL } from '../lib/captureExtensionZip'
import { Download, Copy, Check, Globe, Puzzle, KeyRound, MousePointerClick } from 'lucide-react'
import './InstallExtension.css'

const API_BASE = import.meta.env.VITE_API_URL || ''

export default function InstallExtension() {
  const { session } = useAuth()
  const [captureKey, setCaptureKey] = useState('')
  const [copied, setCopied] = useState(false)
  const [downloaded, setDownloaded] = useState(false)

  useEffect(() => {
    if (!session?.user?.id) return
    fetch(`${API_BASE}/api/v1/ingest/key?user_id=${session.user.id}`)
      .then(r => (r.ok ? r.json() : null))
      .then(d => { if (d?.key) setCaptureKey(d.key) })
      .catch(() => {})
  }, [session?.user?.id])

  function copyKey() {
    navigator.clipboard?.writeText(captureKey).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 1800)
    })
  }

  function doDownload() {
    const a = document.createElement('a')
    a.href = EXTENSION_ZIP_URL
    a.download = 'fass-capture-extension.zip'
    document.body.appendChild(a)
    a.click()
    a.remove()
    setDownloaded(true)
  }

  return (
    <div className="ie">
      <header className="ie-head">
        <h1><Puzzle size={22} /> Install the capture extension</h1>
        <p>
          The extension reads a solicitation you're viewing in your portal and sends it straight into
          your pipeline — matched by BPM ID — so R-E-A-D and FASS FILL work from the real document.
          Setup takes about two minutes.
        </p>
      </header>

      <ol className="ie-steps">
        <li>
          <div className="ie-step-head"><Download size={16} /> Download the extension</div>
          <p>Click below, then <strong>unzip</strong> the file somewhere you'll keep it (Chrome can't load a zip directly).</p>
          <button className="ie-btn" onClick={doDownload}>
            {downloaded ? <><Check size={15} /> Downloaded — now unzip it</> : <><Download size={15} /> Download extension (.zip)</>}
          </button>
        </li>

        <li>
          <div className="ie-step-head"><Globe size={16} /> Open Chrome's extensions page</div>
          <p>Click the address bar, type <code>chrome://extensions</code>, and press Enter. (It won't open as a normal link — you have to type it.)</p>
        </li>

        <li>
          <div className="ie-step-head"><MousePointerClick size={16} /> Turn on Developer mode &amp; load it</div>
          <p>Flip on <strong>Developer mode</strong> (top-right), click <strong>Load unpacked</strong> (top-left), and select the unzipped <code>capture-extension</code> folder.</p>
        </li>

        <li>
          <div className="ie-step-head"><KeyRound size={16} /> Paste your capture key</div>
          <p>Click the extension (pin it first via the puzzle icon), open <strong>Settings</strong>, and paste this key, then Save:</p>
          <div className="ie-key-row">
            <code className="ie-key">{captureKey || 'Loading your key…'}</code>
            <button className="ie-key-copy" onClick={copyKey} disabled={!captureKey}>
              {copied ? <><Check size={13} /> Copied</> : <><Copy size={13} /> Copy</>}
            </button>
          </div>
          <p className="ie-warn">Keep this key private — anyone with it can write solicitations into your account.</p>
        </li>

        <li>
          <div className="ie-step-head"><Check size={16} /> Capture a solicitation</div>
          <p>Open a solicitation's detail page in your portal (the one showing its BPM ID), click the extension, and hit <strong>Capture this page</strong>. It lands in your pipeline.</p>
        </li>
      </ol>

      <div className="ie-note">
        <strong>One-click install for your vendors is coming.</strong> This Developer-mode setup is the
        interim path. The frictionless “Add to Chrome” version requires publishing to the Chrome Web
        Store (a short review) — that's the next step once you're ready to onboard others.
      </div>
    </div>
  )
}
