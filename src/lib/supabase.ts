import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  console.warn('Supabase credentials not configured.')
}

export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseKey || 'placeholder',
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
    },
    global: {
      headers: {
        // Support both legacy anon key (eyJ...) and new publishable key (sb_publishable_...)
        ...(supabaseKey?.startsWith('sb_publishable_')
          ? { 'X-Supabase-Api-Version': '2024-01-01' }
          : {}),
      },
    },
  }
)
