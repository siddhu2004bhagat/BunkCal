import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { CheckCircle, XCircle, Edit, Trash2 } from 'lucide-react'
import { AppShell } from '@/components/layout/AppShell'
import { PageTransition } from '@/components/motion/PageTransition'
import { AnimatedCounter } from '@/components/motion/AnimatedCounter'
import { Card } from '@/components/ui/Card'
import { ProgressBar } from '@/components/ui/ProgressBar'
import { Button } from '@/components/ui/Button'
import { Skeleton } from '@/components/ui/Skeleton'
import { useAuthStore } from '@/store/authStore'
import { useUIStore } from '@/store/uiStore'
import { subjectsService } from '@/services/subjects'
import { attendanceService } from '@/services/attendance'
import { getAttendancePct, getAttendanceStatus, getProgressColor, getStatusBg } from '@/utils/attendance'
import { calculateBunks } from '@/services/calculator'

export default function SubjectDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const { addToast } = useUIStore()
  const queryClient = useQueryClient()

  const { data: subject, isLoading } = useQuery({
    queryKey: ['subject', id],
    queryFn: () => subjectsService.getSubject(id!),
    enabled: !!id,
  })

  const { data: records = [] } = useQuery({
    queryKey: ['attendance', user?.id, id],
    queryFn: () => attendanceService.getRecords(user!.id, id),
    enabled: !!user?.id && !!id,
  })

  const markMutation = useMutation({
    mutationFn: ({ attended }: { attended: boolean }) =>
      subjectsService.markAttendance(id!, attended),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subject', id] })
      queryClient.invalidateQueries({ queryKey: ['subjects'] })
      addToast({ type: 'success', message: 'Attendance updated' })
    },
    onError: () => addToast({ type: 'error', message: 'Failed to update attendance' }),
  })

  const deleteMutation = useMutation({
    mutationFn: () => subjectsService.deleteSubject(id!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subjects'] })
      addToast({ type: 'success', message: 'Subject deleted' })
      navigate('/subjects')
    },
  })

  if (isLoading) {
    return (
      <AppShell showBack>
        <div className="space-y-4">
          <Skeleton className="h-40 rounded-xl" />
          <Skeleton className="h-32 rounded-xl" />
        </div>
      </AppShell>
    )
  }

  if (!subject) return null

  const pct = getAttendancePct(subject.attended_classes, subject.total_classes)
  const status = getAttendanceStatus(pct, subject.attendance_goal)
  const { canMiss, mustAttend } = calculateBunks(subject.attended_classes, subject.total_classes, subject.attendance_goal)

  return (
    <AppShell showBack title={subject.name}>
      <PageTransition>
        <div className="space-y-4 max-w-2xl mx-auto">
          {/* Hero Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-[#091426] text-white rounded-2xl p-6 relative overflow-hidden"
          >
            <div className="flex items-start justify-between mb-4">
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center text-white text-lg font-bold"
                style={{ backgroundColor: subject.color || '#1e293b' }}
              >
                {subject.name[0]}
              </div>
              <span className={`px-3 py-1 rounded-lg text-xs font-bold uppercase ${getStatusBg(status)}`}>
                {status}
              </span>
            </div>
            <h2 className="text-2xl font-bold text-white mb-1">{subject.name}</h2>
            <p className="text-[#8590a6] text-sm mb-6">{subject.credits} credits · Goal: {subject.attendance_goal}%</p>

            <div className="flex items-end gap-2 mb-4">
              <span className="text-5xl font-bold">
                <AnimatedCounter value={pct} suffix="%" />
              </span>
              <span className="text-[#8590a6] mb-2">attendance</span>
            </div>

            <ProgressBar value={pct} color={getProgressColor(status)} height={6} />
            <p className="text-xs text-[#8590a6] mt-2">{subject.attended_classes} of {subject.total_classes} classes attended</p>

            <div className="absolute right-[-5%] bottom-[-20%] w-48 h-48 bg-white opacity-5 rounded-full blur-3xl pointer-events-none" />
          </motion.div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 gap-4">
            <Card padding="md">
              <p className="text-xs font-semibold text-[#45474c] uppercase tracking-wider mb-1">Can Miss</p>
              <p className="text-3xl font-bold text-[#24a375]">{canMiss}</p>
              <p className="text-xs text-[#75777d]">more classes</p>
            </Card>
            <Card padding="md">
              <p className="text-xs font-semibold text-[#45474c] uppercase tracking-wider mb-1">Must Attend</p>
              <p className={`text-3xl font-bold ${mustAttend > 0 ? 'text-[#ba1a1a]' : 'text-[#24a375]'}`}>{mustAttend}</p>
              <p className="text-xs text-[#75777d]">to reach goal</p>
            </Card>
          </div>

          {/* Mark Attendance */}
          <Card>
            <h3 className="font-semibold text-[#091426] mb-4">Mark Today's Attendance</h3>
            <div className="grid grid-cols-2 gap-3">
              <motion.button
                whileTap={{ scale: 0.96 }}
                onClick={() => markMutation.mutate({ attended: true })}
                disabled={markMutation.isPending}
                className="flex items-center justify-center gap-2 bg-[#85f8c4] text-[#002114] py-3 rounded-lg font-semibold text-sm hover:bg-[#68dba9] transition-colors disabled:opacity-50"
              >
                <CheckCircle size={18} />
                Present
              </motion.button>
              <motion.button
                whileTap={{ scale: 0.96 }}
                onClick={() => markMutation.mutate({ attended: false })}
                disabled={markMutation.isPending}
                className="flex items-center justify-center gap-2 bg-[#ffdad6] text-[#93000a] py-3 rounded-lg font-semibold text-sm hover:bg-[#ffb4ab] transition-colors disabled:opacity-50"
              >
                <XCircle size={18} />
                Absent
              </motion.button>
            </div>
          </Card>

          {/* Recent Records */}
          {records.length > 0 && (
            <Card>
              <h3 className="font-semibold text-[#091426] mb-4">Recent Records</h3>
              <div className="space-y-2">
                {records.slice(0, 5).map((record) => (
                  <div key={record.id} className="flex items-center justify-between py-2 border-b border-[#f2f4f6] last:border-0">
                    <span className="text-sm text-[#45474c]">{new Date(record.date).toLocaleDateString()}</span>
                    <span className={`text-xs font-semibold px-2 py-1 rounded-full ${
                      record.status === 'present' ? 'bg-[#85f8c4] text-[#002114]' :
                      record.status === 'proxy' ? 'bg-[#d0e1fb] text-[#091426]' :
                      'bg-[#ffdad6] text-[#93000a]'
                    }`}>
                      {record.status}
                    </span>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Actions */}
          <div className="flex gap-3">
            <Button variant="secondary" icon={<Edit size={16} />} className="flex-1">
              Edit Subject
            </Button>
            <Button
              variant="danger"
              icon={<Trash2 size={16} />}
              onClick={() => {
                if (confirm('Delete this subject?')) deleteMutation.mutate()
              }}
              loading={deleteMutation.isPending}
            >
              Delete
            </Button>
          </div>
        </div>
      </PageTransition>
    </AppShell>
  )
}
