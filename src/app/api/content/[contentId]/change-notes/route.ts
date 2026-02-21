import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// POST /api/content/[id]/change-notes - Add a reason for an activity
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
    const { activity_id, reason } = body

    if (!activity_id || !reason) {
      return NextResponse.json({ error: 'activity_id and reason are required' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('content_change_notes')
      .insert({
        content_id: contentId,
        activity_id,
        user_id: user.id,
        reason,
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating change note:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ data })
  } catch (error) {
    console.error('Error in POST /api/content/[id]/change-notes:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
