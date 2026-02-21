import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { mockUser, mockTeam } from '@/lib/supabase/client'

// Mock content data for demo
const MOCK_CONTENT = [
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
    status: 'IN_REVIEW' as const,
    scheduled_at: null,
    published_at: null,
    platforms: [{ platform: 'twitter' as const, enabled: true }, { platform: 'linkedin' as const, enabled: true }],
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
    status: 'SCHEDULED' as const,
    scheduled_at: new Date(Date.now() + 86400000).toISOString(),
    published_at: null,
    platforms: [{ platform: 'blog' as const, enabled: true }],
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
    status: 'DRAFT' as const,
    scheduled_at: null,
    published_at: null,
    platforms: [{ platform: 'linkedin' as const, enabled: true }],
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
    status: 'PUBLISHED' as const,
    scheduled_at: null,
    published_at: new Date(Date.now() - 432000000).toISOString(),
    platforms: [{ platform: 'twitter' as const, enabled: true }],
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
    status: 'APPROVED' as const,
    scheduled_at: null,
    published_at: null,
    platforms: [{ platform: 'twitter' as const, enabled: true }, { platform: 'linkedin' as const, enabled: true }],
    created_by: mockUser.id,
    assigned_to: null,
    created_at: new Date(Date.now() - 345600000).toISOString(),
    updated_at: new Date().toISOString(),
  },
]

// GET /api/content/[id] - Get single content
export async function GET(
  request: Request,
  { params }: { params: Promise<{ contentId: string }> }
) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    const demoMode = process.env.DEMO_MODE === 'true' || process.env.NEXT_PUBLIC_DEMO_MODE === 'true'

    const { contentId } = await params

    // If no user (or for demo), return mock content
    if (!user) {
      if (demoMode) {
        const content = MOCK_CONTENT.find((c) => c.id === contentId)
        if (content) {
          return NextResponse.json({ data: content })
        }
        return NextResponse.json({ error: 'Content not found' }, { status: 404 })
      }
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data, error } = await supabase
      .from('content')
      .select(`
        *,
        createdBy:created_by(id, name, email, avatar_url),
        assignedTo:assigned_to(id, name, email, avatar_url),
        versions:content_versions(
          id,
          blocks,
          created_at,
          createdBy:created_by(id, name, avatar_url)
        ),
        comments:comments(
          id,
          text,
          created_at,
          resolved_at,
          user:user_id(id, name, email, avatar_url),
          replies:comments(
            id,
            text,
            created_at,
            user:user_id(id, name, email, avatar_url)
          )
        ).eq('parent_id', null)
      `)
      .eq('id', contentId)
      .single()

    if (error) {
      console.error('Error fetching content:', error)
      if (demoMode) {
        // Return mock content if database is not available
        const content = MOCK_CONTENT.find((c) => c.id === contentId)
        if (content) {
          return NextResponse.json({ data: content })
        }
        return NextResponse.json({ error: 'Content not found' }, { status: 404 })
      }
      return NextResponse.json({ error: 'Failed to fetch content' }, { status: 500 })
    }

    if (!data) {
      return NextResponse.json({ error: 'Content not found' }, { status: 404 })
    }

    return NextResponse.json({ data })
  } catch (error) {
    console.error('Error in GET /api/content/[id]:', error)
    const demoMode = process.env.DEMO_MODE === 'true' || process.env.NEXT_PUBLIC_DEMO_MODE === 'true'
    if (demoMode) {
      // Return mock content on error
      const content = MOCK_CONTENT.find((c) => c.id === contentId)
      if (content) {
        return NextResponse.json({ data: content })
      }
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PUT /api/content/[id] - Update content
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ contentId: string }> }
) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { contentId } = await params
    const body = await request.json()
    const { title, blocks, platforms, status, scheduled_at, assigned_to, change_reason } = body

    const { data: currentContent, error: currentError } = await supabase
      .from('content')
      .select('status, scheduled_at, assigned_to, team_id')
      .eq('id', contentId)
      .single()

    if (currentError || !currentContent) {
      return NextResponse.json({ error: 'Content not found' }, { status: 404 })
    }

    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    }

    if (title !== undefined) updateData.title = title
    if (blocks !== undefined) updateData.blocks = blocks
    if (platforms !== undefined) updateData.platforms = platforms
    if (status !== undefined) updateData.status = status
    if (scheduled_at !== undefined) updateData.scheduled_at = scheduled_at
    if (assigned_to !== undefined) updateData.assigned_to = assigned_to

    const { data, error } = await supabase
      .from('content')
      .update(updateData)
      .eq('id', contentId)
      .select(`
        *,
        createdBy:created_by(id, name, email, avatar_url)
      `)
      .single()

    if (error) {
      console.error('Error updating content:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const activityEntries: Record<string, unknown>[] = []

    if (status !== undefined && status !== currentContent.status) {
      activityEntries.push({
        content_id: contentId,
        team_id: currentContent.team_id,
        user_id: user.id,
        action: 'STATUS_CHANGED',
        from_status: currentContent.status,
        to_status: status,
      })
    }

    if (scheduled_at !== undefined && scheduled_at !== currentContent.scheduled_at) {
      activityEntries.push({
        content_id: contentId,
        team_id: currentContent.team_id,
        user_id: user.id,
        action: 'SCHEDULE_UPDATED',
        from_scheduled_at: currentContent.scheduled_at,
        to_scheduled_at: scheduled_at,
      })
    }

    if (assigned_to !== undefined && assigned_to !== currentContent.assigned_to) {
      activityEntries.push({
        content_id: contentId,
        team_id: currentContent.team_id,
        user_id: user.id,
        action: 'ASSIGNEE_UPDATED',
        from_assigned_to: currentContent.assigned_to,
        to_assigned_to: assigned_to,
      })
    }

    if (activityEntries.length > 0) {
      const { data: inserted, error: activityError } = await supabase
        .from('content_activity')
        .insert(activityEntries)
        .select('id, action')
      if (activityError) {
        console.error('Error logging content activity:', activityError)
      } else if (change_reason && inserted?.length) {
        const noteEntries = inserted.map((entry: { id: string }) => ({
          content_id: contentId,
          activity_id: entry.id,
          user_id: user.id,
          reason: change_reason,
        }))
        const { error: noteError } = await supabase
          .from('content_change_notes')
          .insert(noteEntries)
        if (noteError) {
          console.error('Error logging change notes:', noteError)
        }
      }
    }

    return NextResponse.json({ data })
  } catch (error) {
    console.error('Error in PUT /api/content/[id]:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE /api/content/[id] - Delete content
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ contentId: string }> }
) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { contentId } = await params

    const { error } = await supabase
      .from('content')
      .delete()
      .eq('id', contentId)

    if (error) {
      console.error('Error deleting content:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ data: { success: true } })
  } catch (error) {
    console.error('Error in DELETE /api/content/[id]:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
