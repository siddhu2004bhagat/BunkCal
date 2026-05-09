import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { motion, AnimatePresence } from 'framer-motion'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowLeftRight } from 'lucide-react'
import { AppShell } from '@/components/layout/AppShell'
import { PageTransition } from '@/components/motion/PageTransition'
import { AnimatedCounter } from '@/components/motion/AnimatedCounter'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { useAuthStore } from '@/store/authStore'
import { useUIStore } from '@/store/uiStore'
import { calculatorService, calculateBunks } from '@/services/calculator'
import { subjectsService } from '@/services/subjects'

const schema = z.object({
  subject_name: z.string().min(1, 'Subject name required'),
  attended: z.coerce.number().min(0),
  total: z.coerce.number().min(1, 'Total must be at least 1'),
  target: z.coerce.number().min(50).max(100),
})
type FormData = z.infer<typeof schema>

interface Result {
  currentPct: number
  canMiss: number
  mustAttend: number
  subjectName: string
}

// "Send To" contact selector — from offering_calculator_pro
const MOCK_CONTACTS = [
  { id: 'a', name: 'Aryan', role: 'Class Representative' },
  { id: 'i', name: 'Ishani', role: 'Attendance Monitor' },
  { id: 'r', name: 'Rahul', role: 'Proxy Specialist' },
]

