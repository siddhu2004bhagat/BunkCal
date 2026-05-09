import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { GraduationCap, Mail, Lock, User } from 'lucide-react'
import { useEffect } from 'react'
import { authService } from '@/services/auth'
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
  const { user, loading } = useAuthStore()

  // Already authenticated → redirect
  useEffect(() => {
    if (!loading && user) navigate('/dashboard', { replace: true })
  }, [user, loading, navigate])

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  const onSubmit = async (data: FormData) => {
    try {
      const result = await authService.signUp(data.email, data.password, data.fullName)

      if (result.session) {
        // Email confirmation OFF → session returned immediately
        // onAuthStateChange(SIGNED_IN) fires and handles everything
        // useEffect above will redirect to /dashboard
        addToast({ type: 'success', message: `Welcome, ${data.fullName}! 🎉` })
      } else {
        // Email confirmation ON → no session yet
        addToast({
          type: 'info',
          message: '📧 Check your email and click the confirmation link, then sign in.',
        })
        navigate('/login', { replace: true })
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Sign up failed'
      if (msg.includes('already registered')) {
        addToast({ type: 'error', message: 'Email already registered. Try signing in.' })
      } else {
        addToast({ type: 'error', message: msg })
      }
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
                placeholder="Min. 6 characters"
                icon={<Lock size={16} />}
                error={errors.password?.message}
                {...register('password')}
              />
              <Input
                label="Confirm Password"
                type="password"
                placeholder="Repeat password"
                icon={<Lock size={16} />}
                error={errors.confirmPassword?.message}
                {...register('confirmPassword')}
              />
              <Button type="submit" loading={isSubmitting} className="w-full mt-2" size="lg">
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
        </FadeIn>
      </div>
    </div>
  )
}
