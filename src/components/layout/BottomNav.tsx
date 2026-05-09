import { NavLink, useLocation } from 'react-router-dom'
import { motion } from 'framer-motion'
import { LayoutDashboard, BookOpen, Users, Calculator, User } from 'lucide-react'

const navItems = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Home' },
  { to: '/subjects', icon: BookOpen, label: 'Subjects' },
  { to: '/proxy-ledger', icon: Users, label: 'Proxy' },
  { to: '/offering-calculator', icon: Calculator, label: 'Calculate' },
  { to: '/profile', icon: User, label: 'Profile' },
]

export function BottomNav() {
  const location = useLocation()

  return (
    <nav className="fixed bottom-0 left-0 w-full z-50 md:hidden bg-white border-t border-[#c5c6cd] ambient-shadow">
      <div className="flex justify-around items-center px-2 py-2">
        {navItems.map(({ to, icon: Icon, label }) => {
          const active = location.pathname === to || location.pathname.startsWith(to + '/')
          return (
            <NavLink key={to} to={to} className="flex-1">
              <motion.div
                className="flex flex-col items-center justify-center py-1 px-2 rounded-xl relative"
                whileTap={{ scale: 0.88 }}
                transition={{ duration: 0.12 }}
              >
                {active && (
                  <motion.div
                    layoutId="nav-pill"
                    className="absolute inset-0 bg-[#d0e1fb] rounded-xl"
                    transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                  />
                )}
                <Icon
                  size={22}
                  className={`relative z-10 transition-colors duration-150 ${active ? 'text-[#091426]' : 'text-[#75777d]'}`}
                />
                <span
                  className={`relative z-10 text-[10px] font-semibold mt-0.5 tracking-wide transition-colors duration-150 ${active ? 'text-[#091426]' : 'text-[#75777d]'}`}
                >
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
