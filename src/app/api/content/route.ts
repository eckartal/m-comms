import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

type ApiErrorCode =
  | 'unauthorized'
  | 'content_fetch_failed'
  | 'content_create_failed'
  | 'internal_server_error'
  | 'validation_error'

type RawUser = {
  id: string
  email?: string | null
  name?: string | null
  full_name?: string | null
  avatar_url?: string | null
}

type ContentRow = {
  id: string
  createdBy?: RawUser | RawUser[] | null
  assignedTo?: RawUser | RawUser[] | null
  [key: string]: unknown
}

type ActivityRow = {
  content_id: string
  created_at: string
  user?: RawUser | RawUser[] | null
  [key: string]: unknown
}

function apiError(
  error: string,
  status: number,
  code: ApiErrorCode,
  retryable: boolean
) {
  return NextResponse.json({ error, code, retryable }, { status })
}

function normalizeUser(user: RawUser | RawUser[] | null | undefined) {
  const source = Array.isArray(user) ? user[0] : user
  if (!source) return null

  const name = source.full_name ?? source.name ?? null
  return {
    id: source.id,
    email: source.email ?? null,
    name,
    full_name: source.full_name ?? name,
    avatar_url: source.avatar_url ?? null,
  }
}

// GET /api/content - List content (optionally filtered by team_id)
export async function GET(request: Request) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) return apiError('Unauthorized', 401, 'unauthorized', false)

    const url = new URL(request.url)
    const teamId = url.searchParams.get('team_id')

    let query = supabase
      .from('content')
      .select(`
        *,
        createdBy:created_by(id, full_name, email, avatar_url),
        assignedTo:assigned_to(id, full_name, email, avatar_url),
        comments:comments(id),
        comment_count:comments(count)
      `)
      .order('created_at', { ascending: false })

    if (teamId) {
      query = query.eq('team_id', teamId)
    }

    const { data, error } = await query

    if (error) {
      console.error('Error fetching content:', error)
      return apiError('Failed to fetch content', 500, 'content_fetch_failed', true)
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
        user:user_id(id, full_name, email, avatar_url)
      `)
      .in('content_id', contentIds)
      .order('created_at', { ascending: false })

    const activityCount: Record<string, number> = {}
    const latestActivity: Record<string, ActivityRow> = {}
    ;((activities as ActivityRow[] | null) || []).forEach((activity) => {
      activityCount[activity.content_id] = (activityCount[activity.content_id] || 0) + 1
      if (!latestActivity[activity.content_id]) {
        latestActivity[activity.content_id] = activity
      }
    })

    const enriched = (data as ContentRow[]).map((item) => {
      const latest = latestActivity[item.id]
      return {
        ...item,
        createdBy: normalizeUser(item.createdBy),
        assignedTo: normalizeUser(item.assignedTo),
        latest_activity: latest
          ? {
              ...latest,
              user: normalizeUser(latest.user),
            }
          : null,
        activity_count: activityCount[item.id] || 0,
      }
    })

    return NextResponse.json({ data: enriched })
  } catch (error) {
    console.error('Error in GET /api/content:', error)
    return apiError('Internal server error', 500, 'internal_server_error', true)
  }
}

// POST /api/content - Create new content
export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) return apiError('Unauthorized', 401, 'unauthorized', false)

    const body = await request.json()
    const { title, blocks, platforms, status, scheduled_at, team_id } = body

    if (!title || !team_id) {
      return apiError('Title and team_id are required', 400, 'validation_error', false)
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
        createdBy:created_by(id, full_name, email, avatar_url)
      `)
      .single()

    if (error) {
      console.error('Error creating content:', error)
      return apiError(error.message || 'Failed to create content', 500, 'content_create_failed', true)
    }

    return NextResponse.json(
      {
        data: {
          ...data,
          createdBy: normalizeUser((data as ContentRow).createdBy),
        },
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('Error in POST /api/content:', error)
    return apiError('Internal server error', 500, 'internal_server_error', true)
  }
}
