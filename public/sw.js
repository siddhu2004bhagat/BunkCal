/* ============================================================
   Bunkwise Service Worker — handles background push notifications
   ============================================================ */

const APP_URL = self.location.origin

// ── Push event: fired when server sends a Web Push message ──────────────────
self.addEventListener('push', (event) => {
  let data = {}
  try {
    data = event.data ? event.data.json() : {}
  } catch {
    data = { title: 'Bunkwise', body: event.data ? event.data.text() : 'New notification' }
  }

  const title   = data.title   || 'Bunkwise'
  const body    = data.body    || ''
  const icon    = data.icon    || '/icons/icon-192x192.png'
  const badge   = data.badge   || '/icons/icon-72x72.png'
  const tag     = data.tag     || 'bunkwise-push'
  const url     = data.url     || '/notifications'
  const vibrate = data.vibrate || [200, 100, 200]

  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      icon,
      badge,
      tag,
      vibrate,
      data: { url },
      requireInteraction: false,
    })
  )
})

// ── Notification click: open/focus the app ───────────────────────────────────
self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url = (event.notification.data && event.notification.data.url)
    ? APP_URL + event.notification.data.url
    : APP_URL + '/notifications'

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // If app is already open, focus it and navigate
      for (const client of clientList) {
        if (client.url.startsWith(APP_URL) && 'focus' in client) {
          client.focus()
          client.navigate(url)
          return
        }
      }
      // Otherwise open a new window
      if (clients.openWindow) return clients.openWindow(url)
    })
  )
})

// ── Install / activate: skip waiting so new SW takes over immediately ────────
self.addEventListener('install',  () => self.skipWaiting())
self.addEventListener('activate', (event) => event.waitUntil(clients.claim()))
