import { createClient } from '@supabase/supabase-js'

// Strip ALL whitespace, newlines, carriage returns from env vars
// Vercel sometimes adds %0A (newline) to env var values which breaks WebSocket URLs
function cleanEnvVar(val: string | undefined): string {
  if (!val) return ''
  return val.replace(/[\s\n\r\t]/g, '')
}

const supabaseUrl = cleanEnvVar(import.meta.env.VITE_SUPABASE_URL as string)
const supabaseKey = cleanEnvVar(import.meta.env.VITE_SUPABASE_ANON_KEY as string)

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
