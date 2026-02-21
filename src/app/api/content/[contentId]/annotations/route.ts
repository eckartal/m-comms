import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET /api/content/[id]/annotations - List annotations with comments
export async function GET(
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

    const { data, error } = await supabase
      .from('content_annotations')
      .select(`
        id,
        content_id,
        block_id,
        start_offset,
        end_offset,
        text_snapshot,
        status,
        created_at,
        created_by,
        resolved_by,
        resolved_at,
        creator:created_by(id, name, email, avatar_url),
        comments:annotation_comments(
          id,
          text,
          created_at,
          updated_at,
          user:user_id(id, name, email, avatar_url)
        )
      `)
      .eq('content_id', contentId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching annotations:', error)
      return NextResponse.json({ error: 'Failed to fetch annotations' }, { status: 500 })
    }

    return NextResponse.json({ data: data || [] })
  } catch (error) {
    console.error('Error in GET /api/content/[id]/annotations:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/content/[id]/annotations - Create annotation + first comment
export async function POST(
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
    const { block_id, start_offset, end_offset, text_snapshot, comment_text } = body

    if (
      !block_id ||
      start_offset === undefined ||
      end_offset === undefined ||
      !text_snapshot ||
      !comment_text
    ) {
      return NextResponse.json({ error: 'Missing annotation fields' }, { status: 400 })
    }

    const { data: annotation, error: annotationError } = await supabase
      .from('content_annotations')
      .insert({
        content_id: contentId,
        block_id,
        start_offset,
        end_offset,
        text_snapshot,
        created_by: user.id,
      })
      .select()
      .single()

    if (annotationError || !annotation) {
      console.error('Error creating annotation:', annotationError)
      return NextResponse.json({ error: 'Failed to create annotation' }, { status: 500 })
    }

    const { data: comment, error: commentError } = await supabase
      .from('annotation_comments')
      .insert({
        annotation_id: annotation.id,
        content_id: contentId,
        user_id: user.id,
        text: comment_text,
      })
      .select()
      .single()

    if (commentError) {
      console.error('Error creating annotation comment:', commentError)
      return NextResponse.json({ error: 'Failed to create annotation comment' }, { status: 500 })
    }

    return NextResponse.json({
      data: {
        ...annotation,
        comments: comment ? [comment] : [],
      },
    })
  } catch (error) {
    console.error('Error in POST /api/content/[id]/annotations:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
