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

    // Auto-assign bunkwise_id if missing (profiles created before the column existed)
    if (profile && !profile.bunkwise_id) {
      const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
      const rand4 = Array.from({ length: 4 }, () =>
        chars[Math.floor(Math.random() * chars.length)]
      ).join('')
      try {
        profile = await profilesService.upsertProfile(userId, {
          bunkwise_id: `BW-${rand4}`,
        })
      } catch {
        console.warn('[Auth] Could not assign bunkwise_id')
      }
    }

    return profile
  } catch (e) {
    console.warn('[Auth] Profile load failed (non-fatal):', e)
    return null  // null means "failed to fetch" — don't wipe existing profile
  }
}

export function useAuthInit() {
  const { setUser, setSession, setProfile, setLoading, profile } = useAuthStore()

  useEffect(() => {
    let mounted = true

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!mounted) return

        console.log('[Auth]', event, session?.user?.email ?? 'no user')

        if (session?.user) {
          setSession(session)
          setUser(session.user)

          // Only fetch profile on meaningful events, not on every token refresh
          // TOKEN_REFRESHED fires every ~60s — skip it if we already have a profile
          const shouldFetchProfile =
            event === 'INITIAL_SESSION' ||
            event === 'SIGNED_IN' ||
            event === 'USER_UPDATED' ||
            (event === 'TOKEN_REFRESHED' && !profile)

          if (shouldFetchProfile) {
            const fetchedProfile = await loadProfile(
              session.user.id,
              session.user.email ?? '',
              session.user.user_metadata?.full_name
            )
            // Only update store if we got a real profile back
            // Never set null here — keeps existing persisted profile intact
            if (mounted && fetchedProfile) {
              setProfile(fetchedProfile)
            }
          }
        } else {
          // Explicitly signed out — clear everything
          if (event === 'SIGNED_OUT') {
            setSession(null)
            setUser(null)
            // setProfile(null) won't work due to safe setter — use reset via store
            useAuthStore.getState().reset()
          }
        }

        if (mounted) setLoading(false)
      }
    )

    // Safety net: unblock UI after 4s regardless
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
  }, []) // eslint-disable-line react-hooks/exhaustive-deps
}
