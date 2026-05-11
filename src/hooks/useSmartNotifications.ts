import { useEffect, useRef } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useAuthStore } from '@/store/authStore'
import { subjectsService } from '@/services/subjects'
import { proxyService } from '@/services/proxy'
import { showNotification, requestNotificationPermission } from '@/hooks/usePushNotifications'
import { getAttendancePct, getAttendanceStatus } from '@/utils/attendance'
import { calculateBunks } from '@/services/calculator'

const LAST_CHECK_KEY = 'bunkwise-last-smart-notif'
const CHECK_INTERVAL_MS = 4 * 60 * 60 * 1000 // 4 hours

function getTodayKey() {
  return new Date().toDateString()
}

function getHour() {
  return new Date().getHours()
}

export function useSmartNotifications() {
  const { user } = useAuthStore()
  const hasRun = useRef(false)

  useEffect(() => {
    if (!user?.id || hasRun.current) return
    hasRun.current = true

    // Only run between 8 AM and 10 PM
    const hour = getHour()
    if (hour < 8 || hour > 22) return

    // Throttle: don't run more than once per 4 hours
    const lastCheck = localStorage.getItem(LAST_CHECK_KEY)
    if (lastCheck && Date.now() - parseInt(lastCheck) < CHECK_INTERVAL_MS) return

    // Run after a short delay so app loads first
    const timer = setTimeout(() => runSmartChecks(user.id), 5000)
    return () => clearTimeout(timer)
  }, [user?.id])
}

async function runSmartChecks(userId: string) {
  // Check if notifications are permitted
  const permitted = Notification.permission === 'granted'
  if (!permitted) return // Don't request permission automatically — user must opt in via Settings

  localStorage.setItem(LAST_CHECK_KEY, String(Date.now()))

  try {
    const [subjects, ledger, transactions] = await Promise.all([
      subjectsService.getSubjects(userId),
      proxyService.getLedger(userId),
      proxyService.getTransactions(userId),
    ])

    const todayName = new Date().toLocaleDateString('en-IN', { weekday: 'long' })
    const hour = getHour()

    // ── 1. Attendance warnings ────────────────────────────────────────────────
    const dangerSubjects = subjects.filter(s => {
      const pct = getAttendancePct(s.attended_classes, s.total_classes)
      return getAttendanceStatus(pct, s.attendance_goal) === 'danger'
    })

    const warningSubjects = subjects.filter(s => {
      const pct = getAttendancePct(s.attended_classes, s.total_classes)
      return getAttendanceStatus(pct, s.attendance_goal) === 'warning'
    })

    // Morning reminder (8-10 AM): which classes to attend today
    if (hour >= 8 && hour <= 10 && (dangerSubjects.length > 0 || warningSubjects.length > 0)) {
      const atRisk = [...dangerSubjects, ...warningSubjects].slice(0, 3)
      const names = atRisk.map(s => s.name).join(', ')

      showNotification(
        '📚 Attend Today — Bunkwise',
        `Low attendance in ${names}. Attend today's classes to stay safe!`,
        { tag: 'morning-reminder' }
      )
    }

    // Danger alert (any time): subjects critically low
    if (dangerSubjects.length > 0) {
      for (const s of dangerSubjects.slice(0, 2)) {
        const pct = getAttendancePct(s.attended_classes, s.total_classes)
        const { mustAttend } = calculateBunks(s.attended_classes, s.total_classes, s.attendance_goal)

        showNotification(
          `⚠️ ${s.name} — Critical`,
          `${pct}% attendance. Must attend ${mustAttend} more class${mustAttend !== 1 ? 'es' : ''} to reach ${s.attendance_goal}%.`,
          { tag: `danger-${s.id}` }
        )

        // Stagger notifications
        await new Promise(r => setTimeout(r, 1000))
      }
    }

    // ── 2. Proxy reminders ────────────────────────────────────────────────────
    // Friends who owe you proxies for a long time
    const overdueOwed = ledger.filter(l => {
      if (l.balance <= 0) return false
      // Check if last transaction was more than 7 days ago
      const lastTxn = transactions
        .filter(t => t.ledger_id === l.id)
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0]
      if (!lastTxn) return false
      const daysSince = (Date.now() - new Date(lastTxn.created_at).getTime()) / (1000 * 60 * 60 * 24)
      return daysSince > 7
    })

    if (overdueOwed.length > 0) {
      const names = overdueOwed.map(l => l.contact_name).join(', ')
      showNotification(
        '🤝 Proxy Reminder — Bunkwise',
        `${names} still owe${overdueOwed.length === 1 ? 's' : ''} you ${overdueOwed.reduce((s, l) => s + l.balance, 0)} proxy class${overdueOwed.reduce((s, l) => s + l.balance, 0) !== 1 ? 'es' : ''}. Time to collect!`,
        { tag: 'proxy-overdue' }
      )
    }

    // ── 3. Evening summary (6-8 PM) ───────────────────────────────────────────
    if (hour >= 18 && hour <= 20) {
      const totalCanMiss = subjects.reduce((sum, s) => {
        const { canMiss } = calculateBunks(s.attended_classes, s.total_classes, s.attendance_goal)
        return sum + canMiss
      }, 0)

      const overallPct = subjects.length > 0
        ? Math.round(subjects.reduce((sum, s) => sum + getAttendancePct(s.attended_classes, s.total_classes), 0) / subjects.length)
        : 0

      if (overallPct > 0) {
        showNotification(
          `📊 ${todayName} Summary — Bunkwise`,
          `Overall: ${overallPct}% attendance. You can still miss ${totalCanMiss} class${totalCanMiss !== 1 ? 'es' : ''} safely.`,
          { tag: 'evening-summary' }
        )
      }
    }

  } catch (err) {
    console.warn('[SmartNotifications] Error:', err)
  }
}

// Export for manual trigger (e.g. from Settings)
export async function triggerSmartNotifications(userId: string) {
  const granted = await requestNotificationPermission()
  if (!granted) return false

  // Reset throttle for manual trigger
  localStorage.removeItem(LAST_CHECK_KEY)
  await runSmartChecks(userId)
  return true
}
