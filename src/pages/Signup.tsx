import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { GraduationCap, Mail, Lock, User, AlertCircle } from 'lucide-react'
import { useState } from 'react'
import { authService } from '@/services/auth'
import { profilesService } from '@/services/profiles'
import { useAuthStore } from '@/store/authStore'
import { useUIStore } from '@/store/uiStore'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { FadeIn } from '@/components/motion/FadeIn'

const schema = z.object({
  fullName: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Enter a valid email'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  confirmPassword: z.string(),
}).refine((d) => d.password === d.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword'],
})

type FormData = z.infer<typeof schema>

export default function Signup() {
  const navigate = useNavigate()
  const { addToast } = useUIStore()
  const { setUser, setSession, setProfile } = useAuthStore()
  const [debugError, setDebugError] = useState<string | null>(null)

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  const onSubmit = async (data: FormData) => {
    setDebugError(null)
    try {
      // Step 1: Sign up with Supabase Auth
      const result = await authService.signUp(data.email, data.password, data.fullName)
      console.log('Signup result:', result)

      if (result.session && result.user) {
        // Got a session immediately (email confirmation disabled)
        setSession(result.session)
        setUser(result.user)

        // Step 2: Create profile
        try {
          const profile = await profilesService.createProfile(
            result.user.id,
            data.email,
            data.fullName
          )
          setProfile(profile)
          addToast({ type: 'success', message: `Welcome to Bunkwise, ${data.fullName}!` })
          navigate('/dashboard')
        } catch (profileErr: unknown) {
          console.error('Profile creation error:', profileErr)
          const msg = profileErr instanceof Error ? profileErr.message : String(profileErr)
          setDebugError(`Profile error: ${msg}`)

          // Still navigate — profile can be created later
          addToast({ type: 'warning', message: 'Account created but profile setup failed. Please complete your profile.' })
          navigate('/dashboard')
        }
      } else if (result.user && !result.session) {
        // Email confirmation required
        addToast({
          type: 'info',
          message: 'Check your email to confirm your account, then sign in here.',
        })
        navigate('/login')
      } else {
        setDebugError('Unexpected signup response. Check console.')
        console.error('Unexpected signup result:', result)
      }
    } catch (err: unknown) {
      console.error('Signup error:', err)
      const msg = err instanceof Error ? err.message : 'Sign up failed'
      setDebugError(msg)
      addToast({ type: 'error', message: msg })
    }
  }

  return (
    <div className="min-h-dvh bg-[#f7f9fb] flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <FadeIn direction="up">
          <div className="flex flex-col items-center mb-8">
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }}
              className="w-16 h-16 bg-[#091426] rounded-2xl flex items-center justify-center mb-4 ambient-shadow-md"
            >
              <GraduationCap size={32} className="text-white" />
            </motion.div>
            <h1 className="text-2xl font-bold text-[#091426]">Bunkwise</h1>
            <p className="text-sm text-[#45474c] mt-1">Your academic attendance companion</p>
          </div>

          <div className="bg-white rounded-2xl ambient-shadow p-6 border border-[#c5c6cd]">
            <h2 className="text-lg font-semibold text-[#091426] mb-6">Create your account</h2>

            {/* Debug error panel */}
            {debugError && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-4 p-3 bg-[#ffdad6] border border-[#ba1a1a]/30 rounded-lg flex items-start gap-2"
              >
                <AlertCircle size={16} className="text-[#ba1a1a] shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-semibold text-[#93000a]">Error Details</p>
                  <p className="text-xs text-[#93000a] mt-0.5 break-all">{debugError}</p>
                  {debugError.includes('relation') || debugError.includes('does not exist') ? (
                    <p className="text-xs text-[#93000a] mt-1 font-medium">
                      → The database tables don't exist yet. Run <code className="bg-[#ffb4ab] px-1 rounded">supabase/schema.sql</code> in your Supabase SQL Editor first.
                    </p>
                  ) : null}
                </div>
              </motion.div>
            )}

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <Input
                label="Full Name"
                type="text"
                placeholder="Arjun Sharma"
                icon={<User size={16} />}
                error={errors.fullName?.message}
                {...register('fullName')}
              />
              <Input
                label="Email"
                type="email"
                placeholder="you@college.edu"
                icon={<Mail size={16} />}
                error={errors.email?.message}
                {...register('email')}
              />
              <Input
                label="Password"
                type="password"
                placeholder="••••••••"
                icon={<Lock size={16} />}
                error={errors.password?.message}
                {...register('password')}
              />
              <Input
                label="Confirm Password"
                type="password"
                placeholder="••••••••"
                icon={<Lock size={16} />}
                error={errors.confirmPassword?.message}
                {...register('confirmPassword')}
              />

              <Button
                type="submit"
                loading={isSubmitting}
                className="w-full mt-2"
                size="lg"
              >
                Create Account
              </Button>
            </form>

            <div className="mt-4 text-center">
              <p className="text-sm text-[#45474c]">
                Already have an account?{' '}
                <Link to="/login" className="font-semibold text-[#091426] hover:underline">
                  Sign in
                </Link>
              </p>
            </div>
          </div>

          {/* Setup reminder */}
          <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-xl">
            <p className="text-xs font-semibold text-amber-800 mb-1">⚠️ First-time setup required</p>
            <p className="text-xs text-amber-700">
              Run <code className="bg-amber-100 px-1 rounded font-mono">supabase/schema.sql</code> in your{' '}
              <a
                href="https://supabase.com/dashboard/project/ahapzrtzmyuffvzogitf/sql/new"
                target="_blank"
                rel="noreferrer"
                className="underline font-medium"
              >
                Supabase SQL Editor
              </a>{' '}
              before signing up.
            </p>
          </div>
        </FadeIn>
      </div>
    </div>
  )
}
