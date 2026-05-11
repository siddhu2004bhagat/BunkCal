import { useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useAuthStore } from '@/store/authStore'
import { realtimeManager } from '@/lib/realtimeManager'

/**
 * Connects the singleton RealtimeManager and wires its events to React Query.
 * The manager lives outside React — immune to StrictMode double-mount crashes.
 */
export function useRealtime() {
  const { user } = useAuthStore()
  const queryClient = useQueryClient()

  useEffect(() => {
    if (!user?.id) return
    const userId = user.id

    // Connect the singleton (no-op if already connected for this user)
    realtimeManager.connect(userId)

    // Wire realtime events → React Query invalidations
    const unsubs = [
      realtimeManager.on('subjects',           () => queryClient.invalidateQueries({ queryKey: ['subjects', userId] })),
      realtimeManager.on('attendance',         () => queryClient.invalidateQueries({ queryKey: ['attendance', userId] })),
      realtimeManager.on('proxy-ledger',       () => queryClient.invalidateQueries({ queryKey: ['proxy-ledger', userId] })),
      realtimeManager.on('proxy-transactions', () => queryClient.invalidateQueries({ queryKey: ['proxy-transactions', userId] })),
      realtimeManager.on('timetable',          () => queryClient.invalidateQueries({ queryKey: ['timetable', userId] })),
      realtimeManager.on('notifications',      () => queryClient.invalidateQueries({ queryKey: ['notifications', userId] })),
      realtimeManager.on('friend-requests',    () => queryClient.invalidateQueries({ queryKey: ['friend-requests', userId] })),
      realtimeManager.on('sent-requests',      () => queryClient.invalidateQueries({ queryKey: ['sent-requests', userId] })),
      realtimeManager.on('friends',            () => queryClient.invalidateQueries({ queryKey: ['friends', userId] })),
    ]

    // Fallback polling every 15s (in case Realtime tables aren't enabled yet)
    const poll = setInterval(() => {
      queryClient.invalidateQueries({ queryKey: ['notifications', userId] })
      queryClient.invalidateQueries({ queryKey: ['friend-requests', userId] })
      queryClient.invalidateQueries({ queryKey: ['proxy-ledger', userId] })
    }, 15000)

    return () => {
      unsubs.forEach(fn => fn())
      clearInterval(poll)
      // Don't disconnect the manager — it should stay alive across page navigations
    }
  }, [user?.id, queryClient])
}
