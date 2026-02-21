import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { mockUser, mockTeam } from '@/lib/supabase/client'

// Mock content data for demo
const MOCK_CONTENT: typeof MOCK_CONTENT = [
  {
    id: '1',
    team_id: mockTeam.id,
    title: 'Product Launch Announcement',
    blocks: [
      {
        id: 'block-1',
        type: 'heading' as const,
        content: 'Product Launch',
      },
      {
        id: 'block-2',
        type: 'text' as const,
        content: 'We are excited to announce our new product launch! This will revolutionize the market.',
      },
    ],
    status: 'IN_REVIEW',
    scheduled_at: null,
    published_at: null,
    platforms: [{ platform: 'twitter', enabled: true }, { platform: 'linkedin', enabled: true }],
    created_by: mockUser.id,
    assigned_to: null,
    created_at: new Date(Date.now() - 86400000).toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: '2',
    team_id: mockTeam.id,
    title: 'Weekly Newsletter #45',
    blocks: [
      {
        id: 'block-1',
        type: 'text' as const,
        content: 'Here is your weekly update with top stories and news.',
      },
    ],
    status: 'SCHEDULED',
    scheduled_at: new Date(Date.now() + 86400000).toISOString(),
    published_at: null,
    platforms: [{ platform: 'blog', enabled: true }],
    created_by: mockUser.id,
    assigned_to: null,
    created_at: new Date(Date.now() - 172800000).toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: '3',
    team_id: mockTeam.id,
    title: 'Customer Success Story',
    blocks: [
      {
        id: 'block-1',
        type: 'heading' as const,
        content: 'Customer Success Story',
      },
      {
        id: 'block-2',
        type: 'text' as const,
        content: 'Learn how our customers are achieving success with our platform.',
      },
    ],
    status: 'DRAFT',
    scheduled_at: null,
    published_at: null,
    platforms: [{ platform: 'linkedin', enabled: true }],
    created_by: mockUser.id,
    assigned_to: null,
    created_at: new Date(Date.now() - 259200000).toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: '4',
    team_id: mockTeam.id,
    title: 'Thank You Post',
    blocks: [
      {
        id: 'block-1',
        type: 'text' as const,
        content: 'Thank you to all our followers for your support!',
      },
    ],
    status: 'PUBLISHED',
    scheduled_at: null,
    published_at: new Date(Date.now() - 432000000).toISOString(),
    platforms: [{ platform: 'twitter', enabled: true }],
    created_by: mockUser.id,
    assigned_to: null,
    created_at: new Date(Date.now() - 518400000).toISOString(),
    updated_at: new Date(Date.now() - 432000000).toISOString(),
  },
  {
    id: '5',
    team_id: mockTeam.id,
    title: 'Feature Update',
    blocks: [
      {
        id: 'block-1',
        type: 'text' as const,
        content: 'We just released a new feature update with exciting new capabilities.',
      },
    ],
    status: 'APPROVED',
    scheduled_at: null,
    published_at: null,
    platforms: [{ platform: 'twitter', enabled: true }, { platform: 'linkedin', enabled: true }],
    created_by: mockUser.id,
    assigned_to: null,
    created_at: new Date(Date.now() - 345600000).toISOString(),
    updated_at: new Date().toISOString(),
  },
]

// GET /api/content - List all content
export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    const demoMode = process.env.DEMO_MODE === 'true' || process.env.NEXT_PUBLIC_DEMO_MODE === 'true'

    if (!user) {
      if (demoMode) {
        // Return mock data for demo mode
        return NextResponse.json({ data: MOCK_CONTENT })
      }
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data, error } = await supabase
      .from('content')
      .select(`
        *,
        createdBy:created_by(id, name, email, avatar_url),
        assignedTo:assigned_to(id, name, email, avatar_url),
        comments:comments(id),
        comment_count:comments(count)
      `)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching content:', error)
      if (demoMode) {
        // Return mock data if database is not available
        return NextResponse.json({ data: MOCK_CONTENT })
      }
      return NextResponse.json({ error: 'Failed to fetch content' }, { status: 500 })
    }

    if (!data || data.length === 0) {
      return NextResponse.json({ data: [] })
    }

    const contentIds = data.map((item: { id: string }) => item.id)
    const { data: activities } = await supabase
      .from('content_activity')
      .select(`
        content_id,
        created_at,
        user:user_id(id, name, email, avatar_url)
      `)
      .in('content_id', contentIds)
      .order('created_at', { ascending: false })

    const activityCount: Record<string, number> = {}
    const latestActivity: Record<string, unknown> = {}
    ;(activities || []).forEach((activity: any) => {
      activityCount[activity.content_id] = (activityCount[activity.content_id] || 0) + 1
      if (!latestActivity[activity.content_id]) {
        latestActivity[activity.content_id] = activity
      }
    })

    const enriched = data.map((item: any) => ({
      ...item,
      latest_activity: latestActivity[item.id] || null,
      activity_count: activityCount[item.id] || 0,
    }))

    return NextResponse.json({ data: enriched })
  } catch (error) {
    console.error('Error in GET /api/content:', error)
    const demoMode = process.env.DEMO_MODE === 'true' || process.env.NEXT_PUBLIC_DEMO_MODE === 'true'
    if (demoMode) {
      // Return mock data on error (for demo mode)
      return NextResponse.json({ data: MOCK_CONTENT })
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/content - Create new content
export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { title, blocks, platforms, status, scheduled_at, team_id } = body

    if (!title || !team_id) {
      return NextResponse.json(
        { error: 'Title and team_id are required' },
        { status: 400 }
      )
    }

    const { data, error } = await supabase
      .from('content')
      .insert({
        title,
        blocks: blocks || [],
        platforms: platforms || [],
        status: status || 'DRAFT',
        scheduled_at: scheduled_at || null,
        team_id,
        created_by: user.id,
      })
      .select(`
        *,
        createdBy:created_by(id, name, email, avatar_url)
      `)
      .single()

    if (error) {
      console.error('Error creating content:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ data }, { status: 201 })
  } catch (error) {
    console.error('Error in POST /api/content:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
