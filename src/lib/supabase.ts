import { createClient } from '@supabase/supabase-js'

// Trim to remove accidental whitespace/newlines from Vercel env vars
// The %0A in WebSocket URL is caused by a trailing newline in the key
const supabaseUrl = (import.meta.env.VITE_SUPABASE_URL as string)?.trim()
const supabaseKey = (import.meta.env.VITE_SUPABASE_ANON_KEY as string)?.trim()

export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseKey || 'placeholder',
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      storageKey: 'bunkwise-auth',
    },
  }
)
