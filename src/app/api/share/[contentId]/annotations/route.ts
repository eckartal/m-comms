import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { resolveSharedContent } from '@/lib/shareAccess'
import { SHARE_COLLAB_LIMITS } from '@/lib/shareCollabValidation'
import { checkRateLimit, getRequestIp } from '@/lib/server/rateLimit'

type ShareAnnotationRow = {
  id: string
  content_id: string
  block_id: string
  start_offset: number
  end_offset: number
  text_snapshot: string
  status: 'OPEN' | 'RESOLVED'
  created_by_name: string
  created_by_session_id: string
  created_at: string
  resolved_at: string | null
}

type ShareAnnotationCommentRow = {
  id: string
  annotation_id: string
  content_id: string
  text: string
  author_name: string
  author_session_id: string
  created_at: string
  updated_at: string
}

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

function sanitizeComment(row: ShareAnnotationCommentRow) {
  return {
    id: row.id,
    annotation_id: row.annotation_id,
    text: row.text,
    author_name: row.author_name,
    author_session_id: row.author_session_id,
    created_at: row.created_at,
    updated_at: row.updated_at,
  }
}

function sanitizeAnnotation(row: ShareAnnotationRow, comments: ShareAnnotationCommentRow[]) {
  return {
    id: row.id,
    content_id: row.content_id,
    block_id: row.block_id,
    start_offset: row.start_offset,
    end_offset: row.end_offset,
    text_snapshot: row.text_snapshot,
    status: row.status,
    created_by_name: row.created_by_name,
    created_by_session_id: row.created_by_session_id,
    created_at: row.created_at,
    resolved_at: row.resolved_at,
    comments: comments.map((comment) => sanitizeComment(comment)),
  }
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ contentId: string }> }
) {
  try {
    const { contentId } = await params
    const { searchParams } = new URL(request.url)
    const token = searchParams.get('token')

    if (!token) return badRequest('Share token is required')

    const ip = getRequestIp(request)
    const readLimit = checkRateLimit(`share-annotations:get:${contentId}:${ip}`, 180, 60_000)
    if (!readLimit.allowed) {
      return tooManyRequests(readLimit.retryAfterSeconds)
    }

    const shared = await resolveSharedContent(contentId, token)
    if (!shared) return NextResponse.json({ error: 'Shared content not found' }, { status: 404 })
    if (!shared.settings.allowComments) return NextResponse.json({ data: [] })

    const supabase = createAdminClient()
    const { data: annotations, error: annotationError } = await supabase
      .from('share_annotations')
      .select(
        'id, content_id, block_id, start_offset, end_offset, text_snapshot, status, created_by_name, created_by_session_id, created_at, resolved_at'
      )
      .eq('content_id', contentId)
      .order('created_at', { ascending: true })

    if (annotationError) {
      return NextResponse.json({ error: annotationError.message }, { status: 500 })
    }

    const annotationList = (annotations || []) as ShareAnnotationRow[]
    if (annotationList.length === 0) {
      return NextResponse.json({ data: [] })
    }

    const annotationIds = annotationList.map((item) => item.id)
    const { data: comments, error: commentError } = await supabase
      .from('share_annotation_comments')
      .select('id, annotation_id, content_id, text, author_name, author_session_id, created_at, updated_at')
      .eq('content_id', contentId)
      .in('annotation_id', annotationIds)
      .order('created_at', { ascending: true })

    if (commentError) {
      return NextResponse.json({ error: commentError.message }, { status: 500 })
    }

    const commentsByAnnotation = new Map<string, ShareAnnotationCommentRow[]>()
    for (const item of (comments || []) as ShareAnnotationCommentRow[]) {
      const next = commentsByAnnotation.get(item.annotation_id) || []
      next.push(item)
      commentsByAnnotation.set(item.annotation_id, next)
    }

    const payload = annotationList.map((annotation) =>
      sanitizeAnnotation(annotation, commentsByAnnotation.get(annotation.id) || [])
    )

    return NextResponse.json({ data: payload })
  } catch (error) {
    console.error('Error in GET /api/share/[contentId]/annotations:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ contentId: string }> }
) {
  try {
    const { contentId } = await params
    const body = await request.json()

    const token = typeof body.token === 'string' ? body.token : ''
    const visitorName = typeof body.visitorName === 'string' ? body.visitorName.trim() : ''
    const visitorSessionId = typeof body.visitorSessionId === 'string' ? body.visitorSessionId.trim() : ''
    const blockId = typeof body.blockId === 'string' ? body.blockId.trim() : ''
    const commentText = typeof body.commentText === 'string' ? body.commentText.trim() : ''
    const textSnapshot = typeof body.textSnapshot === 'string' ? body.textSnapshot : ''
    const startOffset = Number(body.startOffset)
    const endOffset = Number(body.endOffset)

    if (!token) return badRequest('Share token is required')
    if (!visitorName) return badRequest('Visitor name is required')
    if (!visitorSessionId) return badRequest('Visitor session is required')
    if (!blockId) return badRequest('Block is required')
    if (!commentText) return badRequest('Comment text is required')
    if (!textSnapshot || !textSnapshot.trim()) return badRequest('Selected text is required')
    if (!Number.isInteger(startOffset) || !Number.isInteger(endOffset) || startOffset < 0 || endOffset <= startOffset) {
      return badRequest('Invalid annotation range')
    }

    if (visitorName.length > SHARE_COLLAB_LIMITS.MAX_VISITOR_NAME_LENGTH) {
      return badRequest(`Visitor name must be ${SHARE_COLLAB_LIMITS.MAX_VISITOR_NAME_LENGTH} characters or fewer`)
    }
    if (commentText.length > SHARE_COLLAB_LIMITS.MAX_NOTE_LENGTH) {
      return badRequest(`Comment must be ${SHARE_COLLAB_LIMITS.MAX_NOTE_LENGTH} characters or fewer`)
    }
    if (textSnapshot.length > SHARE_COLLAB_LIMITS.MAX_NOTE_LENGTH) {
      return badRequest(`Selected text must be ${SHARE_COLLAB_LIMITS.MAX_NOTE_LENGTH} characters or fewer`)
    }

    const ip = getRequestIp(request)
    const writeLimit = checkRateLimit(`share-annotations:post:${contentId}:${ip}`, 45, 60_000)
    if (!writeLimit.allowed) {
      return tooManyRequests(writeLimit.retryAfterSeconds)
    }

    const shared = await resolveSharedContent(contentId, token)
    if (!shared) return NextResponse.json({ error: 'Shared content not found' }, { status: 404 })
    if (!shared.settings.allowComments) {
      return NextResponse.json({ error: 'Comments are disabled for this link' }, { status: 403 })
    }

    const supabase = createAdminClient()
    const { data: annotation, error: annotationError } = await supabase
      .from('share_annotations')
      .insert({
        content_id: contentId,
        block_id: blockId,
        start_offset: startOffset,
        end_offset: endOffset,
        text_snapshot: textSnapshot,
        status: 'OPEN',
        created_by_name: visitorName,
        created_by_session_id: visitorSessionId,
      })
      .select(
        'id, content_id, block_id, start_offset, end_offset, text_snapshot, status, created_by_name, created_by_session_id, created_at, resolved_at'
      )
      .single()

    if (annotationError || !annotation) {
      return NextResponse.json({ error: annotationError?.message || 'Failed to create thread' }, { status: 500 })
    }

    const { data: comment, error: commentError } = await supabase
      .from('share_annotation_comments')
      .insert({
        annotation_id: annotation.id,
        content_id: contentId,
        text: commentText,
        author_name: visitorName,
        author_session_id: visitorSessionId,
      })
      .select('id, annotation_id, content_id, text, author_name, author_session_id, created_at, updated_at')
      .single()

    if (commentError || !comment) {
      return NextResponse.json({ error: commentError?.message || 'Failed to create thread comment' }, { status: 500 })
    }

    return NextResponse.json({
      data: sanitizeAnnotation(annotation as ShareAnnotationRow, [comment as ShareAnnotationCommentRow]),
    })
  } catch (error) {
    console.error('Error in POST /api/share/[contentId]/annotations:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
