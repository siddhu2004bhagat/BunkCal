import * as XLSX from 'xlsx'

export interface ParsedSubject {
  name: string
  credits: number
  attendance_goal: number
}

export interface ParsedScheduleEntry {
  subject_name: string
  day_of_week: number   // 0=Sun … 6=Sat
  start_time: string    // HH:MM
  end_time: string      // HH:MM
  room?: string
}

export interface ImportResult {
  subjects: ParsedSubject[]
  schedule: ParsedScheduleEntry[]
  raw: string[][]
  warnings: string[]
}

// ─── Day name → index ────────────────────────────────────────────────────────
const DAY_MAP: Record<string, number> = {
  sun: 0, sunday: 0,
  mon: 1, monday: 1,
  tue: 2, tuesday: 2,
  wed: 3, wednesday: 3,
  thu: 4, thursday: 4, thur: 4, thurs: 4,
  fri: 5, friday: 5,
  sat: 6, saturday: 6,
}

function parseDay(val: string): number | null {
  const key = val.trim().toLowerCase().replace(/[^a-z]/g, '')
  return DAY_MAP[key] ?? null
}

// ─── Time string → HH:MM ─────────────────────────────────────────────────────
function parseTime(val: string): string | null {
  if (!val) return null
  const s = val.trim()

  // Already HH:MM or H:MM
  const hhmm = s.match(/^(\d{1,2}):(\d{2})$/)
  if (hhmm) return `${hhmm[1].padStart(2, '0')}:${hhmm[2]}`

  // 9:00 AM / 9:00 PM
  const ampm = s.match(/^(\d{1,2})(?::(\d{2}))?\s*(am|pm)$/i)
  if (ampm) {
    let h = parseInt(ampm[1])
    const m = ampm[2] ? parseInt(ampm[2]) : 0
    const period = ampm[3].toLowerCase()
    if (period === 'pm' && h !== 12) h += 12
    if (period === 'am' && h === 12) h = 0
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
  }

  // 0900 or 900
  const compact = s.match(/^(\d{3,4})$/)
  if (compact) {
    const n = compact[1].padStart(4, '0')
    return `${n.slice(0, 2)}:${n.slice(2)}`
  }

  return null
}

