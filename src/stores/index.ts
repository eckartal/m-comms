import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { User, Team, TeamMember } from '@/types'

interface AppState {
  // Auth state - current authenticated user
  currentUser: User | null
  setCurrentUser: (user: User | null) => void

  // Team state - user's teams and current active team
  currentTeam: Team | null
  teams: TeamMember[]
  setCurrentTeam: (team: Team | null) => void
  setTeams: (teams: TeamMember[]) => void

  // UI state
  sidebarOpen: boolean
  toggleSidebar: () => void
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      // Auth
      currentUser: null,
      setCurrentUser: (currentUser) => set({ currentUser }),

      // Team
      currentTeam: null,
      teams: [],
      setCurrentTeam: (currentTeam) => set({ currentTeam }),
      setTeams: (teams) => set({ teams }),

      // UI
      sidebarOpen: true,
      toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
    }),
    {
      name: 'app-storage',
      partialize: (state) => ({
        currentTeam: state.currentTeam,
        currentUser: state.currentUser,
      }),
    }
  )
)

// Helper hook to fetch user from Supabase and sync with store
export async function syncUserWithStore() {
  const { createClient } = await import('@/lib/supabase/client')
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (user) {
    const { data: profile } = await supabase
      .from('users')
      .select('id, name, email, avatar_url, created_at')
      .eq('id', user.id)
      .single()

    if (profile) {
      useAppStore.getState().setCurrentUser({
        id: profile.id,
        name: profile.name,
        email: profile.email,
        avatar_url: profile.avatar_url,
        created_at: profile.created_at,
      })
    }
  }
}

// Helper hook to fetch user's teams and sync with store
export async function syncTeamsWithStore() {
  const { createClient } = await import('@/lib/supabase/client')
  const supabase = createClient()

  const { data } = await supabase
    .from('team_members')
    .select(`
      *,
      team:teams(id, name, slug, logo, created_at)
    `)

  if (data) {
    useAppStore.getState().setTeams(data)
  }
}