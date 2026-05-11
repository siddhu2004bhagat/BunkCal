import { useEffect, useRef } from 'react'
import { useAuthStore } from '@/store/authStore'
import { showNotification } from '@/hooks/usePushNotifications'
import { supabase } from '@/lib/supabase'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any

const SEEN_KEY = 'bunkwise-seen-notifs'

function getSeenIds(): Set<string> {
  try {
    const raw = localStorage.getItem(SEEN_KEY)
    return new Set(raw ? JSON.parse(raw) : [])
  } catch { return new Set() }
}

function markSeen(ids: string[]) {
  const seen = getSeenIds()
  ids.forEach(id => seen.add(id))
  // Keep only last 100 to avoid unbounded growth
  const arr = Array.from(seen).slice(-100)
  localStorage.setItem(SEEN_KEY, JSON.stringify(arr))
}

const notifIcons: Record<string, string> = {
  'warning': '⚠️',
  'success': '✅',
  'info': '👋',
  'proxy': '🤝',
}

/**
 * Polls for new unread notifications every 15 seconds.
 * Fires a browser push notification for any new ones the user hasn't seen.
 */
export function useNotificationWatcher() {
  const { user } = useAuthStore()
  const hasPermission = useRef(false)

  useEffect(() => {
    if (!user?.id) return

    // Check permission once
    hasPermission.current = Notification.permission === 'granted'

    const userId = user.id

    const checkNotifications = async () => {
      // Only fire browser pushes if permission granted
      if (!hasPermission.current) {
        hasPermission.current = Notification.permission === 'granted'
        if (!hasPermission.current) return
      }

      try {
        const { data: notifications } = await db
          .from('notifications')
          .select('id, title, message, type, read, created_at')
          .eq('user_id', userId)
          .eq('read', false)
          .order('created_at', { ascending: false })
          .limit(10)

        if (!notifications?.length) return

        const seen = getSeenIds()
        const newOnes = notifications.filter((n: { id: string }) => !seen.has(n.id))

        if (newOnes.length === 0) return

        // Fire browser push for each new notification
        for (const notif of newOnes.slice(0, 3)) {
          const icon = notifIcons[notif.type] || '🔔'
          showNotification(
            `${icon} ${notif.title}`,
            notif.message,
            { tag: `notif-${notif.id}` }
          )
          // Small delay between multiple notifications
          await new Promise(r => setTimeout(r, 800))
        }

        // Mark all as seen (browser push sent)
        markSeen(newOnes.map((n: { id: string }) => n.id))

      } catch (err) {
        console.warn('[NotificationWatcher] Error:', err)
      }
    }

    // Check immediately on mount (catches notifications received while app was closed)
    const initialTimer = setTimeout(checkNotifications, 2000)

    // Then poll every 15 seconds
    const interval = setInterval(checkNotifications, 15000)

    return () => {
      clearTimeout(initialTimer)
      clearInterval(interval)
    }
  }, [user?.id])
}
