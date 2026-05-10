import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  LayoutGrid, History, Calendar, Settings,
  BookOpen, Users, Calculator, Bell, User,
  ClipboardList, UserPlus, X, ChevronRight
} from 'lucide-react'
import { useState } from 'react'

// Primary nav — always visible in bottom bar
const primaryNav = [
  { to: '/dashboard',    icon: LayoutGrid,    label: 'Home' },
  { to: '/proxy-ledger', icon: Users,         label: 'Proxy' },
  { to: '/attendance',   icon: ClipboardList, label: 'Attendance' },
  { to: '/schedule',     icon: Calendar,      label: 'Schedule' },
]

// Secondary nav — shown in "More" drawer
const moreNav = [
  { to: '/subjects',             icon: BookOpen,    label: 'Subjects' },
  { to: '/offering-calculator',  icon: Calculator,  label: 'Calculator' },
  { to: '/friends',              icon: UserPlus,    label: 'Friends' },
  { to: '/history',              icon: History,     label: 'History' },
  { to: '/notifications',        icon: Bell,        label: 'Notifications' },
  { to: '/profile',              icon: User,        label: 'Profile' },
  { to: '/settings',             icon: Settings,    label: 'Settings' },
]

export function BottomNav() {
  const location = useLocation()
  const navigate = useNavigate()
  const [moreOpen, setMoreOpen] = useState(false)

  const isMoreActive = moreNav.some(item => location.pathname === item.to)

  return (
    <>
      {/* Bottom Nav Bar */}
      <nav
        className="fixed bottom-0 left-0 w-full z-50 md:hidden bg-white border-t border-[#e6e8ea]"
        style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
      >
        <div className="flex justify-around items-center px-1 pt-2 pb-2">
          {primaryNav.map(({ to, icon: Icon, label }) => {
            const active = location.pathname === to || location.pathname.startsWith(to + '/')
            return (
              <NavLink key={to} to={to} className="flex-1" onClick={() => setMoreOpen(false)}>
                <motion.div
                  className="flex flex-col items-center justify-center py-1 px-1 rounded-xl relative"
                  whileTap={{ scale: 0.85 }}
                >
                  {active && (
                    <motion.div
                      layoutId="nav-pill"
                      className="absolute inset-0 bg-[#eff6ff] rounded-xl"
                      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                    />
                  )}
                  <Icon size={21} className={`relative z-10 ${active ? 'text-[#3b82f6]' : 'text-[#9ca3af]'}`} />
                  <span className={`relative z-10 text-[10px] font-semibold mt-0.5 ${active ? 'text-[#3b82f6]' : 'text-[#9ca3af]'}`}>
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
            <div className="flex flex-col items-center justify-center py-1 px-1 rounded-xl relative">
              {(moreOpen || isMoreActive) && (
                <motion.div
                  layoutId="nav-pill"
                  className="absolute inset-0 bg-[#eff6ff] rounded-xl"
                  transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                />
              )}
              <div className="relative z-10 flex flex-col gap-[3px] items-center justify-center h-[21px]">
                <span className={`block w-4 h-0.5 rounded-full ${moreOpen || isMoreActive ? 'bg-[#3b82f6]' : 'bg-[#9ca3af]'}`} />
                <span className={`block w-4 h-0.5 rounded-full ${moreOpen || isMoreActive ? 'bg-[#3b82f6]' : 'bg-[#9ca3af]'}`} />
                <span className={`block w-4 h-0.5 rounded-full ${moreOpen || isMoreActive ? 'bg-[#3b82f6]' : 'bg-[#9ca3af]'}`} />
              </div>
              <span className={`relative z-10 text-[10px] font-semibold mt-0.5 ${moreOpen || isMoreActive ? 'text-[#3b82f6]' : 'text-[#9ca3af]'}`}>
                More
              </span>
            </div>
          </motion.button>
        </div>
      </nav>

      {/* More Drawer — slides up from bottom */}
      <AnimatePresence>
        {moreOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              className="fixed inset-0 z-40 bg-black/30 md:hidden"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMoreOpen(false)}
            />

            {/* Drawer */}
            <motion.div
              className="fixed bottom-0 left-0 right-0 z-50 md:hidden bg-white rounded-t-2xl shadow-2xl"
              style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 80px)' }}
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', stiffness: 400, damping: 35 }}
            >
              {/* Handle */}
              <div className="flex justify-center pt-3 pb-2">
                <div className="w-10 h-1 bg-[#e6e8ea] rounded-full" />
              </div>

              {/* Header */}
              <div className="flex items-center justify-between px-5 pb-3 border-b border-[#f3f4f6]">
                <span className="text-sm font-bold text-[#091426]">More</span>
                <motion.button
                  whileTap={{ scale: 0.9 }}
                  onClick={() => setMoreOpen(false)}
                  className="w-7 h-7 rounded-full bg-[#f3f4f6] flex items-center justify-center"
                >
                  <X size={14} className="text-[#6b7280]" />
                </motion.button>
              </div>

              {/* Nav items grid */}
              <div className="grid grid-cols-2 gap-2 p-4">
                {moreNav.map(({ to, icon: Icon, label }) => {
                  const active = location.pathname === to
                  return (
                    <motion.button
                      key={to}
                      whileTap={{ scale: 0.96 }}
                      onClick={() => { navigate(to); setMoreOpen(false) }}
                      className={`flex items-center gap-3 px-4 py-3.5 rounded-xl text-left transition-colors ${
                        active
                          ? 'bg-[#eff6ff] text-[#3b82f6]'
                          : 'bg-[#f7f9fb] text-[#374151] hover:bg-[#f3f4f6]'
                      }`}
                    >
                      <Icon size={18} className={active ? 'text-[#3b82f6]' : 'text-[#6b7280]'} />
                      <span className="text-sm font-semibold">{label}</span>
                      {active && <ChevronRight size={14} className="ml-auto text-[#3b82f6]" />}
                    </motion.button>
                  )
                })}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  )
}
