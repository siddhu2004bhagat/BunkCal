import { motion } from 'framer-motion'
import React from 'react'
import { LogOut, Trash2, Bell, Moon, Shield, ChevronRight } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { AppShell } from '@/components/layout/AppShell'
import { PageTransition } from '@/components/motion/PageTransition'
import { Card } from '@/components/ui/Card'
import { useAuthStore } from '@/store/authStore'
import { useUIStore } from '@/store/uiStore'
import { authService } from '@/services/auth'
import { useState } from 'react'

interface ToggleProps {
  checked: boolean
  onChange: (v: boolean) => void
}

function Toggle({ checked, onChange }: ToggleProps) {
  return (
    <motion.button
      type="button"
      onClick={() => onChange(!checked)}
      className={`relative w-11 h-6 rounded-full transition-colors duration-200 ${checked ? 'bg-[#091426]' : 'bg-[#c5c6cd]'}`}
    >
      <motion.div
        className="absolute top-0.5 w-5 h-5 bg-white rounded-full ambient-shadow"
        animate={{ left: checked ? '22px' : '2px' }}
        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
      />
    </motion.button>
  )
}

export default function Settings() {
  const navigate = useNavigate()
  const { signOut } = useAuthStore()
  const { addToast } = useUIStore()
  const [notifications, setNotifications] = useState(true)
  const [emailNotifs, setEmailNotifs] = useState(false)
  const [darkMode, setDarkMode] = useState(false)

  const handleSignOut = async () => {
    try {
      await authService.signOut()
      signOut()
      navigate('/login')
    } catch {
      addToast({ type: 'error', message: 'Failed to sign out' })
    }
  }

  const sections: Array<{
    title: string
    items: Array<{
      icon: React.ReactNode
      label: string
      description: string
      control: React.ReactNode
      onClick?: () => void
    }>
  }> = [
    {
      title: 'Preferences',
      items: [
        {
          icon: <Bell size={18} />,
          label: 'Push Notifications',
          description: 'Attendance warnings and reminders',
          control: <Toggle checked={notifications} onChange={setNotifications} />,
        },
        {
          icon: <Bell size={18} />,
          label: 'Email Notifications',
          description: 'Weekly attendance summary',
          control: <Toggle checked={emailNotifs} onChange={setEmailNotifs} />,
        },
        {
          icon: <Moon size={18} />,
          label: 'Dark Mode',
          description: 'Switch to dark theme',
          control: <Toggle checked={darkMode} onChange={setDarkMode} />,
        },
      ],
    },
    {
      title: 'Privacy',
      items: [
        {
          icon: <Shield size={18} />,
          label: 'Privacy Policy',
          description: 'How we handle your data',
          control: <ChevronRight size={16} className="text-[#75777d]" />,
          onClick: () => {},
        },
      ],
    },
  ]

  return (
    <AppShell>
      <PageTransition>
        <div className="max-w-lg mx-auto">
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-[#091426]">Settings</h1>
            <p className="text-sm text-[#45474c] mt-0.5">Manage your preferences</p>
          </div>

          <div className="space-y-4">
            {sections.map((section) => (
              <Card key={section.title} padding="none">
                <div className="px-6 py-3 border-b border-[#f2f4f6]">
                  <p className="text-xs font-semibold uppercase tracking-wider text-[#75777d]">{section.title}</p>
                </div>
                {section.items.map((item, i) => (
                  <motion.div
                    key={item.label}
                    whileTap={item.onClick ? { scale: 0.99 } : {}}
                    onClick={item.onClick}
                    className={`flex items-center justify-between px-6 py-4 ${i < section.items.length - 1 ? 'border-b border-[#f2f4f6]' : ''} ${item.onClick ? 'cursor-pointer hover:bg-[#f7f9fb]' : ''} transition-colors`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-[#f2f4f6] flex items-center justify-center text-[#45474c]">
                        {item.icon}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-[#091426]">{item.label}</p>
                        <p className="text-xs text-[#75777d]">{item.description}</p>
                      </div>
                    </div>
                    {item.control}
                  </motion.div>
                ))}
              </Card>
            ))}

            {/* Account Actions */}
            <Card padding="none">
              <div className="px-6 py-3 border-b border-[#f2f4f6]">
                <p className="text-xs font-semibold uppercase tracking-wider text-[#75777d]">Account</p>
              </div>
              <motion.button
                whileTap={{ scale: 0.99 }}
                onClick={handleSignOut}
                className="w-full flex items-center gap-3 px-6 py-4 border-b border-[#f2f4f6] hover:bg-[#f7f9fb] transition-colors"
              >
                <div className="w-8 h-8 rounded-lg bg-[#f2f4f6] flex items-center justify-center">
                  <LogOut size={18} className="text-[#45474c]" />
                </div>
                <div className="text-left">
                  <p className="text-sm font-medium text-[#091426]">Sign Out</p>
                  <p className="text-xs text-[#75777d]">Sign out of your account</p>
                </div>
              </motion.button>
              <motion.button
                whileTap={{ scale: 0.99 }}
                onClick={() => {
                  if (confirm('Are you sure you want to delete your account? This cannot be undone.')) {
                    addToast({ type: 'info', message: 'Contact support to delete your account.' })
                  }
                }}
                className="w-full flex items-center gap-3 px-6 py-4 hover:bg-[#fff5f5] transition-colors"
              >
                <div className="w-8 h-8 rounded-lg bg-[#ffdad6] flex items-center justify-center">
                  <Trash2 size={18} className="text-[#ba1a1a]" />
                </div>
                <div className="text-left">
                  <p className="text-sm font-medium text-[#ba1a1a]">Delete Account</p>
                  <p className="text-xs text-[#75777d]">Permanently delete all your data</p>
                </div>
              </motion.button>
            </Card>

            <p className="text-center text-xs text-[#75777d] py-2">Bunkwise v1.0.0 · Made for students</p>
          </div>
        </div>
      </PageTransition>
    </AppShell>
  )
}
