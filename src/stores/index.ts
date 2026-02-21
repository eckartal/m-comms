import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { createClient } from '@/lib/supabase/client'
import type { User, Team } from '@/types'

export interface ContentBlock {
  id: string
  type: 'text' | 'image' | 'video' | 'link' | 'thread' | 'poll'
  content: any
}

export interface Content {
  id: string
  title: string
  blocks: ContentBlock[]
  status: 'DRAFT' | 'IN_REVIEW' | 'APPROVED' | 'SCHEDULED' | 'PUBLISHED' | 'ARCHIVED'
  scheduled_at?: string
  published_at?: string
  platforms: any[]
  created_by: string
  assigned_to?: string
  created_at: string
  updated_at: string
  team_id: string
}

interface ContentState {
  // Content list
  contents: Content[]
  setContents: (contents: Content[]) => void
  addContent: (content: Content) => void
  updateContent: (id: string, updates: Partial<Content>) => void
  removeContent: (id: string) => void

  // Auto-save
  saving: boolean
  lastSaved: string | null
  setSaving: (saving: boolean) => void
  setLastSaved: (date: string) => void

  // Active editing content
  activeContent: Content | null
  setActiveContent: (content: Content | null) => void
  updateActiveContent: (updates: Partial<Content>) => void
}

export const useContentStore = create<ContentState>()(
  persist(
    (set) => ({
      // Content list
      contents: [],
      setContents: (contents) => set({ contents }),
      addContent: (content) =>
        set((state) => ({ contents: [content, ...state.contents] })),
      updateContent: (id, updates) =>
        set((state) => ({
          contents: state.contents.map((c) =>
            c.id === id ? { ...c, ...updates } : c
          ),
        })),
      removeContent: (id) =>
        set((state) => ({
          contents: state.contents.filter((c) => c.id !== id),
        })),

      // Auto-save
      saving: false,
      lastSaved: null,
      setSaving: (saving) => set({ saving }),
      setLastSaved: (date) => set({ lastSaved: date }),

      // Active editing content
      activeContent: null,
      setActiveContent: (activeContent) => set({ activeContent }),
      updateActiveContent: (updates) =>
        set((state) => ({
          activeContent: state.activeContent
            ? { ...state.activeContent, ...updates }
            : null,
        })),
    }),
    {
      name: 'content-storage',
      partialize: (state) => ({ contents: state.contents }),
    }
  )
)

// API helpers for content CRUD
export async function createContent(
  teamId: string,
  data: { title: string; blocks?: ContentBlock[]; status?: string }
): Promise<Content | null> {
  const { createClient } = await import('@/lib/supabase/client')
  const supabase = createClient()

  const { data: content, error } = await supabase
    .from('content')
    .insert({
      team_id: teamId,
      title: data.title,
      blocks: data.blocks || [],
      status: data.status || 'DRAFT',
    })
    .select()
    .single()

  if (error) {
    console.error('Error creating content:', error)
    return null
  }

  useContentStore.getState().addContent(content)

  // Mark onboarding complete if this is the first content (not the welcome draft)
  const appState = useAppStore.getState()
  if (!appState.onboarded) {
    useAppStore.getState().markOnboardingComplete()
  }

  return content
}

export async function updateContent(
  id: string,
  updates: Partial<Content>
): Promise<boolean> {
  const { createClient } = await import('@/lib/supabase/client')
  const supabase = createClient()

  const { error } = await supabase
    .from('content')
    .update({
      ...updates,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)

  if (error) {
    console.error('Error updating content:', error)
    return false
  }

  useContentStore.getState().updateContent(id, updates)
  return true
}

export async function deleteContent(id: string): Promise<boolean> {
  const { createClient } = await import('@/lib/supabase/client')
  const supabase = createClient()

  const { error } = await supabase.from('content').delete().eq('id', id)

  if (error) {
    console.error('Error deleting content:', error)
    return false
  }

  useContentStore.getState().removeContent(id)
  return true
}

export async function fetchContents(teamId: string): Promise<Content[]> {
  const { createClient } = await import('@/lib/supabase/client')
  const supabase = createClient()

  const { data, error } = await supabase
    .from('content')
    .select('*, createdBy:created_by(id, name, email, avatar_url), assignedTo:assigned_to(id, name, email, avatar_url)')
    .eq('team_id', teamId)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching contents:', error)
    return []
  }

  useContentStore.getState().setContents(data || [])
  return data || []
}

// Auto-save with debounce
let autoSaveTimeout: NodeJS.Timeout | null = null

export function autoSaveContent(
  contentId: string,
  updates: Partial<Content>,
  onSave?: () => void
) {
  useContentStore.getState().setSaving(true)

  if (autoSaveTimeout) {
    clearTimeout(autoSaveTimeout)
  }

  autoSaveTimeout = setTimeout(async () => {
    const success = await updateContent(contentId, updates)
    useContentStore.getState().setSaving(false)

    if (success) {
      useContentStore.getState().setLastSaved(new Date().toISOString())
      onSave?.()
    }
  }, 1000) // 1 second debounce
}

export const useAppStore = create<{
  currentUser: User | null
  setCurrentUser: (currentUser: User | null) => void
  currentTeam: Team | null
  teams: Team[]
  setCurrentTeam: (currentTeam: Team | null) => void
  setTeams: (teams: Team[]) => void
  onboarded: boolean
  markOnboardingComplete: () => void
  sidebarOpen: boolean
  toggleSidebar: () => void
}>(
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

      // Onboarding
      onboarded: false,
      markOnboardingComplete: () => set({ onboarded: true }),

      // UI
      sidebarOpen: true,
      toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
    }),
    {
      name: 'app-storage',
      partialize: (state) => ({
        currentTeam: state.currentTeam,
        currentUser: state.currentUser,
        onboarded: state.onboarded,
      }),
    }
  )
)

// Helper hook to fetch user from Supabase and sync with store
export async function syncUserWithStore() {
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
  const supabase = createClient()

  const { data } = await supabase
    .from('team_members')
    .select(`
      *,
      team:teams(id, name, slug, logo, created_at)
    `)

  if (data) {
    const teamRows = data as Array<{ team: Team | null }>
    const teams = teamRows
      .map((entry) => entry.team)
      .filter(Boolean)

    useAppStore.getState().setTeams(teams as Team[])
    if (teams.length > 0) {
      useAppStore.getState().setCurrentTeam(teams[0] as Team)
    }
  }
}
