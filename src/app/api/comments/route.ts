import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

type CommentNode = {
  id: string
  parent_id: string | null
  replies?: CommentNode[]
  [key: string]: unknown
}

// GET /api/comments - List comments for a content
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const contentId = searchParams.get('contentId')

    if (!contentId) {
      return NextResponse.json({ error: 'Content ID is required' }, { status: 400 })
    }

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get comments with user info
    const { data: comments, error } = await supabase
      .from('comments')
      .select(`
        *,
        user:user_id (
          id,
          email,
          name,
          avatar_url
        )
      `)
      .eq('content_id', contentId)
      .order('created_at', { ascending: true })

    if (error) {
      console.error('Error fetching comments:', error)
      return NextResponse.json({ error: 'Failed to fetch comments' }, { status: 500 })
    }

    // Build comment tree
    const commentMap = new Map()
    const rootComments: typeof comments = []

    // First pass: create map
    comments?.forEach((comment: CommentNode) => {
      comment.replies = []
      commentMap.set(comment.id, comment)
    })

    // Second pass: build tree
    comments?.forEach((comment: CommentNode) => {
      if (comment.parent_id) {
        const parent = commentMap.get(comment.parent_id)
        if (parent) {
          parent.replies?.push(comment)
        }
      } else {
        rootComments.push(comment)
      }
    })

    return NextResponse.json({ data: rootComments })
  } catch (error) {
    console.error('Error in GET /api/comments:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/comments - Create a new comment
export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { contentId, text, parentId, mentions } = body

    if (!contentId || !text) {
      return NextResponse.json({ error: 'Content ID and text are required' }, { status: 400 })
    }

    // Extract @mentions from text
    const mentionRegex = /@(\w+)/g
    const extractedMentions = text.match(mentionRegex)?.map((m: string) => m.slice(1)) || []
    const allMentions = mentions ? [...new Set([...extractedMentions, ...mentions])] : extractedMentions

    const { data: comment, error } = await supabase
      .from('comments')
      .insert({
        content_id: contentId,
        user_id: user.id,
        text,
        parent_id: parentId || null,
        mentions: allMentions,
      })
      .select(`
        *,
        user:user_id (
          id,
          email,
          name,
          avatar_url
        )
      `)
      .single()

    if (error) {
      console.error('Error creating comment:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ data: comment })
  } catch (error) {
    console.error('Error in POST /api/comments:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PATCH /api/comments - Update comment (edit text or resolve)
export async function PATCH(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { commentId, text, resolved } = body

    if (!commentId) {
      return NextResponse.json({ error: 'Comment ID is required' }, { status: 400 })
    }

    // Check ownership
    const { data: existingComment } = await supabase
      .from('comments')
      .select('user_id')
      .eq('id', commentId)
      .single()

    if (!existingComment) {
      return NextResponse.json({ error: 'Comment not found' }, { status: 404 })
    }

    if (existingComment.user_id !== user.id) {
      return NextResponse.json({ error: 'Not authorized to edit this comment' }, { status: 403 })
    }

    const updateData: Record<string, unknown> = {}
    if (text !== undefined) updateData.text = text
    if (resolved !== undefined) {
      updateData.resolved_at = resolved ? new Date().toISOString() : null
    }

    const { data: comment, error } = await supabase
      .from('comments')
      .update(updateData)
      .eq('id', commentId)
      .select(`
        *,
        user:user_id (
          id,
          email,
          name,
          avatar_url
        )
      `)
      .single()

    if (error) {
      console.error('Error updating comment:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ data: comment })
  } catch (error) {
    console.error('Error in PATCH /api/comments:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE /api/comments - Delete a comment
export async function DELETE(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const commentId = searchParams.get('commentId')

    if (!commentId) {
      return NextResponse.json({ error: 'Comment ID is required' }, { status: 400 })
    }

    // Check ownership
    const { data: existingComment } = await supabase
      .from('comments')
      .select('user_id')
      .eq('id', commentId)
      .single()

    if (!existingComment) {
      return NextResponse.json({ error: 'Comment not found' }, { status: 404 })
    }

    if (existingComment.user_id !== user.id) {
      return NextResponse.json({ error: 'Not authorized to delete this comment' }, { status: 403 })
    }

    const { error } = await supabase
      .from('comments')
      .delete()
      .eq('id', commentId)

    if (error) {
      console.error('Error deleting comment:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ data: { success: true } })
  } catch (error) {
    console.error('Error in DELETE /api/comments:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
