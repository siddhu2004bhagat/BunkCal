import { Link, useNavigate, useLocation } from 'react-router-dom'
import { Bell, GraduationCap, RefreshCw } from 'lucide-react'
import { motion } from 'framer-motion'
import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useAuthStore } from '@/store/authStore'
import { authService } from '@/services/auth'
import { useUIStore } from '@/store/uiStore'

// Map routes to their query keys so we only refetch what's visible
const routeQueryKeys: Record<string, string[][]> = {
  '/dashboard':          [['subjects'], ['attendance'], ['timetable']],
  '/subjects':           [['subjects']],
  '/attendance':         [['attendance'], ['subjects']],
  '/proxy-ledger':       [['proxy-ledger'], ['proxy-transactions']],
  '/friends':            [['friends'], ['friend-requests'], ['sent-requests']],
  '/schedule':           [['timetable'], ['subjects']],
  '/history':            [['attendance'], ['calculator-history'], ['proxy-transactions']],
  '/notifications':      [['notifications']],
  '/profile':            [['profiles']],
  '/offering-calculator':[['calculator-history'], ['proxy-ledger']],
}

interface Props {
  title?: string
  showBack?: boolean
}

export function Header({ title, showBack }: Props) {
  const { profile, reset: signOut } = useAuthStore()
  const { addToast } = useUIStore()
  const navigate = useNavigate()
  const location = useLocation()
  const queryClient = useQueryClient()
  const [refreshing, setRefreshing] = useState(false)

  const handleRefresh = async () => {
    setRefreshing(true)
    // Find query keys for current route
    const path = location.pathname
    const subjectMatch = path.match(/^\/subject\/(.+)$/)
    
    let keysToRefetch: string[][] = routeQueryKeys[path] || []
    if (subjectMatch) {
      keysToRefetch = [['subject', subjectMatch[1]], ['attendance'], ['subjects']]
    }

    if (keysToRefetch.length > 0) {
      await Promise.all(keysToRefetch.map(key => queryClient.invalidateQueries({ queryKey: key })))
    } else {
      // Fallback: refetch everything
      await queryClient.invalidateQueries()
    }
    setTimeout(() => setRefreshing(false), 600)
  }

  const handleSignOut = async () => {
    try {
      await authService.signOut()
      signOut()
      navigate('/login', { replace: true })
    } catch {
      addToast({ type: 'error', message: 'Failed to sign out' })
    }
  }

  return (
    <header className="fixed top-0 left-0 w-full z-50 flex justify-between items-center px-4 md:px-8 bg-white border-b border-[#e6e8ea]"
      style={{ height: 'calc(4rem + env(safe-area-inset-top, 0px))', paddingTop: 'env(safe-area-inset-top, 0px)' }}
    >
      <div className="flex items-center gap-3">
        {showBack ? (
          <button
            onClick={() => navigate(-1)}
            className="p-2 rounded-lg hover:bg-[#f2f4f6] transition-colors"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M19 12H5M12 5l-7 7 7 7" />
            </svg>
          </button>
        ) : (
          <Link to="/dashboard" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-[#091426] rounded-lg flex items-center justify-center">
              <GraduationCap size={18} className="text-white" />
            </div>
            <span className="font-bold text-[#091426] text-lg">Bunkwise</span>
          </Link>
        )}
        {title && <h1 className="font-semibold text-[#091426] text-lg">{title}</h1>}
      </div>

      <div className="flex items-center gap-2">
        {/* Page refresh button */}
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={handleRefresh}
          className="p-2 rounded-full hover:bg-[#f2f4f6] transition-colors"
          title="Refresh page"
        >
          <RefreshCw
            size={17}
            className={`text-[#9ca3af] transition-transform duration-500 ${refreshing ? 'animate-spin' : ''}`}
          />
        </motion.button>

        <Link to="/notifications">
          <motion.button
            whileTap={{ scale: 0.92 }}
            className="p-2 rounded-full hover:bg-[#f2f4f6] transition-colors relative"
          >
            <Bell size={20} className="text-[#45474c]" />
          </motion.button>
        </Link>

        <Link to="/profile">
          <motion.div
            whileTap={{ scale: 0.92 }}
            className="w-8 h-8 rounded-full bg-[#091426] flex items-center justify-center cursor-pointer"
          >
            {profile?.avatar_url ? (
              <img src={profile.avatar_url} alt="avatar" className="w-full h-full rounded-full object-cover" />
            ) : (
              <span className="text-white text-sm font-semibold">
                {profile?.full_name?.[0]?.toUpperCase() || 'U'}
              </span>
            )}
          </motion.div>
        </Link>

        <button
          onClick={handleSignOut}
          className="hidden md:block text-xs font-semibold text-[#45474c] hover:text-[#091426] px-3 py-1.5 rounded hover:bg-[#f2f4f6] transition-colors"
        >
          Sign out
        </button>
      </div>
    </header>
  )
}
