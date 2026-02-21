import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: teamId } = await params
    const supabase = await createClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized', code: 'unauthorized' }, { status: 401 })
    }

    const { data: membership, error: membershipError } = await supabase
      .from('team_members')
      .select('id')
      .eq('team_id', teamId)
      .eq('user_id', user.id)
      .maybeSingle()

    if (membershipError) {
      console.error('Error verifying team membership:', membershipError)
      return NextResponse.json(
        { error: 'Failed to verify team access', code: 'membership_check_failed' },
        { status: 500 }
      )
    }

    if (!membership) {
      return NextResponse.json({ error: 'Forbidden', code: 'forbidden' }, { status: 403 })
    }

    const { data, error } = await supabase
      .from('content_annotations')
      .select(`
        id,
        content_id,
        block_id,
        text_snapshot,
        created_at,
        status,
        content:content_id!inner(
          id,
          title,
          team_id
        ),
        comments:annotation_comments(count)
      `)
      .eq('status', 'OPEN')
      .eq('content.team_id', teamId)
      .order('created_at', { ascending: false })
      .limit(20)

    if (error) {
      console.error('Error fetching open annotations:', error)
      return NextResponse.json(
        { error: 'Failed to fetch open annotations', code: 'open_annotations_fetch_failed' },
        { status: 500 }
      )
    }

    return NextResponse.json({ data: data || [] })
  } catch (error) {
    console.error('Error in GET /api/teams/[id]/open-annotations:', error)
    return NextResponse.json(
      { error: 'Internal server error', code: 'internal_server_error' },
      { status: 500 }
    )
  }
}
