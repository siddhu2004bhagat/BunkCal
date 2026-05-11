/**
 * Server-side Supabase Realtime listener.
 * Watches the `notifications` table for new inserts and immediately
 * sends a Web Push to all of that user's registered devices.
 *
 * This is what makes push notifications work even when the app is closed.
 */

import { createClient } from '@supabase/supabase-js'
import { sendPushToUser } from './routes/push'

const notifIcons: Record<string, string> = {
  warning: '⚠️',
  success: '✅',
  info: '👋',
  proxy: '🤝',
  friend: '👥',
}

const notifUrls: Record<string, string> = {
  warning: '/dashboard',
  success: '/notifications',
  info: '/notifications',
  proxy: '/proxy-ledger',
  friend: '/friends',
}

export function startNotificationPusher() {
  const supabaseUrl = process.env.SUPABASE_URL
  const serviceKey  = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceKey || supabaseUrl.includes('placeholder')) {
    console.warn('[NotifPusher] Skipping — SUPABASE_URL or SERVICE_ROLE_KEY not configured')
    return
  }

  if (!process.env.VAPID_PUBLIC_KEY || !process.env.VAPID_PRIVATE_KEY) {
    console.warn('[NotifPusher] Skipping — VAPID keys not configured')
    return
  }

  // Use a separate client for the realtime listener
  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  const channel = supabase
    .channel('server-notification-pusher')
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .on('postgres_changes' as any, {
      event: 'INSERT',
      schema: 'public',
      table: 'notifications',
    }, async (payload: any) => {
      const notif = payload.new
      if (!notif?.user_id || !notif?.title) return

      const icon = notifIcons[notif.type] || '🔔'
      const url  = notifUrls[notif.type]  || '/notifications'

      try {
        await sendPushToUser(notif.user_id, {
          title: `${icon} ${notif.title}`,
          body:  notif.message || '',
          url,
          tag:   `notif-${notif.id}`,
        })
      } catch (err) {
        console.warn('[NotifPusher] Failed to push for notif', notif.id, err)
      }
    })
    .subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        console.info('[NotifPusher] ✓ Watching notifications table — Web Push active')
      } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
        console.warn('[NotifPusher] Realtime connection failed:', status)
      }
    })

  // Graceful shutdown
  process.on('SIGTERM', () => supabase.removeChannel(channel))
  process.on('SIGINT',  () => supabase.removeChannel(channel))
}
