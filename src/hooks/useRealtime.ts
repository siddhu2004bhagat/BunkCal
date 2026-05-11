import { useEffect, useRef } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/authStore'

/**
 * Supabase Realtime subscription.
 * Uses postgres_changes for instant updates — no polling needed.
 * 
 * REQUIRED: Run supabase/enable_realtime.sql in Supabase SQL Editor first.
 * If Realtime isn't enabled, falls back to 15s polling automatically.
 */
export function useRealtime() {
  const { user } = useAuthStore()
  const queryClient = useQueryClient()
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null)
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    if (!user?.id) return
    const userId = user.id

    // Clean up any existing channel/polling
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current)
      channelRef.current = null
    }
    if (pollingRef.current) {
      clearInterval(pollingRef.current)
      pollingRef.current = null
    }

    // Build all listeners BEFORE calling subscribe
    const channel = supabase.channel(`bw_${userId}_${Date.now()}`)

    // Add all postgres_changes listeners
    const tables = [
      { table: 'subjects',          key: ['subjects', userId],          filter: `user_id=eq.${userId}` },
      { table: 'attendance_records', key: ['attendance', userId],        filter: `user_id=eq.${userId}` },
      { table: 'proxy_ledger',       key: ['proxy-ledger', userId],      filter: `user_id=eq.${userId}` },
      { table: 'proxy_transactions', key: ['proxy-transactions', userId], filter: `user_id=eq.${userId}` },
      { table: 'timetable_entries',  key: ['timetable', userId],         filter: `user_id=eq.${userId}` },
      { table: 'notifications',      key: ['notifications', userId],     filter: `user_id=eq.${userId}` },
    ]

    for (const { table, key, filter } of tables) {
      channel.on(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        'postgres_changes' as any,
        { event: '*', schema: 'public', table, filter },
        () => queryClient.invalidateQueries({ queryKey: key })
      )
    }

    // Friend requests — receiver side (filter by receiver_id)
    channel.on(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      'postgres_changes' as any,
      { event: 'INSERT', schema: 'public', table: 'friend_requests', filter: `receiver_id=eq.${userId}` },
      () => {
        queryClient.invalidateQueries({ queryKey: ['friend-requests', userId] })
        queryClient.invalidateQueries({ queryKey: ['notifications', userId] })
      }
    )

    // Friend requests — sender side (status updates)
    channel.on(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      'postgres_changes' as any,
      { event: 'UPDATE', schema: 'public', table: 'friend_requests', filter: `sender_id=eq.${userId}` },
      () => {
        queryClient.invalidateQueries({ queryKey: ['sent-requests', userId] })
        queryClient.invalidateQueries({ queryKey: ['friends', userId] })
        queryClient.invalidateQueries({ queryKey: ['notifications', userId] })
      }
    )

    // Friends table
    channel.on(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      'postgres_changes' as any,
      { event: '*', schema: 'public', table: 'friends', filter: `user_id=eq.${userId}` },
      () => queryClient.invalidateQueries({ queryKey: ['friends', userId] })
    )

    // Profile updates
    channel.on(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      'postgres_changes' as any,
      { event: 'UPDATE', schema: 'public', table: 'profiles', filter: `user_id=eq.${userId}` },
      (payload: { new: unknown }) => {
        if (payload.new) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          useAuthStore.getState().setProfile(payload.new as any)
        }
      }
    )

    // NOW subscribe — after all listeners are added
    channel.subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        console.info('[Realtime] ✓ Connected — live updates active')
        // Clear polling if Realtime works
        if (pollingRef.current) {
          clearInterval(pollingRef.current)
          pollingRef.current = null
        }
      } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
        console.warn('[Realtime] Not available — falling back to 15s polling')
        // Start polling as fallback
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

    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current)
        pollingRef.current = null
      }
      const ch = channelRef.current
      channelRef.current = null
      if (ch) {
        setTimeout(() => {
          try { supabase.removeChannel(ch) } catch { /* ignore */ }
        }, 100)
      }
    }
  }, [user?.id, queryClient])
}
