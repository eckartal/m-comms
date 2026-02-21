import { createBrowserClient } from '@supabase/ssr'

// Supabase client
let client: ReturnType<typeof createBrowserClient> | null = null

export function createClient() {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    throw new Error('Supabase credentials not configured')
  }

  if (!client) {
    client = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    )
  }
  return client
}

export const supabase = createClient()

// React hook for using Supabase client
export function useSupabase() {
  return supabase
}
