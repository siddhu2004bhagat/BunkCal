import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import { Bell, CheckCheck, AlertTriangle, Info, CheckCircle, Users } from 'lucide-react'
import { AppShell } from '@/components/layout/AppShell'
import { PageTransition } from '@/components/motion/PageTransition'
import { StaggerContainer, StaggerItem } from '@/components/motion/FadeIn'
import { EmptyState } from '@/components/ui/EmptyState'
import { Button } from '@/components/ui/Button'
import { useAuthStore } from '@/store/authStore'
import { useUIStore } from '@/store/uiStore'
import { notificationsService } from '@/services/notifications'
import type { Notification } from '@/types/database'

const typeIcon = (type: Notification['type']) => {
  switch (type) {
    case 'warning': return <AlertTriangle size={18} className="text-amber-600" />
    case 'success': return <CheckCircle size={18} className="text-[#24a375]" />
    case 'proxy': return <Users size={18} className="text-[#505f76]" />
    default: return <Info size={18} className="text-[#505f76]" />
  }
}

const typeBg = (type: Notification['type']) => {
  switch (type) {
    case 'warning': return 'bg-amber-50 border-amber-200'
    case 'success': return 'bg-[#f0fdf4] border-[#85f8c4]'
    case 'proxy': return 'bg-[#f0f4ff] border-[#d0e1fb]'
    default: return 'bg-[#f7f9fb] border-[#c5c6cd]'
  }
}

export default function Notifications() {
  const { user } = useAuthStore()
  const { addToast } = useUIStore()
  const queryClient = useQueryClient()

  const { data: notifications = [] } = useQuery({
    queryKey: ['notifications', user?.id],
    queryFn: () => notificationsService.getNotifications(user!.id),
    enabled: !!user?.id,
  })

  const markReadMutation = useMutation({
    mutationFn: (id: string) => notificationsService.markRead(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }),
  })

  const markAllMutation = useMutation({
    mutationFn: () => notificationsService.markAllRead(user!.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
      addToast({ type: 'success', message: 'All notifications marked as read' })
    },
  })

  const unreadCount = notifications.filter((n) => !n.read).length

  return (
    <AppShell>
      <PageTransition>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-[#091426]">Notifications</h1>
            <p className="text-sm text-[#45474c] mt-0.5">
              {unreadCount > 0 ? `${unreadCount} unread` : 'All caught up'}
            </p>
          </div>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              icon={<CheckCheck size={14} />}
              onClick={() => markAllMutation.mutate()}
              loading={markAllMutation.isPending}
            >
              Mark all read
            </Button>
          )}
        </div>

        {notifications.length === 0 ? (
          <EmptyState
            icon={<Bell size={28} />}
            title="No notifications"
            description="You're all caught up! Notifications about attendance and proxies will appear here."
          />
        ) : (
          <StaggerContainer className="space-y-2">
            <AnimatePresence>
              {notifications.map((notif) => (
                <StaggerItem key={notif.id}>
                  <motion.div
                    layout
                    onClick={() => !notif.read && markReadMutation.mutate(notif.id)}
                    className={`flex items-start gap-3 p-4 rounded-xl border cursor-pointer transition-all ${typeBg(notif.type)} ${!notif.read ? 'opacity-100' : 'opacity-60'}`}
                  >
                    <div className="mt-0.5 shrink-0">{typeIcon(notif.type)}</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <p className="font-semibold text-sm text-[#091426]">{notif.title}</p>
                        {!notif.read && (
                          <span className="w-2 h-2 rounded-full bg-[#091426] shrink-0 mt-1.5" />
                        )}
                      </div>
                      <p className="text-xs text-[#45474c] mt-0.5">{notif.message}</p>
                      <p className="text-xs text-[#75777d] mt-1">
                        {new Date(notif.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </motion.div>
                </StaggerItem>
              ))}
            </AnimatePresence>
          </StaggerContainer>
        )}
      </PageTransition>
    </AppShell>
  )
}
