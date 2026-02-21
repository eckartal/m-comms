import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireTeamMembership } from '@/lib/api/authz'

type MemberUser = {
  id: string
  email?: string | null
  name?: string | null
  full_name?: string | null
  avatar_url?: string | null
}

type TeamMemberRow = {
  id: string
  role: string
  joined_at: string
  user?: MemberUser | MemberUser[] | null
  [key: string]: unknown
}

function normalizeMemberUser(user: MemberUser | MemberUser[] | null | undefined) {
  const source = Array.isArray(user) ? user[0] : user
  if (!source) return null
  const name = source.full_name ?? source.name ?? null
  return {
    id: source.id,
    email: source.email ?? null,
    name,
    full_name: source.full_name ?? name,
    avatar_url: source.avatar_url ?? null,
  }
}

// GET /api/teams/[id]/members - List team members
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: teamId } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) return NextResponse.json({ error: 'Unauthorized', code: 'unauthorized' }, { status: 401 })

    const membership = await requireTeamMembership(supabase, user.id, teamId)
    if (!membership) {
      return NextResponse.json({ error: 'Forbidden', code: 'forbidden' }, { status: 403 })
    }

    // Get team members with user details
    const { data, error } = await supabase
      .from('team_members')
      .select(`
        id,
        role,
        joined_at:created_at,
        user:users(
          id,
          email,
          full_name,
          avatar_url
        )
      `)
      .eq('team_id', teamId)

    if (error) {
      console.error('Error fetching team members:', error)
      return NextResponse.json(
        { error: error.message || 'Failed to fetch team members', code: 'members_fetch_failed' },
        { status: 500 }
      )
    }

    const normalized = ((data as TeamMemberRow[] | null) || []).map((member) => ({
      ...member,
      user: normalizeMemberUser(member.user),
    }))

    return NextResponse.json({ data: normalized })
  } catch (error) {
    console.error('Error in GET /api/teams/[id]/members:', error)
    return NextResponse.json({ error: 'Internal server error', code: 'internal_server_error' }, { status: 500 })
  }
}

// POST /api/teams/[id]/members - Invite new member
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: teamId } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { email, role } = body

    if (!email || !role) {
      return NextResponse.json({ error: 'Email and role are required' }, { status: 400 })
    }

    // Verify user has permission to invite
    const { data: currentMember } = await supabase
      .from('team_members')
      .select('role')
      .eq('team_id', teamId)
      .eq('user_id', user.id)
      .single()

    if (!currentMember || (currentMember.role !== 'OWNER' && currentMember.role !== 'ADMIN')) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    // Find user by email
    const { data: invitedUser } = await supabase
      .from('users')
      .select('id')
      .eq('email', email)
      .single()

    if (!invitedUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Check if already a member
    const { data: existingMember } = await supabase
      .from('team_members')
      .select('id')
      .eq('team_id', teamId)
      .eq('user_id', invitedUser.id)
      .single()

    if (existingMember) {
      return NextResponse.json({ error: 'User is already a team member' }, { status: 400 })
    }

    // Add member
    const { data, error } = await supabase
      .from('team_members')
      .insert({
        team_id: teamId,
        user_id: invitedUser.id,
        role,
      })
      .select()
      .single()

    if (error) {
      console.error('Error adding team member:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ data }, { status: 201 })
  } catch (error) {
    console.error('Error in POST /api/teams/[id]/members:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PUT /api/teams/[id]/members - Update member role
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: teamId } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { memberId, role } = body

    if (!memberId || !role) {
      return NextResponse.json({ error: 'Member ID and role are required' }, { status: 400 })
    }

    // Verify user has permission to update roles
    const { data: currentMember } = await supabase
      .from('team_members')
      .select('role')
      .eq('team_id', teamId)
      .eq('user_id', user.id)
      .single()

    if (!currentMember || (currentMember.role !== 'OWNER' && currentMember.role !== 'ADMIN')) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    // Cannot change OWNER role
    const { data: targetMember } = await supabase
      .from('team_members')
      .select('role')
      .eq('id', memberId)
      .single()

    if (targetMember?.role === 'OWNER') {
      return NextResponse.json({ error: 'Cannot change owner role' }, { status: 400 })
    }

    // Update role
    const { data, error } = await supabase
      .from('team_members')
      .update({ role })
      .eq('id', memberId)
      .select()
      .single()

    if (error) {
      console.error('Error updating member role:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ data })
  } catch (error) {
    console.error('Error in PUT /api/teams/[id]/members:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE /api/teams/[id]/members - Remove member
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: teamId } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const memberId = searchParams.get('memberId')

    if (!memberId) {
      return NextResponse.json({ error: 'Member ID is required' }, { status: 400 })
    }

    // Get target member to check if they're the owner
    const { data: targetMember } = await supabase
      .from('team_members')
      .select('role, user_id')
      .eq('id', memberId)
      .single()

    if (!targetMember) {
      return NextResponse.json({ error: 'Member not found' }, { status: 404 })
    }

    if (targetMember.role === 'OWNER') {
      return NextResponse.json({ error: 'Cannot remove team owner' }, { status: 400 })
    }

    // Check permissions - can only remove if: owner/admin OR removing yourself
    const { data: currentMember } = await supabase
      .from('team_members')
      .select('role')
      .eq('team_id', teamId)
      .eq('user_id', user.id)
      .single()

    const isRemovingSelf = targetMember.user_id === user.id
    const hasPermission = currentMember?.role === 'OWNER' ||
                          currentMember?.role === 'ADMIN' ||
                          isRemovingSelf

    if (!hasPermission) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const { error } = await supabase
      .from('team_members')
      .delete()
      .eq('id', memberId)

    if (error) {
      console.error('Error removing team member:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ data: { success: true } })
  } catch (error) {
    console.error('Error in DELETE /api/teams/[id]/members:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
