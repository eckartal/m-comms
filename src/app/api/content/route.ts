import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET /api/content - List all content
export async function GET() {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
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
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/content - Create new content
export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { title, blocks, platforms, status, scheduled_at, team_id } = body

    if (!title || !team_id) {
      return NextResponse.json({ error: 'Title and team_id are required' }, { status: 400 })
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
