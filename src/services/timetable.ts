import { supabase } from '@/lib/supabase'
import type { TimetableEntry } from '@/types/database'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any

export const timetableService = {
  async getEntries(userId: string): Promise<TimetableEntry[]> {
    const { data, error } = await db
      .from('timetable_entries')
      .select('*')
      .eq('user_id', userId)
      .order('day_of_week', { ascending: true })
    if (error) throw error
    return data || []
  },

  async addEntry(entry: Omit<TimetableEntry, 'id' | 'created_at' | 'updated_at'>): Promise<TimetableEntry> {
    const { data, error } = await db
      .from('timetable_entries')
      .insert(entry)
      .select()
      .single()
    if (error) throw error
    return data
  },

  async updateEntry(id: string, updates: Partial<TimetableEntry>): Promise<TimetableEntry> {
    const { data, error } = await db
      .from('timetable_entries')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    return data
  },

  async deleteEntry(id: string): Promise<void> {
    const { error } = await db.from('timetable_entries').delete().eq('id', id)
    if (error) throw error
  },
}
