/**
 * Web Push subscription management.
 * Registers the service worker, subscribes to push, and saves the
 * subscription to the server so it can send notifications even when
 * the app is closed.
 */

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY as string
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001'

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = atob(base64)
  return Uint8Array.from([...rawData].map(c => c.charCodeAt(0)))
}

export async function registerPushSubscription(userId: string, authToken: string): Promise<boolean> {
  try {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      console.warn('[Push] Not supported in this browser')
      return false
    }

    // Wait for SW to be ready
    const registration = await navigator.serviceWorker.ready

    // Check existing subscription
    let subscription = await registration.pushManager.getSubscription()

    if (!subscription) {
      // Subscribe with VAPID key
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      })
    }

    // Save subscription to server
    const res = await fetch(`${API_URL}/api/push/subscribe`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`,
      },
      body: JSON.stringify({ subscription, userId }),
    })

    if (!res.ok) {
      console.warn('[Push] Failed to save subscription:', await res.text())
      return false
    }

    console.info('[Push] ✓ Subscribed to push notifications')
    return true
  } catch (err) {
    console.warn('[Push] Subscription error:', err)
    return false
  }
}

export async function unregisterPushSubscription(authToken: string): Promise<void> {
  try {
    if (!('serviceWorker' in navigator)) return
    const registration = await navigator.serviceWorker.ready
    const subscription = await registration.pushManager.getSubscription()
    if (!subscription) return

    await subscription.unsubscribe()

    await fetch(`${API_URL}/api/push/unsubscribe`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`,
      },
      body: JSON.stringify({ endpoint: subscription.endpoint }),
    })

    console.info('[Push] Unsubscribed from push notifications')
  } catch (err) {
    console.warn('[Push] Unsubscribe error:', err)
  }
}

export function isPushSupported(): boolean {
  return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window
}
