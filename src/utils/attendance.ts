export function getAttendancePct(attended: number, total: number): number {
  if (total === 0) return 0
  return Math.round((attended / total) * 100)
}

export function getAttendanceStatus(pct: number, goal: number): 'safe' | 'warning' | 'danger' {
  if (pct >= goal) return 'safe'
  if (pct >= goal - 5) return 'warning'
  return 'danger'
}

export function getStatusColor(status: 'safe' | 'warning' | 'danger') {
  switch (status) {
    case 'safe': return 'text-[#24a375]'
    case 'warning': return 'text-amber-600'
    case 'danger': return 'text-[#ba1a1a]'
  }
}

export function getStatusBg(status: 'safe' | 'warning' | 'danger') {
  switch (status) {
    case 'safe': return 'bg-[#85f8c4] text-[#002114]'
    case 'warning': return 'bg-amber-100 text-amber-800'
    case 'danger': return 'bg-[#ffdad6] text-[#93000a]'
  }
}

export function getProgressColor(status: 'safe' | 'warning' | 'danger') {
  switch (status) {
    case 'safe': return 'bg-[#24a375]'
    case 'warning': return 'bg-amber-500'
    case 'danger': return 'bg-[#ba1a1a]'
  }
}

export const SUBJECT_COLORS = [
  '#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b',
  '#10b981', '#ef4444', '#06b6d4', '#f97316',
]

export const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
export const SHORT_DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
