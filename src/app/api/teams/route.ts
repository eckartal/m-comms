import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET /api/teams - List user's teams
export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get teams where user is a member
    const { data, error } = await supabase
      .from('team_members')
      .select(`
        *,
        team:teams(
          id,
          name,
          slug,
          logo,
          created_at
        )
      `)
      .eq('user_id', user.id)

    if (error) {
      console.error('Error fetching teams:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    type TeamMemberData = { team: unknown }
    const teams = (data as TeamMemberData[])?.map((tm) => tm.team) || []
    return NextResponse.json(teams)
  } catch (error) {
    console.error('Error in GET /api/teams:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/teams - Create new team
export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { name, slug } = body

    if (!name || !slug) {
      return NextResponse.json({ error: 'Name and slug are required' }, { status: 400 })
    }

    // Create the team
    const { data: team, error: teamError } = await supabase
      .from('teams')
      .insert({
        name,
        slug,
        settings: {},
      })
      .select()
      .single()

    if (teamError) {
      console.error('Error creating team:', teamError)
      return NextResponse.json({ error: teamError.message }, { status: 500 })
    }

    // Add user as owner
    const { error: memberError } = await supabase
      .from('team_members')
      .insert({
        user_id: user.id,
        team_id: team.id,
        role: 'OWNER',
      })

    if (memberError) {
      console.error('Error adding team member:', memberError)
      // Try to clean up the team
      await supabase.from('teams').delete().eq('id', team.id)
      return NextResponse.json({ error: memberError.message }, { status: 500 })
    }

    return NextResponse.json(team, { status: 201 })
  } catch (error) {
    console.error('Error in POST /api/teams:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}