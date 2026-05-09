import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { motion, AnimatePresence } from 'framer-motion'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Calculator, CheckCircle, AlertTriangle, XCircle, History } from 'lucide-react'
import { AppShell } from '@/components/layout/AppShell'
import { PageTransition } from '@/components/motion/PageTransition'
import { AnimatedCounter } from '@/components/motion/AnimatedCounter'
import { Card } from '@/components/ui/Card'
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

export default function OfferingCalculator() {
  const { user } = useAuthStore()
  const { addToast } = useUIStore()
  const queryClient = useQueryClient()
  const [result, setResult] = useState<Result | null>(null)

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
  const { register, handleSubmit, setValue, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema) as any,
    defaultValues: { target: 75 },
  })

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

  const statusIcon = result
    ? result.currentPct >= 75
      ? <CheckCircle size={24} className="text-[#24a375]" />
      : result.currentPct >= 70
      ? <AlertTriangle size={24} className="text-amber-600" />
      : <XCircle size={24} className="text-[#ba1a1a]" />
    : null

  return (
    <AppShell>
      <PageTransition>
        <div className="max-w-2xl mx-auto">
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-[#091426]">Bunk Calculator</h1>
            <p className="text-sm text-[#45474c] mt-0.5">Calculate how many classes you can safely miss</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
            {/* Calculator Form */}
            <Card className="md:col-span-7">
              <div className="flex items-center gap-2 mb-4">
                <Calculator size={18} className="text-[#091426]" />
                <h3 className="font-semibold text-[#091426]">Enter Details</h3>
              </div>

              {/* Quick fill from subjects */}
              {subjects.length > 0 && (
                <div className="mb-4">
                  <label className="block text-xs font-semibold tracking-wider uppercase text-[#45474c] mb-2">
                    Quick Fill from Subject
                  </label>
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

              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <Input
                  label="Subject Name"
                  placeholder="e.g. Advanced Mathematics"
                  error={errors.subject_name?.message}
                  {...register('subject_name')}
                />
                <div className="grid grid-cols-2 gap-4">
                  <Input
                    label="Classes Attended"
                    type="number"
                    placeholder="0"
                    error={errors.attended?.message}
                    {...register('attended')}
                  />
                  <Input
                    label="Total Classes"
                    type="number"
                    placeholder="0"
                    error={errors.total?.message}
                    {...register('total')}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold tracking-wider uppercase text-[#45474c] mb-2">
                    Target Attendance
                  </label>
                  <div className="grid grid-cols-4 gap-2">
                    {[75, 80, 85, 90].map((t) => (
                      <motion.button
                        key={t}
                        type="button"
                        whileTap={{ scale: 0.95 }}
                        onClick={() => setValue('target', t)}
                        className="py-2 rounded-lg text-sm font-semibold border border-[#c5c6cd] hover:bg-[#091426] hover:text-white hover:border-[#091426] transition-all"
                      >
                        {t}%
                      </motion.button>
                    ))}
                  </div>
                </div>
                <Button type="submit" className="w-full" icon={<Calculator size={16} />}>
                  Calculate
                </Button>
              </form>
            </Card>

            {/* Result */}
            <div className="md:col-span-5 space-y-4">
              <AnimatePresence mode="wait">
                {result ? (
                  <motion.div
                    key="result"
                    initial={{ opacity: 0, scale: 0.95, y: 10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94] }}
                    className="bg-[#091426] text-white rounded-2xl p-6"
                  >
                    <div className="flex items-center gap-2 mb-4">
                      {statusIcon}
                      <h3 className="font-semibold">{result.subjectName}</h3>
                    </div>

                    <div className="mb-4">
                      <p className="text-xs text-[#8590a6] uppercase tracking-wider mb-1">Current Attendance</p>
                      <p className="text-4xl font-bold">
                        <AnimatedCounter value={Math.round(result.currentPct)} suffix="%" />
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-3 mb-4">
                      <div className="bg-[#1e293b] rounded-xl p-3">
                        <p className="text-xs text-[#8590a6] mb-1">Can Miss</p>
                        <p className="text-2xl font-bold text-[#85f8c4]">
                          <AnimatedCounter value={result.canMiss} />
                        </p>
                        <p className="text-xs text-[#8590a6]">classes</p>
                      </div>
                      <div className="bg-[#1e293b] rounded-xl p-3">
                        <p className="text-xs text-[#8590a6] mb-1">Must Attend</p>
                        <p className={`text-2xl font-bold ${result.mustAttend > 0 ? 'text-[#ffdad6]' : 'text-[#85f8c4]'}`}>
                          <AnimatedCounter value={result.mustAttend} />
                        </p>
                        <p className="text-xs text-[#8590a6]">classes</p>
                      </div>
                    </div>

                    <div className="w-full bg-[#1e293b] rounded-full h-2 overflow-hidden">
                      <motion.div
                        className={`h-full rounded-full ${
                          result.currentPct >= 75 ? 'bg-[#85f8c4]' :
                          result.currentPct >= 70 ? 'bg-amber-400' : 'bg-[#ffdad6]'
                        }`}
                        initial={{ width: 0 }}
                        animate={{ width: `${Math.min(100, result.currentPct)}%` }}
                        transition={{ duration: 0.8, ease: [0.25, 0.46, 0.45, 0.94] }}
                      />
                    </div>
                  </motion.div>
                ) : (
                  <motion.div
                    key="placeholder"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="bg-[#f2f4f6] rounded-2xl p-6 flex flex-col items-center justify-center text-center h-48"
                  >
                    <Calculator size={32} className="text-[#c5c6cd] mb-3" />
                    <p className="text-sm text-[#75777d]">Enter details and calculate to see results</p>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* History */}
              {history.length > 0 && (
                <Card padding="md">
                  <div className="flex items-center gap-2 mb-3">
                    <History size={16} className="text-[#45474c]" />
                    <h4 className="text-sm font-semibold text-[#091426]">Recent Calculations</h4>
                  </div>
                  <div className="space-y-2">
                    {history.slice(0, 4).map((h) => (
                      <div key={h.id} className="flex items-center justify-between py-1.5 border-b border-[#f2f4f6] last:border-0">
                        <div>
                          <p className="text-xs font-medium text-[#091426] truncate max-w-[120px]">{h.subject_name}</p>
                          <p className="text-xs text-[#75777d]">{new Date(h.created_at).toLocaleDateString()}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs font-bold text-[#24a375]">+{h.can_miss} miss</p>
                          <p className="text-xs text-[#75777d]">{Math.round((h.attended / h.total) * 100)}%</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>
              )}
            </div>
          </div>
        </div>
      </PageTransition>
    </AppShell>
  )
}
