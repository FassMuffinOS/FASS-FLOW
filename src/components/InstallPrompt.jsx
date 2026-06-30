import { useState, useEffect } from 'react'
import { Download, Share, X } from 'lucide-react'
import './InstallPrompt.css'

const DISMISS = 'fass_pwa_dismissed'

// Install nudge. Behavior differs by platform because of hard OS limits:
//  - Android / desktop Chromium: `beforeinstallprompt` → a real one-tap install.
//  - iOS Safari: Apple blocks programmatic install — only the manual
//    Share → "Add to Home Screen" works, so we show numbered steps.
//  - iOS in a non-Safari browser (Chrome-iOS, Facebook/Messages in-app, etc.):
//    Add-to-Home-Screen isn't available at all → tell them to open in Safari.
export default function InstallPrompt() {
  const [deferred, setDeferred] = useState(null)
  // mode: 'android' | 'ios-safari' | 'ios-other' | null
  const [mode, setMode] = useState(null)

  useEffect(() => {
    try { if (localStorage.getItem(DISMISS) === '1') return } catch { /* ignore */ }

    const standalone = window.matchMedia?.('(display-mode: standalone)').matches || window.navigator.standalone
    if (standalone) return // already installed

    const ua = navigator.userAgent || ''
    const isIos = /iphone|ipad|ipod/i.test(ua) && !window.MSStream
    if (isIos) {
      const otherBrowser = /crios|fxios|edgios|opios|fban|fbav|instagram|line|micromessenger|gsa/i.test(ua)
      setMode(otherBrowser ? 'ios-other' : 'ios-safari')
      return
    }

    function onBIP(e) { e.preventDefault(); setDeferred(e); setMode('android') }
    function onInstalled() { setMode(null) }
    window.addEventListener('beforeinstallprompt', onBIP)
    window.addEventListener('appinstalled', onInstalled)
    return () => {
      window.removeEventListener('beforeinstallprompt', onBIP)
      window.removeEventListener('appinstalled', onInstalled)
    }
  }, [])

  function dismiss() {
    setMode(null)
    try { localStorage.setItem(DISMISS, '1') } catch { /* ignore */ }
  }

  async function install() {
    if (!deferred) return
    deferred.prompt()
    await deferred.userChoice
    dismiss()
  }

  if (!mode) return null

  return (
    <div className="pwa-banner">
      <span className="pwa-ic">{mode === 'android' ? <Download size={18} /> : <Share size={18} />}</span>
      <div className="pwa-body">
        <strong>Install FASS Flow</strong>
        {mode === 'android' && (
          <span>Add it to your home screen for a fast, full-screen, app-like experience.</span>
        )}
        {mode === 'ios-safari' && (
          <span>
            <span className="pwa-step"><b>1.</b> Tap the Share icon <Share size={12} /> in Safari's bar.</span>
            <span className="pwa-step"><b>2.</b> Choose “Add to Home Screen.”</span>
          </span>
        )}
        {mode === 'ios-other' && (
          <span>Open <b>flow.fass.systems</b> in <b>Safari</b>, then Share → “Add to Home Screen.” (iPhone only installs web apps from Safari.)</span>
        )}
      </div>
      {mode === 'android' && <button className="pwa-install" onClick={install}>Install</button>}
      <button className="pwa-close" onClick={dismiss} aria-label="Dismiss"><X size={16} /></button>
    </div>
  )
}
