import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { GraduationCap, Mail, Lock, User } from 'lucide-react'
import { useEffect, useState } from 'react'
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

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
      <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" fill="#34A853"/>
      <path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
      <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
    </svg>
  )
}

export default function Signup() {
  const navigate = useNavigate()
  const { addToast } = useUIStore()
  const { user, loading } = useAuthStore()
  const [googleLoading, setGoogleLoading] = useState(false)

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
        addToast({ type: 'success', message: `Welcome, ${data.fullName}! 🎉` })
      } else {
        addToast({ type: 'info', message: '📧 Check your email and click the confirmation link, then sign in.' })
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

  const handleGoogle = async () => {
    setGoogleLoading(true)
    try {
      await authService.signInWithGoogle()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Google sign in failed'
      addToast({ type: 'error', message: msg })
      setGoogleLoading(false)
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
              transition={{ duration: 0.5 }}
              className="w-16 h-16 bg-[#091426] rounded-2xl flex items-center justify-center mb-4 ambient-shadow-md"
            >
              <GraduationCap size={32} className="text-white" />
            </motion.div>
            <h1 className="text-2xl font-bold text-[#091426]">Bunkwise</h1>
            <p className="text-sm text-[#45474c] mt-1">Your academic attendance companion</p>
          </div>

          <div className="bg-white rounded-2xl ambient-shadow p-6 border border-[#e6e8ea]">
            <h2 className="text-lg font-semibold text-[#091426] mb-5">Create your account</h2>

            {/* Google Sign Up */}
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={handleGoogle}
              disabled={googleLoading}
              className="w-full flex items-center justify-center gap-3 border border-[#e6e8ea] rounded-xl py-3 text-sm font-semibold text-[#374151] hover:bg-[#f7f9fb] transition-colors disabled:opacity-60 mb-5"
            >
              {googleLoading ? (
                <svg className="animate-spin h-4 w-4 text-[#374151]" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              ) : <GoogleIcon />}
              Continue with Google
            </motion.button>

            {/* Divider */}
            <div className="flex items-center gap-3 mb-5">
              <div className="flex-1 h-px bg-[#e6e8ea]" />
              <span className="text-xs text-[#9ca3af] font-medium">or</span>
              <div className="flex-1 h-px bg-[#e6e8ea]" />
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <Input label="Full Name" type="text" placeholder="Arjun Sharma"
                icon={<User size={16} />} error={errors.fullName?.message} {...register('fullName')} />
              <Input label="Email" type="email" placeholder="you@college.edu"
                icon={<Mail size={16} />} error={errors.email?.message} {...register('email')} />
              <Input label="Password" type="password" placeholder="Min. 6 characters"
                icon={<Lock size={16} />} error={errors.password?.message} {...register('password')} />
              <Input label="Confirm Password" type="password" placeholder="Repeat password"
                icon={<Lock size={16} />} error={errors.confirmPassword?.message} {...register('confirmPassword')} />
              <Button type="submit" loading={isSubmitting} className="w-full" size="lg">
                Create Account
              </Button>
            </form>

            <div className="mt-4 text-center">
              <p className="text-sm text-[#45474c]">
                Already have an account?{' '}
                <Link to="/login" className="font-semibold text-[#091426] hover:underline">Sign in</Link>
              </p>
            </div>
          </div>
        </FadeIn>
      </div>
    </div>
  )
}
