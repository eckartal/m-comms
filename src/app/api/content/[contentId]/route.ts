import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET /api/content/[id] - Get single content
export async function GET(
  request: Request,
  { params }: { params: Promise<{ contentId: string }> }
) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    const { contentId } = await params

    if (!user) {
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
      return NextResponse.json({ error: 'Failed to fetch content' }, { status: 500 })
    }

    if (!data) {
      return NextResponse.json({ error: 'Content not found' }, { status: 404 })
    }

    return NextResponse.json({ data })
  } catch (error) {
    console.error('Error in GET /api/content/[id]:', error)
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

    const shouldVersion = blocks !== undefined
    let fromVersionId: string | null = null
    let toVersionId: string | null = null

    if (shouldVersion) {
      const { data: prevVersion } = await supabase
        .from('content_versions')
        .select('id')
        .eq('content_id', contentId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()
      fromVersionId = prevVersion?.id || null

      const { data: newVersion, error: versionError } = await supabase
        .from('content_versions')
        .insert({
          content_id: contentId,
          blocks,
          created_by: user.id,
        })
        .select()
        .single()

      if (versionError) {
        console.error('Error creating content version:', versionError)
      } else {
        toVersionId = newVersion?.id || null
      }
    }

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

    if (blocks !== undefined) {
      activityEntries.push({
        content_id: contentId,
        team_id: currentContent.team_id,
        user_id: user.id,
        action: 'CONTENT_UPDATED',
        from_version_id: fromVersionId,
        to_version_id: toVersionId,
        metadata: { diff_available: true },
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
