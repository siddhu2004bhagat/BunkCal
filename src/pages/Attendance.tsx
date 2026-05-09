import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import { CheckCircle, XCircle, ClipboardList, Clock } from 'lucide-react'
import { AppShell } from '@/components/layout/AppShell'
import { PageTransition } from '@/components/motion/PageTransition'
import { StaggerContainer, StaggerItem } from '@/components/motion/FadeIn'
import { Card } from '@/components/ui/Card'
import { ProgressBar } from '@/components/ui/ProgressBar'
import { EmptyState } from '@/components/ui/EmptyState'
import { useAuthStore } from '@/store/authStore'
import { useUIStore } from '@/store/uiStore'
import { subjectsService } from '@/services/subjects'
import { attendanceService } from '@/services/attendance'
import { getAttendancePct, getAttendanceStatus, getProgressColor } from '@/utils/attendance'

// Local date string YYYY-MM-DD (not UTC)
function getTodayLocal(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function getTimeUntilMidnight(): string {
  const now = new Date()
  const midnight = new Date()
  midnight.setHours(24, 0, 0, 0)
  const diff = midnight.getTime() - now.getTime()
  const h = Math.floor(diff / 3600000)
  const m = Math.floor((diff % 3600000) / 60000)
  return h > 0 ? `${h}h ${m}m` : `${m}m`
}

export default function Attendance() {
  const { user } = useAuthStore()
  const { addToast } = useUIStore()
  const queryClient = useQueryClient()
  const today = getTodayLocal()

  const { data: subjects = [] } = useQuery({
    queryKey: ['subjects', user?.id],
    queryFn: () => subjectsService.getSubjects(user!.id),
    enabled: !!user?.id,
  })

  const { data: records = [] } = useQuery({
    queryKey: ['attendance', user?.id, 'all'],
    queryFn: () => attendanceService.getRecords(user!.id),
    enabled: !!user?.id,
  })

  const markMutation = useMutation({
    mutationFn: async ({ subjectId, status }: { subjectId: string; status: 'present' | 'absent' }) => {
      // Guard: check not already marked
      const existing = records.find((r) => r.subject_id === subjectId && r.date === today)
      if (existing) throw new Error('Already marked for today')

      await attendanceService.addRecord({
        user_id: user!.id,
        subject_id: subjectId,
        date: today,
        status,
        notes: null,
      })
      return subjectsService.markAttendance(subjectId, status === 'present')
    },
    onMutate: async ({ subjectId, status }) => {
      await queryClient.cancelQueries({ queryKey: ['attendance', user?.id, 'all'] })
      const prev = queryClient.getQueryData(['attendance', user?.id, 'all'])
      // Optimistic update — add record immediately
      queryClient.setQueryData(['attendance', user?.id, 'all'], (old: typeof records = []) => [
        { id: `opt-${Date.now()}`, user_id: user!.id, subject_id: subjectId, date: today, status, notes: null, created_at: new Date().toISOString() },
        ...old,
      ])
      return { prev }
    },
    onError: (err: unknown, _, ctx) => {
      if (ctx?.prev) queryClient.setQueryData(['attendance', user?.id, 'all'], ctx.prev)
      const msg = err instanceof Error ? err.message : 'Failed'
      if (msg.includes('Already marked')) {
        addToast({ type: 'warning', message: 'Already marked for today' })
      } else {
        addToast({ type: 'error', message: msg })
      }
    },
    onSettled: (_, __, vars) => {
      queryClient.invalidateQueries({ queryKey: ['attendance', user?.id, 'all'] })
      queryClient.invalidateQueries({ queryKey: ['subjects', user?.id] })
      queryClient.invalidateQueries({ queryKey: ['subject', vars.subjectId] })
    },
    onSuccess: (_, vars) => {
      addToast({
        type: vars.status === 'present' ? 'success' : 'info',
        message: vars.status === 'present' ? '✅ Marked present' : '❌ Marked absent',
      })
    },
  })

  const todayRecords = records.filter((r) => r.date === today)
  const markedIds = new Set(todayRecords.map((r) => r.subject_id))
  const markedCount = todayRecords.length
  const presentCount = todayRecords.filter((r) => r.status === 'present').length
  const absentCount = todayRecords.filter((r) => r.status === 'absent').length

  return (
    <AppShell>
      <PageTransition>
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-[#091426]">Attendance</h1>
            <p className="text-sm text-[#45474c] mt-0.5">
              {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}
            </p>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-[#75777d] bg-[#f2f4f6] px-3 py-1.5 rounded-lg">
            <Clock size={12} />
            <span>Resets in {getTimeUntilMidnight()}</span>
          </div>
        </div>

        {/* Progress bar for today */}
        {subjects.length > 0 && (
          <div className="mb-5 bg-white border border-[#c5c6cd] rounded-xl p-4 ambient-shadow">
            <div className="flex justify-between items-center mb-2">
              <span className="text-xs font-semibold text-[#45474c] uppercase tracking-wider">Today's Progress</span>
              <span className="text-xs text-[#75777d]">{markedCount}/{subjects.length} marked</span>
            </div>
            <div className="w-full bg-[#e6e8ea] rounded-full h-2 overflow-hidden">
              <motion.div
                className="h-full bg-[#091426] rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${subjects.length > 0 ? (markedCount / subjects.length) * 100 : 0}%` }}
                transition={{ duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] }}
              />
            </div>
          </div>
        )}

        {subjects.length === 0 ? (
          <EmptyState
            icon={<ClipboardList size={28} />}
            title="No subjects"
            description="Add subjects first to track attendance."
          />
        ) : (
          <StaggerContainer className="space-y-3">
            {subjects.map((subject) => {
              const pct = getAttendancePct(subject.attended_classes, subject.total_classes)
              const status = getAttendanceStatus(pct, subject.attendance_goal)
              const isMarked = markedIds.has(subject.id)
              const todayRecord = todayRecords.find((r) => r.subject_id === subject.id)

              return (
                <StaggerItem key={subject.id}>
                  <Card padding="md">
                    <div className="flex items-center justify-between gap-3">
                      {/* Subject info */}
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div
                          className="w-10 h-10 rounded-lg flex items-center justify-center text-white text-sm font-bold shrink-0"
                          style={{ backgroundColor: subject.color || '#091426' }}
                        >
                          {subject.name[0]}
                        </div>
                        <div className="min-w-0 flex-1">
                          <h3 className="font-semibold text-[#091426] truncate text-sm">{subject.name}</h3>
                          <div className="flex items-center gap-2 mt-1">
                            <ProgressBar value={pct} color={getProgressColor(status)} height={3} className="w-20" />
                            <span className="text-xs text-[#75777d]">{pct}%</span>
                          </div>
                        </div>
                      </div>

                      {/* Mark buttons or status badge */}
                      <AnimatePresence mode="wait">
                        {isMarked ? (
                          <motion.span
                            key="badge"
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.8 }}
                            transition={{ duration: 0.2 }}
                            className={`text-xs font-semibold px-3 py-1.5 rounded-lg shrink-0 ${
                              todayRecord?.status === 'present'
                                ? 'bg-[#85f8c4] text-[#002114]'
                                : 'bg-[#ffdad6] text-[#93000a]'
                            }`}
                          >
                            {todayRecord?.status === 'present' ? '✓ Present' : '✗ Absent'}
                          </motion.span>
                        ) : (
                          <motion.div
                            key="buttons"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="flex items-center gap-2 shrink-0"
                          >
                            <motion.button
                              whileTap={{ scale: 0.88 }}
                              onClick={() => markMutation.mutate({ subjectId: subject.id, status: 'present' })}
                              disabled={markMutation.isPending}
                              className="p-2 rounded-lg bg-[#85f8c4] text-[#002114] hover:bg-[#68dba9] transition-colors disabled:opacity-40"
                              title="Present"
                            >
                              <CheckCircle size={18} />
                            </motion.button>
                            <motion.button
                              whileTap={{ scale: 0.88 }}
                              onClick={() => markMutation.mutate({ subjectId: subject.id, status: 'absent' })}
                              disabled={markMutation.isPending}
                              className="p-2 rounded-lg bg-[#ffdad6] text-[#93000a] hover:bg-[#ffb4ab] transition-colors disabled:opacity-40"
                              title="Absent"
                            >
                              <XCircle size={18} />
                            </motion.button>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </Card>
                </StaggerItem>
              )
            })}
          </StaggerContainer>
        )}

        {/* Daily summary */}
        <AnimatePresence>
          {markedCount > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 12 }}
              className="mt-5 bg-[#091426] text-white rounded-2xl p-5"
            >
              <p className="text-xs font-semibold text-[#8590a6] uppercase tracking-wider mb-3">Today's Summary</p>
              <div className="flex gap-6">
                <div>
                  <p className="text-3xl font-bold text-[#85f8c4]">{presentCount}</p>
                  <p className="text-xs text-[#8590a6] mt-0.5">Present</p>
                </div>
                <div>
                  <p className="text-3xl font-bold text-[#ffdad6]">{absentCount}</p>
                  <p className="text-xs text-[#8590a6] mt-0.5">Absent</p>
                </div>
                <div>
                  <p className="text-3xl font-bold text-[#bcc7de]">{subjects.length - markedCount}</p>
                  <p className="text-xs text-[#8590a6] mt-0.5">Pending</p>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </PageTransition>
    </AppShell>
  )
}
