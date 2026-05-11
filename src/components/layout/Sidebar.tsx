import { NavLink, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  LayoutDashboard, BookOpen, Users, Calculator,
  Calendar, History, Bell, User, Settings,
  ClipboardList, UserPlus, GraduationCap, LogOut, ChevronRight, Brain, Upload
} from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import { authService } from '@/services/auth'
import { useUIStore } from '@/store/uiStore'

const navGroups = [
  {
    label: 'Main',
    items: [
      { to: '/dashboard',   icon: LayoutDashboard, label: 'Dashboard' },
      { to: '/attendance',  icon: ClipboardList,   label: 'Attendance' },
      { to: '/subjects',    icon: BookOpen,         label: 'Subjects' },
      { to: '/schedule',    icon: Calendar,         label: 'Schedule' },
    ],
  },
  {
    label: 'Social',
    items: [
      { to: '/proxy-ledger', icon: Users,    label: 'Proxy Ledger' },
      { to: '/friends',      icon: UserPlus, label: 'Friends' },
    ],
  },
  {
    label: 'Tools',
    items: [
      { to: '/offering-calculator', icon: Calculator, label: 'Offering Calc' },
      { to: '/ai-prediction',       icon: Brain,      label: 'AI Advisor ✨' },
      { to: '/import-timetable',    icon: Upload,     label: 'Import Timetable' },
      { to: '/history',             icon: History,    label: 'History' },
      { to: '/notifications',       icon: Bell,       label: 'Notifications' },
    ],
  },
  {
    label: 'Account',
    items: [
      { to: '/profile',  icon: User,     label: 'Profile' },
      { to: '/settings', icon: Settings, label: 'Settings' },
    ],
  },
]

export function Sidebar() {
  const { profile, reset } = useAuthStore()
  const { addToast } = useUIStore()
  const navigate = useNavigate()

  const handleSignOut = async () => {
    try {
      await authService.signOut()
      reset()
      navigate('/login')
    } catch {
      addToast({ type: 'error', message: 'Failed to sign out' })
    }
  }

  const initials = profile?.full_name
    ?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || 'U'

  return (
    <aside className="hidden md:flex flex-col w-64 fixed left-0 top-0 bottom-0 bg-white border-r border-[#f0f0f0] z-40">

      {/* Logo */}
      <div className="flex items-center gap-3 px-6 h-16 border-b border-[#f0f0f0] shrink-0">
        <div className="w-8 h-8 bg-[#091426] rounded-lg flex items-center justify-center shrink-0">
          <GraduationCap size={17} className="text-white" />
        </div>
        <span className="font-bold text-[#091426] text-lg tracking-tight">Bunkwise</span>
      </div>

      {/* Nav groups */}
      <nav className="flex-1 overflow-y-auto scrollbar-hide px-3 py-4 space-y-5">
        {navGroups.map((group) => (
          <div key={group.label}>
            <p className="text-[10px] font-bold uppercase tracking-widest text-[#b0b7c3] px-3 mb-1.5">
              {group.label}
            </p>
            <div className="space-y-0.5">
              {group.items.map(({ to, icon: Icon, label }) => (
                <NavLink key={to} to={to}>
                  {({ isActive }) => (
                    <motion.div
                      whileHover={{ x: 2 }}
                      whileTap={{ scale: 0.97 }}
                      transition={{ duration: 0.1 }}
                      className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 group ${
                        isActive
                          ? 'bg-[#091426] text-white'
                          : 'text-[#6b7280] hover:bg-[#f7f9fb] hover:text-[#091426]'
                      }`}
                    >
                      <Icon size={17} className={isActive ? 'text-white' : 'text-[#9ca3af] group-hover:text-[#091426]'} />
                      <span className="flex-1">{label}</span>
                      {isActive && <ChevronRight size={13} className="text-white/60" />}
                    </motion.div>
                  )}
                </NavLink>
              ))}
            </div>
          </div>
        ))}
      </nav>

      {/* User profile footer */}
      <div className="px-3 py-3 border-t border-[#f0f0f0] shrink-0">
        <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-[#f7f9fb] transition-colors group">
          <div className="w-8 h-8 rounded-full bg-[#091426] flex items-center justify-center text-white text-xs font-bold shrink-0">
            {profile?.avatar_url
              ? <img src={profile.avatar_url} alt="avatar" className="w-full h-full rounded-full object-cover" />
              : initials}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-[#091426] truncate">{profile?.full_name || 'Student'}</p>
            {profile?.bunkwise_id && (
              <p className="text-xs text-[#9ca3af] font-mono">{profile.bunkwise_id}</p>
            )}
          </div>
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={handleSignOut}
            className="p-1.5 rounded-lg text-[#9ca3af] hover:text-[#ba1a1a] hover:bg-[#ffdad6] transition-colors"
            title="Sign out"
          >
            <LogOut size={15} />
          </motion.button>
        </div>
      </div>
    </aside>
  )
}
