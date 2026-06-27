// Messenger push service worker. Registered from
// src/hooks/usePushNotifications.js — this is the only thing that lets a
// push notification show up when the tab/app is fully closed.
self.addEventListener('install', () => {
  self.skipWaiting()
})

self.addEventListener('activate', event => {
  event.waitUntil(self.clients.claim())
})

self.addEventListener('push', event => {
  let data = { title: 'FASS Flow', body: 'You have a new message.', url: '/messages' }
  if (event.data) {
    try {
      data = { ...data, ...event.data.json() }
    } catch (err) {
      data.body = event.data.text() || data.body
    }
  }
  event.waitUntil(
    self.registration.showNotification(data.title || 'FASS Flow', {
      body: data.body || '',
      icon: '/favicon.svg',
      badge: '/favicon.svg',
      data: { url: data.url || '/messages' },
    })
  )
})

self.addEventListener('notificationclick', event => {
  event.notification.close()
  const url = event.notification.data?.url || '/messages'
  event.waitUntil(
    self.clients.matchAll({ type: 'window' }).then(windowClients => {
      for (const client of windowClients) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.focus()
          return client.navigate ? client.navigate(url) : undefined
        }
      }
      if (self.clients.openWindow) return self.clients.openWindow(url)
    })
  )
})
