import { Navigate } from 'react-router-dom'
import type { ReactNode } from 'react'
import { useAuthStore } from '@/store/authStore'

interface Props {
  children: ReactNode
}

export function ProtectedRoute({ children }: Props) {
  const { user, loading } = useAuthStore()

  if (loading) {
    return (
      <div className="min-h-dvh flex items-center justify-center bg-[#f7f9fb]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-12 h-12 bg-[#091426] rounded-xl flex items-center justify-center animate-pulse">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
              <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
              <path d="M6 12v5c3 3 9 3 12 0v-5" />
            </svg>
          </div>
          <div className="flex gap-1">
            <span className="w-2 h-2 bg-[#091426] rounded-full animate-bounce [animation-delay:0ms]" />
            <span className="w-2 h-2 bg-[#091426] rounded-full animate-bounce [animation-delay:150ms]" />
            <span className="w-2 h-2 bg-[#091426] rounded-full animate-bounce [animation-delay:300ms]" />
          </div>
          <p className="text-sm text-[#45474c] font-medium">Loading Bunkwise...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  return <>{children}</>
}
