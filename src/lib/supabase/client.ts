import { createBrowserClient } from '@supabase/ssr'

// Check if we're in dev mode (placeholder URL)
export const isDevMode = () => {
  return (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    process.env.NEXT_PUBLIC_SUPABASE_URL?.includes('placeholder')
  )
}

// Mock user for dev mode
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

// Mock Supabase Client for Dev Mode
class MockSupabaseClient {
  auth: MockAuthClient
  from: MockQueryBuilder
  channel: unknown

  constructor() {
    this.auth = new MockAuthClient()
    this.from = new MockQueryBuilder()
    this.channel = null
  }
}

class MockAuthClient {
  user: typeof mockUser | null = mockUser
  session: { access_token: string; user: typeof mockUser } | null = {
    access_token: 'mock-token',
    user: mockUser,
  }

  getUser() {
    return Promise.resolve({ data: { user: this.user }, error: null })
  }

  getSession() {
    return Promise.resolve({ data: { session: this.session }, error: null })
  }

  signInWithPassword(email: string, _password: string) {
    if (email === mockUser.email) {
      this.user = mockUser
      this.session = { access_token: 'mock-token', user: mockUser }
      return Promise.resolve({ data: { user: this.user, session: this.session }, error: null })
    }
    // Auto-create user on login in dev mode
    const newUser = {
      id: crypto.randomUUID(),
      email,
      name: email.split('@')[0],
      avatar_url: null,
      created_at: new Date().toISOString(),
    }
    this.user = newUser
    this.session = { access_token: 'mock-token', user: newUser }
    return Promise.resolve({ data: { user: this.user, session: this.session }, error: null })
  }

  signUp(_email: string, _password: string, _options?: { data?: Record<string, unknown> }) {
    this.user = mockUser
    this.session = { access_token: 'mock-token', user: mockUser }
    return Promise.resolve({ data: { user: mockUser, session: this.session }, error: null })
  }

  signOut() {
    this.user = null
    this.session = null
    return Promise.resolve({ error: null })
  }

  onAuthStateChange(callback: (event: string, session: unknown) => void) {
    callback('SIGNED_IN', this.session)
    return { data: { subscription: { unsubscribe: () => {} } } }
  }
}

class MockQueryBuilder {
  private data: unknown[] = []
  private conditions: Array<{ field: string; value?: unknown; values?: unknown[] }> = []

  select(_query?: string) {
    this.conditions = []
    return this
  }

  insert(data: unknown) {
    this.data = [data]
    return this
  }

  update(data: unknown) {
    if (this.data.length > 0 && data && typeof data === 'object') {
      const currentData = this.data[0] as Record<string, unknown>
      this.data = [{ ...currentData, ...data }]
    }
    return this
  }

  delete() {
    return this
  }

  eq(field: string, value: unknown) {
    this.conditions.push({ field, value })
    return this
  }

  in(field: string, values: unknown[]) {
    this.conditions.push({ field, values })
    return this
  }

  order(_field: string, _options?: { ascending?: boolean }) {
    return this
  }

  single() {
    // Simulate finding single item
    let result = this.data[0]
    if (!result && this.conditions.length > 0) {
      // Return mock data based on table
      if (this.data.length === 0) {
        result = getMockTableData(this.conditions)
      }
    }
    return Promise.resolve({ data: result, error: null })
  }

  then(resolve: (value: { data: unknown; error: null }) => void) {
    resolve({ data: this.data.length > 0 ? this.data : getMockTableData(this.conditions), error: null })
  }
}

function getMockTableData(conditions: Array<{ field: string; value?: unknown; values?: unknown[] }>) {
  const teamIdCond = conditions.find((c) => c.field === 'team_id')
  // Return mock content
  return {
    id: 'content-' + crypto.randomUUID().slice(0, 8),
    team_id: teamIdCond?.value || mockTeam.id,
    title: 'Demo Content',
    blocks: [
      { id: '1', type: 'text', content: 'This is demo content for testing.' },
      { id: '2', type: 'heading', content: 'Getting Started' },
      { id: '3', type: 'text', content: 'Create your first content piece by clicking the button below.' },
    ],
    status: 'DRAFT',
    scheduled_at: null,
    published_at: null,
    platforms: [
      { platform: 'twitter', enabled: true, text: '' },
      { platform: 'linkedin', enabled: false, text: '' },
    ],
    created_by: mockUser.id,
    assigned_to: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    createdBy: mockUser,
    share_token: null,
    share_settings: null,
  }
}

// Actual Supabase client
let actualClient: ReturnType<typeof createBrowserClient> | null = null

export function createClient() {
  if (isDevMode()) {
    return new MockSupabaseClient() as unknown as ReturnType<typeof createBrowserClient>
  }

  if (!actualClient) {
    actualClient = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
  }
  return actualClient
}

export const supabase = createClient()

// React hook for using Supabase client
export function useSupabase() {
  return supabase
}