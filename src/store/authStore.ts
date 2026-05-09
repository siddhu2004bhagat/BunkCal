import { create } from 'zustand'
import type { User, Session } from '@supabase/supabase-js'
import type { Profile } from '@/types/database'

interface AuthState {
  user: User | null
  session: Session | null
  profile: Profile | null
  loading: boolean  // true only during initial session check
  setUser: (user: User | null) => void
  setSession: (session: Session | null) => void
  setProfile: (profile: Profile | null) => void
  setLoading: (loading: boolean) => void
  reset: () => void
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  session: null,
  profile: null,
  loading: true,
  setUser: (user) => set({ user }),
  setSession: (session) => set({ session }),
  setProfile: (profile) => set({ profile }),
  setLoading: (loading) => set({ loading }),
  reset: () => set({ user: null, session: null, profile: null, loading: false }),
  // keep signOut as alias for reset
  signOut: () => set({ user: null, session: null, profile: null, loading: false }),
}))
