import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Upload, FileSpreadsheet, Image, CheckCircle,
  AlertTriangle, Trash2, Plus, ArrowRight, X, FileText
} from 'lucide-react'
import { AppShell } from '@/components/layout/AppShell'
import { PageTransition } from '@/components/motion/PageTransition'
import { Button } from '@/components/ui/Button'
import { useAuthStore } from '@/store/authStore'
import { useUIStore } from '@/store/uiStore'
import { subjectsService } from '@/services/subjects'
import { timetableService } from '@/services/timetable'
import {
  parseExcelFile, parseCsvFile, parseTextSubjects,
  type ImportResult, type ParsedSubject, type ParsedScheduleEntry
} from '@/services/timetableImport'
import { SUBJECT_COLORS, DAYS } from '@/utils/attendance'

type Step = 'upload' | 'review' | 'importing' | 'done'

export default function ImportTimetable() {
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const { addToast } = useUIStore()
  const queryClient = useQueryClient()
  const fileRef = useRef<HTMLInputElement>(null)
  const textRef = useRef<HTMLTextAreaElement>(null)

  const [step, setStep] = useState<Step>('upload')
  const [result, setResult] = useState<ImportResult | null>(null)
  const [subjects, setSubjects] = useState<ParsedSubject[]>([])
  const [schedule, setSchedule] = useState<ParsedScheduleEntry[]>([])
  const [importing, setImporting] = useState(false)
  const [importedCount, setImportedCount] = useState(0)
  const [dragOver, setDragOver] = useState(false)
  const [textMode, setTextMode] = useState(false)
  const [textInput, setTextInput] = useState('')

  const handleFile = async (file: File) => {
    try {
      let parsed: ImportResult
      const ext = file.name.split('.').pop()?.toLowerCase()

      if (ext === 'xlsx' || ext === 'xls') {
        parsed = await parseExcelFile(file)
      } else if (ext === 'csv') {
        parsed = await parseCsvFile(file)
      } else {
        addToast({ type: 'error', message: 'Unsupported file. Use .xlsx, .xls, or .csv' })
        return
      }

      setResult(parsed)
      setSubjects(parsed.subjects.map((s, i) => ({
        ...s,
        color: SUBJECT_COLORS[i % SUBJECT_COLORS.length],
      })))
      setSchedule(parsed.schedule)
      setStep('review')

      if (parsed.warnings.length > 0) {
        addToast({ type: 'warning', message: `Parsed with ${parsed.warnings.length} warning(s)` })
      }
    } catch (err) {
      console.error(err)
      addToast({ type: 'error', message: 'Failed to parse file. Check the format.' })
    }
  }

  const handleTextImport = () => {
    if (!textInput.trim()) return
    const parsed = parseTextSubjects(textInput)
    setSubjects(parsed.map((s, i) => ({ ...s, color: SUBJECT_COLORS[i % SUBJECT_COLORS.length] })))
    setSchedule([])
    setResult({ subjects: parsed, schedule: [], raw: [], warnings: [] })
    setStep('review')
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }

  const doImport = async () => {
    if (!user) return
    setImporting(true)
    setStep('importing')
    let count = 0

    try {
      // Create subjects and build name→id map
      const subjectIdMap = new Map<string, string>()

      for (const sub of subjects) {
        const created = await subjectsService.createSubject(user.id, {
          name: sub.name,
          credits: sub.credits,
          attendance_goal: sub.attendance_goal,
          attended_classes: 0,
          total_classes: 0,
          color: (sub as ParsedSubject & { color?: string }).color || SUBJECT_COLORS[0],
          icon: null,
          notes: null,
        })
        subjectIdMap.set(sub.name, created.id)
        count++
        setImportedCount(count)
      }

      // Create timetable entries
      for (const entry of schedule) {
        const subjectId = subjectIdMap.get(entry.subject_name)
        if (!subjectId) continue
        await timetableService.addEntry({
          user_id: user.id,
          subject_id: subjectId,
          day_of_week: entry.day_of_week,
          start_time: entry.start_time,
          end_time: entry.end_time,
          room: entry.room || null,
        })
      }

      queryClient.invalidateQueries({ queryKey: ['subjects'] })
      queryClient.invalidateQueries({ queryKey: ['timetable'] })
      setStep('done')
    } catch (err) {
      console.error(err)
      addToast({ type: 'error', message: 'Import failed. Some subjects may have been created.' })
      setStep('review')
    } finally {
      setImporting(false)
    }
  }

  return (
    <AppShell showBack title="Import Timetable">
      <PageTransition>
        <div className="max-w-2xl mx-auto">

          {/* Progress steps */}
          <div className="flex items-center gap-2 mb-8">
            {(['upload', 'review', 'done'] as const).map((s, i) => (
              <div key={s} className="flex items-center gap-2">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                  step === s ? 'bg-[#091426] text-white' :
                  (step === 'review' && s === 'upload') || step === 'done' ? 'bg-[#85f8c4] text-[#002114]' :
                  'bg-[#f2f4f6] text-[#9ca3af]'
                }`}>
                  {(step === 'review' && s === 'upload') || step === 'done' && s !== 'done'
                    ? <CheckCircle size={14} />
                    : i + 1}
                </div>
                <span className={`text-xs font-semibold capitalize ${step === s ? 'text-[#091426]' : 'text-[#9ca3af]'}`}>
                  {s}
                </span>
                {i < 2 && <div className="w-8 h-px bg-[#e6e8ea]" />}
              </div>
            ))}
          </div>

          <AnimatePresence mode="wait">

            {/* ── STEP 1: Upload ── */}
            {step === 'upload' && (
              <motion.div key="upload" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                <div className="mb-6">
                  <h1 className="text-2xl font-bold text-[#091426]">Import Your Timetable</h1>
                  <p className="text-sm text-[#45474c] mt-1">Upload an Excel/CSV file or paste subject names to auto-create subjects and schedule</p>
                </div>

                {/* Toggle */}
                <div className="flex gap-2 mb-5">
                  <button onClick={() => setTextMode(false)}
                    className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all ${!textMode ? 'bg-[#091426] text-white' : 'bg-[#f2f4f6] text-[#45474c]'}`}>
                    📄 File Upload
                  </button>
                  <button onClick={() => setTextMode(true)}
                    className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all ${textMode ? 'bg-[#091426] text-white' : 'bg-[#f2f4f6] text-[#45474c]'}`}>
                    ✏️ Paste Subjects
                  </button>
                </div>

                {!textMode ? (
                  <>
                    {/* Drop zone */}
                    <motion.div
                      onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
                      onDragLeave={() => setDragOver(false)}
                      onDrop={handleDrop}
                      onClick={() => fileRef.current?.click()}
                      animate={{ borderColor: dragOver ? '#091426' : '#c5c6cd', backgroundColor: dragOver ? '#f0f4ff' : '#fafafa' }}
                      className="border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-colors"
                    >
                      <div className="w-14 h-14 bg-[#f2f4f6] rounded-2xl flex items-center justify-center mx-auto mb-4">
                        <Upload size={26} className="text-[#45474c]" />
                      </div>
                      <p className="font-semibold text-[#091426] mb-1">Drop your timetable file here</p>
                      <p className="text-sm text-[#75777d] mb-4">or click to browse</p>
                      <div className="flex items-center justify-center gap-3">
                        <span className="flex items-center gap-1.5 text-xs bg-white border border-[#c5c6cd] px-3 py-1.5 rounded-lg text-[#45474c]">
                          <FileSpreadsheet size={13} /> .xlsx / .xls
                        </span>
                        <span className="flex items-center gap-1.5 text-xs bg-white border border-[#c5c6cd] px-3 py-1.5 rounded-lg text-[#45474c]">
                          <FileText size={13} /> .csv
                        </span>
                      </div>
                      <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" className="hidden"
                        onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f) }} />
                    </motion.div>

                    {/* Format guide */}
                    <div className="mt-5 bg-[#f7f9fb] border border-[#e6e8ea] rounded-xl p-4">
                      <p className="text-xs font-bold text-[#45474c] uppercase tracking-wider mb-3">Expected Format</p>
                      <div className="overflow-x-auto">
                        <table className="text-xs w-full">
                          <thead>
                            <tr className="text-[#75777d]">
                              {['Day', 'Subject', 'Start Time', 'End Time', 'Room'].map(h => (
                                <th key={h} className="text-left py-1 pr-4 font-semibold">{h}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody className="text-[#45474c]">
                            {[
                              ['Monday', 'Mathematics', '9:00 AM', '10:00 AM', 'LH-301'],
                              ['Tuesday', 'Physics', '11:00 AM', '12:00 PM', 'Lab-2'],
                              ['Wednesday', 'Chemistry', '2:00 PM', '3:00 PM', ''],
                            ].map((row, i) => (
                              <tr key={i}>
                                {row.map((cell, j) => <td key={j} className="py-1 pr-4">{cell || '—'}</td>)}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                      <p className="text-xs text-[#75777d] mt-2">Also supports grid timetables where columns = days and rows = time slots.</p>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="bg-white border border-[#c5c6cd] rounded-2xl p-5 ambient-shadow">
                      <label className="block text-xs font-semibold uppercase tracking-wider text-[#45474c] mb-2">
                        Paste subject names (one per line)
                      </label>
                      <textarea
                        ref={textRef}
                        value={textInput}
                        onChange={e => setTextInput(e.target.value)}
                        placeholder={"Mathematics\nPhysics\nChemistry\nEnglish\nComputer Science"}
                        rows={8}
                        className="w-full border border-[#c5c6cd] rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#091426] resize-none"
                      />
                      <p className="text-xs text-[#75777d] mt-2">Subjects will be created with default settings. You can edit them later.</p>
                    </div>
                    <Button className="w-full mt-4" onClick={handleTextImport} disabled={!textInput.trim()}>
                      Parse Subjects
                    </Button>
                  </>
                )}
              </motion.div>
            )}

            {/* ── STEP 2: Review ── */}
            {step === 'review' && result && (
              <motion.div key="review" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="text-xl font-bold text-[#091426]">Review & Confirm</h2>
                    <p className="text-sm text-[#45474c] mt-0.5">
                      {subjects.length} subject{subjects.length !== 1 ? 's' : ''} · {schedule.length} schedule entries
                    </p>
                  </div>
                  <button onClick={() => setStep('upload')} className="text-xs text-[#75777d] hover:text-[#091426] flex items-center gap-1">
                    <X size={13} /> Start over
                  </button>
                </div>

                {/* Warnings */}
                {result.warnings.length > 0 && (
                  <div className="mb-4 bg-amber-50 border border-amber-200 rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <AlertTriangle size={15} className="text-amber-600" />
                      <p className="text-xs font-bold text-amber-700 uppercase tracking-wider">Warnings</p>
                    </div>
                    {result.warnings.map((w, i) => (
                      <p key={i} className="text-xs text-amber-700">{w}</p>
                    ))}
                  </div>
                )}

                {/* Subjects list */}
                <div className="bg-white border border-[#c5c6cd] rounded-2xl overflow-hidden ambient-shadow mb-4">
                  <div className="px-5 py-3 border-b border-[#f2f4f6] flex items-center justify-between">
                    <h3 className="font-semibold text-[#091426] text-sm">Subjects to Create</h3>
                    <span className="text-xs text-[#75777d]">{subjects.length} total</span>
                  </div>
                  <div className="divide-y divide-[#f2f4f6] max-h-64 overflow-y-auto scrollbar-hide">
                    {subjects.map((sub, i) => (
                      <div key={i} className="flex items-center gap-3 px-5 py-3">
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-bold shrink-0"
                          style={{ backgroundColor: (sub as ParsedSubject & { color?: string }).color || SUBJECT_COLORS[i % SUBJECT_COLORS.length] }}>
                          {sub.name[0]}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-[#091426] truncate">{sub.name}</p>
                          <p className="text-xs text-[#75777d]">{sub.credits} credits · Goal: {sub.attendance_goal}%</p>
                        </div>
                        <button onClick={() => setSubjects(s => s.filter((_, j) => j !== i))}
                          className="p-1 rounded-lg text-[#75777d] hover:bg-[#ffdad6] hover:text-[#ba1a1a] transition-colors">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Schedule preview */}
                {schedule.length > 0 && (
                  <div className="bg-white border border-[#c5c6cd] rounded-2xl overflow-hidden ambient-shadow mb-6">
                    <div className="px-5 py-3 border-b border-[#f2f4f6] flex items-center justify-between">
                      <h3 className="font-semibold text-[#091426] text-sm">Schedule Entries</h3>
                      <span className="text-xs text-[#75777d]">{schedule.length} classes</span>
                    </div>
                    <div className="divide-y divide-[#f2f4f6] max-h-48 overflow-y-auto scrollbar-hide">
                      {schedule.map((entry, i) => (
                        <div key={i} className="flex items-center justify-between px-5 py-2.5">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-semibold text-[#3b82f6] w-8">{DAYS[entry.day_of_week].slice(0, 3)}</span>
                            <span className="text-sm text-[#091426]">{entry.subject_name}</span>
                            {entry.room && <span className="text-xs text-[#75777d]">· {entry.room}</span>}
                          </div>
                          <span className="text-xs text-[#75777d]">{entry.start_time} – {entry.end_time}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex gap-3">
                  <Button variant="secondary" className="flex-1" onClick={() => setStep('upload')}>
                    Back
                  </Button>
                  <Button
                    className="flex-1"
                    icon={<ArrowRight size={16} />}
                    disabled={subjects.length === 0}
                    onClick={doImport}
                  >
                    Import {subjects.length} Subject{subjects.length !== 1 ? 's' : ''}
                  </Button>
                </div>
              </motion.div>
            )}

            {/* ── STEP 3: Importing ── */}
            {step === 'importing' && (
              <motion.div key="importing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-16">
                <div className="w-16 h-16 bg-[#091426] rounded-2xl flex items-center justify-center mx-auto mb-6 animate-pulse">
                  <Upload size={28} className="text-white" />
                </div>
                <h2 className="text-xl font-bold text-[#091426] mb-2">Importing...</h2>
                <p className="text-sm text-[#45474c]">Created {importedCount} of {subjects.length} subjects</p>
                <div className="w-48 bg-[#f2f4f6] rounded-full h-2 mx-auto mt-4 overflow-hidden">
                  <motion.div
                    className="h-full bg-[#091426] rounded-full"
                    animate={{ width: `${subjects.length > 0 ? (importedCount / subjects.length) * 100 : 0}%` }}
                    transition={{ duration: 0.3 }}
                  />
                </div>
              </motion.div>
            )}

            {/* ── STEP 4: Done ── */}
            {step === 'done' && (
              <motion.div key="done" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="text-center py-12">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', stiffness: 300, damping: 20, delay: 0.1 }}
                  className="w-20 h-20 bg-[#85f8c4] rounded-2xl flex items-center justify-center mx-auto mb-6"
                >
                  <CheckCircle size={36} className="text-[#002114]" />
                </motion.div>
                <h2 className="text-2xl font-bold text-[#091426] mb-2">Import Complete!</h2>
                <p className="text-sm text-[#45474c] mb-2">
                  {subjects.length} subject{subjects.length !== 1 ? 's' : ''} created
                  {schedule.length > 0 ? ` · ${schedule.length} schedule entries added` : ''}
                </p>
                <p className="text-xs text-[#75777d] mb-8">Your dashboard and schedule are now updated.</p>
                <div className="flex gap-3 justify-center">
                  <Button variant="secondary" onClick={() => navigate('/subjects')}>
                    View Subjects
                  </Button>
                  <Button onClick={() => navigate('/schedule')}>
                    View Schedule
                  </Button>
                </div>
              </motion.div>
            )}

          </AnimatePresence>
        </div>
      </PageTransition>
    </AppShell>
  )
}
