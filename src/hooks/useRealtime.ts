import { useEffect, useRef } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/authStore'

// Check if Realtime is available by testing the connection once
let realtimeAvailable: boolean | null = null

async function checkRealtimeAvailable(): Promise<boolean> {
  if (realtimeAvailable !== null) return realtimeAvailable
  try {
    // Quick check: try to subscribe to a test channel with a 3s timeout
    const result = await Promise.race([
      new Promise<boolean>((resolve) => {
        const ch = supabase.channel('__ping__')
        ch.subscribe((status) => {
          supabase.removeChannel(ch)
          resolve(status === 'SUBSCRIBED')
        })
      }),
      new Promise<boolean>((resolve) => setTimeout(() => resolve(false), 3000)),
    ])
    realtimeAvailable = result
    return result
  } catch {
    realtimeAvailable = false
    return false
  }
}

export function useRealtime() {
  const { user } = useAuthStore()
  const queryClient = useQueryClient()
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null)

  useEffect(() => {
    if (!user?.id) return

    const userId = user.id
    let mounted = true

    const setup = async () => {
      const available = await checkRealtimeAvailable()

      if (!mounted) return

      if (!available) {
        // Realtime not available — use polling every 30s as fallback
        console.info('[Realtime] Not available, using polling fallback')
        const interval = setInterval(() => {
          queryClient.invalidateQueries({ queryKey: ['subjects', userId] })
          queryClient.invalidateQueries({ queryKey: ['attendance', userId] })
          queryClient.invalidateQueries({ queryKey: ['proxy-ledger', userId] })
        }, 30000)
        return () => clearInterval(interval)
      }

      // Realtime is available — subscribe
      const channel = supabase
        .channel(`bunkwise:${userId}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'subjects', filter: `user_id=eq.${userId}` },
          () => queryClient.invalidateQueries({ queryKey: ['subjects', userId] }))
        .on('postgres_changes', { event: '*', schema: 'public', table: 'attendance_records', filter: `user_id=eq.${userId}` },
          () => queryClient.invalidateQueries({ queryKey: ['attendance', userId] }))
        .on('postgres_changes', { event: '*', schema: 'public', table: 'proxy_ledger', filter: `user_id=eq.${userId}` },
          () => queryClient.invalidateQueries({ queryKey: ['proxy-ledger', userId] }))
        .on('postgres_changes', { event: '*', schema: 'public', table: 'proxy_transactions', filter: `user_id=eq.${userId}` },
          () => queryClient.invalidateQueries({ queryKey: ['proxy-transactions', userId] }))
        .on('postgres_changes', { event: '*', schema: 'public', table: 'timetable_entries', filter: `user_id=eq.${userId}` },
          () => queryClient.invalidateQueries({ queryKey: ['timetable', userId] }))
        .on('postgres_changes', { event: '*', schema: 'public', table: 'notifications', filter: `user_id=eq.${userId}` },
          () => queryClient.invalidateQueries({ queryKey: ['notifications', userId] }))
        // Friend requests — receiver sees new requests instantly
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'friend_requests', filter: `receiver_id=eq.${userId}` },
          () => {
            queryClient.invalidateQueries({ queryKey: ['friend-requests', userId] })
            queryClient.invalidateQueries({ queryKey: ['notifications', userId] })
          })
        // Friend requests — sender sees status updates (accepted/rejected)
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'friend_requests', filter: `sender_id=eq.${userId}` },
          () => {
            queryClient.invalidateQueries({ queryKey: ['sent-requests', userId] })
            queryClient.invalidateQueries({ queryKey: ['friends', userId] })
            queryClient.invalidateQueries({ queryKey: ['notifications', userId] })
          })
        // Friends table — both sides update when friendship is created
        .on('postgres_changes', { event: '*', schema: 'public', table: 'friends', filter: `user_id=eq.${userId}` },
          () => queryClient.invalidateQueries({ queryKey: ['friends', userId] }))
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'profiles', filter: `user_id=eq.${userId}` },
          (payload) => {
            if (payload.new) {
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              useAuthStore.getState().setProfile(payload.new as any)
            }
          })
        .subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            console.info('[Realtime] ✓ Connected')
          } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
            console.warn('[Realtime] Channel error — run enable_realtime.sql in Supabase SQL Editor')
            realtimeAvailable = false
          }
        })

      channelRef.current = channel
    }

    setup()

    return () => {
      mounted = false
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current)
        channelRef.current = null
      }
    }
  }, [user?.id, queryClient])
}
