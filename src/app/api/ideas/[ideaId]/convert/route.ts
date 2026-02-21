import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

type IdeaRow = {
  id: string
  team_id: string
  title: string
  blocks: unknown[] | null
  platforms: unknown[] | null
  created_by: string
  assigned_to: string | null
  item_type: 'IDEA' | 'POST'
  idea_state: string | null
  converted_post_id: string | null
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ ideaId: string }> }
) {
  try {
    const { ideaId } = await params
    const supabase = await createClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized', code: 'unauthorized' }, { status: 401 })
    }

    const { data: idea, error: ideaError } = await supabase
      .from('content')
      .select('*')
      .eq('id', ideaId)
      .single()

    if (ideaError || !idea) {
      return NextResponse.json({ error: 'Idea not found', code: 'idea_not_found' }, { status: 404 })
    }

    const ideaRow = idea as IdeaRow

    if (ideaRow.item_type !== 'IDEA') {
      return NextResponse.json({ error: 'Only ideas can be converted', code: 'invalid_item_type' }, { status: 400 })
    }

    const { data: membership, error: membershipError } = await supabase
      .from('team_members')
      .select('id')
      .eq('team_id', ideaRow.team_id)
      .eq('user_id', user.id)
      .maybeSingle()

    if (membershipError) {
      console.error('Error verifying team membership:', membershipError)
      return NextResponse.json(
        { error: 'Failed to verify team membership', code: 'membership_check_failed' },
        { status: 500 }
      )
    }

    if (!membership) {
      return NextResponse.json({ error: 'Forbidden', code: 'forbidden' }, { status: 403 })
    }

    if (ideaRow.converted_post_id) {
      const { data: existingPost } = await supabase
        .from('content')
        .select('*')
        .eq('id', ideaRow.converted_post_id)
        .single()

      return NextResponse.json({
        data: {
          idea: ideaRow,
          post: existingPost || null,
          already_converted: true,
        },
      })
    }

    const { data: post, error: postError } = await supabase
      .from('content')
      .insert({
        team_id: ideaRow.team_id,
        item_type: 'POST',
        source_idea_id: ideaRow.id,
        title: ideaRow.title || 'Untitled from Idea',
        blocks: ideaRow.blocks || [],
        platforms: ideaRow.platforms || [],
        status: 'DRAFT',
        created_by: user.id,
        assigned_to: ideaRow.assigned_to,
      })
      .select('*')
      .single()

    if (postError || !post) {
      console.error('Error creating post from idea:', postError)
      return NextResponse.json(
        { error: 'Failed to create post from idea', code: 'post_create_failed' },
        { status: 500 }
      )
    }

    const { data: updatedIdea, error: updateIdeaError } = await supabase
      .from('content')
      .update({
        idea_state: 'CONVERTED',
        converted_post_id: post.id,
        converted_at: new Date().toISOString(),
        converted_by: user.id,
        updated_at: new Date().toISOString(),
      })
      .eq('id', ideaRow.id)
      .select('*')
      .single()

    if (updateIdeaError || !updatedIdea) {
      console.error('Error linking converted idea:', updateIdeaError)
      await supabase.from('content').delete().eq('id', post.id)
      return NextResponse.json(
        { error: 'Failed to finalize conversion', code: 'conversion_finalize_failed' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      data: {
        idea: updatedIdea,
        post,
        already_converted: false,
      },
    })
  } catch (error) {
    console.error('Error in POST /api/ideas/[ideaId]/convert:', error)
    return NextResponse.json(
      { error: 'Internal server error', code: 'internal_server_error' },
      { status: 500 }
    )
  }
}
