import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { createClient } from '@/lib/supabase/client'
import type { User, Team } from '@/types'

export interface ContentBlock {
  id: string
  type: 'text' | 'image' | 'video' | 'link' | 'thread' | 'poll'
  content: unknown
}

export interface Content {
  id: string
  item_type?: 'IDEA' | 'POST'
  idea_state?: 'INBOX' | 'SHAPING' | 'READY' | 'CONVERTED' | 'ARCHIVED' | null
  source_idea_id?: string | null
  converted_post_id?: string | null
  converted_at?: string | null
  converted_by?: string | null
  title: string
  blocks: ContentBlock[]
  status: 'DRAFT' | 'IN_REVIEW' | 'APPROVED' | 'SCHEDULED' | 'PUBLISHED' | 'ARCHIVED'
  scheduled_at?: string
  published_at?: string
  platforms: Array<{
    type?: string
    platform?: string
    [key: string]: unknown
  }>
  created_by: string
  assigned_to?: string
  createdBy?: {
    id: string
    name: string | null
    email: string
    avatar_url: string | null
    created_at?: string
  }
  assignedTo?: {
    id: string
    name: string | null
    email: string
    avatar_url: string | null
    created_at?: string
  }
  comments_count?: number
  views_count?: number
  activity_count?: number
  latest_activity?: {
    user?: {
      name?: string | null
      email?: string | null
    } | null
  } | null
  created_at: string
  updated_at: string
  team_id: string
}

interface ContentState {
  // Content list
  contents: Content[]
  setContents: (contents: Content[]) => void
  contentLoading: boolean
  setContentLoading: (contentLoading: boolean) => void
  contentError: string | null
  setContentError: (contentError: string | null) => void
  loadedTeamId: string | null
  setLoadedTeamId: (loadedTeamId: string | null) => void
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
      contentLoading: false,
      setContentLoading: (contentLoading) => set({ contentLoading }),
      contentError: null,
      setContentError: (contentError) => set({ contentError }),
      loadedTeamId: null,
      setLoadedTeamId: (loadedTeamId) => set({ loadedTeamId }),
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
    await persistOnboardingComplete()
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
  const state = useContentStore.getState()

  if (state.loadedTeamId !== teamId) {
    state.setContents([])
    state.setLoadedTeamId(null)
  }
  state.setContentLoading(true)
  state.setContentError(null)

  const { data, error } = await supabase
    .from('content')
    .select('*, createdBy:created_by(id, name, email, avatar_url), assignedTo:assigned_to(id, name, email, avatar_url)')
    .eq('team_id', teamId)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching contents:', error)
    useContentStore.getState().setContentError(error.message || 'Failed to load content')
    useContentStore.getState().setContentLoading(false)
    return []
  }

  useContentStore.getState().setContents(data || [])
  useContentStore.getState().setLoadedTeamId(teamId)
  useContentStore.getState().setContentLoading(false)
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
  setOnboarded: (onboarded: boolean) => void
  markOnboardingComplete: () => void
  sidebarOpen: boolean
  toggleSidebar: () => void
}>()(
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
      setOnboarded: (onboarded) => set({ onboarded }),
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

  if (!user) return

  const metaName = (user.user_metadata?.name as string | undefined) || null
  const fallbackUser = {
    id: user.id,
    name: metaName,
    email: user.email || '',
    avatar_url: (user.user_metadata?.avatar_url as string | undefined) || null,
    created_at: user.created_at || new Date().toISOString(),
  }

  useAppStore.getState().setCurrentUser(fallbackUser)

  const { data: profile } = await supabase
    .from('users')
    .select('*')
    .eq('id', user.id)
    .maybeSingle()

  if (profile && typeof profile === 'object') {
    const source = profile as Record<string, unknown>
    const profileName =
      (source.name as string | null | undefined) ??
      (source.full_name as string | null | undefined) ??
      fallbackUser.name

    useAppStore.getState().setCurrentUser({
      id: String(source.id || fallbackUser.id),
      name: profileName || null,
      email: String(source.email || fallbackUser.email),
      avatar_url: (source.avatar_url as string | null | undefined) ?? fallbackUser.avatar_url,
      created_at: String(source.created_at || fallbackUser.created_at),
    })
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

export async function syncOnboardingWithStore() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return

  const { data } = await supabase
    .from('user_onboarding')
    .select('completed')
    .eq('user_id', user.id)
    .maybeSingle()

  useAppStore.getState().setOnboarded(Boolean(data?.completed))
}

export async function persistOnboardingComplete() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return

  await supabase
    .from('user_onboarding')
    .upsert(
      {
        user_id: user.id,
        completed: true,
        completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id' }
    )

  useAppStore.getState().markOnboardingComplete()
}