export default function OfferingCalculator() {
  const { user } = useAuthStore()
  const { addToast } = useUIStore()
  const queryClient = useQueryClient()
  const [result, setResult] = useState<Result | null>(null)
  const [selectedContact, setSelectedContact] = useState('i')

  const { data: subjects = [] } = useQuery({
    queryKey: ['subjects', user?.id],
    queryFn: () => subjectsService.getSubjects(user!.id),
    enabled: !!user?.id,
  })

  const { data: history = [] } = useQuery({
    queryKey: ['calculator-history', user?.id],
    queryFn: () => calculatorService.getHistory(user!.id),
    enabled: !!user?.id,
  })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema) as any,
    defaultValues: { target: 75 },
  })

  const targetVal = watch('target') || 75

  const saveMutation = useMutation({
    mutationFn: (data: Parameters<typeof calculatorService.saveCalculation>[0]) =>
      calculatorService.saveCalculation(data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['calculator-history'] }),
  })

  const onSubmit = (data: FormData) => {
    const { currentPct, canMiss, mustAttend } = calculateBunks(data.attended, data.total, data.target)
    setResult({ currentPct, canMiss, mustAttend, subjectName: data.subject_name })
    saveMutation.mutate({
      user_id: user!.id,
      subject_name: data.subject_name,
      attended: data.attended,
      total: data.total,
      target: data.target,
      can_miss: canMiss,
      must_attend: mustAttend,
    })
  }

  return (
    <AppShell>
      <PageTransition>

        {/* Header — matches "Trade for Attendance" style */}
        <div className="mb-10">
          <h2 className="text-4xl font-bold text-[#091426] mb-1">Trade for Attendance</h2>
          <p className="text-lg text-[#45474c]">Verify your offering to secure institutional proxy credits.</p>
        </div>

        {/* Bento Grid — 12 col */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

          {/* Calculator Form — col-span-7 */}
          <section className="lg:col-span-7 bg-white border border-[#c5c6cd] rounded-xl p-6 ambient-shadow">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-[#091426]">Calculate Bunks</h3>
              <span className="text-xs font-semibold bg-[#d0e1fb] text-[#54647a] px-3 py-1 rounded-full">CALCULATOR</span>
            </div>

            {/* Quick fill chips */}
            {subjects.length > 0 && (
              <div className="mb-6">
                <p className="text-xs font-semibold uppercase tracking-wider text-[#45474c] mb-2">Quick Fill</p>
                <div className="flex gap-2 flex-wrap">
                  {subjects.map((s) => (
                    <motion.button
                      key={s.id}
                      type="button"
                      whileTap={{ scale: 0.95 }}
                      onClick={() => {
                        setValue('subject_name', s.name)
                        setValue('attended', s.attended_classes)
                        setValue('total', s.total_classes)
                        setValue('target', s.attendance_goal)
                      }}
                      className="text-xs px-3 py-1.5 bg-[#f2f4f6] text-[#091426] rounded-lg hover:bg-[#e6e8ea] transition-colors font-medium"
                    >
                      {s.name}
                    </motion.button>
                  ))}
                </div>
              </div>
            )}

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
              <Input label="Subject Name" placeholder="e.g. Advanced Mathematics" error={errors.subject_name?.message} {...register('subject_name')} />
              <div className="grid grid-cols-2 gap-4">
                <Input label="Classes Attended" type="number" placeholder="0" error={errors.attended?.message} {...register('attended')} />
                <Input label="Total Classes" type="number" placeholder="0" error={errors.total?.message} {...register('total')} />
              </div>

              {/* Target selector — matches original goal button grid */}
              <div>
                <label className="block text-xs font-semibold tracking-wider uppercase text-[#45474c] mb-2">Target Attendance</label>
                <div className="grid grid-cols-4 gap-2">
                  {[75, 80, 85, 90].map((t) => (
                    <motion.button
                      key={t}
                      type="button"
                      whileTap={{ scale: 0.95 }}
                      onClick={() => setValue('target', t)}
                      className={`py-2.5 rounded text-sm font-semibold border transition-all ${
                        targetVal === t
                          ? 'bg-[#091426] text-white border-[#091426]'
                          : 'border-[#c5c6cd] text-[#45474c] hover:bg-[#091426] hover:text-white hover:border-[#091426]'
                      }`}
                    >
                      {t}%
                    </motion.button>
                  ))}
                </div>
              </div>

              <Button type="submit" className="w-full" size="lg">
                Calculate
              </Button>
            </form>
          </section>

          {/* Right column — col-span-5 */}
          <div className="lg:col-span-5 flex flex-col gap-6">

            {/* Result / Estimated Value Card — dark navy like original */}
            <AnimatePresence mode="wait">
              {result ? (
                <motion.div
                  key="result"
                  initial={{ opacity: 0, scale: 0.95, y: 10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.3 }}
                  className="bg-[#091426] text-white rounded-xl p-6 ambient-shadow flex-1 flex flex-col justify-between"
                >
                  <div>
                    <h3 className="text-lg font-semibold opacity-90 mb-1">Estimated Value</h3>
                    <div className="flex items-end gap-2 my-10">
                      <span className="text-6xl font-bold leading-none">
                        <AnimatedCounter value={result.canMiss} />
                      </span>
                      <span className="text-xl font-semibold mb-1">Classes Safe</span>
                    </div>
                    <div className="grid grid-cols-2 gap-3 mb-6">
                      <div className="bg-[#1e293b] rounded-xl p-4">
                        <p className="text-xs text-[#8590a6] mb-1">Current</p>
                        <p className="text-2xl font-bold text-[#85f8c4]">
                          <AnimatedCounter value={Math.round(result.currentPct)} suffix="%" />
                        </p>
                      </div>
                      <div className="bg-[#1e293b] rounded-xl p-4">
                        <p className="text-xs text-[#8590a6] mb-1">Must Attend</p>
                        <p className={`text-2xl font-bold ${result.mustAttend > 0 ? 'text-[#ffdad6]' : 'text-[#85f8c4]'}`}>
                          <AnimatedCounter value={result.mustAttend} />
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="border-t border-white/10 pt-4">
                    <div className="flex justify-between items-center text-sm mb-2">
                      <span>Subject: {result.subjectName}</span>
                      <span>Standard Rate</span>
                    </div>
                    <div className="w-full bg-white/20 h-1 rounded-full overflow-hidden">
                      <motion.div
                        className={`h-full rounded-full ${result.currentPct >= 75 ? 'bg-[#85f8c4]' : result.currentPct >= 70 ? 'bg-amber-400' : 'bg-[#ffdad6]'}`}
                        initial={{ width: 0 }}
                        animate={{ width: `${Math.min(100, result.currentPct)}%` }}
                        transition={{ duration: 0.8 }}
                      />
                    </div>
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  key="placeholder"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="bg-[#091426] text-white rounded-xl p-6 ambient-shadow flex-1 flex flex-col justify-between"
                >
                  <div>
                    <h3 className="text-lg font-semibold opacity-90 mb-1">Estimated Value</h3>
                    <div className="flex items-end gap-2 my-10">
                      <span className="text-6xl font-bold leading-none opacity-30">—</span>
                      <span className="text-xl font-semibold mb-1 opacity-30">Classes</span>
                    </div>
                  </div>
                  <div className="border-t border-white/10 pt-4">
                    <p className="text-sm opacity-50">Enter details and calculate to see results</p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Send To — contact selector from original */}
            <div className="bg-white border border-[#c5c6cd] rounded-xl p-6 ambient-shadow">
              <h3 className="text-lg font-semibold text-[#091426] mb-4">Send To</h3>
              <div className="space-y-2">
                {MOCK_CONTACTS.map((contact) => {
                  const isSelected = selectedContact === contact.id
                  return (
                    <motion.div
                      key={contact.id}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => setSelectedContact(contact.id)}
                      className={`flex items-center justify-between p-3 rounded-lg cursor-pointer border transition-all ${
                        isSelected
                          ? 'bg-[#e6e8ea] border-[#091426]/20'
                          : 'hover:bg-[#f2f4f6] border-transparent hover:border-[#c5c6cd]'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm ${
                          isSelected ? 'bg-[#091426] text-white' : 'bg-[#d0e1fb] text-[#091426]'
                        }`}>
                          {contact.name[0]}
                        </div>
                        <div>
                          <p className="text-base font-semibold text-[#091426] leading-tight">{contact.name}</p>
                          <p className="text-sm text-[#45474c]">{contact.role}</p>
                        </div>
                      </div>
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                        isSelected ? 'border-[#091426] bg-[#091426]' : 'border-[#c5c6cd]'
                      }`}>
                        {isSelected && <div className="w-2 h-2 rounded-full bg-white" />}
                      </div>
                    </motion.div>
                  )
                })}
              </div>
            </div>
          </div>

          {/* CTA + Quote — col-span-12, matches original */}
          <section className="lg:col-span-12 flex flex-col items-center gap-6 py-6">
            <motion.button
              whileTap={{ scale: 0.97 }}
              whileHover={{ backgroundColor: '#3c475a' }}
              onClick={() => {
                if (!result) { addToast({ type: 'info', message: 'Calculate first to accept a trade' }); return }
                addToast({ type: 'success', message: `Trade accepted! ${result.canMiss} classes secured.` })
              }}
              className="bg-[#091426] text-white text-lg font-semibold px-16 py-6 rounded-lg ambient-shadow transition-colors flex items-center gap-3"
            >
              Accept Trade
              <ArrowLeftRight size={20} />
            </motion.button>

            {/* Quote from original */}
            <div className="max-w-2xl text-center mt-4">
              <p className="text-[#45474c] text-base italic opacity-75">
                "In the halls of academia, true currency isn't just grades—it's the strategic distribution of Maggi to those who hold the ledger."
              </p>
            </div>
          </section>

          {/* History */}
          {history.length > 0 && (
            <section className="lg:col-span-12">
              <div className="bg-white border border-[#c5c6cd] rounded-xl overflow-hidden ambient-shadow">
                <div className="px-6 py-3 border-b border-[#c5c6cd] bg-[#f2f4f6]">
                  <h3 className="text-sm font-semibold text-[#091426]">Recent Calculations</h3>
                </div>
                <div className="divide-y divide-[#f2f4f6]">
                  {history.slice(0, 5).map((h) => (
                    <div key={h.id} className="flex items-center justify-between px-6 py-4">
                      <div>
                        <p className="text-sm font-semibold text-[#091426]">{h.subject_name}</p>
                        <p className="text-xs text-[#75777d]">{h.attended}/{h.total} · Target {h.target}% · {new Date(h.created_at).toLocaleDateString()}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold text-[#24a375]">+{h.can_miss} safe</p>
                        <p className="text-xs text-[#75777d]">{Math.round((h.attended / h.total) * 100)}% current</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          )}
        </div>

      </PageTransition>
    </AppShell>
  )
}
