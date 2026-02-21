import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireTeamMembership } from '@/lib/api/authz'

// GET /api/content/[id]/share - Get share status and public link
export async function GET(
  request: Request,
  { params }: { params: Promise<{ contentId: string }> }
) {
  try {
    const { contentId } = await params
    const supabase = await createClient()

    // Check auth - either team member or valid share token
    const { searchParams } = new URL(request.url)
    const token = searchParams.get('token')

    let content
    if (token) {
      // Public access with share token
      const { data } = await supabase
        .from('content')
        .select('*, createdBy:created_by(id, name, avatar_url)')
        .eq('id', contentId)
        .eq('share_token', token)
        .single()
      content = data
    } else {
      // Authenticated access
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }

      const { data: contentMeta } = await supabase
        .from('content')
        .select('team_id')
        .eq('id', contentId)
        .maybeSingle()

      if (!contentMeta) {
        return NextResponse.json({ error: 'Content not found' }, { status: 404 })
      }

      const membership = await requireTeamMembership(supabase, user.id, contentMeta.team_id)
      if (!membership) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }

      const { data } = await supabase
        .from('content')
        .select('*, createdBy:created_by(id, name, avatar_url)')
        .eq('id', contentId)
        .single()
      content = data
    }

    if (!content) {
      return NextResponse.json({ error: 'Content not found' }, { status: 404 })
    }

    return NextResponse.json({
      data: {
        isPublic: !!content.share_token,
        shareUrl: content.share_token
          ? `${process.env.NEXT_PUBLIC_APP_URL}/share/${content.id}?token=${content.share_token}`
          : null,
        allowComments: content.share_settings?.allow_comments ?? true,
        allowEditing: content.share_settings?.allow_editing ?? false,
      },
    })
  } catch (error) {
    console.error('Error in GET /api/content/[id]/share:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/content/[id]/share - Create or update share settings
export async function POST(
  request: Request,
  { params }: { params: Promise<{ contentId: string }> }
) {
  try {
    const { contentId } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check content ownership
    const { data: content } = await supabase
      .from('content')
      .select('team_id, created_by')
      .eq('id', contentId)
      .single()

    if (!content) {
      return NextResponse.json({ error: 'Content not found' }, { status: 404 })
    }

    // Check team membership
    const { data: member } = await supabase
      .from('team_members')
      .select('role')
      .eq('team_id', content.team_id)
      .eq('user_id', user.id)
      .single()

    if (!member || !['OWNER', 'ADMIN', 'EDITOR'].includes(member.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const body = await request.json()
    const { enableShare, allowComments = true, allowEditing = false } = body

    if (enableShare) {
      // Generate share token
      const shareToken = generateShareToken()

      const { data: updated, error } = await supabase
        .from('content')
        .update({
          share_token: shareToken,
          share_settings: {
            allow_comments: allowComments,
            allow_editing: allowEditing,
          },
        })
        .eq('id', contentId)
        .select()
        .single()

      if (error) {
        console.error('Error enabling share:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
      }

      return NextResponse.json({
        data: {
          isPublic: true,
          shareUrl: `${process.env.NEXT_PUBLIC_APP_URL}/share/${contentId}?token=${shareToken}`,
        },
      })
    } else {
      // Disable sharing
      const { error } = await supabase
        .from('content')
        .update({
          share_token: null,
          share_settings: null,
        })
        .eq('id', contentId)

      if (error) {
        console.error('Error disabling share:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
      }

      return NextResponse.json({ data: { isPublic: false, shareUrl: null } })
    }
  } catch (error) {
    console.error('Error in POST /api/content/[id]/share:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE /api/content/[id]/share - Revoke share link
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ contentId: string }> }
) {
  try {
    const { contentId } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check content ownership
    const { data: content } = await supabase
      .from('content')
      .select('team_id, created_by')
      .eq('id', contentId)
      .single()

    if (!content) {
      return NextResponse.json({ error: 'Content not found' }, { status: 404 })
    }

    const { error } = await supabase
      .from('content')
      .update({
        share_token: null,
        share_settings: null,
      })
      .eq('id', contentId)

    if (error) {
      console.error('Error revoking share:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ data: { success: true } })
  } catch (error) {
    console.error('Error in DELETE /api/content/[id]/share:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

function generateShareToken(): string {
  const bytes = new Uint8Array(16)
  crypto.getRandomValues(bytes)
  return Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('')
}
