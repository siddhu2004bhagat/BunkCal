import { supabase } from '@/lib/supabase'
import type { Profile } from '@/types/database'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any

/** Generate a short unique friend code like BW-A3X9K */
function generateFriendCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let code = 'BW-'
  for (let i = 0; i < 5; i++) {
    code += chars[Math.floor(Math.random() * chars.length)]
  }
  return code
}

export const profilesService = {
  async getProfile(userId: string): Promise<Profile | null> {
    const { data, error } = await db
      .from('profiles')
      .select('*')
      .eq('user_id', userId)
      .single()
    if (error && error.code !== 'PGRST116') throw error
    return data ?? null
  },

  /** Look up a user by their friend code */
  async getProfileByFriendCode(code: string): Promise<Profile | null> {
    const { data, error } = await db
      .from('profiles')
      .select('*')
      .eq('friend_code', code.toUpperCase().trim())
      .single()
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
    const friendCode = generateFriendCode()
    const { data, error } = await db
      .from('profiles')
      .upsert(
        {
          user_id: userId,
          email,
          full_name: fullName || null,
          attendance_goal: 75,
          friend_code: friendCode,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id' }
      )
      .select()
      .single()
    if (error) throw error
    return data
  },

  /** Ensure a profile has a friend code — assign one if missing */
  async ensureFriendCode(userId: string): Promise<string> {
    const profile = await profilesService.getProfile(userId)
    if (profile?.friend_code) return profile.friend_code

    const code = generateFriendCode()
    await db
      .from('profiles')
      .update({ friend_code: code, updated_at: new Date().toISOString() })
      .eq('user_id', userId)
    return code
  },
}
