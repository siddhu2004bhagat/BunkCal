import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, Trash2, BookOpen } from 'lucide-react'
import { AppShell } from '@/components/layout/AppShell'
import { PageTransition } from '@/components/motion/PageTransition'
import { StaggerContainer, StaggerItem } from '@/components/motion/FadeIn'
import { ProgressBar } from '@/components/ui/ProgressBar'
import { EmptyState } from '@/components/ui/EmptyState'
import { SubjectCardSkeleton } from '@/components/ui/Skeleton'
import { Button } from '@/components/ui/Button'
import { useAuthStore } from '@/store/authStore'
import { useUIStore } from '@/store/uiStore'
import { subjectsService } from '@/services/subjects'
import { getAttendancePct, getAttendanceStatus, getProgressColor, getStatusBg } from '@/utils/attendance'

export default function Subjects() {
  const { user } = useAuthStore()
  const { addToast } = useUIStore()
  const queryClient = useQueryClient()

  const { data: subjects = [], isLoading } = useQuery({
    queryKey: ['subjects', user?.id],
    queryFn: () => subjectsService.getSubjects(user!.id),
    enabled: !!user?.id,
  })

  const deleteMutation = useMutation({
    mutationFn: subjectsService.deleteSubject,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subjects'] })
      addToast({ type: 'success', message: 'Subject deleted' })
    },
    onError: () => addToast({ type: 'error', message: 'Failed to delete subject' }),
  })

  return (
    <AppShell>
      <PageTransition>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-[#091426]">Subjects</h1>
            <p className="text-sm text-[#45474c] mt-0.5">{subjects.length} subject{subjects.length !== 1 ? 's' : ''} tracked</p>
          </div>
          <Link to="/add-subject">
            <Button icon={<Plus size={16} />}>Add Subject</Button>
          </Link>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => <SubjectCardSkeleton key={i} />)}
          </div>
        ) : subjects.length === 0 ? (
          <EmptyState
            icon={<BookOpen size={28} />}
            title="No subjects yet"
            description="Add your first subject to start tracking attendance."
            action={
              <Link to="/add-subject">
                <Button icon={<Plus size={16} />}>Add Subject</Button>
              </Link>
            }
          />
        ) : (
          <StaggerContainer className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <AnimatePresence>
              {subjects.map((subject) => {
                const pct = getAttendancePct(subject.attended_classes, subject.total_classes)
                const status = getAttendanceStatus(pct, subject.attendance_goal)

                return (
                  <StaggerItem key={subject.id}>
                    <motion.div
                      layout
                      exit={{ opacity: 0, scale: 0.9 }}
                      className="bg-white border border-[#c5c6cd] rounded-xl p-6 ambient-shadow group"
                    >
                      <div className="flex justify-between items-start mb-4">
                        <div className="flex items-center gap-3">
                          <div
                            className="w-10 h-10 rounded-lg flex items-center justify-center text-white text-sm font-bold"
                            style={{ backgroundColor: subject.color || '#091426' }}
                          >
                            {subject.name[0]}
                          </div>
                          <div>
                            <h3 className="font-semibold text-[#091426] leading-tight">{subject.name}</h3>
                            <p className="text-xs text-[#75777d]">{subject.credits} credits</p>
                          </div>
                        </div>
                        <span className={`text-2xl font-bold ${
                          status === 'safe' ? 'text-[#24a375]' :
                          status === 'warning' ? 'text-amber-600' : 'text-[#ba1a1a]'
                        }`}>
                          {pct}%
                        </span>
                      </div>

                      <div className="mb-3">
                        <ProgressBar value={pct} color={getProgressColor(status)} height={4} />
                        <div className="flex justify-between mt-1.5">
                          <span className="text-xs text-[#75777d]">{subject.attended_classes}/{subject.total_classes} classes</span>
                          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${getStatusBg(status)}`}>
                            Goal: {subject.attendance_goal}%
                          </span>
                        </div>
                      </div>

                      <div className="flex gap-2 mt-4">
                        <Link to={`/subject/${subject.id}`} className="flex-1">
                          <motion.button
                            whileTap={{ scale: 0.97 }}
                            className="w-full bg-[#f2f4f6] text-[#091426] py-2 rounded text-xs font-semibold hover:bg-[#e6e8ea] transition-colors"
                          >
                            View Details
                          </motion.button>
                        </Link>
                        <motion.button
                          whileTap={{ scale: 0.97 }}
                          onClick={() => {
                            if (confirm(`Delete "${subject.name}"?`)) {
                              deleteMutation.mutate(subject.id)
                            }
                          }}
                          className="p-2 rounded text-[#ba1a1a] hover:bg-[#ffdad6] transition-colors"
                        >
                          <Trash2 size={16} />
                        </motion.button>
                      </div>
                    </motion.div>
                  </StaggerItem>
                )
              })}
            </AnimatePresence>
          </StaggerContainer>
        )}
      </PageTransition>
    </AppShell>
  )
}
