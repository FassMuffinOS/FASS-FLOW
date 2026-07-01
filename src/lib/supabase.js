import { createClient } from '@supabase/supabase-js'
import { cookieAuthStorage } from './cookieAuthStorage'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// Explicit auth config (these are mostly defaults, but pinned so behavior is
// predictable across SDK upgrades):
//  - persistSession + autoRefreshToken: keep users signed in, refresh silently
//  - detectSessionInUrl: parse the session out of the OAuth/email redirect
//  - flowType 'pkce': the modern, more secure code-exchange flow
//  - storage: cookieAuthStorage — 2026-07-01, subdomain rollout. A cookie
//    scoped to .fass.systems (see cookieAuthStorage.js) instead of the
//    default localStorage, so one login covers flow./regulars./
//    affiliates.fass.systems (and any future {tenant}.fass.systems)
//    instead of each subdomain needing its own sign-in.
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    flowType: 'pkce',
    storage: cookieAuthStorage,
  },
})