// ─── Parse Excel / CSV ───────────────────────────────────────────────────────
export async function parseExcelFile(file: File): Promise<ImportResult> {
  const buffer = await file.arrayBuffer()
  const wb = XLSX.read(buffer, { type: 'array' })
  const ws = wb.Sheets[wb.SheetNames[0]]
  const raw: string[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' }) as string[][]

  return parseRawTable(raw)
}

export async function parseCsvFile(file: File): Promise<ImportResult> {
  const text = await file.text()
  const raw: string[][] = text
    .split('\n')
    .map(row => row.split(',').map(c => c.trim().replace(/^"|"$/g, '')))
  return parseRawTable(raw)
}

// ─── Core table parser ───────────────────────────────────────────────────────
function parseRawTable(raw: string[][]): ImportResult {
  const warnings: string[] = []
  const subjectMap = new Map<string, ParsedSubject>()
  const schedule: ParsedScheduleEntry[] = []

  if (raw.length === 0) {
    return { subjects: [], schedule: [], raw, warnings: ['Empty file'] }
  }

  // Detect format:
  // Format A: Day | Subject | Start | End | Room  (row per class)
  // Format B: Timetable grid — first row = days, first col = time slots

  const header = raw[0].map(c => String(c).toLowerCase().trim())
  const hasDay = header.some(h => h.includes('day'))
  const hasSubject = header.some(h => h.includes('subject') || h.includes('course') || h.includes('class'))
  const hasTime = header.some(h => h.includes('time') || h.includes('start'))

  if (hasDay && hasSubject) {
    // ── Format A: columnar list ──
    const dayCol = header.findIndex(h => h.includes('day'))
    const subCol = header.findIndex(h => h.includes('subject') || h.includes('course') || h.includes('class'))
    const startCol = header.findIndex(h => h.includes('start') || h.includes('from') || h.includes('time'))
    const endCol = header.findIndex(h => h.includes('end') || h.includes('to'))
    const roomCol = header.findIndex(h => h.includes('room') || h.includes('venue') || h.includes('location'))
    const creditsCol = header.findIndex(h => h.includes('credit'))

    for (let i = 1; i < raw.length; i++) {
      const row = raw[i]
      if (!row || row.every(c => !c)) continue

      const subjectName = String(row[subCol] || '').trim()
      if (!subjectName) continue

      const dayIdx = parseDay(String(row[dayCol] || ''))
      if (dayIdx === null) {
        warnings.push(`Row ${i + 1}: Could not parse day "${row[dayCol]}"`)
        continue
      }

      const startTime = parseTime(String(row[startCol] || ''))
      const endTime = endCol >= 0 ? parseTime(String(row[endCol] || '')) : null

      if (!startTime) {
        warnings.push(`Row ${i + 1}: Could not parse start time "${row[startCol]}"`)
        continue
      }

      // Add subject if not seen
      if (!subjectMap.has(subjectName)) {
        subjectMap.set(subjectName, {
          name: subjectName,
          credits: creditsCol >= 0 ? parseInt(String(row[creditsCol])) || 4 : 4,
          attendance_goal: 75,
        })
      }

      schedule.push({
        subject_name: subjectName,
        day_of_week: dayIdx,
        start_time: startTime,
        end_time: endTime || addOneHour(startTime),
        room: roomCol >= 0 ? String(row[roomCol] || '').trim() || undefined : undefined,
      })
    }
  } else {
    // ── Format B: grid timetable ──
    // Row 0: headers (days or time slots)
    // Try to detect if first row has day names
    const firstRowDays = raw[0].map(c => parseDay(String(c)))
    const hasDaysInHeader = firstRowDays.filter(d => d !== null).length >= 3

    if (hasDaysInHeader) {
      // Columns = days, rows = time slots
      for (let col = 1; col < raw[0].length; col++) {
        const dayIdx = firstRowDays[col]
        if (dayIdx === null) continue

        for (let row = 1; row < raw.length; row++) {
          const cell = String(raw[row][col] || '').trim()
          if (!cell) continue

          const timeCell = String(raw[row][0] || '').trim()
          const startTime = parseTime(timeCell) || `${String(8 + row - 1).padStart(2, '0')}:00`

          // Cell may contain "Subject (Room)" or just "Subject"
          const roomMatch = cell.match(/\(([^)]+)\)/)
          const room = roomMatch ? roomMatch[1].trim() : undefined
          const subjectName = cell.replace(/\([^)]+\)/, '').trim()

          if (!subjectName) continue

          if (!subjectMap.has(subjectName)) {
            subjectMap.set(subjectName, { name: subjectName, credits: 4, attendance_goal: 75 })
          }

          schedule.push({
            subject_name: subjectName,
            day_of_week: dayIdx,
            start_time: startTime,
            end_time: addOneHour(startTime),
            room,
          })
        }
      }
    } else {
      // Fallback: treat each non-empty cell as a subject name
      warnings.push('Could not detect timetable format. Extracting subject names only.')
      const seen = new Set<string>()
      for (const row of raw) {
        for (const cell of row) {
          const name = String(cell || '').trim()
          if (name && name.length > 1 && !seen.has(name) && isNaN(Number(name))) {
            seen.add(name)
            subjectMap.set(name, { name, credits: 4, attendance_goal: 75 })
          }
        }
      }
    }
  }

  if (subjectMap.size === 0) {
    warnings.push('No subjects could be extracted. Check the file format.')
  }

  return {
    subjects: Array.from(subjectMap.values()),
    schedule,
    raw,
    warnings,
  }
}

function addOneHour(time: string): string {
  const [h, m] = time.split(':').map(Number)
  return `${String((h + 1) % 24).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

// ─── Manual subject list parser (plain text) ─────────────────────────────────
export function parseTextSubjects(text: string): ParsedSubject[] {
  return text
    .split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 1)
    .map(name => ({ name, credits: 4, attendance_goal: 75 }))
}
