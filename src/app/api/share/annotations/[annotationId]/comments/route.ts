import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { resolveSharedContent } from '@/lib/shareAccess'
import { SHARE_COLLAB_LIMITS } from '@/lib/shareCollabValidation'
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

export async function POST(
  request: Request,
  { params }: { params: Promise<{ annotationId: string }> }
) {
  try {
    const { annotationId } = await params
    const body = await request.json()
    const token = typeof body.token === 'string' ? body.token : ''
    const visitorName = typeof body.visitorName === 'string' ? body.visitorName.trim() : ''
    const visitorSessionId = typeof body.visitorSessionId === 'string' ? body.visitorSessionId.trim() : ''
    const text = typeof body.text === 'string' ? body.text.trim() : ''

    if (!token) return badRequest('Share token is required')
    if (!visitorName) return badRequest('Visitor name is required')
    if (!visitorSessionId) return badRequest('Visitor session is required')
    if (!text) return badRequest('Comment text is required')

    if (visitorName.length > SHARE_COLLAB_LIMITS.MAX_VISITOR_NAME_LENGTH) {
      return badRequest(`Visitor name must be ${SHARE_COLLAB_LIMITS.MAX_VISITOR_NAME_LENGTH} characters or fewer`)
    }
    if (text.length > SHARE_COLLAB_LIMITS.MAX_NOTE_LENGTH) {
      return badRequest(`Comment must be ${SHARE_COLLAB_LIMITS.MAX_NOTE_LENGTH} characters or fewer`)
    }

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
    const writeLimit = checkRateLimit(`share-annotation-comments:post:${annotation.content_id}:${ip}`, 60, 60_000)
    if (!writeLimit.allowed) {
      return tooManyRequests(writeLimit.retryAfterSeconds)
    }

    const shared = await resolveSharedContent(annotation.content_id, token)
    if (!shared) return NextResponse.json({ error: 'Shared content not found' }, { status: 404 })
    if (!shared.settings.allowComments) return NextResponse.json({ error: 'Comments are disabled for this link' }, { status: 403 })

    const { data, error } = await supabase
      .from('share_annotation_comments')
      .insert({
        annotation_id: annotation.id,
        content_id: annotation.content_id,
        text,
        author_name: visitorName,
        author_session_id: visitorSessionId,
      })
      .select('id, annotation_id, content_id, text, author_name, author_session_id, created_at, updated_at')
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ data })
  } catch (error) {
    console.error('Error in POST /api/share/annotations/[annotationId]/comments:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
