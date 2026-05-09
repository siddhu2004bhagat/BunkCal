import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { User, Session } from '@supabase/supabase-js'
import type { Profile } from '@/types/database'

interface AuthState {
  user: User | null
  session: Session | null
  profile: Profile | null
  loading: boolean
  setUser: (user: User | null) => void
  setSession: (session: Session | null) => void
  // setProfile(p) — sets profile; setProfile(null) only clears if called from reset
  setProfile: (profile: Profile | null) => void
  setLoading: (loading: boolean) => void
  reset: () => void  // full sign-out clear
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      session: null,
      profile: null,
      loading: true,

      setUser: (user) => set({ user }),
      setSession: (session) => set({ session }),

      // Safe setter: only updates if new value is non-null
      // Prevents TOKEN_REFRESHED race conditions from wiping profile
      setProfile: (profile) => set((state) => ({
        profile: profile !== null ? profile : state.profile,
      })),

      setLoading: (loading) => set({ loading }),

      // Hard reset — used on sign out only
      reset: () => set({ user: null, session: null, profile: null, loading: false }),
    }),
    {
      name: 'bunkwise-auth-v2',  // new key clears any stale persisted state
      partialize: (state) => ({
        user: state.user,
        session: state.session,
        profile: state.profile,
        // don't persist loading — always starts fresh
      }),
    }
  )
)
