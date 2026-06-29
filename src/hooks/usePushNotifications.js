import { useCallback, useState } from 'react'
import { apiFetch } from '../lib/apiClient'

const API_BASE = import.meta.env.VITE_API_URL || ''
const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY || ''

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = window.atob(base64)
  return Uint8Array.from([...rawData].map(c => c.charCodeAt(0)))
}

// True Web Push (delivered even with every tab closed) needs a registered
// service worker (public/sw.js) + a VAPID key pair. The public key is safe
// to ship to the browser (VITE_VAPID_PUBLIC_KEY); the private key never
// leaves the backend (app/web_push.py). If VITE_VAPID_PUBLIC_KEY isn't set
// yet, enable() is a no-op so the "Enable notifications" button can stay in
// the UI without erroring before Railway's keys exist.
export function usePushNotifications(userId) {
  const [permission, setPermission] = useState(
    typeof Notification !== 'undefined' ? Notification.permission : 'unsupported'
  )
  const [busy, setBusy] = useState(false)

  const enable = useCallback(async () => {
    if (!userId || !VAPID_PUBLIC_KEY) return
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      setPermission('unsupported')
      return
    }
    setBusy(true)
    try {
      const perm = await Notification.requestPermission()
      setPermission(perm)
      if (perm !== 'granted') return
      const reg = await navigator.serviceWorker.register('/sw.js')
      let sub = await reg.pushManager.getSubscription()
      if (!sub) {
        sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
        })
      }
      const raw = sub.toJSON()
      await apiFetch(`/api/v1/chat/push/subscribe`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: userId,
          endpoint: raw.endpoint,
          p256dh: raw.keys.p256dh,
          auth_key: raw.keys.auth,
        }),
      }).catch(() => {})
    } catch (err) {
      console.error('usePushNotifications: subscribe failed', err)
    } finally {
      setBusy(false)
    }
  }, [userId])

  return { permission, enable, busy, supported: Boolean(VAPID_PUBLIC_KEY) }
}
