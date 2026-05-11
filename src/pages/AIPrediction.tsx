import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import { Brain, TrendingUp, TrendingDown, AlertTriangle, CheckCircle, Bell, Sparkles, RefreshCw } from 'lucide-react'
import { AppShell } from '@/components/layout/AppShell'
import { PageTransition } from '@/components/motion/PageTransition'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { useAuthStore } from '@/store/authStore'
import { useUIStore } from '@/store/uiStore'
import { subjectsService } from '@/services/subjects'
import { timetableService } from '@/services/timetable'
import { predictAttendance, generateAttendanceAlert, type AttendancePrediction } from '@/services/gemini'
import { getAttendancePct } from '@/utils/attendance'
import { requestNotificationPermission, showNotification } from '@/hooks/usePushNotifications'

const riskColor = {
  safe: { text: 'text-[#24a375]', bg: 'bg-[#f0fdf4] border-[#85f8c4]', icon: <CheckCircle size={16} className="text-[#24a375]" /> },
  warning: { text: 'text-amber-600', bg: 'bg-amber-50 border-amber-200', icon: <AlertTriangle size={16} className="text-amber-600" /> },
  danger: { text: 'text-[#ba1a1a]', bg: 'bg-[#fef2f2] border-[#fecaca]', icon: <AlertTriangle size={16} className="text-[#ba1a1a]" /> },
}

