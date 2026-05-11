import { useEffect } from 'react'
import { useAuthStore } from '@/store/authStore'
import { registerPushSubscription, isPushSupported } from '@/services/pushSubscription'
import { supabase } from '@/lib/supabase'

/**
 * On mount, if the user has already granted notification permission,
 * register the Web Push subscription so the server can send real pushes
 * even when the app is closed.
 */
export function usePushNotifications() {
  const { user } = useAuthStore()

  useEffect(() => {
    if (!user?.id || !isPushSupported()) return
    if (Notification.permission !== 'granted') return

    // Get the current session token and register
    supabase.auth.getSession().then(({ data }) => {
      const token = data.session?.access_token
      if (token) registerPushSubscription(user.id, token)
    })
  }, [user?.id])
}

// ── Request permission + register Web Push ───────────────────────────────────
export async function requestNotificationPermission(): Promise<boolean> {
  if (!('Notification' in window)) return false
  if (Notification.permission === 'denied') return false

  if (Notification.permission !== 'granted') {
    const result = await Notification.requestPermission()
    if (result !== 'granted') return false
  }

  // Register Web Push subscription after permission granted
  const { data } = await supabase.auth.getSession()
  const token = data.session?.access_token
  const { useAuthStore: store } = await import('@/store/authStore')
  const userId = store.getState().user?.id

  if (token && userId && isPushSupported()) {
    await registerPushSubscription(userId, token)
  }

  return true
}

// ── Show a local notification (fallback when app is open) ────────────────────
export function showNotification(title: string, body: string, options?: {
  icon?: string
  badge?: string
  tag?: string
  data?: Record<string, unknown>
}) {
  if (!('Notification' in window) || Notification.permission !== 'granted') return

  // Use SW registration for better mobile support if available
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.ready.then(reg => {
      reg.showNotification(title, {
        body,
        icon: options?.icon ?? '/icons/icon-192x192.png',
        badge: options?.badge ?? '/icons/icon-72x72.png',
        tag: options?.tag,
        data: options?.data ?? {},
        // @ts-expect-error vibrate is supported on Android
        vibrate: [200, 100, 200],
      })
    }).catch(() => {
      // Fallback to basic Notification
      new Notification(title, { body, icon: options?.icon ?? '/icons/icon-192x192.png' })
    })
    return
  }

  const n = new Notification(title, {
    body,
    icon: options?.icon ?? '/icons/icon-192x192.png',
    badge: options?.badge ?? '/icons/icon-72x72.png',
    tag: options?.tag,
    data: options?.data,
    // @ts-expect-error vibrate is supported on Android
    vibrate: [200, 100, 200],
  })
  n.onclick = () => { window.focus(); n.close() }
}

// ── Convenience helpers ───────────────────────────────────────────────────────
export function notifyAttendanceWarning(subjectName: string, pct: number) {
  showNotification(
    `⚠️ Attendance Warning — ${subjectName}`,
    `Your attendance is ${pct}%. Attend the next class to stay safe.`,
    { tag: `attendance-${subjectName}` }
  )
}

export function notifyProxyReceived(fromName: string, classes: number) {
  showNotification(
    '🤝 Proxy Received',
    `${fromName} did a proxy for you — ${classes} class${classes !== 1 ? 'es' : ''} credited.`,
    { tag: 'proxy-received' }
  )
}

export function scheduleDailyReminder() {
  if (!('Notification' in window) || Notification.permission !== 'granted') return
  const today = new Date().toDateString()
  const lastReminder = localStorage.getItem('bunkwise-last-reminder')
  if (lastReminder === today) return
  const now = new Date()
  if (now.getHours() >= 9 && now.getHours() < 10) {
    showNotification(
      '📚 Mark Your Attendance',
      "Don't forget to mark today's attendance in Bunkwise!",
      { tag: 'daily-reminder' }
    )
    localStorage.setItem('bunkwise-last-reminder', today)
  }
}
