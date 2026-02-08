import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ platform: string }> }
) {
  const resolvedParams = await params
  const platform = resolvedParams.platform

  try {
    const { searchParams } = new URL(request.url)
    const code = searchParams.get('code')
    const state = searchParams.get('state')
    const error = searchParams.get('error')
    const errorDescription = searchParams.get('error_description')

    if (error) {
      console.error(`${platform} OAuth error:`, error, errorDescription)
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3004'}/${state?.split(':')[0] || 'dashboard'}/integrations?error=${encodeURIComponent(errorDescription || error)}`
      )
    }

    if (!code || !state) {
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3004'}/dashboard/integrations?error=missing_params`
      )
    }

    const [teamId, userId] = state.split(':')

    if (!teamId || !userId) {
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3004'}/dashboard/integrations?error=invalid_state`
      )
    }

    const supabase = await createClient()

    // Exchange code for token
    const tokenResponse = await exchangeCodeForToken(platform, code, teamId)

    if (!tokenResponse.access_token) {
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3004'}/${teamId}/integrations?error=token_exchange_failed`
      )
    }

    // Store the platform account
    const { error: insertError } = await supabase
      .from('platform_accounts')
      .insert({
        team_id: teamId,
        platform,
        account_id: tokenResponse.accountId || userId,
        account_name: tokenResponse.accountName || '',
        access_token: tokenResponse.access_token,
        refresh_token: tokenResponse.refresh_token,
        token_expires_at: tokenResponse.expires_at,
        scope: tokenResponse.scope,
      })

    if (insertError) {
      console.error('Error storing platform account:', insertError)
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3004'}/${teamId}/integrations?error=storage_failed`
      )
    }

    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3004'}/${teamId}/integrations?connected=${platform}`
    )
  } catch (err) {
    console.error(`Error in ${platform} callback:`, err)
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3004'}/dashboard/integrations?error=internal_error`
    )
  }
}

async function exchangeCodeForToken(platform: string, code: string, teamId: string) {
  const tokenUrl = getTokenUrl(platform)
  const clientId = process.env[`${platform.toUpperCase()}_CLIENT_ID`]
  const clientSecret = process.env[`${platform.toUpperCase()}_CLIENT_SECRET`]
  const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3004'}/api/platforms/${platform}/callback`

  const params = new URLSearchParams({
    grant_type: 'authorization_code',
    code,
    redirect_uri: redirectUri,
    client_id: clientId || '',
    ...(clientSecret && { client_secret: clientSecret }),
  })

  const response = await fetch(tokenUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      ...(platform === 'twitter' && {
        Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
      }),
    },
    body: params.toString(),
  })

  if (!response.ok) {
    console.error(`${platform} token exchange failed:`, await response.text())
    return {}
  }

  const data = await response.json()

  // Platform-specific response parsing
  if (platform === 'twitter') {
    return {
      access_token: data.access_token,
      refresh_token: data.refresh_token,
      expires_at: data.expires_in
        ? new Date(Date.now() + data.expires_in * 1000).toISOString()
        : null,
      accountId: data.scope?.includes('users.read') ? 'twitter_user' : '',
      accountName: '',
    }
  }

  if (platform === 'linkedin') {
    // Get user profile
    let accountName = ''
    try {
      const profileResponse = await fetch('https://api.linkedin.com/v2/me', {
        headers: {
          Authorization: `Bearer ${data.access_token}`,
        },
      })
      if (profileResponse.ok) {
        const profile = await profileResponse.json()
        accountName = `${profile.localizedFirstName} ${profile.localizedLastName}`
      }
    } catch (e) {
      console.error('Failed to fetch LinkedIn profile:', e)
    }

    return {
      access_token: data.access_token,
      refresh_token: data.refresh_token,
      expires_at: data.expires_in
        ? new Date(Date.now() + data.expires_in * 1000).toISOString()
        : null,
      scope: data.scope,
      accountId: 'linkedin_user',
      accountName,
    }
  }

  return data
}

function getTokenUrl(platform: string): string {
  const urls: Record<string, string> = {
    twitter: 'https://api.twitter.com/2/oauth2/token',
    linkedin: 'https://www.linkedin.com/oauth/v2/accessToken',
  }
  return urls[platform] || ''
}