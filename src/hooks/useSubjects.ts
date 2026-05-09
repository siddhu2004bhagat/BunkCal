import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuthStore } from '@/store/authStore'
import { subjectsService } from '@/services/subjects'
import { getAttendancePct, getAttendanceStatus } from '@/utils/attendance'
import { calculateBunks } from '@/services/calculator'
import type { Subject } from '@/types/database'

// Enriched subject with derived stats — computed once, used everywhere
export interface SubjectWithStats extends Subject {
  pct: number
  status: 'safe' | 'warning' | 'danger'
  canMiss: number
  mustAttend: number
}

function enrichSubject(s: Subject): SubjectWithStats {
  const pct = getAttendancePct(s.attended_classes, s.total_classes)
  const status = getAttendanceStatus(pct, s.attendance_goal)
  const { canMiss, mustAttend } = calculateBunks(s.attended_classes, s.total_classes, s.attendance_goal)
  return { ...s, pct, status, canMiss, mustAttend }
}

export function useSubjects() {
  const { user } = useAuthStore()
  return useQuery({
    queryKey: ['subjects', user?.id],
    queryFn: () => subjectsService.getSubjects(user!.id),
    enabled: !!user?.id,
    select: (data) => data.map(enrichSubject),
    staleTime: 1000 * 60 * 10,
  })
}

export function useSubject(id: string | undefined) {
  return useQuery({
    queryKey: ['subject', id],
    queryFn: () => subjectsService.getSubject(id!),
    enabled: !!id,
    select: (s) => s ? enrichSubject(s) : null,
  })
}

export function useDeleteSubject() {
  const queryClient = useQueryClient()
  const { user } = useAuthStore()
  return useMutation({
    mutationFn: subjectsService.deleteSubject,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subjects', user?.id] })
    },
  })
}

export function useCreateSubject() {
  const queryClient = useQueryClient()
  const { user } = useAuthStore()
  return useMutation({
    mutationFn: (subject: Omit<Subject, 'id' | 'user_id' | 'created_at' | 'updated_at'>) =>
      subjectsService.createSubject(user!.id, subject),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subjects', user?.id] })
    },
  })
}
