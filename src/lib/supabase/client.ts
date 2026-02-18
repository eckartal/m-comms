import { createBrowserClient } from '@supabase/ssr'

// Mock user for development
export const mockUser = {
  id: '00000000-0000-0000-0000-000000000001',
  email: 'demo@example.com',
  name: 'Demo User',
  avatar_url: null,
  created_at: new Date().toISOString(),
}

export const mockTeam = {
  id: '00000000-0000-0000-0000-000000000002',
  name: 'Demo Team',
  slug: 'demo-team',
  logo: null,
  settings: {},
  created_at: new Date().toISOString(),
}

export const mockTeamMember = {
  id: '00000000-0000-0000-0000-000000000003',
  user_id: mockUser.id,
  team_id: mockTeam.id,
  role: 'OWNER' as const,
  created_at: new Date().toISOString(),
  user: mockUser,
  team: mockTeam,
}

// Check if Supabase is configured
export const isDevMode = () => {
  return (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    process.env.NEXT_PUBLIC_SUPABASE_URL === 'https://your-project.supabase.co' ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY === 'your-anon-key'
  )
}

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