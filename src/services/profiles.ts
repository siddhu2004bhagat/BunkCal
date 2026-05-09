import { supabase } from '@/lib/supabase'
import type { Profile } from '@/types/database'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any

export const profilesService = {
  async getProfile(userId: string): Promise<Profile | null> {
    const { data, error } = await db
      .from('profiles')
      .select('*')
      .eq('user_id', userId)
      .single()
    // PGRST116 = no rows found — not an error
    if (error && error.code !== 'PGRST116') throw error
    return data ?? null
  },

  async upsertProfile(userId: string, updates: Partial<Profile>): Promise<Profile> {
    const { data, error } = await db
      .from('profiles')
      .upsert(
        { user_id: userId, ...updates, updated_at: new Date().toISOString() },
        { onConflict: 'user_id' }
      )
      .select()
      .single()
    if (error) throw error
    return data
  },

  async createProfile(userId: string, email: string, fullName?: string): Promise<Profile> {
    // Use upsert so it works even if the trigger already created the row
    const { data, error } = await db
      .from('profiles')
      .upsert(
        {
          user_id: userId,
          email,
          full_name: fullName || null,
          attendance_goal: 75,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id' }
      )
      .select()
      .single()
    if (error) throw error
    return data
  },
}
