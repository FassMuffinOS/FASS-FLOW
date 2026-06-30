import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// Explicit auth config (these are mostly defaults, but pinned so behavior is
// predictable across SDK upgrades):
//  - persistSession + autoRefreshToken: keep users signed in, refresh silently
//  - detectSessionInUrl: parse the session out of the OAuth/email redirect
//  - flowType 'pkce': the modern, more secure code-exchange flow
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    flowType: 'pkce',
  },
})
