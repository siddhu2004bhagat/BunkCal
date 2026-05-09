import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Plus, Calculator, Users, Calendar, TrendingUp, Flame } from 'lucide-react'
import { AppShell } from '@/components/layout/AppShell'
import { PageTransition } from '@/components/motion/PageTransition'
import { StaggerContainer, StaggerItem } from '@/components/motion/FadeIn'
import { AnimatedCounter } from '@/components/motion/AnimatedCounter'
import { Card } from '@/components/ui/Card'
import { ProgressBar } from '@/components/ui/ProgressBar'
import { DashboardSkeleton } from '@/components/ui/Skeleton'
import { useAuthStore } from '@/store/authStore'
import { subjectsService } from '@/services/subjects'
import { getAttendancePct, getAttendanceStatus, getStatusBg, getProgressColor } from '@/utils/attendance'
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'

const weekData = [
  { day: 'Mon', pct: 72 }, { day: 'Tue', pct: 75 }, { day: 'Wed', pct: 74 },
  { day: 'Thu', pct: 76 }, { day: 'Fri', pct: 78 }, { day: 'Sat', pct: 78 }, { day: 'Sun', pct: 78 },
]

export default function Dashboard() {
  const { user, profile } = useAuthStore()

  const { data: subjects = [], isLoading } = useQuery({
    queryKey: ['subjects', user?.id],
    queryFn: () => subjectsService.getSubjects(user!.id),
    enabled: !!user?.id,
  })

  const overallPct = subjects.length > 0
    ? Math.round(subjects.reduce((sum, s) => sum + getAttendancePct(s.attended_classes, s.total_classes), 0) / subjects.length)
    : 0

  const goal = profile?.attendance_goal ?? 75
  const overallStatus = getAttendanceStatus(overallPct, goal)
  const atRisk = subjects.filter(s => getAttendancePct(s.attended_classes, s.total_classes) < goal)

  const greeting = () => {
    const h = new Date().getHours()
    if (h < 12) return 'Good morning'
    if (h < 17) return 'Good afternoon'
    return 'Good evening'
  }

  return (
    <AppShell>
      <PageTransition>
        {isLoading ? (
          <DashboardSkeleton />
        ) : (
          <div className="space-y-6">
            {/* Greeting */}
            <div>
              <p className="text-sm text-[#45474c]">{greeting()},</p>
              <h1 className="text-2xl font-bold text-[#091426]">
                {profile?.full_name?.split(' ')[0] || 'Student'} 👋
              </h1>
            </div>

            {/* Hero Stats Bento */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
              {/* Overall Attendance */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="md:col-span-8 bg-white border border-[#c5c6cd] rounded-2xl p-6 ambient-shadow"
              >
                <p className="text-xs font-semibold tracking-wider uppercase text-[#45474c] mb-1">Current Status</p>
                <div className="flex items-end gap-3 mb-3">
                  <h2 className="text-4xl font-bold text-[#091426]">
                    <AnimatedCounter value={overallPct} suffix="%" />
                  </h2>
                  <span className="text-lg text-[#45474c] mb-1">Overall Attendance</span>
                </div>

                <div className="flex items-center gap-2 mb-6">
                  <span className={`px-3 py-1 rounded-lg text-xs font-bold uppercase tracking-wider ${getStatusBg(overallStatus)}`}>
                    {overallStatus}
                  </span>
                  <span className="text-sm text-[#45474c]">
                    {overallStatus === 'safe'
                      ? 'You are above the threshold for all subjects.'
                      : `${atRisk.length} subject${atRisk.length !== 1 ? 's' : ''} need attention.`}
                  </span>
                </div>

                <div>
                  <div className="flex justify-between items-end mb-1.5">
                    <span className="text-xs font-semibold text-[#091426]">Goal Progress ({goal}%)</span>
                    <span className="text-sm font-bold text-[#091426]">{overallPct}/{goal}%</span>
                  </div>
                  <ProgressBar
                    value={overallPct}
                    max={100}
                    color={getProgressColor(overallStatus)}
                    height={6}
                  />
                </div>
              </motion.div>

              {/* Goal Selector */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.1 }}
                className="md:col-span-4 bg-[#1e293b] text-white rounded-2xl p-6 ambient-shadow"
              >
                <h3 className="font-semibold text-white mb-2">Attendance Goal</h3>
                <p className="text-xs text-[#8590a6] mb-4">Your current target threshold</p>
                <div className="grid grid-cols-2 gap-2">
                  {[75, 80, 85, 90].map((g) => (
                    <motion.div
                      key={g}
                      whileTap={{ scale: 0.95 }}
                      className={`p-3 rounded-lg text-center font-bold text-lg cursor-pointer transition-colors ${
                        goal === g
                          ? 'bg-white text-[#091426]'
                          : 'bg-[#091426] text-[#8590a6] border border-[#3c475a] hover:bg-[#3c475a]'
                      }`}
                    >
                      {g}%
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            </div>

            {/* Weekly Trend Chart */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.15 }}
              className="bg-white border border-[#c5c6cd] rounded-2xl p-6 ambient-shadow"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <TrendingUp size={18} className="text-[#091426]" />
                  <h3 className="font-semibold text-[#091426]">Weekly Trend</h3>
                </div>
                <span className="text-xs text-[#45474c] bg-[#f2f4f6] px-2 py-1 rounded">This week</span>
              </div>
              <div className="h-32">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={weekData}>
                    <defs>
                      <linearGradient id="grad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#091426" stopOpacity={0.15} />
                        <stop offset="95%" stopColor="#091426" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="day" tick={{ fontSize: 11, fill: '#75777d' }} axisLine={false} tickLine={false} />
                    <YAxis domain={[60, 100]} hide />
                    <Tooltip
                      contentStyle={{ background: '#fff', border: '1px solid #c5c6cd', borderRadius: 8, fontSize: 12 }}
                      formatter={(v) => [`${v}%`, 'Attendance']}
                    />
                    <Area type="monotone" dataKey="pct" stroke="#091426" strokeWidth={2} fill="url(#grad)" dot={false} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </motion.div>

            {/* Subject Breakdown */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-[#091426]">Subject Breakdown</h3>
                <Link
                  to="/subjects"
                  className="text-xs font-semibold text-[#091426] flex items-center gap-1 hover:underline"
                >
                  Manage
                </Link>
              </div>

              {subjects.length === 0 ? (
                <Card className="text-center py-10">
                  <p className="text-[#45474c] mb-3">No subjects yet</p>
                  <Link to="/add-subject">
                    <motion.button
                      whileTap={{ scale: 0.97 }}
                      className="bg-[#091426] text-white px-4 py-2 rounded text-sm font-semibold"
                    >
                      Add your first subject
                    </motion.button>
                  </Link>
                </Card>
              ) : (
                <StaggerContainer className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {subjects.map((subject) => {
                    const pct = getAttendancePct(subject.attended_classes, subject.total_classes)
                    const status = getAttendanceStatus(pct, subject.attendance_goal)
                    const { canMiss } = (() => {
                      const canMiss = Math.max(0, Math.floor((subject.attended_classes * 100) / subject.attendance_goal - subject.total_classes))
                      return { canMiss }
                    })()

                    return (
                      <StaggerItem key={subject.id}>
                        <Link to={`/subject/${subject.id}`}>
                          <motion.div
                            whileHover={{ y: -3, boxShadow: '0px 8px 24px rgba(30,41,59,0.1)' }}
                            whileTap={{ scale: 0.98 }}
                            transition={{ duration: 0.18 }}
                            className="bg-white border border-[#c5c6cd] rounded-xl p-6 ambient-shadow cursor-pointer group"
                          >
                            <div className="flex justify-between items-start mb-4">
                              <div
                                className="w-10 h-10 rounded-lg flex items-center justify-center text-white text-sm font-bold group-hover:scale-110 transition-transform"
                                style={{ backgroundColor: subject.color || '#091426' }}
                              >
                                {subject.name[0]}
                              </div>
                              <span className={`text-3xl font-bold ${
                                status === 'safe' ? 'text-[#24a375]' :
                                status === 'warning' ? 'text-amber-600' : 'text-[#ba1a1a]'
                              }`}>
                                {pct}%
                              </span>
                            </div>
                            <h4 className="font-semibold text-[#091426] mb-1 truncate">{subject.name}</h4>
                            <p className={`text-xs mb-4 ${
                              status === 'safe' ? 'text-[#24a375]' :
                              status === 'warning' ? 'text-amber-600' : 'text-[#ba1a1a]'
                            }`}>
                              {status === 'safe'
                                ? `Can miss ${canMiss} more class${canMiss !== 1 ? 'es' : ''}`
                                : status === 'warning'
                                ? 'At the edge — attend next class'
                                : 'Attend next classes urgently'}
                            </p>
                            <ProgressBar
                              value={pct}
                              color={getProgressColor(status)}
                              height={4}
                            />
                            <p className="text-xs text-[#75777d] mt-2">
                              {subject.attended_classes}/{subject.total_classes} classes
                            </p>
                          </motion.div>
                        </Link>
                      </StaggerItem>
                    )
                  })}
                </StaggerContainer>
              )}
            </div>

            {/* Quick Actions */}
            <div>
              <h3 className="text-lg font-semibold text-[#091426] mb-4">Quick Actions</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                  { to: '/add-subject', icon: Plus, label: 'Add Subject', color: 'bg-[#091426] text-white' },
                  { to: '/offering-calculator', icon: Calculator, label: 'Calculate Bunks', color: 'bg-[#d0e1fb] text-[#091426]' },
                  { to: '/proxy-ledger', icon: Users, label: 'Proxy Ledger', color: 'bg-[#f2f4f6] text-[#091426]' },
                  { to: '/schedule', icon: Calendar, label: 'Schedule', color: 'bg-[#f2f4f6] text-[#091426]' },
                ].map(({ to, icon: Icon, label, color }) => (
                  <Link key={to} to={to}>
                    <motion.div
                      whileHover={{ y: -2 }}
                      whileTap={{ scale: 0.96 }}
                      className={`${color} rounded-xl p-4 flex flex-col items-center gap-2 cursor-pointer ambient-shadow`}
                    >
                      <Icon size={22} />
                      <span className="text-xs font-semibold text-center">{label}</span>
                    </motion.div>
                  </Link>
                ))}
              </div>
            </div>

            {/* Streak Banner */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="relative overflow-hidden bg-[#091426] text-white rounded-2xl p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4"
            >
              <div className="relative z-10">
                <h3 className="text-xl font-bold text-white mb-1">Keep up the streak</h3>
                <p className="text-sm text-[#8590a6] max-w-sm">
                  Consistent attendance leads to better outcomes. You're doing great!
                </p>
              </div>
              <div className="relative z-10 flex items-center gap-4">
                <div className="flex flex-col items-center">
                  <div className="w-12 h-12 rounded-full border-2 border-[#68dba9] flex items-center justify-center">
                    <Flame size={22} className="text-[#68dba9]" />
                  </div>
                  <span className="text-xs font-bold text-white mt-1">STREAK</span>
                </div>
                <Link to="/history">
                  <motion.button
                    whileTap={{ scale: 0.97 }}
                    className="bg-white text-[#091426] px-5 py-2.5 rounded-lg text-sm font-semibold hover:bg-[#f2f4f6] transition-colors"
                  >
                    View History
                  </motion.button>
                </Link>
              </div>
              {/* Decorative */}
              <div className="absolute right-[-5%] bottom-[-20%] w-64 h-64 bg-[#d8e3fb] opacity-5 rounded-full blur-3xl pointer-events-none" />
            </motion.div>
          </div>
        )}
      </PageTransition>
    </AppShell>
  )
}
