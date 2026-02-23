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

async function getCommentRecord(commentId: string) {
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('share_annotation_comments')
    .select('id, content_id, author_session_id')
    .eq('id', commentId)
    .maybeSingle()

  if (error) return { data: null, error }
  return { data, error: null }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ commentId: string }> }
) {
  try {
    const { commentId } = await params
    const body = await request.json()
    const token = typeof body.token === 'string' ? body.token : ''
    const visitorSessionId = typeof body.visitorSessionId === 'string' ? body.visitorSessionId.trim() : ''
    const text = typeof body.text === 'string' ? body.text.trim() : ''

    if (!token) return badRequest('Share token is required')
    if (!visitorSessionId) return badRequest('Visitor session is required')
    if (!text) return badRequest('Comment text is required')
    if (text.length > SHARE_COLLAB_LIMITS.MAX_NOTE_LENGTH) {
      return badRequest(`Comment must be ${SHARE_COLLAB_LIMITS.MAX_NOTE_LENGTH} characters or fewer`)
    }

    const current = await getCommentRecord(commentId)
    if (current.error) return NextResponse.json({ error: current.error.message }, { status: 500 })
    if (!current.data) return NextResponse.json({ error: 'Comment not found' }, { status: 404 })

    const ip = getRequestIp(request)
    const writeLimit = checkRateLimit(`share-annotation-comments:patch:${current.data.content_id}:${ip}`, 60, 60_000)
    if (!writeLimit.allowed) {
      return tooManyRequests(writeLimit.retryAfterSeconds)
    }

    const shared = await resolveSharedContent(current.data.content_id, token)
    if (!shared) return NextResponse.json({ error: 'Shared content not found' }, { status: 404 })
    if (!shared.settings.allowComments) return NextResponse.json({ error: 'Comments are disabled for this link' }, { status: 403 })
    if (current.data.author_session_id !== visitorSessionId) {
      return NextResponse.json({ error: 'You can only edit your own comments' }, { status: 403 })
    }

    const supabase = createAdminClient()
    const { data, error } = await supabase
      .from('share_annotation_comments')
      .update({ text })
      .eq('id', commentId)
      .select('id, annotation_id, content_id, text, author_name, author_session_id, created_at, updated_at')
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ data })
  } catch (error) {
    console.error('Error in PATCH /api/share/annotation-comments/[commentId]:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ commentId: string }> }
) {
  try {
    const { commentId } = await params
    const { searchParams } = new URL(request.url)
    const token = searchParams.get('token') || ''
    const visitorSessionId = (searchParams.get('visitorSessionId') || '').trim()

    if (!token) return badRequest('Share token is required')
    if (!visitorSessionId) return badRequest('Visitor session is required')

    const current = await getCommentRecord(commentId)
    if (current.error) return NextResponse.json({ error: current.error.message }, { status: 500 })
    if (!current.data) return NextResponse.json({ error: 'Comment not found' }, { status: 404 })

    const ip = getRequestIp(request)
    const writeLimit = checkRateLimit(`share-annotation-comments:delete:${current.data.content_id}:${ip}`, 60, 60_000)
    if (!writeLimit.allowed) {
      return tooManyRequests(writeLimit.retryAfterSeconds)
    }

    const shared = await resolveSharedContent(current.data.content_id, token)
    if (!shared) return NextResponse.json({ error: 'Shared content not found' }, { status: 404 })
    if (!shared.settings.allowComments) return NextResponse.json({ error: 'Comments are disabled for this link' }, { status: 403 })
    if (current.data.author_session_id !== visitorSessionId) {
      return NextResponse.json({ error: 'You can only delete your own comments' }, { status: 403 })
    }

    const supabase = createAdminClient()
    const { error } = await supabase
      .from('share_annotation_comments')
      .delete()
      .eq('id', commentId)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ data: { success: true } })
  } catch (error) {
    console.error('Error in DELETE /api/share/annotation-comments/[commentId]:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
