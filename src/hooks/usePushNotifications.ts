import { useEffect } from 'react'
import { useAuthStore } from '@/store/authStore'

/**
 * Requests push notification permission and shows local notifications
 * for attendance warnings and proxy updates.
 */
export function usePushNotifications() {
  const { user } = useAuthStore()

  useEffect(() => {
    if (!user || !('Notification' in window)) return

    // Request permission on first use (don't auto-prompt on load)
    // Permission is requested when user enables it in Settings
  }, [user])
}

// Request notification permission
export async function requestNotificationPermission(): Promise<boolean> {
  if (!('Notification' in window)) return false
  if (Notification.permission === 'granted') return true
  if (Notification.permission === 'denied') return false

  const result = await Notification.requestPermission()
  return result === 'granted'
}

// Show a local push notification
export function showNotification(title: string, body: string, options?: {
  icon?: string
  badge?: string
  tag?: string
  data?: Record<string, unknown>
}) {
  if (!('Notification' in window) || Notification.permission !== 'granted') return

  const n = new Notification(title, {
    body,
    icon: options?.icon ?? '/icons/icon-192x192.png',
    badge: options?.badge ?? '/icons/icon-72x72.png',
    tag: options?.tag,
    data: options?.data,
    // @ts-expect-error - vibrate is supported on Android
    vibrate: [200, 100, 200],
  })

  n.onclick = () => {
    window.focus()
    n.close()
  }
}

// Attendance warning notification
export function notifyAttendanceWarning(subjectName: string, pct: number) {
  showNotification(
    `⚠️ Attendance Warning — ${subjectName}`,
    `Your attendance is ${pct}%. Attend the next class to stay safe.`,
    { tag: `attendance-${subjectName}` }
  )
}

// Proxy notification
export function notifyProxyReceived(fromName: string, classes: number) {
  showNotification(
    `🤝 Proxy Received`,
    `${fromName} did a proxy for you — ${classes} class${classes !== 1 ? 'es' : ''} credited.`,
    { tag: 'proxy-received' }
  )
}

// Daily attendance reminder
export function scheduleDailyReminder() {
  if (!('Notification' in window) || Notification.permission !== 'granted') return

  // Check if already reminded today
  const today = new Date().toDateString()
  const lastReminder = localStorage.getItem('bunkwise-last-reminder')
  if (lastReminder === today) return

  const now = new Date()
  const reminderHour = 9 // 9 AM
  if (now.getHours() >= reminderHour && now.getHours() < reminderHour + 1) {
    showNotification(
      '📚 Mark Your Attendance',
      "Don't forget to mark today's attendance in Bunkwise!",
      { tag: 'daily-reminder' }
    )
    localStorage.setItem('bunkwise-last-reminder', today)
  }
}
