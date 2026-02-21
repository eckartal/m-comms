import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// POST /api/annotations/[id]/comments - Add comment to annotation
export async function POST(
  request: Request,
  { params }: { params: Promise<{ annotationId: string }> }
) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { annotationId } = await params
    const body = await request.json()
    const { content_id, text } = body

    if (!content_id || !text) {
      return NextResponse.json({ error: 'content_id and text are required' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('annotation_comments')
      .insert({
        annotation_id: annotationId,
        content_id,
        user_id: user.id,
        text,
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating annotation comment:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ data })
  } catch (error) {
    console.error('Error in POST /api/annotations/[id]/comments:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
