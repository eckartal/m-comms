import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireTeamMembership } from '@/lib/api/authz'

// GET /api/teams/[id] - Get single team
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    const membership = await requireTeamMembership(supabase, user.id, id)
    if (!membership) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { data, error } = await supabase
      .from('teams')
      .select('*')
      .eq('id', id)
      .single()

    if (error) {
      console.error('Error fetching team:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    if (!data) {
      return NextResponse.json({ error: 'Team not found' }, { status: 404 })
    }

    return NextResponse.json({ data })
  } catch (error) {
    console.error('Error in GET /api/teams/[id]:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PUT /api/teams/[id] - Update team
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const body = await request.json()
    const { name, settings } = body

    const membership = await requireTeamMembership(
      supabase,
      user.id,
      id,
      ['OWNER', 'ADMIN']
    )
    if (!membership) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    }

    if (name !== undefined) updateData.name = name
    if (settings !== undefined) updateData.settings = settings

    const { data, error } = await supabase
      .from('teams')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Error updating team:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ data })
  } catch (error) {
    console.error('Error in PUT /api/teams/[id]:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE /api/teams/[id] - Delete team
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    const membership = await requireTeamMembership(
      supabase,
      user.id,
      id,
      ['OWNER', 'ADMIN']
    )
    if (!membership) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { error } = await supabase
      .from('teams')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Error deleting team:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ data: { success: true } })
  } catch (error) {
    console.error('Error in DELETE /api/teams/[id]:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
