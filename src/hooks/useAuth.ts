import { useEffect } from 'react'
import { useAuthStore } from '@/store/authStore'
import { supabase } from '@/lib/supabase'
import { profilesService } from '@/services/profiles'

async function loadProfile(userId: string, email: string, fullName?: string) {
  try {
    let profile = await profilesService.getProfile(userId)
    if (!profile) {
      profile = await profilesService.createProfile(userId, email, fullName)
    }
    return profile
  } catch (e) {
    console.warn('Profile load failed (non-fatal):', e)
    return null
  }
}

export function useAuthInit() {
  const { setUser, setSession, setProfile, setLoading } = useAuthStore()

  useEffect(() => {
    let mounted = true

    // onAuthStateChange fires INITIAL_SESSION immediately on mount
    // with the persisted session from localStorage — this is the single
    // source of truth. No need to call getSession() separately.
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!mounted) return

        console.log('[Auth]', event, session?.user?.email ?? 'no user')

        if (session?.user) {
          setSession(session)
          setUser(session.user)

          // Load profile for all relevant events
          if (
            event === 'INITIAL_SESSION' ||
            event === 'SIGNED_IN' ||
            event === 'TOKEN_REFRESHED' ||
            event === 'USER_UPDATED'
          ) {
            const profile = await loadProfile(
              session.user.id,
              session.user.email ?? '',
              session.user.user_metadata?.full_name
            )
            if (mounted) setProfile(profile)
          }
        } else {
          // No session — signed out or no account
          setSession(null)
          setUser(null)
          setProfile(null)
        }

        // Always stop loading after first event
        if (mounted) setLoading(false)
      }
    )

    // Safety net: if onAuthStateChange never fires within 4s, unblock the UI
    const timeout = setTimeout(() => {
      if (mounted) {
        console.warn('[Auth] Timeout — forcing loading=false')
        setLoading(false)
      }
    }, 4000)

    return () => {
      mounted = false
      clearTimeout(timeout)
      subscription.unsubscribe()
    }
  }, []) // empty deps — run once on mount only
}
