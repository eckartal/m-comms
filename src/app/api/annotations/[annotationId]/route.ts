import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// PATCH /api/annotations/[id] - Resolve or reopen
export async function PATCH(
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
    const { status } = body

    if (!status || (status !== 'OPEN' && status !== 'RESOLVED')) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('content_annotations')
      .update({
        status,
        resolved_by: status === 'RESOLVED' ? user.id : null,
        resolved_at: status === 'RESOLVED' ? new Date().toISOString() : null,
      })
      .eq('id', annotationId)
      .select()
      .single()

    if (error) {
      console.error('Error updating annotation:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ data })
  } catch (error) {
    console.error('Error in PATCH /api/annotations/[id]:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
