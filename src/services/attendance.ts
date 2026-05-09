import { supabase } from '@/lib/supabase'
import type { AttendanceRecord } from '@/types/database'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any

export const attendanceService = {
  async getRecords(userId: string, subjectId?: string): Promise<AttendanceRecord[]> {
    let query = db
      .from('attendance_records')
      .select('*')
      .eq('user_id', userId)
      .order('date', { ascending: false })

    if (subjectId) query = query.eq('subject_id', subjectId)

    const { data, error } = await query
    if (error) throw error
    return data || []
  },

  async addRecord(record: Omit<AttendanceRecord, 'id' | 'created_at'>): Promise<AttendanceRecord> {
    const { data, error } = await db
      .from('attendance_records')
      .insert(record)
      .select()
      .single()
    if (error) throw error
    return data
  },

  async deleteRecord(id: string): Promise<void> {
    const { error } = await db.from('attendance_records').delete().eq('id', id)
    if (error) throw error
  },
}
