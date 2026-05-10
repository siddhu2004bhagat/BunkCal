import { Navigate } from 'react-router-dom'
import type { ReactNode } from 'react'
import { motion } from 'framer-motion'
import { GraduationCap } from 'lucide-react'
import { useAuthStore } from '@/store/authStore'

interface Props {
  children: ReactNode
}

export function ProtectedRoute({ children }: Props) {
  const { user, loading } = useAuthStore()

  if (loading) {
    return (
      <div className="min-h-dvh flex items-center justify-center bg-[#f7f9fb]">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }}
          className="w-20 h-20 bg-[#091426] rounded-2xl flex items-center justify-center ambient-shadow-lg"
        >
          <GraduationCap size={40} className="text-white" />
        </motion.div>
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  return <>{children}</>
}
