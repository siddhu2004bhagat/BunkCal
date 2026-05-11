import { useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useAuthStore } from '@/store/authStore'

/**
 * Polling-based data sync — safe fallback until Supabase Realtime tables are enabled.
 * Refreshes key queries every 20 seconds.
 * To enable true Realtime, run supabase/enable_realtime.sql in your Supabase SQL Editor.
 */
export function useRealtime() {
  const { user } = useAuthStore()
  const queryClient = useQueryClient()

  useEffect(() => {
    if (!user?.id) return
    const userId = user.id

    const interval = setInterval(() => {
      queryClient.invalidateQueries({ queryKey: ['subjects', userId] })
      queryClient.invalidateQueries({ queryKey: ['attendance', userId] })
      queryClient.invalidateQueries({ queryKey: ['proxy-ledger', userId] })
      queryClient.invalidateQueries({ queryKey: ['notifications', userId] })
      queryClient.invalidateQueries({ queryKey: ['friend-requests', userId] })
    }, 20000)

    return () => clearInterval(interval)
  }, [user?.id, queryClient])
}
