import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  LayoutDashboard, Users, ClipboardList, Calendar,
  BookOpen, Calculator, UserPlus, History,
  Bell, User, Settings, X, LogOut, GraduationCap
} from 'lucide-react'
import { useState } from 'react'
import { useAuthStore } from '@/store/authStore'
import { authService } from '@/services/auth'
import { useUIStore } from '@/store/uiStore'

const primaryNav = [
  { to: '/dashboard',    icon: LayoutDashboard, label: 'Home' },
  { to: '/proxy-ledger', icon: Users,           label: 'Proxy' },
  { to: '/attendance',   icon: ClipboardList,   label: 'Attend' },
  { to: '/schedule',     icon: Calendar,        label: 'Schedule' },
]

const moreNavGroups = [
  {
    label: 'Academics',
    items: [
      { to: '/subjects',            icon: BookOpen,   label: 'Subjects' },
      { to: '/offering-calculator', icon: Calculator, label: 'Calculator' },
      { to: '/history',             icon: History,    label: 'History' },
    ],
  },
  {
    label: 'Social',
    items: [
      { to: '/friends',       icon: UserPlus, label: 'Friends' },
      { to: '/notifications', icon: Bell,     label: 'Notifications' },
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

export function BottomNav() {
  const location = useLocation()
  const navigate = useNavigate()
  const [moreOpen, setMoreOpen] = useState(false)
  const { profile, reset } = useAuthStore()
  const { addToast } = useUIStore()

  const isMoreActive = moreNavGroups
    .flatMap(g => g.items)
    .some(item => location.pathname === item.to)

  const handleSignOut = async () => {
    try {
      await authService.signOut()
      reset()
      navigate('/login')
      setMoreOpen(false)
    } catch {
      addToast({ type: 'error', message: 'Failed to sign out' })
    }
  }

  const initials = profile?.full_name
    ?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || 'U'

  return (
    <>
      {/* ── Bottom Bar ── */}
      <nav
        className="fixed bottom-0 left-0 w-full z-50 md:hidden bg-white/95 backdrop-blur-md border-t border-[#f0f0f0]"
        style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
      >
        <div className="flex items-center justify-around px-2 pt-2 pb-2">
          {primaryNav.map(({ to, icon: Icon, label }) => {
            const active = location.pathname === to || location.pathname.startsWith(to + '/')
            return (
              <NavLink key={to} to={to} className="flex-1" onClick={() => setMoreOpen(false)}>
                <motion.div
                  className="flex flex-col items-center justify-center py-1 gap-0.5"
                  whileTap={{ scale: 0.85 }}
                  transition={{ duration: 0.1 }}
                >
                  <div className={`relative flex items-center justify-center w-10 h-7 rounded-xl transition-all duration-200 ${active ? 'bg-[#091426]' : ''}`}>
                    <Icon size={19} className={`transition-colors duration-200 ${active ? 'text-white' : 'text-[#9ca3af]'}`} />
                  </div>
                  <span className={`text-[10px] font-semibold transition-colors duration-200 ${active ? 'text-[#091426]' : 'text-[#b0b7c3]'}`}>
                    {label}
                  </span>
                </motion.div>
              </NavLink>
            )
          })}

          {/* More button */}
          <motion.button
            className="flex-1"
            whileTap={{ scale: 0.85 }}
            onClick={() => setMoreOpen(v => !v)}
          >
            <div className="flex flex-col items-center justify-center py-1 gap-0.5">
              <div className={`relative flex items-center justify-center w-10 h-7 rounded-xl transition-all duration-200 ${moreOpen || isMoreActive ? 'bg-[#091426]' : ''}`}>
                {moreOpen ? (
                  <X size={19} className="text-white" />
                ) : (
                  <div className="flex flex-col gap-[3.5px] items-center">
                    <span className={`block w-[14px] h-[1.5px] rounded-full transition-colors ${isMoreActive ? 'bg-white' : 'bg-[#9ca3af]'}`} />
                    <span className={`block w-[14px] h-[1.5px] rounded-full transition-colors ${isMoreActive ? 'bg-white' : 'bg-[#9ca3af]'}`} />
                    <span className={`block w-[10px] h-[1.5px] rounded-full transition-colors ${isMoreActive ? 'bg-white' : 'bg-[#9ca3af]'}`} />
                  </div>
                )}
              </div>
              <span className={`text-[10px] font-semibold transition-colors duration-200 ${moreOpen || isMoreActive ? 'text-[#091426]' : 'text-[#b0b7c3]'}`}>
                More
              </span>
            </div>
          </motion.button>
        </div>
      </nav>

      {/* ── More Drawer ── */}
      <AnimatePresence>
        {moreOpen && (
          <>
            <motion.div
              className="fixed inset-0 z-40 bg-black/20 md:hidden"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={() => setMoreOpen(false)}
            />

            <motion.div
              className="fixed left-0 right-0 z-50 md:hidden bg-white rounded-t-2xl shadow-2xl"
              style={{ bottom: 'calc(env(safe-area-inset-bottom, 0px) + 64px)' }}
              initial={{ y: '100%', opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: '100%', opacity: 0 }}
              transition={{ type: 'spring', stiffness: 380, damping: 32 }}
            >
              {/* Handle */}
              <div className="flex justify-center pt-3 pb-1">
                <div className="w-8 h-1 bg-[#e5e7eb] rounded-full" />
              </div>

              {/* User info strip */}
              <div className="flex items-center gap-3 px-5 py-3 border-b border-[#f3f4f6]">
                <div className="w-9 h-9 rounded-full bg-[#091426] flex items-center justify-center text-white text-xs font-bold shrink-0">
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
                <div className="w-7 h-7 bg-[#091426] rounded-lg flex items-center justify-center shrink-0">
                  <GraduationCap size={14} className="text-white" />
                </div>
              </div>

              {/* Nav groups */}
              <div className="px-4 py-3 space-y-4 max-h-[60vh] overflow-y-auto scrollbar-hide">
                {moreNavGroups.map((group) => (
                  <div key={group.label}>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-[#b0b7c3] px-2 mb-1.5">
                      {group.label}
                    </p>
                    <div className="grid grid-cols-3 gap-2">
                      {group.items.map(({ to, icon: Icon, label }) => {
                        const active = location.pathname === to
                        return (
                          <motion.button
                            key={to}
                            whileTap={{ scale: 0.93 }}
                            onClick={() => { navigate(to); setMoreOpen(false) }}
                            className={`flex flex-col items-center gap-1.5 py-3 px-2 rounded-xl transition-all ${
                              active
                                ? 'bg-[#091426] text-white'
                                : 'bg-[#f7f9fb] text-[#374151] hover:bg-[#f0f0f0]'
                            }`}
                          >
                            <Icon size={20} className={active ? 'text-white' : 'text-[#6b7280]'} />
                            <span className={`text-[11px] font-semibold ${active ? 'text-white' : 'text-[#6b7280]'}`}>
                              {label}
                            </span>
                          </motion.button>
                        )
                      })}
                    </div>
                  </div>
                ))}

                {/* Sign out */}
                <motion.button
                  whileTap={{ scale: 0.97 }}
                  onClick={handleSignOut}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-[#fff5f5] text-[#ba1a1a] hover:bg-[#ffdad6] transition-colors"
                >
                  <LogOut size={17} />
                  <span className="text-sm font-semibold">Sign Out</span>
                </motion.button>
              </div>

              <div className="h-3" />
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  )
}
