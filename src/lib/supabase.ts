import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

export const isSupabaseConfigured =
  !!supabaseUrl &&
  !!supabaseKey &&
  !supabaseUrl.includes('YOUR_PROJECT') &&
  !supabaseKey.includes('YOUR_ANON_KEY') &&
  supabaseUrl.startsWith('https://')

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseKey)
  : (null as unknown as ReturnType<typeof createClient>)
