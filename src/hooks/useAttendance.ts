import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuthStore } from '@/store/authStore'
import { attendanceService } from '@/services/attendance'
import { subjectsService } from '@/services/subjects'
import type { AttendanceRecord } from '@/types/database'

function getTodayLocal(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export function useAttendanceRecords(subjectId?: string) {
  const { user } = useAuthStore()
  return useQuery({
    queryKey: ['attendance', user?.id, subjectId ?? 'all'],
    queryFn: () => attendanceService.getRecords(user!.id, subjectId),
    enabled: !!user?.id,
    staleTime: 1000 * 60 * 5,
  })
}

export function useTodayAttendance() {
  const { user } = useAuthStore()
  const today = getTodayLocal()
  return useQuery({
    queryKey: ['attendance', user?.id, 'all'],
    queryFn: () => attendanceService.getRecords(user!.id),
    enabled: !!user?.id,
    select: (records) => records.filter((r) => r.date === today),
    staleTime: 1000 * 60 * 2,
  })
}

export function useMarkAttendance() {
  const { user } = useAuthStore()
  const queryClient = useQueryClient()
  const today = getTodayLocal()

  return useMutation({
    mutationFn: async ({
      subjectId,
      status,
    }: {
      subjectId: string
      status: 'present' | 'absent'
    }) => {
      // Check for duplicate
      const existing = queryClient.getQueryData<AttendanceRecord[]>(
        ['attendance', user?.id, 'all']
      )
      if (existing?.find((r) => r.subject_id === subjectId && r.date === today)) {
        throw new Error('Already marked for today')
      }

      await attendanceService.addRecord({
        user_id: user!.id,
        subject_id: subjectId,
        date: today,
        status,
        notes: null,
      })
      return subjectsService.markAttendance(subjectId, status === 'present')
    },

    // ─── Optimistic update ────────────────────────────────────────────────
    onMutate: async ({ subjectId, status }) => {
      // Cancel in-flight queries
      await queryClient.cancelQueries({ queryKey: ['attendance', user?.id, 'all'] })
      await queryClient.cancelQueries({ queryKey: ['subjects', user?.id] })

      // Snapshot previous state for rollback
      const prevAttendance = queryClient.getQueryData<AttendanceRecord[]>(
        ['attendance', user?.id, 'all']
      )

      // Optimistically add the record to cache
      const optimisticRecord: AttendanceRecord = {
        id: `optimistic-${Date.now()}`,
        user_id: user!.id,
        subject_id: subjectId,
        date: today,
        status,
        notes: null,
        created_at: new Date().toISOString(),
      }

      queryClient.setQueryData<AttendanceRecord[]>(
        ['attendance', user?.id, 'all'],
        (old = []) => [optimisticRecord, ...old]
      )

      return { prevAttendance }
    },

    onError: (err, _, ctx) => {
      // Roll back on error
      if (ctx?.prevAttendance) {
        queryClient.setQueryData(
          ['attendance', user?.id, 'all'],
          ctx.prevAttendance
        )
      }
    },

    onSettled: (_, __, vars) => {
      // Always refetch to sync with server
      queryClient.invalidateQueries({ queryKey: ['attendance', user?.id, 'all'] })
      queryClient.invalidateQueries({ queryKey: ['attendance', user?.id, vars.subjectId] })
      queryClient.invalidateQueries({ queryKey: ['subjects', user?.id] })
      queryClient.invalidateQueries({ queryKey: ['subject', vars.subjectId] })
    },
  })
}
