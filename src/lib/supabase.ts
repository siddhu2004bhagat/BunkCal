import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseKey || 'placeholder',
  {
    auth: {
      persistSession: true,       // saves session to localStorage
      autoRefreshToken: true,     // refreshes token before expiry
      detectSessionInUrl: true,   // handles email confirmation redirects
      storageKey: 'bunkwise-auth',
    },
  }
)
