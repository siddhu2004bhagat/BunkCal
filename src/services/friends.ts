import { supabase } from '@/lib/supabase'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any

export interface FriendSearchResult {
  user_id: string
  full_name: string | null
  bunkwise_id: string
  college: string | null
  branch: string | null
}

export const friendsService = {
  // Search a user by their Bunkwise ID (e.g. BW-A3K9)
  async searchByBunkwiseId(bunkwiseId: string): Promise<FriendSearchResult | null> {
    const normalized = bunkwiseId.trim().toUpperCase()
    const { data, error } = await db
      .from('profiles')
      .select('user_id, full_name, bunkwise_id, college, branch')
      .eq('bunkwise_id', normalized)
      .maybeSingle()
    if (error) throw error
    return data ?? null
  },

  // Get own bunkwise_id
  async getMyBunkwiseId(userId: string): Promise<string | null> {
    const { data, error } = await db
      .from('profiles')
      .select('bunkwise_id')
      .eq('user_id', userId)
      .maybeSingle()
    if (error) throw error
    return data?.bunkwise_id ?? null
  },
}
