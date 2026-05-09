import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useMutation } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { User, Mail, BookOpen, Building, GraduationCap, Edit3, X, Copy, Check } from 'lucide-react'
import { useState } from 'react'
import { AppShell } from '@/components/layout/AppShell'
import { PageTransition } from '@/components/motion/PageTransition'
import { Card } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { useAuthStore } from '@/store/authStore'
import { useUIStore } from '@/store/uiStore'
import { supabase } from '@/lib/supabase'
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
  const [copied, setCopied] = useState(false)

  const copyBunkwiseId = () => {
    if (profile?.bunkwise_id) {
      navigator.clipboard.writeText(profile.bunkwise_id)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema) as any,
    defaultValues: {
      full_name: profile?.full_name || '',
      semester: profile?.semester || '',
      branch: profile?.branch || '',
      college: profile?.college || '',
      attendance_goal: profile?.attendance_goal ?? 75,
    },
  })

  const mutation = useMutation({
    mutationFn: async (data: FormData) => {
      // Verify session is active before attempting write
      const { data: sessionData } = await supabase.auth.getSession()
      console.log('[Profile] session check:', sessionData.session?.user?.id)

      if (!sessionData.session) {
        throw new Error('No active session. Please sign in again.')
      }

      return profilesService.upsertProfile(sessionData.session.user.id, data)
    },
    onSuccess: (updated) => {
      setProfile(updated)
      addToast({ type: 'success', message: 'Profile updated ✓' })
      setEditing(false)
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : 'Failed to update profile'
      console.error('[Profile] save error:', err)
      addToast({ type: 'error', message: msg })
    },
  })

  const initials = profile?.full_name
    ?.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2) || 'U'

  const startEditing = () => {
    reset({
      full_name: profile?.full_name || '',
      semester: profile?.semester || '',
      branch: profile?.branch || '',
      college: profile?.college || '',
      attendance_goal: profile?.attendance_goal ?? 75,
    })
    setEditing(true)
  }

  return (
    <AppShell>
      <PageTransition>
        <div className="max-w-lg mx-auto">
          {/* Avatar */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center mb-8"
          >
            <div className="w-24 h-24 rounded-2xl bg-[#091426] flex items-center justify-center text-white text-3xl font-bold ambient-shadow-md mb-4">
              {profile?.avatar_url
                ? <img src={profile.avatar_url} alt="avatar" className="w-full h-full rounded-2xl object-cover" />
                : initials}
            </div>
            <h2 className="text-xl font-bold text-[#091426]">{profile?.full_name || 'Student'}</h2>
            <p className="text-sm text-[#45474c]">{user?.email}</p>
            {profile?.branch && (
              <p className="text-xs text-[#75777d] mt-1">
                {profile.branch}{profile.semester ? ` · Sem ${profile.semester}` : ''}
              </p>
            )}
          </motion.div>

          {/* Bunkwise ID Card — share with friends */}
          {profile?.bunkwise_id && (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-[#091426] rounded-2xl p-5 mb-4 relative overflow-hidden"
            >
              <p className="text-xs font-bold uppercase tracking-widest text-[#8590a6] mb-1">Your Bunkwise ID</p>
              <div className="flex items-center justify-between">
                <span className="text-3xl font-bold text-white tracking-widest font-mono">
                  {profile.bunkwise_id}
                </span>
                <motion.button
                  whileTap={{ scale: 0.9 }}
                  onClick={copyBunkwiseId}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all ${
                    copied
                      ? 'bg-[#85f8c4] text-[#002114]'
                      : 'bg-[#1e293b] text-white hover:bg-[#3c475a]'
                  }`}
                >
                  {copied ? <><Check size={13} /> Copied!</> : <><Copy size={13} /> Copy</>}
                </motion.button>
              </div>
              <p className="text-xs text-[#8590a6] mt-2">
                Share this ID with friends so they can add you to their proxy ledger
              </p>
              {/* Decorative */}
              <div className="absolute right-[-10%] top-[-30%] w-32 h-32 bg-[#d8e3fb] opacity-5 rounded-full blur-2xl pointer-events-none" />
            </motion.div>
          )}

          {/* Form Card */}
          <Card>
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-semibold text-[#091426]">Profile Details</h3>
              {!editing ? (
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={startEditing}
                  className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg bg-[#091426] text-white"
                >
                  <Edit3 size={12} /> Edit
                </motion.button>
              ) : (
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={() => { reset(); setEditing(false) }}
                  className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg bg-[#f2f4f6] text-[#45474c]"
                >
                  <X size={12} /> Cancel
                </motion.button>
              )}
            </div>

            <form onSubmit={handleSubmit((d) => mutation.mutate(d))}>
              <div className="flex items-center gap-3 py-3 border-b border-[#f2f4f6]">
                <User size={16} className="text-[#75777d] shrink-0" />
                {editing
                  ? <Input label="" placeholder="Full Name" error={errors.full_name?.message} {...register('full_name')} />
                  : <div><p className="text-xs text-[#75777d]">Full Name</p><p className="text-sm font-medium text-[#091426]">{profile?.full_name || '—'}</p></div>}
              </div>

              <div className="flex items-center gap-3 py-3 border-b border-[#f2f4f6]">
                <Mail size={16} className="text-[#75777d] shrink-0" />
                <div><p className="text-xs text-[#75777d]">Email</p><p className="text-sm font-medium text-[#091426]">{user?.email}</p></div>
              </div>

              <div className="flex items-center gap-3 py-3 border-b border-[#f2f4f6]">
                <BookOpen size={16} className="text-[#75777d] shrink-0" />
                {editing
                  ? <Input label="" placeholder="Branch / Department" {...register('branch')} />
                  : <div><p className="text-xs text-[#75777d]">Branch</p><p className="text-sm font-medium text-[#091426]">{profile?.branch || '—'}</p></div>}
              </div>

              <div className="flex items-center gap-3 py-3 border-b border-[#f2f4f6]">
                <GraduationCap size={16} className="text-[#75777d] shrink-0" />
                {editing
                  ? <Input label="" placeholder="Semester (e.g. 4)" {...register('semester')} />
                  : <div><p className="text-xs text-[#75777d]">Semester</p><p className="text-sm font-medium text-[#091426]">{profile?.semester ? `Semester ${profile.semester}` : '—'}</p></div>}
              </div>

              <div className="flex items-center gap-3 py-3 border-b border-[#f2f4f6]">
                <Building size={16} className="text-[#75777d] shrink-0" />
                {editing
                  ? <Input label="" placeholder="College / University" {...register('college')} />
                  : <div><p className="text-xs text-[#75777d]">College</p><p className="text-sm font-medium text-[#091426]">{profile?.college || '—'}</p></div>}
              </div>

              <div className="flex items-center gap-3 py-3">
                <span className="text-xs font-bold text-[#75777d] shrink-0">%</span>
                {editing
                  ? <Input label="" type="number" placeholder="75" suffix="%" {...register('attendance_goal')} />
                  : <div><p className="text-xs text-[#75777d]">Attendance Goal</p><p className="text-sm font-medium text-[#091426]">{profile?.attendance_goal ?? 75}%</p></div>}
              </div>

              {editing && (
                <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="pt-4">
                  <Button type="submit" loading={mutation.isPending} className="w-full" size="lg">
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
