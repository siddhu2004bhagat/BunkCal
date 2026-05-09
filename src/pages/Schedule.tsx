import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { motion } from 'framer-motion'
import { Plus, Calendar, Clock } from 'lucide-react'
import { AppShell } from '@/components/layout/AppShell'
import { PageTransition } from '@/components/motion/PageTransition'
import { Card } from '@/components/ui/Card'
import { Modal } from '@/components/ui/Modal'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/EmptyState'
import { useAuthStore } from '@/store/authStore'
import { useUIStore } from '@/store/uiStore'
import { timetableService } from '@/services/timetable'
import { subjectsService } from '@/services/subjects'
import { DAYS, SHORT_DAYS } from '@/utils/attendance'

export default function Schedule() {
  const { user } = useAuthStore()
  const { addToast } = useUIStore()
  const queryClient = useQueryClient()
  const [selectedDay, setSelectedDay] = useState(new Date().getDay())
  const [addOpen, setAddOpen] = useState(false)
  const [form, setForm] = useState({ subject_id: '', day_of_week: selectedDay, start_time: '09:00', end_time: '10:00', room: '' })

  const { data: entries = [] } = useQuery({
    queryKey: ['timetable', user?.id],
    queryFn: () => timetableService.getEntries(user!.id),
    enabled: !!user?.id,
  })

  const { data: subjects = [] } = useQuery({
    queryKey: ['subjects', user?.id],
    queryFn: () => subjectsService.getSubjects(user!.id),
    enabled: !!user?.id,
  })

  const addMutation = useMutation({
    mutationFn: () =>
      timetableService.addEntry({
        user_id: user!.id,
        subject_id: form.subject_id,
        day_of_week: form.day_of_week,
        start_time: form.start_time,
        end_time: form.end_time,
        room: form.room || null,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['timetable'] })
      addToast({ type: 'success', message: 'Class added to schedule' })
      setAddOpen(false)
    },
    onError: () => addToast({ type: 'error', message: 'Failed to add class' }),
  })

  const deleteMutation = useMutation({
    mutationFn: timetableService.deleteEntry,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['timetable'] })
      addToast({ type: 'success', message: 'Class removed' })
    },
  })

  const dayEntries = entries
    .filter((e) => e.day_of_week === selectedDay)
    .sort((a, b) => a.start_time.localeCompare(b.start_time))

  const getSubject = (id: string) => subjects.find((s) => s.id === id)

  return (
    <AppShell>
      <PageTransition>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-[#091426]">Schedule</h1>
            <p className="text-sm text-[#45474c] mt-0.5">Your weekly timetable</p>
          </div>
          <Button icon={<Plus size={16} />} onClick={() => { setForm(f => ({ ...f, day_of_week: selectedDay })); setAddOpen(true) }}>
            Add Class
          </Button>
        </div>

        {/* Day Selector */}
        <div className="flex gap-2 mb-6 overflow-x-auto scrollbar-hide pb-1">
          {SHORT_DAYS.map((day, i) => (
            <motion.button
              key={day}
              whileTap={{ scale: 0.92 }}
              onClick={() => setSelectedDay(i)}
              className={`flex-shrink-0 flex flex-col items-center px-4 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                selectedDay === i
                  ? 'bg-[#091426] text-white'
                  : 'bg-white border border-[#c5c6cd] text-[#45474c] hover:bg-[#f2f4f6]'
              }`}
            >
              <span className="text-xs">{day}</span>
              {entries.filter((e) => e.day_of_week === i).length > 0 && (
                <span className={`w-1.5 h-1.5 rounded-full mt-1 ${selectedDay === i ? 'bg-[#85f8c4]' : 'bg-[#091426]'}`} />
              )}
            </motion.button>
          ))}
        </div>

        {/* Day Label */}
        <div className="flex items-center gap-2 mb-4">
          <Calendar size={16} className="text-[#45474c]" />
          <h2 className="font-semibold text-[#091426]">{DAYS[selectedDay]}</h2>
          <span className="text-xs text-[#75777d]">· {dayEntries.length} class{dayEntries.length !== 1 ? 'es' : ''}</span>
        </div>

        {dayEntries.length === 0 ? (
          <EmptyState
            icon={<Calendar size={28} />}
            title="No classes today"
            description="Add classes to build your timetable."
            action={
              <Button icon={<Plus size={16} />} onClick={() => setAddOpen(true)}>
                Add Class
              </Button>
            }
          />
        ) : (
          <div className="space-y-3">
            {dayEntries.map((entry, i) => {
              const subject = getSubject(entry.subject_id)
              return (
                <motion.div
                  key={entry.id}
                  initial={{ opacity: 0, x: -16 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.06 }}
                  className="flex items-center gap-4 bg-white border border-[#c5c6cd] rounded-xl p-4 ambient-shadow"
                >
                  <div className="flex flex-col items-center text-xs text-[#75777d] w-14 shrink-0">
                    <span className="font-semibold text-[#091426]">{entry.start_time}</span>
                    <div className="w-px h-4 bg-[#c5c6cd] my-1" />
                    <span>{entry.end_time}</span>
                  </div>
                  <div
                    className="w-1 h-12 rounded-full shrink-0"
                    style={{ backgroundColor: subject?.color || '#091426' }}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-[#091426] truncate">{subject?.name || 'Unknown Subject'}</p>
                    <div className="flex items-center gap-3 mt-0.5">
                      <span className="flex items-center gap-1 text-xs text-[#75777d]">
                        <Clock size={11} />
                        {entry.start_time} – {entry.end_time}
                      </span>
                      {entry.room && (
                        <span className="text-xs text-[#75777d]">Room {entry.room}</span>
                      )}
                    </div>
                  </div>
                  <motion.button
                    whileTap={{ scale: 0.9 }}
                    onClick={() => deleteMutation.mutate(entry.id)}
                    className="p-1.5 rounded-lg text-[#75777d] hover:bg-[#ffdad6] hover:text-[#ba1a1a] transition-colors"
                  >
                    ×
                  </motion.button>
                </motion.div>
              )
            })}
          </div>
        )}

        {/* Add Class Modal */}
        <Modal open={addOpen} onClose={() => setAddOpen(false)} title="Add Class">
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold tracking-wider uppercase text-[#45474c] mb-2">Subject</label>
              <select
                value={form.subject_id}
                onChange={(e) => setForm(f => ({ ...f, subject_id: e.target.value }))}
                className="w-full border border-[#c5c6cd] rounded px-3 py-2.5 text-sm bg-white focus:outline-none focus:border-[#091426]"
              >
                <option value="">Select subject...</option>
                {subjects.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold tracking-wider uppercase text-[#45474c] mb-2">Day</label>
              <select
                value={form.day_of_week}
                onChange={(e) => setForm(f => ({ ...f, day_of_week: Number(e.target.value) }))}
                className="w-full border border-[#c5c6cd] rounded px-3 py-2.5 text-sm bg-white focus:outline-none focus:border-[#091426]"
              >
                {DAYS.map((d, i) => <option key={d} value={i}>{d}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Input label="Start Time" type="time" value={form.start_time} onChange={(e) => setForm(f => ({ ...f, start_time: e.target.value }))} />
              <Input label="End Time" type="time" value={form.end_time} onChange={(e) => setForm(f => ({ ...f, end_time: e.target.value }))} />
            </div>
            <Input label="Room (optional)" placeholder="e.g. LH-301" value={form.room} onChange={(e) => setForm(f => ({ ...f, room: e.target.value }))} />
            <Button
              className="w-full"
              onClick={() => addMutation.mutate()}
              loading={addMutation.isPending}
              disabled={!form.subject_id}
            >
              Add to Schedule
            </Button>
          </div>
        </Modal>
      </PageTransition>
    </AppShell>
  )
}
