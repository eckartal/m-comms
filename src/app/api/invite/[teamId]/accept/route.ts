import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createHash } from 'crypto'

function hashToken(token: string) {
  return createHash('sha256').update(token).digest('hex')
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ teamId: string }> }
) {
  try {
    const { teamId } = await params
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json().catch(() => ({}))
    const token = typeof body?.token === 'string' ? body.token.trim() : ''
    if (!token) {
      return NextResponse.json({ error: 'Invite token is required' }, { status: 400 })
    }

    const tokenHash = hashToken(token)

    const { data: team, error: teamError } = await supabase
      .from('teams')
      .select('id, slug')
      .eq('id', teamId)
      .single()

    if (teamError || !team) {
      return NextResponse.json({ error: 'Team not found' }, { status: 404 })
    }

    const { data: invite, error: inviteError } = await supabase
      .from('team_invites')
      .select('id, invited_email, invite_role, expires_at, used_at')
      .eq('team_id', teamId)
      .eq('token_hash', tokenHash)
      .maybeSingle()

    if (inviteError) {
      return NextResponse.json({ error: inviteError.message || 'Failed to validate invite' }, { status: 500 })
    }

    if (!invite) {
      return NextResponse.json({ error: 'Invalid invite link' }, { status: 400 })
    }

    if (invite.used_at) {
      return NextResponse.json({ error: 'Invite link has already been used' }, { status: 400 })
    }

    if (new Date(invite.expires_at).getTime() < Date.now()) {
      return NextResponse.json({ error: 'Invite link has expired' }, { status: 400 })
    }

    if (invite.invited_email && user.email?.toLowerCase() !== invite.invited_email.toLowerCase()) {
      return NextResponse.json({ error: 'Invite link is for a different email address' }, { status: 403 })
    }

    const { data: membership } = await supabase
      .from('team_members')
      .select('id')
      .eq('team_id', teamId)
      .eq('user_id', user.id)
      .maybeSingle()

    if (!membership) {
      const { error: insertError } = await supabase
        .from('team_members')
        .insert({ team_id: teamId, user_id: user.id, role: invite.invite_role || 'VIEWER' })

      if (insertError) {
        return NextResponse.json({ error: insertError.message }, { status: 500 })
      }
    }

    const { error: inviteUpdateError } = await supabase
      .from('team_invites')
      .update({
        used_at: new Date().toISOString(),
        used_by: user.id,
      })
      .eq('id', invite.id)
      .is('used_at', null)

    if (inviteUpdateError) {
      return NextResponse.json({ error: inviteUpdateError.message || 'Failed to finalize invite' }, { status: 500 })
    }

    return NextResponse.json({ data: { slug: team.slug } })
  } catch (error) {
    console.error('Error accepting invite:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
