import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET /api/content/[id]/diff?from=...&to=...
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
    const { searchParams } = new URL(request.url)
    const fromId = searchParams.get('from')
    const toId = searchParams.get('to')

    if (!fromId || !toId) {
      return NextResponse.json({ error: 'from and to are required' }, { status: 400 })
    }

    const { data: fromVersion } = await supabase
      .from('content_versions')
      .select('id, blocks')
      .eq('id', fromId)
      .eq('content_id', contentId)
      .single()

    const { data: toVersion } = await supabase
      .from('content_versions')
      .select('id, blocks')
      .eq('id', toId)
      .eq('content_id', contentId)
      .single()

    if (!fromVersion || !toVersion) {
      return NextResponse.json({ error: 'Version not found' }, { status: 404 })
    }

    return NextResponse.json({
      data: {
        from: fromVersion,
        to: toVersion,
      },
    })
  } catch (error) {
    console.error('Error in GET /api/content/[id]/diff:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
