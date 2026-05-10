import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import { CheckCircle, XCircle, Edit, Trash2, CalendarCheck, Clock } from 'lucide-react'
import { useState } from 'react'
import { AppShell } from '@/components/layout/AppShell'
import { PageTransition } from '@/components/motion/PageTransition'
import { AnimatedCounter } from '@/components/motion/AnimatedCounter'
import { Card } from '@/components/ui/Card'
import { ProgressBar } from '@/components/ui/ProgressBar'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { Input } from '@/components/ui/Input'
import { Skeleton } from '@/components/ui/Skeleton'
import { useAuthStore } from '@/store/authStore'
import { useUIStore } from '@/store/uiStore'
import { subjectsService } from '@/services/subjects'
import { attendanceService } from '@/services/attendance'
import { getAttendancePct, getAttendanceStatus, getProgressColor, getStatusBg, SUBJECT_COLORS } from '@/utils/attendance'
import { calculateBunks } from '@/services/calculator'

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

export default function SubjectDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const { addToast } = useUIStore()
  const queryClient = useQueryClient()
  const today = getTodayLocal()

  // Edit modal state
  const [editOpen, setEditOpen] = useState(false)
  const [editForm, setEditForm] = useState({
    name: '',
    credits: 4,
    attendance_goal: 75,
    attended_classes: 0,
    total_classes: 0,
    notes: '',
    color: SUBJECT_COLORS[0],
  })

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

  const todayRecord = records.find((r) => r.date === today)
  const alreadyMarkedToday = !!todayRecord

  // Open edit modal pre-filled with current values
  const openEdit = () => {
    if (!subject) return
    setEditForm({
      name: subject.name,
      credits: subject.credits,
      attendance_goal: subject.attendance_goal,
      attended_classes: subject.attended_classes,
      total_classes: subject.total_classes,
      notes: subject.notes || '',
      color: subject.color || SUBJECT_COLORS[0],
    })
    setEditOpen(true)
  }

  const markMutation = useMutation({
    mutationFn: async ({ status }: { status: 'present' | 'absent' }) => {
      const existing = await attendanceService.getRecords(user!.id, id)
      if (existing.find((r) => r.date === today)) throw new Error('Already marked for today')
      await attendanceService.addRecord({ user_id: user!.id, subject_id: id!, date: today, status, notes: null })
      return subjectsService.markAttendance(id!, status === 'present')
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ['subject', id] })
      queryClient.invalidateQueries({ queryKey: ['subjects'] })
      queryClient.invalidateQueries({ queryKey: ['attendance', user?.id, id] })
      addToast({ type: vars.status === 'present' ? 'success' : 'info', message: vars.status === 'present' ? '✅ Marked present' : '❌ Marked absent' })
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : 'Failed'
      addToast({ type: msg.includes('Already') ? 'warning' : 'error', message: msg })
    },
  })

  const editMutation = useMutation({
    mutationFn: () => subjectsService.updateSubject(id!, {
      name: editForm.name,
      credits: Number(editForm.credits),
      attendance_goal: Number(editForm.attendance_goal),
      attended_classes: Number(editForm.attended_classes),
      total_classes: Number(editForm.total_classes),
      notes: editForm.notes || null,
      color: editForm.color,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subject', id] })
      queryClient.invalidateQueries({ queryKey: ['subjects'] })
      addToast({ type: 'success', message: 'Subject updated ✓' })
      setEditOpen(false)
    },
    onError: () => addToast({ type: 'error', message: 'Failed to update subject' }),
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
          <Skeleton className="h-48 rounded-2xl" />
          <div className="grid grid-cols-2 gap-4">
            <Skeleton className="h-24 rounded-xl" />
            <Skeleton className="h-24 rounded-xl" />
          </div>
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
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            className="bg-[#091426] text-white rounded-2xl p-6 relative overflow-hidden"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center text-white text-lg font-bold"
                style={{ backgroundColor: subject.color || '#1e293b' }}>
                {subject.name[0]}
              </div>
              <span className={`px-3 py-1 rounded-lg text-xs font-bold uppercase ${getStatusBg(status)}`}>{status}</span>
            </div>
            <h2 className="text-2xl font-bold text-white mb-1">{subject.name}</h2>
            <p className="text-[#8590a6] text-sm mb-6">{subject.credits} credits · Goal: {subject.attendance_goal}%</p>
            <div className="flex items-end gap-2 mb-4">
              <span className="text-5xl font-bold"><AnimatedCounter value={pct} suffix="%" /></span>
              <span className="text-[#8590a6] mb-2">attendance</span>
            </div>
            <ProgressBar value={pct} color={getProgressColor(status)} height={6} />
            <p className="text-xs text-[#8590a6] mt-2">{subject.attended_classes} of {subject.total_classes} classes attended</p>
            <div className="absolute right-[-5%] bottom-[-20%] w-48 h-48 bg-white opacity-5 rounded-full blur-3xl pointer-events-none" />
          </motion.div>

          {/* Stats */}
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

          {/* Today's Attendance */}
          <Card>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <CalendarCheck size={18} className="text-[#091426]" />
                <h3 className="font-semibold text-[#091426]">Today's Attendance</h3>
              </div>
              <span className="text-xs text-[#75777d] bg-[#f2f4f6] px-2 py-1 rounded-lg">
                {new Date().toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })}
              </span>
            </div>
            <AnimatePresence mode="wait">
              {alreadyMarkedToday ? (
                <motion.div key="marked" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
                  className={`rounded-xl p-4 flex items-center justify-between ${todayRecord.status === 'present' ? 'bg-[#f0fdf4] border border-[#85f8c4]' : 'bg-[#fff5f5] border border-[#ffdad6]'}`}
                >
                  <div className="flex items-center gap-3">
                    {todayRecord.status === 'present' ? <CheckCircle size={24} className="text-[#24a375]" /> : <XCircle size={24} className="text-[#ba1a1a]" />}
                    <div>
                      <p className={`font-semibold text-sm ${todayRecord.status === 'present' ? 'text-[#24a375]' : 'text-[#ba1a1a]'}`}>
                        {todayRecord.status === 'present' ? 'Present today' : 'Absent today'}
                      </p>
                      <p className="text-xs text-[#75777d]">Resets after midnight</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 text-xs text-[#75777d]">
                    <Clock size={12} /><span>{getTimeUntilMidnight()}</span>
                  </div>
                </motion.div>
              ) : (
                <motion.div key="unmarked" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}>
                  <div className="grid grid-cols-2 gap-3">
                    <motion.button whileTap={{ scale: 0.96 }} onClick={() => markMutation.mutate({ status: 'present' })}
                      disabled={markMutation.isPending}
                      className="flex items-center justify-center gap-2 bg-[#85f8c4] text-[#002114] py-3.5 rounded-xl font-semibold text-sm disabled:opacity-50">
                      <CheckCircle size={18} /> Present
                    </motion.button>
                    <motion.button whileTap={{ scale: 0.96 }} onClick={() => markMutation.mutate({ status: 'absent' })}
                      disabled={markMutation.isPending}
                      className="flex items-center justify-center gap-2 bg-[#ffdad6] text-[#93000a] py-3.5 rounded-xl font-semibold text-sm disabled:opacity-50">
                      <XCircle size={18} /> Absent
                    </motion.button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </Card>

          {/* Attendance History */}
          {records.length > 0 && (
            <Card>
              <h3 className="font-semibold text-[#091426] mb-4">Attendance History</h3>
              {records.slice(0, 10).map((record, i) => {
                const date = new Date(record.date + 'T00:00:00')
                return (
                  <motion.div key={record.id} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.04 }}
                    className="flex items-center justify-between py-2.5 border-b border-[#f2f4f6] last:border-0">
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${record.status === 'present' ? 'bg-[#24a375]' : record.status === 'proxy' ? 'bg-[#505f76]' : 'bg-[#ba1a1a]'}`} />
                      <span className="text-sm text-[#45474c]">
                        {record.date === today ? 'Today' : date.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })}
                      </span>
                    </div>
                    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${record.status === 'present' ? 'bg-[#85f8c4] text-[#002114]' : record.status === 'proxy' ? 'bg-[#d0e1fb] text-[#091426]' : 'bg-[#ffdad6] text-[#93000a]'}`}>
                      {record.status}
                    </span>
                  </motion.div>
                )
              })}
            </Card>
          )}

          {/* Actions */}
          <div className="flex gap-3 pb-4">
            <Button variant="secondary" icon={<Edit size={16} />} className="flex-1" onClick={openEdit}>
              Edit Subject
            </Button>
            <Button variant="danger" icon={<Trash2 size={16} />}
              onClick={() => {
                if (window.confirm(`Delete "${subject.name}"? This cannot be undone.`)) deleteMutation.mutate()
              }}
              loading={deleteMutation.isPending}
            >
              Delete
            </Button>
          </div>
        </div>

        {/* ── Edit Subject Modal ── */}
        <Modal open={editOpen} onClose={() => setEditOpen(false)} title="Edit Subject" size="md">
          <div className="space-y-4">
            <Input
              label="Subject Name"
              value={editForm.name}
              onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))}
              placeholder="e.g. Advanced Mathematics"
            />
            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Credits"
                type="number"
                value={editForm.credits}
                onChange={e => setEditForm(f => ({ ...f, credits: Number(e.target.value) }))}
              />
              <Input
                label="Required %"
                type="number"
                value={editForm.attendance_goal}
                onChange={e => setEditForm(f => ({ ...f, attendance_goal: Number(e.target.value) }))}
                suffix="%"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Classes Attended"
                type="number"
                value={editForm.attended_classes}
                onChange={e => setEditForm(f => ({ ...f, attended_classes: Number(e.target.value) }))}
              />
              <Input
                label="Total Classes"
                type="number"
                value={editForm.total_classes}
                onChange={e => setEditForm(f => ({ ...f, total_classes: Number(e.target.value) }))}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold tracking-wider uppercase text-[#45474c] mb-2">Color</label>
              <div className="flex gap-2 flex-wrap">
                {SUBJECT_COLORS.map(color => (
                  <motion.button key={color} type="button" whileTap={{ scale: 0.85 }}
                    onClick={() => setEditForm(f => ({ ...f, color }))}
                    className={`w-8 h-8 rounded-lg transition-all ${editForm.color === color ? 'ring-2 ring-offset-2 ring-[#091426] scale-110' : ''}`}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            </div>
            <Input
              label="Notes (optional)"
              value={editForm.notes}
              onChange={e => setEditForm(f => ({ ...f, notes: e.target.value }))}
              placeholder="Any notes..."
            />
            <div className="flex gap-3 pt-2">
              <Button variant="secondary" className="flex-1" onClick={() => setEditOpen(false)}>
                Cancel
              </Button>
              <Button
                className="flex-1"
                loading={editMutation.isPending}
                disabled={!editForm.name.trim()}
                onClick={() => editMutation.mutate()}
              >
                Save Changes
              </Button>
            </div>
          </div>
        </Modal>

      </PageTransition>
    </AppShell>
  )
}
