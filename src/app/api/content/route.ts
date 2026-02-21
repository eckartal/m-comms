import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

type ApiErrorCode =
  | 'unauthorized'
  | 'forbidden'
  | 'content_fetch_failed'
  | 'content_create_failed'
  | 'invalid_item_type'
  | 'migration_required'
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

function isMissingIdeaColumnsError(error: unknown) {
  const message =
    typeof error === 'object' && error && 'message' in error
      ? String((error as { message?: unknown }).message || '')
      : ''

  return (
    message.includes('item_type') ||
    message.includes('idea_state') ||
    message.includes('source_idea_id') ||
    message.includes('converted_post_id') ||
    message.includes('converted_at') ||
    message.includes('converted_by')
  )
}

function isMissingScheduledColumnError(error: unknown) {
  const message =
    typeof error === 'object' && error && 'message' in error
      ? String((error as { message?: unknown }).message || '')
      : ''

  return message.includes('scheduled_at')
}

function isMissingContentCommentsRelationError(error: unknown) {
  const message =
    typeof error === 'object' && error && 'message' in error
      ? String((error as { message?: unknown }).message || '')
      : ''

  return (
    message.includes("relationship between 'content' and 'comments'") ||
    message.includes("Could not find a relationship between 'content' and 'comments'")
  )
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
      .select('*')
      .order('created_at', { ascending: false })

    if (teamId) {
      const { data: membership, error: membershipError } = await supabase
        .from('team_members')
        .select('id')
        .eq('team_id', teamId)
        .eq('user_id', user.id)
        .maybeSingle()

      if (membershipError) {
        console.error('Error verifying team membership:', membershipError)
        return apiError('Failed to verify team access', 500, 'internal_server_error', true)
      }

      if (!membership) {
        return apiError('Forbidden', 403, 'forbidden', false)
      }

      query = query.eq('team_id', teamId)
    }

    let { data, error } = await query

    if (error && (isMissingScheduledColumnError(error) || isMissingContentCommentsRelationError(error))) {
      // Compatibility fallback for older schemas missing scheduled_at/published_at.
      const fallbackQuery = supabase
        .from('content')
        .select(`
          id,
          team_id,
          item_type,
          idea_state,
          source_idea_id,
          converted_post_id,
          converted_at,
          converted_by,
          title,
          blocks,
          status,
          platforms,
          created_by,
          assigned_to,
          created_at,
          updated_at
        `)
        .order('created_at', { ascending: false })

      const fallbackResult = teamId ? fallbackQuery.eq('team_id', teamId) : fallbackQuery
      const fallbackResponse = await fallbackResult
      data = fallbackResponse.data
      error = fallbackResponse.error
    }

    if (error) {
      console.error('Error fetching content:', error)
      if (isMissingScheduledColumnError(error) || isMissingContentCommentsRelationError(error)) {
        return apiError(
          'Database core schema migration required. Apply migration 20260221_core_schema_bootstrap.sql and refresh schema cache.',
          500,
          'migration_required',
          false
        )
      }
      return apiError(error.message || 'Failed to fetch content', 500, 'content_fetch_failed', true)
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
    const { title, blocks, platforms, status, scheduled_at, team_id, item_type, idea_state, assigned_to } = body

    if (!title || !team_id) {
      return apiError('Title and team_id are required', 400, 'validation_error', false)
    }

    const normalizedItemType = item_type === 'IDEA' ? 'IDEA' : item_type === 'POST' || !item_type ? 'POST' : null
    if (!normalizedItemType) {
      return apiError('item_type must be IDEA or POST', 400, 'invalid_item_type', false)
    }

    const { data: membership, error: membershipError } = await supabase
      .from('team_members')
      .select('id')
      .eq('team_id', team_id)
      .eq('user_id', user.id)
      .maybeSingle()

    if (membershipError) {
      console.error('Error verifying team membership:', membershipError)
      return apiError('Failed to verify team access', 500, 'internal_server_error', true)
    }

    if (!membership) {
      return apiError('Forbidden', 403, 'forbidden', false)
    }

    const normalizedIdeaState =
      normalizedItemType === 'IDEA'
        ? ['INBOX', 'SHAPING', 'READY', 'CONVERTED', 'ARCHIVED'].includes(idea_state)
          ? idea_state
          : 'INBOX'
        : null

    const normalizedStatus = normalizedItemType === 'IDEA' ? 'DRAFT' : status || 'DRAFT'

    const insertData: Record<string, unknown> = {
      title,
      blocks: blocks || [],
      platforms: platforms || [],
      status: normalizedStatus,
      item_type: normalizedItemType,
      idea_state: normalizedIdeaState,
      team_id,
      created_by: user.id,
    }

    // Keep backward compatibility with older schemas where these columns may not exist yet.
    if (scheduled_at !== undefined) insertData.scheduled_at = scheduled_at
    if (assigned_to !== undefined) insertData.assigned_to = assigned_to

    const { data, error } = await supabase
      .from('content')
      .insert(insertData)
      .select('*')
      .single()

    if (error) {
      console.error('Error creating content:', error)
      if (isMissingIdeaColumnsError(error)) {
        return apiError(
          'Database migration required for ideas support. Apply migration 20260221_ideas_posts_conversion.sql',
          500,
          'migration_required',
          false
        )
      }
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
