import { supabase } from '@/lib/supabase'
import type { Subject } from '@/types/database'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any

export const subjectsService = {
  async getSubjects(userId: string): Promise<Subject[]> {
    const { data, error } = await db
      .from('subjects')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: true })
    if (error) throw error
    return data || []
  },

  async getSubject(id: string): Promise<Subject | null> {
    const { data, error } = await db
      .from('subjects')
      .select('*')
      .eq('id', id)
      .single()
    if (error) throw error
    return data
  },

  async createSubject(userId: string, subject: Omit<Subject, 'id' | 'user_id' | 'created_at' | 'updated_at'>): Promise<Subject> {
    const { data, error } = await db
      .from('subjects')
      .insert({ ...subject, user_id: userId })
      .select()
      .single()
    if (error) throw error
    return data
  },

  async updateSubject(id: string, updates: Partial<Subject>): Promise<Subject> {
    const { data, error } = await db
      .from('subjects')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    return data
  },

  async deleteSubject(id: string): Promise<void> {
    const { error } = await db.from('subjects').delete().eq('id', id)
    if (error) throw error
  },

  async markAttendance(id: string, attended: boolean): Promise<Subject> {
    const { data: subject, error: fetchError } = await db
      .from('subjects')
      .select('attended_classes, total_classes')
      .eq('id', id)
      .single()
    if (fetchError) throw fetchError

    const newTotal = subject.total_classes + 1
    const newAttended = attended ? subject.attended_classes + 1 : subject.attended_classes

    const { data, error } = await db
      .from('subjects')
      .update({
        attended_classes: newAttended,
        total_classes: newTotal,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    return data
  },
}
