import { useEffect } from 'react'
import { useAuthStore } from '@/store/authStore'
import { authService } from '@/services/auth'
import { profilesService } from '@/services/profiles'

export function useAuthInit() {
  const { setUser, setSession, setProfile, setLoading } = useAuthStore()

  useEffect(() => {
    // Get initial session
    authService.getSession().then(async (session) => {
      setSession(session)
      setUser(session?.user ?? null)

      if (session?.user) {
        try {
          let profile = await profilesService.getProfile(session.user.id)
          if (!profile) {
            profile = await profilesService.createProfile(
              session.user.id,
              session.user.email || '',
              session.user.user_metadata?.full_name
            )
          }
          setProfile(profile)
        } catch (e) {
          console.error('Profile fetch error:', e)
        }
      }
      setLoading(false)
    }).catch(() => setLoading(false))

    // Listen for auth changes
    const { data: { subscription } } = authService.onAuthStateChange(async (event, session) => {
      setSession(session)
      setUser(session?.user ?? null)

      if (session?.user) {
        try {
          let profile = await profilesService.getProfile(session.user.id)
          if (!profile && event === 'SIGNED_IN') {
            profile = await profilesService.createProfile(
              session.user.id,
              session.user.email || '',
              session.user.user_metadata?.full_name
            )
          }
          setProfile(profile)
        } catch (e) {
          console.error('Profile error:', e)
        }
      } else {
        setProfile(null)
      }
      setLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [setUser, setSession, setProfile, setLoading])
}
