import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { mockUser } from '@/lib/supabase/client'

// Mock reactions data for demo
const MOCK_REACTIONS = {
  like: [
    {
      id: 'reaction-1',
      content_id: '1',
      user_id: mockUser.id,
      type: 'like',
      created_at: new Date(Date.now() - 3600000).toISOString(),
      user: {
        id: mockUser.id,
        email: mockUser.email,
        name: mockUser.name,
        avatar_url: mockUser.avatar_url,
      },
    },
  ],
  love: [],
  laugh: [],
}

// GET /api/reactions - Get reactions for a content
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const contentId = searchParams.get('contentId')

    if (!contentId) {
      return NextResponse.json({ error: 'Content ID is required' }, { status: 400 })
    }

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    // If no user (or for demo), return mock reactions
    if (!user) {
      const filteredReactions = Object.entries(MOCK_REACTIONS).reduce((acc, [type, reactions]) => {
        acc[type] = reactions.filter((r) => r.content_id === contentId)
        return acc
      }, {} as Record<string, typeof reactions>)
      return NextResponse.json({ data: filteredReactions })
    }

    // Get reactions with user info
    const { data: reactions, error } = await supabase
      .from('reactions')
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
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching reactions:', error)
      // Return mock reactions if database is not available
      const filteredReactions = Object.entries(MOCK_REACTIONS).reduce((acc, [type, reactions]) => {
        acc[type] = reactions.filter((r) => r.content_id === contentId)
        return acc
      }, {} as Record<string, typeof reactions>)
      return NextResponse.json({ data: filteredReactions })
    }

    // Group reactions by type
    const grouped = reactions?.reduce((acc, reaction) => {
      if (!acc[reaction.type]) acc[reaction.type] = []
      acc[reaction.type].push(reaction)
      return acc
    }, {} as Record<string, typeof reactions>)

    return NextResponse.json({ data: grouped })
  } catch (error) {
    console.error('Error in GET /api/reactions:', error)
    // Return mock reactions on error
    const { searchParams } = new URL(request.url)
    const contentId = searchParams.get('contentId')
    const filteredReactions = Object.entries(MOCK_REACTIONS).reduce((acc, [type, reactions]) => {
      acc[type] = reactions.filter((r) => r.content_id === contentId)
      return acc
    }, {} as Record<string, typeof reactions>)
    return NextResponse.json({ data: filteredReactions })
  }
}

// POST /api/reactions - Create a new reaction
export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { contentId, type } = body

    if (!contentId || !type) {
      return NextResponse.json({ error: 'Content ID and reaction type are required' }, { status: 400 })
    }

    // Check for existing reaction from this user
    const { data: existing, error: fetchError } = await supabase
      .from('reactions')
      .select('id')
      .eq('content_id', contentId)
      .eq('user_id', user.id)
      .eq('type', type)
      .single()

    if (fetchError && fetchError.code !== 'PGRST116') {
      console.error('Error checking existing reaction:', fetchError)
      return NextResponse.json({ error: fetchError.message }, { status: 500 })
    }

    if (existing) {
      // Remove existing reaction (toggle off)
      const { error: deleteError } = await supabase
        .from('reactions')
        .delete()
        .eq('id', existing.id)

      if (deleteError) {
        console.error('Error deleting reaction:', deleteError)
        return NextResponse.json({ error: deleteError.message }, { status: 500 })
      }

      return NextResponse.json({ data: { id: existing.id, removed: true } })
    }

    // Create new reaction
    const { data: reaction, error } = await supabase
      .from('reactions')
      .insert({
        content_id: contentId,
        user_id: user.id,
        type,
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
      console.error('Error creating reaction:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ data: reaction })
  } catch (error) {
    console.error('Error in POST /api/reactions:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE /api/reactions - Remove a reaction
export async function DELETE(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const reactionId = searchParams.get('reactionId')

    if (!reactionId) {
      return NextResponse.json({ error: 'Reaction ID is required' }, { status: 400 })
    }

    // Check ownership
    const { data: existingReaction } = await supabase
      .from('reactions')
      .select('user_id')
      .eq('id', reactionId)
      .single()

    if (!existingReaction) {
      return NextResponse.json({ error: 'Reaction not found' }, { status: 404 })
    }

    if (existingReaction.user_id !== user.id) {
      return NextResponse.json({ error: 'Not authorized to delete this reaction' }, { status: 403 })
    }

    const { error } = await supabase
      .from('reactions')
      .delete()
      .eq('id', reactionId)

    if (error) {
      console.error('Error deleting reaction:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error in DELETE /api/reactions:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
