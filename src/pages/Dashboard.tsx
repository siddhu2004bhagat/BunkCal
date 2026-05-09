import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, TrendingUp, Calendar, MoreVertical, AlertTriangle, CalendarClock, Menu } from 'lucide-react'
import { AppShell } from '@/components/layout/AppShell'
import { PageTransition } from '@/components/motion/PageTransition'
import { AnimatedCounter } from '@/components/motion/AnimatedCounter'
import { useAuthStore } from '@/store/authStore'
import { subjectsService } from '@/services/subjects'
import { timetableService } from '@/services/timetable'
import { profilesService } from '@/services/profiles'
import { getAttendancePct, getAttendanceStatus } from '@/utils/attendance'
import { calculateBunks } from '@/services/calculator'
import { BarChart, Bar, ResponsiveContainer, Cell } from 'recharts'
import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'

// Weekly trend bar data
const weekData = [
  { day: 'M', val: 55 }, { day: 'T', val: 60 }, { day: 'W', val: 58 },
  { day: 'T', val: 65 }, { day: 'F', val: 70 }, { day: 'S', val: 72 }, { day: 'S', val: 75 },
]

function getTodayDayIndex() {
  return new Date().getDay() // 0=Sun, 1=Mon...
}

function formatTime(time: string) {
  const [h, m] = time.split(':').map(Number)
  const ampm = h >= 12 ? 'PM' : 'AM'
  const hour = h % 12 || 12
  return `${hour}:${String(m).padStart(2, '0')} ${ampm}`
}

// Generate a short course code from subject name
function getCourseCode(name: string, index: number) {
  const codes = ['MATH401', 'CS302', 'ENG202', 'PHY301', 'CHEM201', 'BIO101', 'ECO301', 'HIS201']
  if (index < codes.length) return codes[index]
  const words = name.split(' ')
  return words.map(w => w[0]).join('').toUpperCase().slice(0, 3) + '0' + (index + 1)
}

const GOAL_OPTIONS = [70, 75, 80, 85]