export default function AIPrediction() {
  const { user } = useAuthStore()
  const { addToast } = useUIStore()
  const [prediction, setPrediction] = useState<AttendancePrediction | null>(null)
  const [loading, setLoading] = useState(false)
  const [sendingNotifs, setSendingNotifs] = useState(false)

  const { data: subjects = [] } = useQuery({
    queryKey: ['subjects', user?.id],
    queryFn: () => subjectsService.getSubjects(user!.id),
    enabled: !!user?.id,
  })

  const { data: timetable = [] } = useQuery({
    queryKey: ['timetable', user?.id],
    queryFn: () => timetableService.getEntries(user!.id),
    enabled: !!user?.id,
  })

  const getClassesPerWeek = (subjectId: string) => {
    return timetable.filter(e => e.subject_id === subjectId).length || 3
  }

  const handlePredict = async () => {
    if (subjects.length === 0) {
      addToast({ type: 'warning', message: 'Add subjects first to get predictions' })
      return
    }

    setLoading(true)
    try {
      const subjectData = subjects.map(s => ({
        name: s.name,
        attended: s.attended_classes,
        total: s.total_classes,
        goal: s.attendance_goal,
        credits: s.credits,
        classesPerWeek: getClassesPerWeek(s.id),
      }))

      const result = await predictAttendance(subjectData)
      setPrediction(result)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Prediction failed'
      if (msg.includes('API key not configured')) {
        // Demo mode
        setPrediction({
          overallRisk: 'warning',
          predictedPctIn30Days: 71,
          canMissTotal: 2,
          mustAttendPerWeek: 4,
          insight: 'Your attendance is declining. You missed 3 consecutive classes in your weakest subject.',
          recommendation: 'Attend all classes this week. Focus on subjects below 75% first.',
          subjectAlerts: subjects.slice(0, 3).map((s, i) => ({
            name: s.name,
            currentPct: getAttendancePct(s.attended_classes, s.total_classes),
            predictedPct: Math.max(60, getAttendancePct(s.attended_classes, s.total_classes) - (i * 3)),
            risk: i === 0 ? 'danger' : i === 1 ? 'warning' : 'safe',
            action: i === 0 ? 'Must attend all classes this week' : i === 1 ? 'Attend at least 3 classes' : 'On track, keep it up',
          })),
        })
        addToast({ type: 'info', message: 'Demo prediction shown. Add VITE_GEMINI_API_KEY for real AI.' })
      } else {
        addToast({ type: 'error', message: msg })
      }
    } finally {
      setLoading(false)
    }
  }

  const handleSendNotifications = async () => {
    if (!prediction) return
    setSendingNotifs(true)

    try {
      const granted = await requestNotificationPermission()
      if (!granted) {
        addToast({ type: 'warning', message: 'Enable notifications in browser settings first' })
        setSendingNotifs(false)
        return
      }

      // Send notification for each at-risk subject
      const atRisk = prediction.subjectAlerts.filter(s => s.risk !== 'safe')
      for (const subject of atRisk) {
        const mustAttend = Math.max(0, Math.ceil((subject.currentPct < subject.predictedPct ? 2 : 1)))
        let message: string
        try {
          message = await generateAttendanceAlert(subject.name, subject.currentPct, 75, mustAttend)
        } catch {
          message = `⚠️ ${subject.name}: ${subject.currentPct}% — ${subject.action}`
        }
        showNotification(`Bunkwise Alert`, message, { tag: `ai-alert-${subject.name}` })
        await new Promise(r => setTimeout(r, 500)) // stagger notifications
      }

      // Overall recommendation notification
      showNotification(
        '🤖 AI Attendance Report',
        prediction.recommendation,
        { tag: 'ai-recommendation' }
      )

      addToast({ type: 'success', message: `Sent ${atRisk.length + 1} AI notifications` })
    } catch (err) {
      addToast({ type: 'error', message: 'Failed to send notifications' })
    } finally {
      setSendingNotifs(false)
    }
  }

  return (
    <AppShell>
      <PageTransition>
        <div className="max-w-2xl mx-auto">

          {/* Header */}
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-1">
              <Brain size={22} className="text-[#3b82f6]" />
              <h1 className="text-2xl font-bold text-[#091426]">AI Attendance Advisor</h1>
            </div>
            <p className="text-sm text-[#45474c]">
              "I Let an AI Decide My Attendance For 30 Days" — get your prediction
            </p>
          </div>

          {/* Predict button */}
          {!prediction ? (
            <Card className="text-center py-10">
              <motion.div
                animate={{ scale: [1, 1.05, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="w-20 h-20 bg-gradient-to-br from-[#3b82f6] to-[#091426] rounded-2xl flex items-center justify-center mx-auto mb-5"
              >
                <Brain size={36} className="text-white" />
              </motion.div>
              <h2 className="text-xl font-bold text-[#091426] mb-2">Get Your 30-Day Prediction</h2>
              <p className="text-sm text-[#45474c] mb-6 max-w-sm mx-auto">
                Gemini AI analyzes your attendance patterns and predicts where you'll be in 30 days — with personalized alerts.
              </p>
              <Button
                loading={loading}
                icon={<Sparkles size={16} />}
                onClick={handlePredict}
                size="lg"
              >
                {loading ? 'Analyzing your data...' : 'Predict My Attendance'}
              </Button>
            </Card>
          ) : (
            <AnimatePresence>
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-4"
              >
                {/* Overall prediction hero */}
                <div className={`rounded-2xl p-6 border ${riskColor[prediction.overallRisk].bg}`}>
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-wider text-[#45474c] mb-1">30-Day Prediction</p>
                      <div className="flex items-center gap-3">
                        <span className={`text-5xl font-bold ${riskColor[prediction.overallRisk].text}`}>
                          {prediction.predictedPctIn30Days}%
                        </span>
                        <div>
                          <div className="flex items-center gap-1.5">
                            {riskColor[prediction.overallRisk].icon}
                            <span className={`text-sm font-bold capitalize ${riskColor[prediction.overallRisk].text}`}>
                              {prediction.overallRisk}
                            </span>
                          </div>
                          <p className="text-xs text-[#45474c]">predicted attendance</p>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-[#45474c]">Can miss</p>
                      <p className="text-2xl font-bold text-[#091426]">{prediction.canMissTotal}</p>
                      <p className="text-xs text-[#45474c]">more classes</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 mb-4">
                    <div className="bg-white/60 rounded-xl p-3">
                      <p className="text-xs text-[#45474c] mb-0.5">Must attend/week</p>
                      <p className="text-xl font-bold text-[#091426]">{prediction.mustAttendPerWeek}</p>
                    </div>
                    <div className="bg-white/60 rounded-xl p-3">
                      <p className="text-xs text-[#45474c] mb-0.5">AI Insight</p>
                      <p className="text-xs font-medium text-[#091426] leading-tight">{prediction.insight.slice(0, 60)}...</p>
                    </div>
                  </div>

                  <div className="bg-white/60 rounded-xl p-3">
                    <p className="text-xs font-bold text-[#091426] mb-1">🤖 AI Recommendation</p>
                    <p className="text-sm text-[#45474c]">{prediction.recommendation}</p>
                  </div>
                </div>

                {/* Subject alerts */}
                <Card>
                  <h3 className="font-semibold text-[#091426] mb-4">Subject-wise Forecast</h3>
                  <div className="space-y-3">
                    {prediction.subjectAlerts.map((alert, i) => (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, x: -8 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.08 }}
                        className={`flex items-center justify-between p-3 rounded-xl border ${riskColor[alert.risk].bg}`}
                      >
                        <div className="flex items-center gap-3">
                          {riskColor[alert.risk].icon}
                          <div>
                            <p className="text-sm font-semibold text-[#091426]">{alert.name}</p>
                            <p className="text-xs text-[#45474c]">{alert.action}</p>
                          </div>
                        </div>
                        <div className="text-right shrink-0 ml-3">
                          <div className="flex items-center gap-1">
                            <span className="text-xs text-[#75777d]">{alert.currentPct}%</span>
                            {alert.predictedPct < alert.currentPct
                              ? <TrendingDown size={12} className="text-[#ba1a1a]" />
                              : <TrendingUp size={12} className="text-[#24a375]" />}
                            <span className={`text-xs font-bold ${alert.predictedPct < alert.currentPct ? 'text-[#ba1a1a]' : 'text-[#24a375]'}`}>
                              {alert.predictedPct}%
                            </span>
                          </div>
                          <p className="text-[10px] text-[#75777d]">in 30 days</p>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </Card>

                {/* Action buttons */}
                <div className="flex gap-3">
                  <Button
                    variant="secondary"
                    icon={<RefreshCw size={15} />}
                    className="flex-1"
                    onClick={() => { setPrediction(null) }}
                  >
                    Re-analyze
                  </Button>
                  <Button
                    icon={<Bell size={15} />}
                    className="flex-1"
                    loading={sendingNotifs}
                    onClick={handleSendNotifications}
                  >
                    Send AI Alerts
                  </Button>
                </div>

                <p className="text-center text-xs text-[#9ca3af]">
                  Powered by Google Gemini · Predictions based on current attendance patterns
                </p>
              </motion.div>
            </AnimatePresence>
          )}
        </div>
      </PageTransition>
    </AppShell>
  )
}
