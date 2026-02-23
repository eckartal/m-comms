import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { resolveSharedContent } from '@/lib/shareAccess'
import { checkRateLimit, getRequestIp } from '@/lib/server/rateLimit'

function badRequest(message: string) {
  return NextResponse.json({ error: message }, { status: 400 })
}

function tooManyRequests(retryAfterSeconds: number) {
  return NextResponse.json(
    { error: 'Too many requests. Please try again shortly.' },
    {
      status: 429,
      headers: {
        'Retry-After': String(retryAfterSeconds),
      },
    }
  )
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ annotationId: string }> }
) {
  try {
    const { annotationId } = await params
    const body = await request.json()
    const token = typeof body.token === 'string' ? body.token : ''
    const status = body.status === 'RESOLVED' ? 'RESOLVED' : body.status === 'OPEN' ? 'OPEN' : null

    if (!token) return badRequest('Share token is required')
    if (!status) return badRequest('Invalid status')

    const supabase = createAdminClient()
    const { data: annotation, error: annotationError } = await supabase
      .from('share_annotations')
      .select('id, content_id')
      .eq('id', annotationId)
      .maybeSingle()

    if (annotationError) {
      return NextResponse.json({ error: annotationError.message }, { status: 500 })
    }
    if (!annotation) {
      return NextResponse.json({ error: 'Annotation not found' }, { status: 404 })
    }

    const ip = getRequestIp(request)
    const writeLimit = checkRateLimit(`share-annotations:patch:${annotation.content_id}:${ip}`, 60, 60_000)
    if (!writeLimit.allowed) {
      return tooManyRequests(writeLimit.retryAfterSeconds)
    }

    const shared = await resolveSharedContent(annotation.content_id, token)
    if (!shared) return NextResponse.json({ error: 'Shared content not found' }, { status: 404 })
    if (!shared.settings.allowComments) return NextResponse.json({ error: 'Comments are disabled for this link' }, { status: 403 })

    const { data, error } = await supabase
      .from('share_annotations')
      .update({
        status,
        resolved_at: status === 'RESOLVED' ? new Date().toISOString() : null,
      })
      .eq('id', annotationId)
      .select(
        'id, content_id, block_id, start_offset, end_offset, text_snapshot, status, created_by_name, created_by_session_id, created_at, resolved_at'
      )
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ data })
  } catch (error) {
    console.error('Error in PATCH /api/share/annotations/[annotationId]:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
