import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { GraduationCap, Mail, Lock } from 'lucide-react'
import { useEffect } from 'react'
import { authService } from '@/services/auth'
import { useAuthStore } from '@/store/authStore'
import { useUIStore } from '@/store/uiStore'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { FadeIn } from '@/components/motion/FadeIn'

const schema = z.object({
  email: z.string().email('Enter a valid email'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
})
type FormData = z.infer<typeof schema>

export default function Login() {
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
      // signIn triggers onAuthStateChange(SIGNED_IN) which sets user/session/profile
      // Then the useEffect above redirects to /dashboard automatically
      await authService.signIn(data.email, data.password)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Sign in failed'
      if (msg.includes('Invalid login credentials')) {
        addToast({ type: 'error', message: 'Wrong email or password.' })
      } else if (msg.includes('Email not confirmed')) {
        addToast({ type: 'warning', message: '📧 Confirm your email first, then sign in.' })
      } else {
        addToast({ type: 'error', message: msg })
      }
    }
  }

  return (
    <div className="min-h-dvh bg-[#f7f9fb] flex items-center justify-center p-4 overflow-y-auto">
      <div className="w-full max-w-sm py-8">
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
            <p className="text-sm text-[#45474c] mt-1">Track smart. Bunk smarter.</p>
          </div>

          <div className="bg-white rounded-2xl ambient-shadow p-6 border border-[#c5c6cd]">
            <h2 className="text-lg font-semibold text-[#091426] mb-6">Sign in to your account</h2>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
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
              <Button type="submit" loading={isSubmitting} className="w-full mt-2" size="lg">
                Sign In
              </Button>
            </form>
            <div className="mt-4 text-center">
              <p className="text-sm text-[#45474c]">
                Don't have an account?{' '}
                <Link to="/signup" className="font-semibold text-[#091426] hover:underline">
                  Sign up
                </Link>
              </p>
            </div>
          </div>
          <p className="text-center text-xs text-[#75777d] mt-6">
            Academic attendance management for students
          </p>
        </FadeIn>
      </div>
    </div>
  )
}
