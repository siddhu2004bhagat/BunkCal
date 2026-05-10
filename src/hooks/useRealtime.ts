import { useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/authStore'

/**
 * Subscribes to Supabase Realtime for the current user's tables.
 * When any row changes, the relevant React Query cache is invalidated
 * and refetched instantly — no polling needed.
 */
export function useRealtime() {
  const { user } = useAuthStore()
  const queryClient = useQueryClient()

  useEffect(() => {
    if (!user?.id) return

    const userId = user.id

    // Single channel for all user-scoped tables
    const channel = supabase
      .channel(`realtime:${userId}`)

      // Subjects
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'subjects',
        filter: `user_id=eq.${userId}`,
      }, () => {
        queryClient.invalidateQueries({ queryKey: ['subjects', userId] })
      })

      // Attendance records
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'attendance_records',
        filter: `user_id=eq.${userId}`,
      }, () => {
        queryClient.invalidateQueries({ queryKey: ['attendance', userId] })
      })

      // Proxy ledger
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'proxy_ledger',
        filter: `user_id=eq.${userId}`,
      }, () => {
        queryClient.invalidateQueries({ queryKey: ['proxy-ledger', userId] })
      })

      // Proxy transactions
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'proxy_transactions',
        filter: `user_id=eq.${userId}`,
      }, () => {
        queryClient.invalidateQueries({ queryKey: ['proxy-transactions', userId] })
      })

      // Timetable
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'timetable_entries',
        filter: `user_id=eq.${userId}`,
      }, () => {
        queryClient.invalidateQueries({ queryKey: ['timetable', userId] })
      })

      // Notifications
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${userId}`,
      }, () => {
        queryClient.invalidateQueries({ queryKey: ['notifications', userId] })
      })

      // Profile
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'profiles',
        filter: `user_id=eq.${userId}`,
      }, (payload) => {
        // Update profile in auth store directly — no extra fetch needed
        const { setProfile } = useAuthStore.getState()
        if (payload.new) setProfile(payload.new as Parameters<typeof setProfile>[0])
      })

      .subscribe((status) => {
        console.log('[Realtime]', status)
      })

    return () => {
      supabase.removeChannel(channel)
    }
  }, [user?.id, queryClient])
}
