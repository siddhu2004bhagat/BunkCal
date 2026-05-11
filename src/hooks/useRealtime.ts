import { useEffect, useRef } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/authStore'
import { showNotification } from '@/hooks/usePushNotifications'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type P = any

export function useRealtime() {
  const { user } = useAuthStore()
  const queryClient = useQueryClient()
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null)
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const setupTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (!user?.id) return
    const userId = user.id

    // Full cleanup of previous state
    if (setupTimerRef.current) { clearTimeout(setupTimerRef.current); setupTimerRef.current = null }
    if (pollingRef.current) { clearInterval(pollingRef.current); pollingRef.current = null }
    if (channelRef.current) {
      const old = channelRef.current
      channelRef.current = null
      try { supabase.removeChannel(old) } catch { /* ignore */ }
    }

    // Delay setup slightly — lets React StrictMode's first-mount cleanup finish
    // before we create the new channel. Prevents "cannot add after subscribe" crash.
    setupTimerRef.current = setTimeout(() => {
      // Unique name per mount — never reuses a subscribed channel
      const channelName = `bw_${userId}_${Date.now()}_${Math.random().toString(36).slice(2)}`
      const channel = supabase.channel(channelName)

      // ── Add ALL listeners BEFORE calling subscribe ──────────────────────────

      // Standard tables
      const tables = [
        { table: 'subjects',           key: ['subjects', userId],           filter: `user_id=eq.${userId}` },
        { table: 'attendance_records', key: ['attendance', userId],         filter: `user_id=eq.${userId}` },
        { table: 'proxy_ledger',       key: ['proxy-ledger', userId],       filter: `user_id=eq.${userId}` },
        { table: 'proxy_transactions', key: ['proxy-transactions', userId], filter: `user_id=eq.${userId}` },
        { table: 'timetable_entries',  key: ['timetable', userId],          filter: `user_id=eq.${userId}` },
      ]
      for (const { table, key, filter } of tables) {
        channel.on('postgres_changes' as P, { event: '*', schema: 'public', table, filter },
          () => queryClient.invalidateQueries({ queryKey: key }))
      }

      // Notifications — fire browser push immediately
      channel.on('postgres_changes' as P,
        { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${userId}` },
        (payload: P) => {
          queryClient.invalidateQueries({ queryKey: ['notifications', userId] })
          if (Notification.permission === 'granted' && payload?.new) {
            const icons: Record<string, string> = { warning: '⚠️', success: '✅', info: '👋', proxy: '🤝' }
            showNotification(
              `${icons[payload.new.type] || '🔔'} ${payload.new.title}`,
              payload.new.message,
              { tag: `rt-${payload.new.id}` }
            )
            try {
              const seen = JSON.parse(localStorage.getItem('bunkwise-seen-notifs') || '[]')
              seen.push(payload.new.id)
              localStorage.setItem('bunkwise-seen-notifs', JSON.stringify(seen.slice(-100)))
            } catch { /* ignore */ }
          }
        }
      )

      // Friend requests — receiver
      channel.on('postgres_changes' as P,
        { event: 'INSERT', schema: 'public', table: 'friend_requests', filter: `receiver_id=eq.${userId}` },
        () => {
          queryClient.invalidateQueries({ queryKey: ['friend-requests', userId] })
          queryClient.invalidateQueries({ queryKey: ['notifications', userId] })
        }
      )

      // Friend requests — sender status updates
      channel.on('postgres_changes' as P,
        { event: 'UPDATE', schema: 'public', table: 'friend_requests', filter: `sender_id=eq.${userId}` },
        () => {
          queryClient.invalidateQueries({ queryKey: ['sent-requests', userId] })
          queryClient.invalidateQueries({ queryKey: ['friends', userId] })
          queryClient.invalidateQueries({ queryKey: ['notifications', userId] })
        }
      )

      // Friends table
      channel.on('postgres_changes' as P,
        { event: '*', schema: 'public', table: 'friends', filter: `user_id=eq.${userId}` },
        () => queryClient.invalidateQueries({ queryKey: ['friends', userId] })
      )

      // Profile updates
      channel.on('postgres_changes' as P,
        { event: 'UPDATE', schema: 'public', table: 'profiles', filter: `user_id=eq.${userId}` },
        (payload: P) => {
          if (payload?.new) useAuthStore.getState().setProfile(payload.new)
        }
      )

      // ── Subscribe AFTER all listeners ───────────────────────────────────────
      channel.subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.info('[Realtime] ✓ Connected')
          if (pollingRef.current) { clearInterval(pollingRef.current); pollingRef.current = null }
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          console.warn('[Realtime] Falling back to 15s polling')
          if (!pollingRef.current) {
            pollingRef.current = setInterval(() => {
              queryClient.invalidateQueries({ queryKey: ['subjects', userId] })
              queryClient.invalidateQueries({ queryKey: ['attendance', userId] })
              queryClient.invalidateQueries({ queryKey: ['proxy-ledger', userId] })
              queryClient.invalidateQueries({ queryKey: ['notifications', userId] })
              queryClient.invalidateQueries({ queryKey: ['friend-requests', userId] })
              queryClient.invalidateQueries({ queryKey: ['friends', userId] })
            }, 15000)
          }
        }
      })

      channelRef.current = channel
    }, 200) // 200ms delay — enough for StrictMode cleanup to complete

    return () => {
      if (setupTimerRef.current) { clearTimeout(setupTimerRef.current); setupTimerRef.current = null }
      if (pollingRef.current) { clearInterval(pollingRef.current); pollingRef.current = null }
      const ch = channelRef.current
      channelRef.current = null
      if (ch) setTimeout(() => { try { supabase.removeChannel(ch) } catch { /* ignore */ } }, 50)
    }
  }, [user?.id, queryClient])
}