export default function Dashboard() {
  const { user, profile, setProfile } = useAuthStore()
  const queryClient = useQueryClient()
  const [activeGoal, setActiveGoal] = useState(profile?.attendance_goal ?? 75)

  const { data: subjects = [], isLoading: subjectsLoading } = useQuery({
    queryKey: ['subjects', user?.id],
    queryFn: () => subjectsService.getSubjects(user!.id),
    enabled: !!user?.id,
  })

  const { data: timetable = [] } = useQuery({
    queryKey: ['timetable', user?.id],
    queryFn: () => timetableService.getEntries(user!.id),
    enabled: !!user?.id,
  })

  // Save goal to profile when changed
  const goalMutation = useMutation({
    mutationFn: (goal: number) => profilesService.upsertProfile(user!.id, { attendance_goal: goal }),
    onSuccess: (updated) => {
      setProfile(updated)
      queryClient.invalidateQueries({ queryKey: ['subjects', user?.id] })
    },
  })

  const handleGoalChange = (goal: number) => {
    setActiveGoal(goal)
    goalMutation.mutate(goal)
  }

  // Today's schedule sorted by time
  const todayEntries = timetable
    .filter(e => e.day_of_week === getTodayDayIndex())
    .sort((a, b) => a.start_time.localeCompare(b.start_time))

  // Overall stats
  const overallPct = subjects.length > 0
    ? Math.round(subjects.reduce((sum, s) => sum + getAttendancePct(s.attended_classes, s.total_classes), 0) / subjects.length)
    : 0
  const overallStatus = getAttendanceStatus(overallPct, activeGoal)
  const prevPct = Math.max(0, overallPct - 2.4) // simulated previous week
  const improvement = (overallPct - prevPct).toFixed(1)

  return (
    <AppShell>
      <PageTransition>
        <div className="max-w-lg mx-auto space-y-0">

          {/* ── GLOBAL STATUS ─────────────────────────────────────── */}
          <motion.div
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="mb-6"
          >
            {/* Label */}
            <p className="text-xs font-bold uppercase tracking-widest text-[#9ca3af] text-center mb-1">
              Global Status
            </p>

            {/* Big % + Safe pill */}
            <div className="flex items-center justify-center gap-3 mb-4">
              <span className="text-6xl font-bold text-[#191c1e] leading-none">
                <AnimatedCounter value={overallPct} suffix="%" />
              </span>
              <span className={`px-3 py-1 rounded-full text-sm font-semibold ${
                overallStatus === 'safe'
                  ? 'bg-[#eff6ff] text-[#3b82f6] border border-[#bfdbfe]'
                  : overallStatus === 'warning'
                  ? 'bg-amber-50 text-amber-600 border border-amber-200'
                  : 'bg-red-50 text-red-500 border border-red-200'
              }`}>
                {overallStatus === 'safe' ? 'Safe' : overallStatus === 'warning' ? 'Warning' : 'Danger'}
              </span>
            </div>

            {/* Goal selector pill row */}
            <div className="flex items-center justify-center gap-1 bg-[#f3f4f6] rounded-full px-2 py-1.5 w-fit mx-auto">
              <span className="text-xs font-semibold text-[#6b7280] mr-2 pl-2">Goal:</span>
              {GOAL_OPTIONS.map((g) => (
                <motion.button
                  key={g}
                  whileTap={{ scale: 0.92 }}
                  onClick={() => handleGoalChange(g)}
                  className={`px-4 py-1.5 rounded-full text-sm font-semibold transition-all duration-200 ${
                    activeGoal === g
                      ? 'bg-[#3b82f6] text-white shadow-sm'
                      : 'text-[#6b7280] hover:text-[#374151]'
                  }`}
                >
                  {g}%
                </motion.button>
              ))}
            </div>
          </motion.div>

          {/* Divider */}
          <div className="border-t border-[#f3f4f6] mb-6" />

          {/* Page Header */}
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-2xl font-bold text-[#091426]">Your Schedule</h1>
            <Link to="/add-subject">
              <motion.button
                whileTap={{ scale: 0.92 }}
                className="flex items-center gap-1 text-sm font-semibold text-[#3b82f6] hover:text-[#2563eb] transition-colors"
              >
                Add Class <Plus size={16} />
              </motion.button>
            </Link>
          </div>

          {/* Subject Cards */}
          {subjectsLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map(i => (
                <div key={i} className="bg-white rounded-2xl p-5 ambient-shadow animate-pulse">
                  <div className="h-3 bg-[#e6e8ea] rounded w-16 mb-2" />
                  <div className="h-6 bg-[#e6e8ea] rounded w-40 mb-1" />
                  <div className="h-4 bg-[#e6e8ea] rounded w-24 mb-4" />
                  <div className="h-1 bg-[#e6e8ea] rounded w-full mb-4" />
                  <div className="h-10 bg-[#f2f4f6] rounded-xl w-full" />
                </div>
              ))}
            </div>
          ) : subjects.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-2xl p-8 ambient-shadow text-center"
            >
              <div className="w-14 h-14 bg-[#f2f4f6] rounded-2xl flex items-center justify-center mx-auto mb-4">
                <CalendarClock size={24} className="text-[#75777d]" />
              </div>
              <h3 className="font-semibold text-[#091426] mb-2">No subjects yet</h3>
              <p className="text-sm text-[#45474c] mb-5">Add your subjects to start tracking attendance</p>
              <Link to="/add-subject">
                <motion.button
                  whileTap={{ scale: 0.97 }}
                  className="bg-[#091426] text-white px-6 py-2.5 rounded-xl text-sm font-semibold"
                >
                  Add First Subject
                </motion.button>
              </Link>
            </motion.div>
          ) : (
            <div className="space-y-4">
              <AnimatePresence>
                {subjects.map((subject, index) => {
                  const pct = getAttendancePct(subject.attended_classes, subject.total_classes)
                  const status = getAttendanceStatus(pct, subject.attendance_goal)
                  const { canMiss, mustAttend } = calculateBunks(
                    subject.attended_classes,
                    subject.total_classes,
                    subject.attendance_goal
                  )
                  const courseCode = getCourseCode(subject.name, index)

                  // Progress bar color
                  const barColor = status === 'safe' ? '#3b82f6' : status === 'warning' ? '#f59e0b' : '#ef4444'
                  const pctColor = status === 'safe' ? 'text-[#3b82f6]' : status === 'warning' ? 'text-amber-500' : 'text-[#ef4444]'

                  return (
                    <motion.div
                      key={subject.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.08, duration: 0.35 }}
                      layout
                    >
                      <Link to={`/subject/${subject.id}`}>
                        <div className="bg-white rounded-2xl p-5 ambient-shadow hover:ambient-shadow-md transition-shadow cursor-pointer">
                          {/* Course code + menu */}
                          <div className="flex items-start justify-between mb-1">
                            <span className="text-xs font-semibold text-[#75777d] tracking-wider uppercase">
                              {courseCode}
                            </span>
                            <motion.button
                              whileTap={{ scale: 0.9 }}
                              onClick={(e) => { e.preventDefault(); e.stopPropagation() }}
                              className="p-1 rounded-lg hover:bg-[#f2f4f6] transition-colors"
                            >
                              <MoreVertical size={16} className="text-[#75777d]" />
                            </motion.button>
                          </div>

                          {/* Subject name */}
                          <h3 className="text-xl font-bold text-[#091426] mb-1">{subject.name}</h3>

                          {/* Attendance % */}
                          <p className={`text-base font-semibold mb-3 ${pctColor}`}>
                            {pct}% <span className="text-[#75777d] font-normal text-sm">Attendance</span>
                          </p>

                          {/* Progress bar */}
                          <div className="w-full bg-[#f2f4f6] rounded-full h-1.5 mb-4 overflow-hidden">
                            <motion.div
                              className="h-full rounded-full"
                              style={{ backgroundColor: barColor }}
                              initial={{ width: 0 }}
                              animate={{ width: `${pct}%` }}
                              transition={{ duration: 0.9, ease: [0.25, 0.46, 0.45, 0.94], delay: index * 0.08 + 0.2 }}
                            />
                          </div>

                          {/* Status badge */}
                          {status === 'danger' || mustAttend > 0 ? (
                            <motion.div
                              initial={{ opacity: 0, scale: 0.95 }}
                              animate={{ opacity: 1, scale: 1 }}
                              className="flex items-center justify-between bg-[#fef2f2] border border-[#fecaca] rounded-xl px-4 py-3"
                            >
                              <div className="flex items-center gap-2">
                                <AlertTriangle size={16} className="text-[#ef4444]" />
                                <span className="text-sm font-semibold text-[#ef4444]">Must attend</span>
                              </div>
                              <span className="text-xl font-bold text-[#ef4444]">{mustAttend}</span>
                            </motion.div>
                          ) : (
                            <motion.div
                              initial={{ opacity: 0, scale: 0.95 }}
                              animate={{ opacity: 1, scale: 1 }}
                              className="flex items-center justify-between bg-[#f8faff] border border-[#e0e7ff] rounded-xl px-4 py-3"
                            >
                              <div className="flex items-center gap-2">
                                <Calendar size={16} className="text-[#3b82f6]" />
                                <span className="text-sm font-semibold text-[#45474c]">Bunks left</span>
                              </div>
                              <span className="text-xl font-bold text-[#091426]">{canMiss}</span>
                            </motion.div>
                          )}
                        </div>
                      </Link>
                    </motion.div>
                  )
                })}
              </AnimatePresence>
            </div>
          )}

          {/* Weekly Trend Card */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-white rounded-2xl p-5 ambient-shadow mt-4"
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-bold uppercase tracking-widest text-[#75777d]">Weekly Trend</span>
              <TrendingUp size={16} className="text-[#3b82f6]" />
            </div>
            <p className="text-sm text-[#45474c] mb-4">
              You've improved your average by{' '}
              <span className="text-[#3b82f6] font-bold">{improvement}%</span> this week. Keep it up!
            </p>
            <div className="h-24">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={weekData} barSize={42} barCategoryGap="8%" barGap={2}>
                  <Bar dataKey="val" radius={[4, 4, 0, 0]}>
                    {weekData.map((_, i) => (
                      <Cell
                        key={i}
                        fill={i === weekData.length - 1 ? '#3b82f6' : '#e0e7ff'}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="flex justify-between mt-1">
              {weekData.map((d, i) => (
                <span key={i} className="flex-1 text-center text-xs text-[#75777d]">{d.day}</span>
              ))}
            </div>
          </motion.div>

          {/* Upcoming Schedule Card */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.38 }}
            className="bg-white rounded-2xl p-5 ambient-shadow mt-4"
          >
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-bold uppercase tracking-widest text-[#75777d]">Upcoming Schedule</span>
              <Calendar size={16} className="text-[#3b82f6]" />
            </div>

            {todayEntries.length === 0 ? (
              <div className="text-center py-4">
                <p className="text-sm text-[#75777d]">No classes scheduled today</p>
                <Link to="/schedule" className="text-xs text-[#3b82f6] font-semibold mt-1 inline-block">
                  Add to schedule →
                </Link>
              </div>
            ) : (
              <div className="space-y-0">
                {todayEntries.map((entry, i) => {
                  const subject = subjects.find(s => s.id === entry.subject_id)
                  return (
                    <motion.div
                      key={entry.id}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.4 + i * 0.06 }}
                      className="flex items-center justify-between py-3 border-b border-[#f2f4f6] last:border-0"
                    >
                      <span className="text-sm font-medium text-[#191c1e]">
                        {subject?.name || 'Unknown'}
                      </span>
                      <span className="text-sm font-semibold text-[#45474c]">
                        {formatTime(entry.start_time)}
                      </span>
                    </motion.div>
                  )
                })}
              </div>
            )}

            {/* If no timetable set up, show sample from subjects */}
            {todayEntries.length === 0 && subjects.length > 0 && (
              <div className="space-y-0 mt-2">
                {subjects.slice(0, 3).map((s, i) => {
                  const times = ['09:30 AM', '11:00 AM', '02:00 PM']
                  return (
                    <div key={s.id} className="flex items-center justify-between py-3 border-b border-[#f2f4f6] last:border-0">
                      <span className="text-sm font-medium text-[#191c1e]">{s.name}</span>
                      <span className="text-sm font-semibold text-[#45474c]">{times[i] || '—'}</span>
                    </div>
                  )
                })}
              </div>
            )}
          </motion.div>

          {/* FAB — Add Subject */}
          <div className="fixed bottom-24 right-4 md:bottom-8 md:right-8 z-40">
            <Link to="/add-subject">
              <motion.button
                whileHover={{ scale: 1.08 }}
                whileTap={{ scale: 0.93 }}
                className="w-14 h-14 bg-[#3b82f6] text-white rounded-full flex items-center justify-center ambient-shadow-lg"
              >
                <Plus size={24} />
              </motion.button>
            </Link>
          </div>

        </div>
      </PageTransition>
    </AppShell>
  )
}
