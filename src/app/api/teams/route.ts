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
    return NextResponse.json({ data: teams })
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
    const { name, slug, createWelcomeContent = true } = body

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
      const message = teamError.message || 'Failed to create team'
      const isUniqueViolation = teamError.code === '23505'
      const isMissingTable =
        teamError.code === '42P01' ||
        message.includes("Could not find the table 'public.teams'") ||
        message.includes('relation "public.teams" does not exist')

      if (isMissingTable) {
        return NextResponse.json(
          {
            error:
              'Database schema is not initialized (missing public.teams). Apply Supabase migrations before onboarding.',
            code: 'schema_not_initialized',
          },
          { status: 500 }
        )
      }

      const status = isUniqueViolation ? 409 : 500
      return NextResponse.json({ error: message }, { status })
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

    // Create welcome draft content if requested
    let welcomeContentId: string | null = null
    if (createWelcomeContent) {
      const WELCOME_DRAFT = {
        title: "This is your draft",
        blocks: [
          {
            id: 'welcome-1',
            type: 'text' as const,
            content: {
              text: `Welcome to your content platform! 🎉

This is your draft space where you can create and edit content before publishing.

## Getting started:
1. Click "New post" to create content
2. Select your platform (Twitter, LinkedIn, Instagram, or Blog)
3. Write your content or use a template
4. Click "Publish" to share it with your audience

Feel free to edit or delete this draft as you explore the platform!`,
            },
          },
        ],
        status: 'DRAFT' as const,
        platforms: [],
      }

      const { data: content, error: contentError } = await supabase
        .from('content')
        .insert({
          team_id: team.id,
          title: WELCOME_DRAFT.title,
          blocks: WELCOME_DRAFT.blocks,
          status: WELCOME_DRAFT.status,
          platforms: WELCOME_DRAFT.platforms,
          created_by: user.id,
          assigned_to: null,
        })
        .select()
        .single()

      if (contentError) {
        console.error('Error creating welcome content:', contentError)
        // Don't fail team creation if welcome content fails
      } else {
        welcomeContentId = content.id
      }
    }

    return NextResponse.json(
      {
        data: {
          ...team,
          welcome_content_id: welcomeContentId,
        },
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('Error in POST /api/teams:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
