import { supabase } from '@/lib/supabase'
import type { Notification } from '@/types/database'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any

export const notificationsService = {
  async getNotifications(userId: string): Promise<Notification[]> {
    const { data, error } = await db
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
    if (error) throw error
    return data || []
  },

  async markRead(id: string): Promise<void> {
    const { error } = await db
      .from('notifications')
      .update({ read: true })
      .eq('id', id)
    if (error) throw error
  },

  async markAllRead(userId: string): Promise<void> {
    const { error } = await db
      .from('notifications')
      .update({ read: true })
      .eq('user_id', userId)
    if (error) throw error
  },

  async createNotification(notification: Omit<Notification, 'id' | 'created_at'>): Promise<Notification> {
    const { data, error } = await db
      .from('notifications')
      .insert(notification)
      .select()
      .single()
    if (error) throw error
    return data
  },
}
