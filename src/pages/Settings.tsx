import { motion } from 'framer-motion'
import React, { useState, useEffect } from 'react'
import { LogOut, Trash2, Bell, Moon, Shield, ChevronRight, BellOff, Zap } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { AppShell } from '@/components/layout/AppShell'
import { PageTransition } from '@/components/motion/PageTransition'
import { Card } from '@/components/ui/Card'
import { useAuthStore } from '@/store/authStore'
import { useUIStore } from '@/store/uiStore'
import { authService } from '@/services/auth'
import { requestNotificationPermission, showNotification } from '@/hooks/usePushNotifications'
import { triggerSmartNotifications } from '@/hooks/useSmartNotifications'

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
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
  const { reset: signOut, user } = useAuthStore()
  const { addToast } = useUIStore()
  const [darkMode, setDarkMode] = useState(false)
  const [emailNotifs, setEmailNotifs] = useState(false)

  // Push notification state — synced with browser permission
  const [pushEnabled, setPushEnabled] = useState(false)
  const [pushSupported] = useState('Notification' in window)

  useEffect(() => {
    if (pushSupported) {
      setPushEnabled(Notification.permission === 'granted')
    }
  }, [pushSupported])

  const handlePushToggle = async (enabled: boolean) => {
    if (enabled) {
      const granted = await requestNotificationPermission()
      if (granted) {
        setPushEnabled(true)
        // Send a test notification
        showNotification('🎉 Notifications enabled!', 'You\'ll now get attendance warnings and proxy updates.')
        addToast({ type: 'success', message: 'Push notifications enabled' })
      } else {
        addToast({ type: 'warning', message: 'Permission denied. Enable in browser settings.' })
      }
    } else {
      setPushEnabled(false)
      addToast({ type: 'info', message: 'Notifications disabled. Re-enable in browser settings to turn back on.' })
    }
  }

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
      title: 'Notifications',
      items: [
        {
          icon: pushEnabled ? <Bell size={18} /> : <BellOff size={18} />,
          label: 'Push Notifications',
          description: pushSupported
            ? pushEnabled
              ? 'Attendance warnings, proxy updates, reminders'
              : 'Tap to enable attendance alerts'
            : 'Not supported in this browser',
          control: pushSupported
            ? <Toggle checked={pushEnabled} onChange={handlePushToggle} />
            : <span className="text-xs text-[#75777d]">N/A</span>,
        },
        {
          icon: <Zap size={18} />,
          label: 'Smart Alerts',
          description: pushEnabled ? 'Tap to send attendance & proxy alerts now' : 'Enable notifications first',
          control: (
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={async () => {
                if (!pushEnabled) { addToast({ type: 'warning', message: 'Enable notifications first' }); return }
                const sent = await triggerSmartNotifications(user!.id)
                if (sent) addToast({ type: 'success', message: 'Smart alerts sent!' })
              }}
              className="text-xs font-semibold bg-[#091426] text-white px-3 py-1.5 rounded-lg hover:bg-[#1e293b] transition-colors disabled:opacity-50"
            >
              Send Now
            </motion.button>
          ),
        },
        {
          icon: <Bell size={18} />,
          label: 'Email Notifications',
          description: 'Weekly attendance summary',
          control: <Toggle checked={emailNotifs} onChange={setEmailNotifs} />,
        },
      ],
    },
    {
      title: 'Appearance',
      items: [
        {
          icon: <Moon size={18} />,
          label: 'Dark Mode',
          description: 'Coming soon',
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

            {/* Account */}
            <Card padding="none">
              <div className="px-6 py-3 border-b border-[#f2f4f6]">
                <p className="text-xs font-semibold uppercase tracking-wider text-[#75777d]">Account</p>
              </div>
              <motion.button whileTap={{ scale: 0.99 }} onClick={handleSignOut}
                className="w-full flex items-center gap-3 px-6 py-4 border-b border-[#f2f4f6] hover:bg-[#f7f9fb] transition-colors">
                <div className="w-8 h-8 rounded-lg bg-[#f2f4f6] flex items-center justify-center">
                  <LogOut size={18} className="text-[#45474c]" />
                </div>
                <div className="text-left">
                  <p className="text-sm font-medium text-[#091426]">Sign Out</p>
                  <p className="text-xs text-[#75777d]">Sign out of your account</p>
                </div>
              </motion.button>
              <motion.button whileTap={{ scale: 0.99 }}
                onClick={() => {
                  if (window.confirm('Delete your account? This cannot be undone.')) {
                    addToast({ type: 'info', message: 'Contact support to delete your account.' })
                  }
                }}
                className="w-full flex items-center gap-3 px-6 py-4 hover:bg-[#fff5f5] transition-colors">
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
