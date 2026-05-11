/**
 * Singleton Realtime Manager — created ONCE outside React lifecycle.
 * This is the same pattern used in WhatsApp-style messaging apps.
 * 
 * By living outside React, it's immune to StrictMode double-mount,
 * component re-renders, and cleanup/re-run cycles.
 */

import { supabase } from '@/lib/supabase'
import { showNotification } from '@/hooks/usePushNotifications'

type Callback = () => void
type NotifCallback = (payload: { title: string; message: string; type: string; id: string }) => void

class RealtimeManager {
  private channel: ReturnType<typeof supabase.channel> | null = null
  private userId: string | null = null
  private callbacks = new Map<string, Set<Callback>>()
  private notifCallbacks = new Set<NotifCallback>()
  private isConnected = false

  // Subscribe to a specific event key
  on(key: string, cb: Callback) {
    if (!this.callbacks.has(key)) this.callbacks.set(key, new Set())
    this.callbacks.get(key)!.add(cb)
    return () => this.callbacks.get(key)?.delete(cb)
  }

  onNotification(cb: NotifCallback) {
    this.notifCallbacks.add(cb)
    return () => this.notifCallbacks.delete(cb)
  }

  private emit(key: string) {
    this.callbacks.get(key)?.forEach(cb => cb())
  }

  connect(userId: string) {
    // Already connected for this user — skip
    if (this.userId === userId && this.isConnected) return
    
    // Disconnect previous
    this.disconnect()
    this.userId = userId

    const channel = supabase.channel(`bunkwise_rt_${userId}`)

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const on = (table: string, filter: string, key: string) => {
      channel.on('postgres_changes' as any, { event: '*', schema: 'public', table, filter },
        () => this.emit(key))
    }

    on('subjects',           `user_id=eq.${userId}`, 'subjects')
    on('attendance_records', `user_id=eq.${userId}`, 'attendance')
    on('proxy_ledger',       `user_id=eq.${userId}`, 'proxy-ledger')
    on('proxy_transactions', `user_id=eq.${userId}`, 'proxy-transactions')
    on('timetable_entries',  `user_id=eq.${userId}`, 'timetable')
    on('friends',            `user_id=eq.${userId}`, 'friends')

    // Friend requests — receiver
    channel.on('postgres_changes' as any,
      { event: 'INSERT', schema: 'public', table: 'friend_requests', filter: `receiver_id=eq.${userId}` },
      () => { this.emit('friend-requests'); this.emit('notifications') }
    )

    // Friend requests — sender status
    channel.on('postgres_changes' as any,
      { event: 'UPDATE', schema: 'public', table: 'friend_requests', filter: `sender_id=eq.${userId}` },
      () => { this.emit('sent-requests'); this.emit('friends'); this.emit('notifications') }
    )

    // Notifications — fire browser push immediately
    channel.on('postgres_changes' as any,
      { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${userId}` },
      (payload: any) => {
        this.emit('notifications')
        if (payload?.new) {
          // Notify all registered callbacks
          this.notifCallbacks.forEach(cb => cb(payload.new))
          // Fire browser push
          if (Notification.permission === 'granted') {
            const icons: Record<string, string> = { warning: '⚠️', success: '✅', info: '👋', proxy: '🤝' }
            showNotification(
              `${icons[payload.new.type] || '🔔'} ${payload.new.title}`,
              payload.new.message,
              { tag: `rt-${payload.new.id}` }
            )
            // Mark seen
            try {
              const seen = JSON.parse(localStorage.getItem('bunkwise-seen-notifs') || '[]')
              seen.push(payload.new.id)
              localStorage.setItem('bunkwise-seen-notifs', JSON.stringify(seen.slice(-100)))
            } catch { /* ignore */ }
          }
        }
      }
    )

    // Profile updates
    channel.on('postgres_changes' as any,
      { event: 'UPDATE', schema: 'public', table: 'profiles', filter: `user_id=eq.${userId}` },
      (payload: any) => {
        this.emit('profile')
        if (payload?.new) {
          // Update auth store directly
          import('@/store/authStore').then(({ useAuthStore }) => {
            useAuthStore.getState().setProfile(payload.new)
          })
        }
      }
    )

    channel.subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        this.isConnected = true
        console.info('[Realtime] ✓ Connected — WhatsApp-style live updates active')
      } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
        this.isConnected = false
        console.warn('[Realtime] Connection failed')
      }
    })

    this.channel = channel
  }

  disconnect() {
    this.isConnected = false
    this.userId = null
    if (this.channel) {
      try { supabase.removeChannel(this.channel) } catch { /* ignore */ }
      this.channel = null
    }
  }
}

// Singleton — created once, lives for the entire app session
export const realtimeManager = new RealtimeManager()
