import { NavLink } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  LayoutDashboard, BookOpen, Users, Calculator,
  Calendar, History, Bell, User, Settings, ClipboardList, UserPlus
} from 'lucide-react'

const navItems = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/subjects', icon: BookOpen, label: 'Subjects' },
  { to: '/attendance', icon: ClipboardList, label: 'Attendance' },
  { to: '/friends', icon: UserPlus, label: 'Friends' },
  { to: '/proxy-ledger', icon: Users, label: 'Proxy Ledger' },
  { to: '/offering-calculator', icon: Calculator, label: 'Calculator' },
  { to: '/schedule', icon: Calendar, label: 'Schedule' },
  { to: '/history', icon: History, label: 'History' },
  { to: '/notifications', icon: Bell, label: 'Notifications' },
  { to: '/profile', icon: User, label: 'Profile' },
  { to: '/settings', icon: Settings, label: 'Settings' },
]

export function Sidebar() {
  return (
    <aside className="hidden md:flex flex-col w-60 fixed left-0 top-16 bottom-0 bg-white border-r border-[#c5c6cd] z-40 overflow-y-auto scrollbar-hide">
      <div className="p-4 flex-1">
        <nav className="space-y-0.5 mt-2">
          {navItems.map(({ to, icon: Icon, label }) => (
            <NavLink key={to} to={to}>
              {({ isActive }) => (
                <motion.div
                  whileHover={{ x: 2 }}
                  whileTap={{ scale: 0.97 }}
                  transition={{ duration: 0.12 }}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors duration-150 ${
                    isActive
                      ? 'bg-[#d0e1fb] text-[#091426]'
                      : 'text-[#45474c] hover:bg-[#f2f4f6] hover:text-[#091426]'
                  }`}
                >
                  <Icon size={18} />
                  {label}
                </motion.div>
              )}
            </NavLink>
          ))}
        </nav>
      </div>
    </aside>
  )
}
