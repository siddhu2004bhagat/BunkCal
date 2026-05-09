import { NavLink, useLocation } from 'react-router-dom'
import { motion } from 'framer-motion'
import { LayoutGrid, History, Calendar, Settings } from 'lucide-react'

const navItems = [
  { to: '/dashboard', icon: LayoutGrid, label: 'Attendance' },
  { to: '/history', icon: History, label: 'History' },
  { to: '/schedule', icon: Calendar, label: 'Schedule' },
  { to: '/settings', icon: Settings, label: 'Settings' },
]

export function BottomNav() {
  const location = useLocation()

  return (
    <nav className="fixed bottom-0 left-0 w-full z-50 md:hidden bg-white border-t border-[#e6e8ea]">
      <div className="flex justify-around items-center px-2 py-2">
        {navItems.map(({ to, icon: Icon, label }) => {
          const active = location.pathname === to ||
            (to === '/dashboard' && location.pathname === '/')
          return (
            <NavLink key={to} to={to} className="flex-1">
              <motion.div
                className="flex flex-col items-center justify-center py-1.5 px-2 rounded-xl relative"
                whileTap={{ scale: 0.88 }}
                transition={{ duration: 0.12 }}
              >
                {active && (
                  <motion.div
                    layoutId="nav-pill"
                    className="absolute inset-0 bg-[#eff6ff] rounded-xl"
                    transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                  />
                )}
                <Icon
                  size={22}
                  className={`relative z-10 transition-colors duration-150 ${active ? 'text-[#3b82f6]' : 'text-[#9ca3af]'}`}
                />
                <span className={`relative z-10 text-[10px] font-semibold mt-0.5 transition-colors duration-150 ${active ? 'text-[#3b82f6]' : 'text-[#9ca3af]'}`}>
                  {label}
                </span>
              </motion.div>
            </NavLink>
          )
        })}
      </div>
    </nav>
  )
}
