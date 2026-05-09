import { supabase } from '@/lib/supabase'
import type { Profile } from '@/types/database'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any

// Wrap any DB call with an 8s timeout so it never hangs forever
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function withTimeout<T extends { data: any; error: any }>(promise: Promise<T>, ms = 8000): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`Request timed out after ${ms}ms`)), ms)
    ),
  ])
}

export const profilesService = {
  async getProfile(userId: string): Promise<Profile | null> {
    const { data, error } = await withTimeout(
      db.from('profiles').select('*').eq('user_id', userId).maybeSingle()
    )
    if (error) {
      console.error('[profiles] getProfile error:', error)
      throw new Error(error.message)
    }
    return data ?? null
  },

  async upsertProfile(userId: string, updates: Partial<Profile>): Promise<Profile> {
    // Strip undefined values
    const payload: Record<string, unknown> = {
      user_id: userId,
      updated_at: new Date().toISOString(),
    }
    for (const [k, v] of Object.entries(updates)) {
      if (v !== undefined && k !== 'id' && k !== 'created_at') {
        payload[k] = v === '' ? null : v
      }
    }

    console.log('[profiles] upsertProfile payload:', payload)

    const { data, error } = await withTimeout(
      db
        .from('profiles')
        .upsert(payload, { onConflict: 'user_id' })
        .select()
        .single()
    )

    if (error) {
      console.error('[profiles] upsertProfile error:', error)
      throw new Error(error.message || JSON.stringify(error))
    }

    console.log('[profiles] upsertProfile success:', data)
    return data
  },

  async createProfile(userId: string, email: string, fullName?: string): Promise<Profile> {
    const payload = {
      user_id: userId,
      email,
      full_name: fullName || null,
      attendance_goal: 75,
      updated_at: new Date().toISOString(),
    }

    console.log('[profiles] createProfile payload:', payload)

    const { data, error } = await withTimeout(
      db
        .from('profiles')
        .upsert(payload, { onConflict: 'user_id' })
        .select()
        .single()
    )

    if (error) {
      console.error('[profiles] createProfile error:', error)
      throw new Error(error.message || JSON.stringify(error))
    }

    return data
  },
}
