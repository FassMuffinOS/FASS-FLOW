import { useState, useEffect } from 'react'
import { Download, Share, X } from 'lucide-react'
import './InstallPrompt.css'

const DISMISS = 'fass_pwa_dismissed'

// Nudge users to install the PWA so "Get Started" feels like a native app,
// not a browser tab. Android/Chromium fire `beforeinstallprompt` → one-tap
// install. iOS Safari blocks programmatic install, so we show the manual
// Share → "Add to Home Screen" steps. Hides if already installed or dismissed.
export default function InstallPrompt() {
  const [deferred, setDeferred] = useState(null)
  const [show, setShow] = useState(false)
  const [ios, setIos] = useState(false)

  useEffect(() => {
    try { if (localStorage.getItem(DISMISS) === '1') return } catch { /* ignore */ }

    // Already installed (standalone display) → nothing to prompt.
    const standalone = window.matchMedia?.('(display-mode: standalone)').matches || window.navigator.standalone
    if (standalone) return

    const isIos = /iphone|ipad|ipod/i.test(navigator.userAgent) && !window.MSStream
    if (isIos) { setIos(true); setShow(true); return }

    function onBIP(e) {
      e.preventDefault()           // suppress the mini-infobar; we show our own
      setDeferred(e)
      setShow(true)
    }
    window.addEventListener('beforeinstallprompt', onBIP)
    // If they install via the browser UI, hide ours.
    function onInstalled() { setShow(false) }
    window.addEventListener('appinstalled', onInstalled)
    return () => {
      window.removeEventListener('beforeinstallprompt', onBIP)
      window.removeEventListener('appinstalled', onInstalled)
    }
  }, [])

  function dismiss() {
    setShow(false)
    try { localStorage.setItem(DISMISS, '1') } catch { /* ignore */ }
  }

  async function install() {
    if (!deferred) return
    deferred.prompt()
    await deferred.userChoice
    dismiss()
  }

  if (!show) return null

  return (
    <div className="pwa-banner">
      <span className="pwa-ic">{ios ? <Share size={18} /> : <Download size={18} />}</span>
      <div className="pwa-body">
        <strong>Install FASS Flow</strong>
        {ios
          ? <span>Tap the Share icon, then “Add to Home Screen” for the full-screen app.</span>
          : <span>Add it to your home screen for a fast, full-screen, app-like experience.</span>}
      </div>
      {!ios && <button className="pwa-install" onClick={install}>Install</button>}
      <button className="pwa-close" onClick={dismiss} aria-label="Dismiss"><X size={16} /></button>
    </div>
  )
}
