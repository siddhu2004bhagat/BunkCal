import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useNavigate } from 'react-router-dom'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { Lightbulb } from 'lucide-react'
import { useState } from 'react'
import { AppShell } from '@/components/layout/AppShell'
import { PageTransition } from '@/components/motion/PageTransition'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { useAuthStore } from '@/store/authStore'
import { useUIStore } from '@/store/uiStore'
import { subjectsService } from '@/services/subjects'
import { SUBJECT_COLORS } from '@/utils/attendance'

const schema = z.object({
  name: z.string().min(2, 'Subject name required'),
  credits: z.coerce.number().min(1).max(10),
  attendance_goal: z.coerce.number().min(50).max(100),
  attended_classes: z.coerce.number().min(0),
  total_classes: z.coerce.number().min(0),
  notes: z.string().optional(),
})
type FormData = z.infer<typeof schema>

export default function AddSubject() {
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const { addToast } = useUIStore()
  const queryClient = useQueryClient()
  const [selectedColor, setSelectedColor] = useState(SUBJECT_COLORS[0])

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { register, handleSubmit, watch, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema) as any,
    defaultValues: { credits: 4, attendance_goal: 75, attended_classes: 0, total_classes: 0 },
  })

  const attended = Number(watch('attended_classes')) || 0
  const total = Number(watch('total_classes')) || 0
  const pct = total > 0 ? Math.round((attended / total) * 100) : 0

  const mutation = useMutation({
    mutationFn: (data: FormData) =>
      subjectsService.createSubject(user!.id, {
        name: data.name,
        credits: data.credits,
        attendance_goal: data.attendance_goal,
        attended_classes: data.attended_classes,
        total_classes: data.total_classes,
        color: selectedColor,
        icon: null,
        notes: data.notes || null,
      }),
    onSuccess: () => {
      // Immediately refetch so dashboard shows new subject right away
      queryClient.invalidateQueries({ queryKey: ['subjects'] })
      queryClient.refetchQueries({ queryKey: ['subjects', user?.id] })
      addToast({ type: 'success', message: 'Subject added successfully' })
      navigate('/subjects')
    },
    onError: () => addToast({ type: 'error', message: 'Failed to add subject' }),
  })

  return (
    <AppShell showBack title="Add Subject">
      <PageTransition>
        <form onSubmit={handleSubmit((d) => mutation.mutate(d))}>
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4">

            {/* Course Information Card — col-span-7 */}
            <div className="md:col-span-7 bg-white border border-[#c5c6cd] p-6 rounded-xl ambient-shadow">
              <h3 className="text-lg font-semibold text-[#091426] mb-6">Course Information</h3>
              <div className="space-y-6">
                <div>
                  <label className="block text-xs font-semibold tracking-wider uppercase text-[#45474c] mb-1.5">Subject Name</label>
                  <input
                    className="w-full bg-white border border-[#c5c6cd] rounded-lg px-6 py-3 focus:ring-2 focus:ring-[#091426]/10 focus:border-[#091426] outline-none transition-all text-sm"
                    placeholder="e.g. Advanced Thermodynamics"
                    {...register('name')}
                  />
                  {errors.name && <p className="text-xs text-[#ba1a1a] mt-1">{errors.name.message}</p>}
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <label className="block text-xs font-semibold tracking-wider uppercase text-[#45474c] mb-1.5">Credits</label>
                    <input
                      type="number"
                      className="w-full bg-white border border-[#c5c6cd] rounded-lg px-6 py-3 focus:ring-2 focus:ring-[#091426]/10 focus:border-[#091426] outline-none transition-all text-sm"
                      placeholder="4"
                      {...register('credits')}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold tracking-wider uppercase text-[#45474c] mb-1.5">Required %</label>
                    <div className="relative">
                      <input
                        type="number"
                        className="w-full bg-white border border-[#c5c6cd] rounded-lg px-6 py-3 pr-10 focus:ring-2 focus:ring-[#091426]/10 focus:border-[#091426] outline-none transition-all text-sm"
                        placeholder="75"
                        {...register('attendance_goal')}
                      />
                      <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[#45474c] text-xs font-semibold">%</span>
                    </div>
                  </div>
                </div>

                {/* Color picker */}
                <div>
                  <label className="block text-xs font-semibold tracking-wider uppercase text-[#45474c] mb-2">Subject Color</label>
                  <div className="flex gap-2 flex-wrap">
                    {SUBJECT_COLORS.map((color) => (
                      <motion.button
                        key={color}
                        type="button"
                        whileTap={{ scale: 0.85 }}
                        onClick={() => setSelectedColor(color)}
                        className={`w-8 h-8 rounded-lg transition-all ${selectedColor === color ? 'ring-2 ring-offset-2 ring-[#091426] scale-110' : ''}`}
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>
                </div>

                <Input label="Notes (optional)" placeholder="Any notes about this subject..." {...register('notes')} />
              </div>
            </div>

            {/* Attendance Tracker Card — col-span-5 */}
            <div className="md:col-span-5 bg-white border border-[#c5c6cd] p-6 rounded-xl ambient-shadow flex flex-col">
              <h3 className="text-lg font-semibold text-[#091426] mb-6">Current Attendance</h3>

              {/* Attendance Ratio Preview — matches original */}
              <div className="flex-grow space-y-6">
                <div className="bg-[#f2f4f6] p-6 rounded-lg border border-[#c5c6cd]/30">
                  <div className="flex justify-between items-end mb-3">
                    <span className="text-xs font-semibold tracking-wider text-[#45474c]">ATTENDANCE RATIO</span>
                    <span className="text-2xl font-bold text-[#091426]">{attended}/{total}</span>
                  </div>
                  <div className="w-full bg-[#c5c6cd]/30 h-2 rounded-full overflow-hidden">
                    <motion.div
                      className="bg-[#505f76] h-full rounded-full"
                      animate={{ width: `${pct}%` }}
                      transition={{ duration: 0.4 }}
                    />
                  </div>
                  <p className="text-xs text-[#45474c] mt-1 text-right">{pct}%</p>
                </div>

                <div className="flex items-center gap-6">
                  <div className="flex-1">
                    <label className="block text-xs font-semibold tracking-wider uppercase text-[#45474c] mb-1.5">Attended</label>
                    <input
                      type="number"
                      className="w-full bg-white border border-[#c5c6cd] rounded-lg px-6 py-3 focus:ring-2 focus:ring-[#091426]/10 focus:border-[#091426] outline-none transition-all text-sm"
                      {...register('attended_classes')}
                    />
                  </div>
                  <div className="pt-6 text-[#75777d] font-bold text-lg">/</div>
                  <div className="flex-1">
                    <label className="block text-xs font-semibold tracking-wider uppercase text-[#45474c] mb-1.5">Total Conducted</label>
                    <input
                      type="number"
                      className="w-full bg-white border border-[#c5c6cd] rounded-lg px-6 py-3 focus:ring-2 focus:ring-[#091426]/10 focus:border-[#091426] outline-none transition-all text-sm"
                      {...register('total_classes')}
                    />
                  </div>
                </div>
              </div>

              <div className="mt-6 pt-6 border-t border-[#c5c6cd]">
                <Button type="submit" loading={mutation.isPending} className="w-full" size="lg">
                  Save Subject
                </Button>
              </div>
            </div>

            {/* Pro Tip + Illustration — col-span-12, matches original */}
            <div className="md:col-span-12 grid grid-cols-1 md:grid-cols-3 gap-4">

              {/* Pro Tip — dark green card */}
              <div className="md:col-span-1 bg-[#00301f] text-[#85f8c4] p-6 rounded-xl ambient-shadow flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <Lightbulb size={18} />
                    <span className="text-xs font-bold uppercase tracking-wider">Pro Tip</span>
                  </div>
                  <p className="text-sm leading-relaxed text-[#85f8c4]">
                    Consistency is key. Update your attendance after every lecture to maintain an accurate forecast of your bunking potential.
                  </p>
                </div>
                <div className="mt-6">
                  <span className="text-xs text-[#68dba9] opacity-70">Academic Excellence Hub</span>
                </div>
              </div>

              {/* Illustration card */}
              <div className="md:col-span-2 relative h-48 md:h-full min-h-[160px] rounded-xl overflow-hidden ambient-shadow group bg-[#1e293b]">
                <div className="absolute inset-0 bg-gradient-to-br from-[#091426] to-[#1e293b]" />
                <div className="absolute inset-0 bg-gradient-to-t from-[#091426]/80 to-transparent" />
                <div className="absolute bottom-6 left-6">
                  <p className="text-lg font-semibold text-white">Stay ahead of your schedule.</p>
                  <p className="text-sm text-white/80">Track with precision, focus with intent.</p>
                </div>
                {/* Decorative elements */}
                <div className="absolute top-6 right-6 w-16 h-16 rounded-full border border-white/10" />
                <div className="absolute top-10 right-10 w-8 h-8 rounded-full border border-white/10" />
                <motion.div
                  className="absolute top-6 right-6 w-2 h-2 rounded-full bg-[#85f8c4]"
                  animate={{ scale: [1, 1.5, 1], opacity: [1, 0.5, 1] }}
                  transition={{ duration: 2, repeat: Infinity }}
                />
              </div>
            </div>

          </div>
        </form>
      </PageTransition>
    </AppShell>
  )
}
