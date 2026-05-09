import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { motion } from 'framer-motion'
import { CheckCircle, XCircle, ClipboardList } from 'lucide-react'
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

export default function Attendance() {
  const { user } = useAuthStore()
  const { addToast } = useUIStore()
  const queryClient = useQueryClient()
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0])

  const { data: subjects = [] } = useQuery({
    queryKey: ['subjects', user?.id],
    queryFn: () => subjectsService.getSubjects(user!.id),
    enabled: !!user?.id,
  })

  const { data: records = [] } = useQuery({
    queryKey: ['attendance', user?.id],
    queryFn: () => attendanceService.getRecords(user!.id),
    enabled: !!user?.id,
  })

  const markMutation = useMutation({
    mutationFn: ({ subjectId, status }: { subjectId: string; status: 'present' | 'absent' | 'proxy' }) =>
      attendanceService.addRecord({
        user_id: user!.id,
        subject_id: subjectId,
        date: selectedDate,
        status,
        notes: null,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attendance'] })
      queryClient.invalidateQueries({ queryKey: ['subjects'] })
      addToast({ type: 'success', message: 'Attendance recorded' })
    },
    onError: () => addToast({ type: 'error', message: 'Failed to record attendance' }),
  })

  const todayRecords = records.filter((r) => r.date === selectedDate)
  const markedSubjectIds = new Set(todayRecords.map((r) => r.subject_id))

  return (
    <AppShell>
      <PageTransition>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-[#091426]">Attendance</h1>
            <p className="text-sm text-[#45474c] mt-0.5">Mark and track your daily attendance</p>
          </div>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="text-sm border border-[#c5c6cd] rounded-lg px-3 py-2 bg-white focus:outline-none focus:border-[#091426]"
          />
        </div>

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
              const isMarked = markedSubjectIds.has(subject.id)
              const todayRecord = todayRecords.find((r) => r.subject_id === subject.id)

              return (
                <StaggerItem key={subject.id}>
                  <Card padding="md">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div
                          className="w-10 h-10 rounded-lg flex items-center justify-center text-white text-sm font-bold shrink-0"
                          style={{ backgroundColor: subject.color || '#091426' }}
                        >
                          {subject.name[0]}
                        </div>
                        <div className="min-w-0 flex-1">
                          <h3 className="font-semibold text-[#091426] truncate">{subject.name}</h3>
                          <div className="flex items-center gap-2 mt-1">
                            <ProgressBar value={pct} color={getProgressColor(status)} height={3} className="w-24" />
                            <span className="text-xs text-[#75777d]">{pct}%</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 ml-3">
                        {isMarked ? (
                          <span className={`text-xs font-semibold px-3 py-1.5 rounded-lg ${
                            todayRecord?.status === 'present' ? 'bg-[#85f8c4] text-[#002114]' :
                            todayRecord?.status === 'proxy' ? 'bg-[#d0e1fb] text-[#091426]' :
                            'bg-[#ffdad6] text-[#93000a]'
                          }`}>
                            {todayRecord?.status}
                          </span>
                        ) : (
                          <>
                            <motion.button
                              whileTap={{ scale: 0.9 }}
                              onClick={() => markMutation.mutate({ subjectId: subject.id, status: 'present' })}
                              className="p-2 rounded-lg bg-[#85f8c4] text-[#002114] hover:bg-[#68dba9] transition-colors"
                              title="Present"
                            >
                              <CheckCircle size={18} />
                            </motion.button>
                            <motion.button
                              whileTap={{ scale: 0.9 }}
                              onClick={() => markMutation.mutate({ subjectId: subject.id, status: 'absent' })}
                              className="p-2 rounded-lg bg-[#ffdad6] text-[#93000a] hover:bg-[#ffb4ab] transition-colors"
                              title="Absent"
                            >
                              <XCircle size={18} />
                            </motion.button>
                          </>
                        )}
                      </div>
                    </div>
                  </Card>
                </StaggerItem>
              )
            })}
          </StaggerContainer>
        )}

        {/* Summary */}
        {todayRecords.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-6 bg-[#091426] text-white rounded-xl p-4"
          >
            <p className="text-sm font-semibold mb-2">Today's Summary</p>
            <div className="flex gap-4">
              <div>
                <p className="text-2xl font-bold text-[#85f8c4]">
                  {todayRecords.filter((r) => r.status === 'present').length}
                </p>
                <p className="text-xs text-[#8590a6]">Present</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-[#ffdad6]">
                  {todayRecords.filter((r) => r.status === 'absent').length}
                </p>
                <p className="text-xs text-[#8590a6]">Absent</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-[#d0e1fb]">
                  {todayRecords.filter((r) => r.status === 'proxy').length}
                </p>
                <p className="text-xs text-[#8590a6]">Proxy</p>
              </div>
            </div>
          </motion.div>
        )}
      </PageTransition>
    </AppShell>
  )
}
