import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

type EventPayload = {
  event?: string
  teamId?: string | null
  payload?: Record<string, unknown>
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = (await request.json()) as EventPayload
    const event = (body.event || '').trim()
    if (!event) {
      return NextResponse.json({ error: 'event is required' }, { status: 400 })
    }

    if (body.teamId) {
      const { data: membership } = await supabase
        .from('team_members')
        .select('team_id')
        .eq('team_id', body.teamId)
        .eq('user_id', user.id)
        .single()

      if (!membership) {
        return NextResponse.json({ error: 'Forbidden team context' }, { status: 403 })
      }
    }

    const { error } = await supabase.from('analytics_events').insert({
      user_id: user.id,
      team_id: body.teamId || null,
      event_name: event,
      payload: body.payload || {},
    })

    if (error) {
      console.error('Error logging analytics event:', error)
      return NextResponse.json({ error: 'Failed to log event' }, { status: 500 })
    }

    return NextResponse.json({ data: { success: true } })
  } catch (error) {
    console.error('Error in POST /api/analytics/events:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
