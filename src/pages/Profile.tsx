import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useMutation } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { User, Mail, BookOpen, Building, GraduationCap, Edit3, Check } from 'lucide-react'
import { useState } from 'react'
import { AppShell } from '@/components/layout/AppShell'
import { PageTransition } from '@/components/motion/PageTransition'
import { Card } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { useAuthStore } from '@/store/authStore'
import { useUIStore } from '@/store/uiStore'
import { profilesService } from '@/services/profiles'

const schema = z.object({
  full_name: z.string().min(2, 'Name required'),
  semester: z.string().optional(),
  branch: z.string().optional(),
  college: z.string().optional(),
  attendance_goal: z.coerce.number().min(50).max(100),
})

type FormData = z.infer<typeof schema>

export default function Profile() {
  const { user, profile, setProfile } = useAuthStore()
  const { addToast } = useUIStore()
  const [editing, setEditing] = useState(false)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema) as any,
    defaultValues: {
      full_name: profile?.full_name || '',
      semester: profile?.semester || '',
      branch: profile?.branch || '',
      college: profile?.college || '',
      attendance_goal: profile?.attendance_goal || 75,
    },
  })

  const mutation = useMutation({
    mutationFn: (data: FormData) =>
      profilesService.upsertProfile(user!.id, data),
    onSuccess: (updated) => {
      setProfile(updated)
      addToast({ type: 'success', message: 'Profile updated' })
      setEditing(false)
    },
    onError: () => addToast({ type: 'error', message: 'Failed to update profile' }),
  })

  const initials = profile?.full_name
    ?.split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) || 'U'

  return (
    <AppShell>
      <PageTransition>
        <div className="max-w-lg mx-auto">
          {/* Avatar Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center mb-8"
          >
            <div className="relative mb-4">
              <div className="w-24 h-24 rounded-2xl bg-[#091426] flex items-center justify-center text-white text-3xl font-bold ambient-shadow-md">
                {profile?.avatar_url ? (
                  <img src={profile.avatar_url} alt="avatar" className="w-full h-full rounded-2xl object-cover" />
                ) : initials}
              </div>
              <motion.button
                whileTap={{ scale: 0.9 }}
                className="absolute -bottom-2 -right-2 w-8 h-8 bg-white border border-[#c5c6cd] rounded-lg flex items-center justify-center ambient-shadow"
              >
                <Edit3 size={14} className="text-[#45474c]" />
              </motion.button>
            </div>
            <h2 className="text-xl font-bold text-[#091426]">{profile?.full_name || 'Student'}</h2>
            <p className="text-sm text-[#45474c]">{user?.email}</p>
            {profile?.branch && profile?.semester && (
              <p className="text-xs text-[#75777d] mt-1">{profile.branch} · Semester {profile.semester}</p>
            )}
          </motion.div>

          {/* Profile Form */}
          <Card>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-[#091426]">Profile Details</h3>
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={() => setEditing(!editing)}
                className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors ${
                  editing ? 'bg-[#f2f4f6] text-[#45474c]' : 'bg-[#091426] text-white'
                }`}
              >
                {editing ? <><Check size={12} /> Done</> : <><Edit3 size={12} /> Edit</>}
              </motion.button>
            </div>

            <form onSubmit={handleSubmit((d) => mutation.mutate(d))} className="space-y-4">
              <div className="flex items-center gap-3 py-2 border-b border-[#f2f4f6]">
                <User size={16} className="text-[#75777d] shrink-0" />
                {editing ? (
                  <Input label="" placeholder="Full Name" error={errors.full_name?.message} {...register('full_name')} />
                ) : (
                  <div>
                    <p className="text-xs text-[#75777d]">Full Name</p>
                    <p className="text-sm font-medium text-[#091426]">{profile?.full_name || '—'}</p>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-3 py-2 border-b border-[#f2f4f6]">
                <Mail size={16} className="text-[#75777d] shrink-0" />
                <div>
                  <p className="text-xs text-[#75777d]">Email</p>
                  <p className="text-sm font-medium text-[#091426]">{user?.email}</p>
                </div>
              </div>

              <div className="flex items-center gap-3 py-2 border-b border-[#f2f4f6]">
                <BookOpen size={16} className="text-[#75777d] shrink-0" />
                {editing ? (
                  <Input label="" placeholder="Branch / Department" {...register('branch')} />
                ) : (
                  <div>
                    <p className="text-xs text-[#75777d]">Branch</p>
                    <p className="text-sm font-medium text-[#091426]">{profile?.branch || '—'}</p>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-3 py-2 border-b border-[#f2f4f6]">
                <GraduationCap size={16} className="text-[#75777d] shrink-0" />
                {editing ? (
                  <Input label="" placeholder="Semester (e.g. 4)" {...register('semester')} />
                ) : (
                  <div>
                    <p className="text-xs text-[#75777d]">Semester</p>
                    <p className="text-sm font-medium text-[#091426]">{profile?.semester ? `Semester ${profile.semester}` : '—'}</p>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-3 py-2 border-b border-[#f2f4f6]">
                <Building size={16} className="text-[#75777d] shrink-0" />
                {editing ? (
                  <Input label="" placeholder="College / University" {...register('college')} />
                ) : (
                  <div>
                    <p className="text-xs text-[#75777d]">College</p>
                    <p className="text-sm font-medium text-[#091426]">{profile?.college || '—'}</p>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-3 py-2">
                <div className="w-4 h-4 shrink-0 text-[#75777d] text-xs font-bold">%</div>
                {editing ? (
                  <Input label="" type="number" placeholder="75" suffix="%" {...register('attendance_goal')} />
                ) : (
                  <div>
                    <p className="text-xs text-[#75777d]">Attendance Goal</p>
                    <p className="text-sm font-medium text-[#091426]">{profile?.attendance_goal || 75}%</p>
                  </div>
                )}
              </div>

              {editing && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <Button type="submit" loading={mutation.isPending} className="w-full">
                    Save Changes
                  </Button>
                </motion.div>
              )}
            </form>
          </Card>
        </div>
      </PageTransition>
    </AppShell>
  )
}
