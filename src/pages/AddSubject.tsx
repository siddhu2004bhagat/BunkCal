import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useNavigate } from 'react-router-dom'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { AppShell } from '@/components/layout/AppShell'
import { PageTransition } from '@/components/motion/PageTransition'
import { Card } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { useAuthStore } from '@/store/authStore'
import { useUIStore } from '@/store/uiStore'
import { subjectsService } from '@/services/subjects'
import { SUBJECT_COLORS } from '@/utils/attendance'
import { useState } from 'react'
import { motion } from 'framer-motion'

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

  const attended = watch('attended_classes') || 0
  const total = watch('total_classes') || 0
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
      queryClient.invalidateQueries({ queryKey: ['subjects'] })
      addToast({ type: 'success', message: 'Subject added successfully' })
      navigate('/subjects')
    },
    onError: () => addToast({ type: 'error', message: 'Failed to add subject' }),
  })

  return (
    <AppShell showBack title="Add Subject">
      <PageTransition>
        <div className="max-w-2xl mx-auto">
          <form onSubmit={handleSubmit((d) => mutation.mutate(d))} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
              {/* Course Info */}
              <Card className="md:col-span-7">
                <h3 className="font-semibold text-[#091426] mb-4">Course Information</h3>
                <div className="space-y-4">
                  <Input
                    label="Subject Name"
                    placeholder="e.g. Advanced Thermodynamics"
                    error={errors.name?.message}
                    {...register('name')}
                  />
                  <div className="grid grid-cols-2 gap-4">
                    <Input
                      label="Credits"
                      type="number"
                      placeholder="4"
                      error={errors.credits?.message}
                      {...register('credits')}
                    />
                    <Input
                      label="Required %"
                      type="number"
                      placeholder="75"
                      suffix="%"
                      error={errors.attendance_goal?.message}
                      {...register('attendance_goal')}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold tracking-wider uppercase text-[#45474c] mb-2">
                      Subject Color
                    </label>
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
                  <Input
                    label="Notes (optional)"
                    placeholder="Any notes about this subject..."
                    {...register('notes')}
                  />
                </div>
              </Card>

              {/* Attendance */}
              <Card className="md:col-span-5">
                <h3 className="font-semibold text-[#091426] mb-4">Current Attendance</h3>
                <div className="bg-[#f2f4f6] rounded-lg p-4 mb-4">
                  <div className="flex justify-between items-end mb-2">
                    <span className="text-xs font-semibold text-[#45474c] uppercase tracking-wider">Ratio</span>
                    <span className="text-xl font-bold text-[#091426]">{attended}/{total}</span>
                  </div>
                  <div className="w-full bg-[#e6e8ea] rounded-full h-2 overflow-hidden">
                    <motion.div
                      className="h-full bg-[#091426] rounded-full"
                      animate={{ width: `${pct}%` }}
                      transition={{ duration: 0.4 }}
                    />
                  </div>
                  <p className="text-xs text-[#45474c] mt-1 text-right">{pct}%</p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <Input
                    label="Attended"
                    type="number"
                    error={errors.attended_classes?.message}
                    {...register('attended_classes')}
                  />
                  <Input
                    label="Total"
                    type="number"
                    error={errors.total_classes?.message}
                    {...register('total_classes')}
                  />
                </div>
                <Button
                  type="submit"
                  loading={mutation.isPending}
                  className="w-full mt-4"
                >
                  Save Subject
                </Button>
              </Card>
            </div>
          </form>
        </div>
      </PageTransition>
    </AppShell>
  )
}
