import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET /api/content/[id]/activity - List activity for a content item
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
      .from('content_activity')
      .select(`
        id,
        action,
        from_status,
        to_status,
        from_scheduled_at,
        to_scheduled_at,
        from_assigned_to,
        to_assigned_to,
        metadata,
        created_at,
        user:user_id(id, name, email, avatar_url)
      `)
      .eq('content_id', contentId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching content activity:', error)
      return NextResponse.json({ error: 'Failed to fetch activity' }, { status: 500 })
    }

    return NextResponse.json(data || [])
  } catch (error) {
    console.error('Error in GET /api/content/[id]/activity:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

