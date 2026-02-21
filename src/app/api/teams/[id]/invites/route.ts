import { createHash, randomBytes } from 'crypto'
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireTeamMembership } from '@/lib/api/authz'

type InviteRole = 'ADMIN' | 'EDITOR' | 'VIEWER'

function generateInviteToken() {
  return randomBytes(24).toString('base64url')
}

function hashToken(token: string) {
  return createHash('sha256').update(token).digest('hex')
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: teamId } = await params
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const membership = await requireTeamMembership(supabase, user.id, teamId, ['OWNER', 'ADMIN'])
    if (!membership) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json().catch(() => ({}))
    const inputRole = typeof body?.role === 'string' ? body.role.toUpperCase() : 'VIEWER'
    const inviteRole: InviteRole =
      inputRole === 'ADMIN' || inputRole === 'EDITOR' || inputRole === 'VIEWER'
        ? inputRole
        : 'VIEWER'
    const invitedEmail =
      typeof body?.email === 'string' && body.email.trim().length > 0
        ? body.email.trim().toLowerCase()
        : null

    const token = generateInviteToken()
    const tokenHash = hashToken(token)
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()

    const { error: inviteError } = await supabase
      .from('team_invites')
      .insert({
        team_id: teamId,
        invited_by: user.id,
        invited_email: invitedEmail,
        invite_role: inviteRole,
        token_hash: tokenHash,
        expires_at: expiresAt,
      })

    if (inviteError) {
      return NextResponse.json({ error: inviteError.message || 'Failed to create invite' }, { status: 500 })
    }

    const origin = new URL(request.url).origin
    const inviteUrl = `${origin}/invite/${teamId}?token=${encodeURIComponent(token)}`

    return NextResponse.json({
      data: {
        inviteUrl,
        expiresAt,
        role: inviteRole,
      },
    })
  } catch (error) {
    console.error('Error in POST /api/teams/[id]/invites:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
