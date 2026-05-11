import { Navigate } from 'react-router-dom'
import type { ReactNode } from 'react'
import { useAuthStore } from '@/store/authStore'

interface Props { children: ReactNode }

/**
 * Wraps public pages (login/signup).
 * If user is already logged in, redirect to dashboard.
 * This prevents going back to login after signing in.
 */
export function PublicRoute({ children }: Props) {
  const { user, loading } = useAuthStore()

  // Still loading — don't redirect yet
  if (loading) return null

  // Already logged in — replace history so back button can't go to login
  if (user) return <Navigate to="/dashboard" replace />

  return <>{children}</>
}
