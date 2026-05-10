import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, TrendingUp, Calendar, MoreVertical, AlertTriangle, CalendarClock, ArrowRight } from 'lucide-react'
import { AppShell } from '@/components/layout/AppShell'
import { PageTransition } from '@/components/motion/PageTransition'
import { AnimatedCounter } from '@/components/motion/AnimatedCounter'
import { useAuthStore } from '@/store/authStore'
import { subjectsService } from '@/services/subjects'
import { timetableService } from '@/services/timetable'
import { attendanceService } from '@/services/attendance'
import { profilesService } from '@/services/profiles'
import { getAttendancePct, getAttendanceStatus } from '@/utils/attendance'
import { calculateBunks } from '@/services/calculator'
import { BarChart, Bar, ResponsiveContainer, Cell, YAxis, XAxis, Tooltip } from 'recharts'
import { useState, useMemo } from 'react'

const weekData = [
  { day: 'M', val: 55 }, { day: 'T', val: 60 }, { day: 'W', val: 58 },
  { day: 'T', val: 65 }, { day: 'F', val: 70 }, { day: 'S', val: 72 }, { day: 'S', val: 75 },
]

const GOAL_OPTIONS = [70, 75, 80, 85]

function getTodayDayIndex() { return new Date().getDay() }

function formatTime(time: string) {
  const [h, m] = time.split(':').map(Number)
  const ampm = h >= 12 ? 'PM' : 'AM'
  return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${ampm}`
}

function getCourseCode(name: string, index: number) {
  const codes = ['MATH401', 'CS302', 'ENG202', 'PHY301', 'CHEM201', 'BIO101', 'ECO301', 'HIS201']
  if (index < codes.length) return codes[index]
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 3) + '0' + (index + 1)
}

// Build last-7-days attendance trend from records
function buildWeekTrend(records: { date: string; status: string }[]) {
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  const result = []
  for (let i = 6; i >= 0; i--) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    const dayRecords = records.filter(r => r.date === dateStr)
    const present = dayRecords.filter(r => r.status === 'present' || r.status === 'proxy').length
    const total = dayRecords.length
    const pct = total > 0 ? Math.round((present / total) * 100) : null
    result.push({
      day: days[d.getDay()].slice(0, 1),
      fullDay: days[d.getDay()],
      val: pct,
      hasData: total > 0,
      date: dateStr,
    })
  }
  return result
}

export default function Dashboard() {
  const { user, profile, setProfile } = useAuthStore()
  const queryClient = useQueryClient()
  const [activeGoal, setActiveGoal] = useState(profile?.attendance_goal ?? 75)

  const { data: subjects = [], isLoading } = useQuery({
    queryKey: ['subjects', user?.id],
    queryFn: () => subjectsService.getSubjects(user!.id),
    enabled: !!user?.id,
  })

  const { data: timetable = [] } = useQuery({
    queryKey: ['timetable', user?.id],
    queryFn: () => timetableService.getEntries(user!.id),
    enabled: !!user?.id,
  })

  const { data: allRecords = [] } = useQuery({
    queryKey: ['attendance', user?.id, 'all'],
    queryFn: () => attendanceService.getRecords(user!.id),
    enabled: !!user?.id,
  })

  // Build real 7-day trend from attendance records
  const weekTrend = useMemo(() => buildWeekTrend(allRecords), [allRecords])

  // Calculate improvement: compare last 3 days avg vs previous 4 days avg
  const improvement = useMemo(() => {
    const withData = weekTrend.filter(d => d.hasData && d.val !== null)
    if (withData.length < 2) return null
    const recent = withData.slice(-3)
    const older = withData.slice(0, -3)
    if (!older.length) return null
    const recentAvg = recent.reduce((s, d) => s + (d.val ?? 0), 0) / recent.length
    const olderAvg = older.reduce((s, d) => s + (d.val ?? 0), 0) / older.length
    const diff = recentAvg - olderAvg
    return diff
  }, [weekTrend])

  const goalMutation = useMutation({
    mutationFn: (goal: number) => profilesService.upsertProfile(user!.id, { attendance_goal: goal }),
    onSuccess: (updated) => { setProfile(updated) },
  })

  const todayEntries = timetable
    .filter(e => e.day_of_week === getTodayDayIndex())
    .sort((a, b) => a.start_time.localeCompare(b.start_time))

  const overallPct = subjects.length > 0
    ? Math.round(subjects.reduce((sum, s) => sum + getAttendancePct(s.attended_classes, s.total_classes), 0) / subjects.length)
    : 0
  const overallStatus = getAttendanceStatus(overallPct, activeGoal)

  const greeting = () => {
    const h = new Date().getHours()
    if (h < 12) return 'Good morning'
    if (h < 17) return 'Good afternoon'
    return 'Good evening'
  }

  return (
    <AppShell>
      <PageTransition>

        {/* ── DESKTOP: 3-col bento grid / MOBILE: single col ── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* ══ LEFT COLUMN (lg:col-span-2) ══════════════════════ */}
          <div className="lg:col-span-2 space-y-6">

            {/* Greeting + Global Status Hero */}
            <motion.div
              initial={{ opacity: 0, y: -12 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-2xl p-6 ambient-shadow"
            >
              {/* Top row */}
              <div className="flex items-start justify-between mb-6">
                <div>
                  <p className="text-sm text-[#6b7280]">{greeting()},</p>
                  <h1 className="text-2xl font-bold text-[#091426]">
                    {profile?.full_name?.split(' ')[0] || 'Student'} 👋
                  </h1>
                </div>
                <Link to="/add-subject">
                  <motion.button
                    whileTap={{ scale: 0.92 }}
                    className="flex items-center gap-1.5 text-sm font-semibold text-[#3b82f6] bg-[#eff6ff] px-4 py-2 rounded-xl hover:bg-[#dbeafe] transition-colors"
                  >
                    <Plus size={15} /> Add Class
                  </motion.button>
                </Link>
              </div>

              {/* Global Status */}
              <div className="flex flex-col sm:flex-row sm:items-center gap-6">
                {/* Big % */}
                <div className="flex items-center gap-3">
                  <span className="text-7xl font-bold text-[#191c1e] leading-none tabular-nums">
                    <AnimatedCounter value={overallPct} suffix="%" />
                  </span>
                  <div>
                    <p className="text-xs font-bold uppercase tracking-widest text-[#9ca3af] mb-1">Global Status</p>
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
                </div>

                {/* Divider */}
                <div className="hidden sm:block w-px h-16 bg-[#f3f4f6]" />

                {/* Goal selector */}
                <div>
                  <p className="text-xs font-semibold text-[#6b7280] mb-2">Attendance Goal</p>
                  <div className="flex items-center gap-1 bg-[#f3f4f6] rounded-full px-1.5 py-1">
                    {GOAL_OPTIONS.map((g) => (
                      <motion.button
                        key={g}
                        whileTap={{ scale: 0.92 }}
                        onClick={() => { setActiveGoal(g); goalMutation.mutate(g) }}
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
                </div>
              </div>
            </motion.div>

            {/* Your Schedule header */}
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-[#091426]">Your Schedule</h2>
              <Link to="/subjects" className="text-sm text-[#3b82f6] font-semibold flex items-center gap-1 hover:underline">
                View all <ArrowRight size={14} />
              </Link>
            </div>

            {/* Subject Cards — 2-col grid on desktop */}
            {isLoading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {[1, 2, 3, 4].map(i => (
                  <div key={i} className="bg-white rounded-2xl p-5 ambient-shadow animate-pulse">
                    <div className="h-3 bg-[#e6e8ea] rounded w-16 mb-2" />
                    <div className="h-6 bg-[#e6e8ea] rounded w-40 mb-1" />
                    <div className="h-4 bg-[#e6e8ea] rounded w-24 mb-4" />
                    <div className="h-1.5 bg-[#e6e8ea] rounded w-full mb-4" />
                    <div className="h-10 bg-[#f2f4f6] rounded-xl w-full" />
                  </div>
                ))}
              </div>
            ) : subjects.length === 0 ? (
              <div className="bg-white rounded-2xl p-10 ambient-shadow text-center">
                <div className="w-14 h-14 bg-[#f2f4f6] rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <CalendarClock size={24} className="text-[#75777d]" />
                </div>
                <h3 className="font-semibold text-[#091426] mb-2">No subjects yet</h3>
                <p className="text-sm text-[#45474c] mb-5">Add your subjects to start tracking attendance</p>
                <Link to="/add-subject">
                  <motion.button whileTap={{ scale: 0.97 }} className="bg-[#091426] text-white px-6 py-2.5 rounded-xl text-sm font-semibold">
                    Add First Subject
                  </motion.button>
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <AnimatePresence>
                  {subjects.map((subject, index) => {
                    const pct = getAttendancePct(subject.attended_classes, subject.total_classes)
                    const status = getAttendanceStatus(pct, subject.attendance_goal)
                    const { canMiss, mustAttend } = calculateBunks(subject.attended_classes, subject.total_classes, subject.attendance_goal)
                    const courseCode = getCourseCode(subject.name, index)
                    const barColor = status === 'safe' ? '#3b82f6' : status === 'warning' ? '#f59e0b' : '#ef4444'
                    const pctColor = status === 'safe' ? 'text-[#3b82f6]' : status === 'warning' ? 'text-amber-500' : 'text-[#ef4444]'

                    return (
                      <motion.div
                        key={subject.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.06, duration: 0.3 }}
                        layout
                      >
                        <Link to={`/subject/${subject.id}`}>
                          <div className="bg-white rounded-2xl p-5 ambient-shadow hover:ambient-shadow-md transition-all cursor-pointer group">
                            <div className="flex items-start justify-between mb-1">
                              <span className="text-xs font-semibold text-[#9ca3af] tracking-wider uppercase">{courseCode}</span>
                              <motion.button
                                whileTap={{ scale: 0.9 }}
                                onClick={(e) => { e.preventDefault(); e.stopPropagation() }}
                                className="p-1 rounded-lg hover:bg-[#f2f4f6] transition-colors opacity-0 group-hover:opacity-100"
                              >
                                <MoreVertical size={15} className="text-[#9ca3af]" />
                              </motion.button>
                            </div>
                            <h3 className="text-lg font-bold text-[#091426] mb-1 truncate">{subject.name}</h3>
                            <p className={`text-base font-semibold mb-3 ${pctColor}`}>
                              {pct}% <span className="text-[#9ca3af] font-normal text-sm">Attendance</span>
                            </p>
                            <div className="w-full bg-[#f3f4f6] rounded-full h-1.5 mb-4 overflow-hidden">
                              <motion.div
                                className="h-full rounded-full"
                                style={{ backgroundColor: barColor }}
                                initial={{ width: 0 }}
                                animate={{ width: `${pct}%` }}
                                transition={{ duration: 0.9, ease: [0.25, 0.46, 0.45, 0.94], delay: index * 0.06 + 0.2 }}
                              />
                            </div>
                            {mustAttend > 0 ? (
                              <div className="flex items-center justify-between bg-[#fef2f2] border border-[#fecaca] rounded-xl px-4 py-2.5">
                                <div className="flex items-center gap-2">
                                  <AlertTriangle size={15} className="text-[#ef4444]" />
                                  <span className="text-sm font-semibold text-[#ef4444]">Must attend</span>
                                </div>
                                <span className="text-xl font-bold text-[#ef4444]">{mustAttend}</span>
                              </div>
                            ) : (
                              <div className="flex items-center justify-between bg-[#f8faff] border border-[#e0e7ff] rounded-xl px-4 py-2.5">
                                <div className="flex items-center gap-2">
                                  <Calendar size={15} className="text-[#3b82f6]" />
                                  <span className="text-sm font-semibold text-[#6b7280]">Bunks left</span>
                                </div>
                                <span className="text-xl font-bold text-[#091426]">{canMiss}</span>
                              </div>
                            )}
                          </div>
                        </Link>
                      </motion.div>
                    )
                  })}
                </AnimatePresence>
              </div>
            )}
          </div>

          {/* ══ RIGHT COLUMN (lg:col-span-1) ═════════════════════ */}
          <div className="space-y-6">

            {/* Weekly Trend */}
            <motion.div
              initial={{ opacity: 0, x: 16 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.15 }}
              className="bg-white rounded-2xl p-5 ambient-shadow"
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-bold uppercase tracking-widest text-[#9ca3af]">Weekly Trend</span>
                <TrendingUp size={15} className={improvement !== null && improvement > 0 ? 'text-[#3b82f6]' : 'text-[#9ca3af]'} />
              </div>

              {/* Improvement text */}
              <p className="text-sm text-[#6b7280] mb-4">
                {improvement === null ? (
                  'Mark attendance daily to see your trend.'
                ) : improvement > 0 ? (
                  <>Improved by <span className="text-[#3b82f6] font-bold">{improvement.toFixed(1)}%</span> this week. Keep it up!</>
                ) : improvement < 0 ? (
                  <>Down by <span className="text-[#ef4444] font-bold">{Math.abs(improvement).toFixed(1)}%</span> this week. Stay consistent!</>
                ) : (
                  'Attendance is steady this week.'
                )}
              </p>

              {/* Chart — single unified chart, works on all sizes */}
              <div className="h-28">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={weekTrend} barCategoryGap="20%" margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
                    <XAxis
                      dataKey="day"
                      tick={{ fontSize: 11, fill: '#9ca3af' }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis domain={[0, 100]} hide />
                    <Tooltip
                      cursor={{ fill: '#f3f4f6', radius: 6 }}
                      contentStyle={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8, fontSize: 11 }}
                      formatter={(v) => v !== null ? [`${v}%`, 'Attendance'] : ['No data', '']}
                      labelFormatter={(label) => weekTrend.find(d => d.day === label)?.fullDay ?? label}
                    />
                    <Bar dataKey="val" radius={[5, 5, 0, 0]} maxBarSize={36}>
                      {weekTrend.map((entry, i) => {
                        const isToday = i === weekTrend.length - 1
                        const noData = !entry.hasData
                        return (
                          <Cell
                            key={i}
                            fill={noData ? '#f3f4f6' : isToday ? '#3b82f6' : '#bfdbfe'}
                          />
                        )
                      })}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Legend */}
              <div className="flex items-center gap-4 mt-2">
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded-sm bg-[#3b82f6]" />
                  <span className="text-xs text-[#9ca3af]">Today</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded-sm bg-[#bfdbfe]" />
                  <span className="text-xs text-[#9ca3af]">Past days</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded-sm bg-[#f3f4f6]" />
                  <span className="text-xs text-[#9ca3af]">No data</span>
                </div>
              </div>
            </motion.div>

            {/* Upcoming Schedule */}
            <motion.div
              initial={{ opacity: 0, x: 16 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.22 }}
              className="bg-white rounded-2xl p-5 ambient-shadow"
            >
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-bold uppercase tracking-widest text-[#9ca3af]">Upcoming Schedule</span>
                <Link to="/schedule">
                  <Calendar size={15} className="text-[#3b82f6] hover:text-[#2563eb] transition-colors" />
                </Link>
              </div>

              {todayEntries.length > 0 ? (
                <div>
                  {todayEntries.map((entry, i) => {
                    const subject = subjects.find(s => s.id === entry.subject_id)
                    return (
                      <motion.div
                        key={entry.id}
                        initial={{ opacity: 0, x: -8 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.25 + i * 0.06 }}
                        className="flex items-center justify-between py-3 border-b border-[#f3f4f6] last:border-0"
                      >
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-[#3b82f6] shrink-0" />
                          <span className="text-sm font-medium text-[#191c1e] truncate max-w-[140px]">
                            {subject?.name || 'Unknown'}
                          </span>
                        </div>
                        <span className="text-sm font-semibold text-[#6b7280] shrink-0 ml-2">
                          {formatTime(entry.start_time)}
                        </span>
                      </motion.div>
                    )
                  })}
                </div>
              ) : subjects.length > 0 ? (
                // Fallback: show subjects with placeholder times
                <div>
                  {subjects.slice(0, 4).map((s, i) => {
                    const times = ['09:30 AM', '11:00 AM', '02:00 PM', '04:00 PM']
                    return (
                      <div key={s.id} className="flex items-center justify-between py-3 border-b border-[#f3f4f6] last:border-0">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: s.color || '#3b82f6' }} />
                          <span className="text-sm font-medium text-[#191c1e] truncate max-w-[140px]">{s.name}</span>
                        </div>
                        <span className="text-sm font-semibold text-[#6b7280]">{times[i]}</span>
                      </div>
                    )
                  })}
                  <Link to="/schedule" className="block text-center text-xs text-[#3b82f6] font-semibold mt-3 hover:underline">
                    Set up your timetable →
                  </Link>
                </div>
              ) : (
                <div className="text-center py-4">
                  <p className="text-sm text-[#9ca3af]">No classes today</p>
                  <Link to="/schedule" className="text-xs text-[#3b82f6] font-semibold mt-1 inline-block">
                    Add to schedule →
                  </Link>
                </div>
              )}
            </motion.div>

            {/* Quick Actions */}
            <motion.div
              initial={{ opacity: 0, x: 16 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.28 }}
              className="bg-white rounded-2xl p-5 ambient-shadow"
            >
              <span className="text-xs font-bold uppercase tracking-widest text-[#9ca3af] block mb-4">Quick Actions</span>
              <div className="space-y-2">
                {[
                  { to: '/attendance', label: 'Mark Attendance', color: 'bg-[#eff6ff] text-[#3b82f6]' },
                  { to: '/offering-calculator', label: 'Calculate Bunks', color: 'bg-[#f0fdf4] text-[#16a34a]' },
                  { to: '/proxy-ledger', label: 'Proxy Ledger', color: 'bg-[#faf5ff] text-[#7c3aed]' },
                  { to: '/history', label: 'View History', color: 'bg-[#fff7ed] text-[#ea580c]' },
                ].map(({ to, label, color }) => (
                  <Link key={to} to={to}>
                    <motion.div
                      whileHover={{ x: 3 }}
                      whileTap={{ scale: 0.98 }}
                      className={`flex items-center justify-between px-4 py-3 rounded-xl ${color} cursor-pointer transition-all`}
                    >
                      <span className="text-sm font-semibold">{label}</span>
                      <ArrowRight size={14} />
                    </motion.div>
                  </Link>
                ))}
              </div>
            </motion.div>
          </div>
        </div>

        {/* FAB */}
        <div
          className="fixed right-4 md:bottom-8 md:right-8 z-40"
          style={{ bottom: 'calc(5rem + env(safe-area-inset-bottom, 0px))' }}
        >
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

      </PageTransition>
    </AppShell>
  )
}
