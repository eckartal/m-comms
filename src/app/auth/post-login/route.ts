import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
  const url = new URL(request.url)
  const origin = url.origin

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.redirect(`${origin}/login`)
  }

  const { data, error } = await supabase
    .from('team_members')
    .select('team:teams(slug)')
    .eq('user_id', user.id)
    .limit(1)

  if (error) {
    return NextResponse.redirect(`${origin}/onboarding/team`)
  }

  const first = (data as Array<{ team?: { slug?: string } | null }> | null)?.[0]
  const slug = first?.team?.slug

  if (slug) {
    return NextResponse.redirect(`${origin}/${slug}`)
  }

  return NextResponse.redirect(`${origin}/onboarding/team`)
}
