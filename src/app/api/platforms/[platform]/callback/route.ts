import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

type OAuthStateRow = {
  team_id: string
  user_id: string
  code_verifier: string | null
  expires_at: string
  team_slug: string | null
  return_to: string | null
  connect_mode: 'redirect' | 'popup' | null
}

function sanitizeReturnTo(returnTo?: string | null, fallback = '/dashboard/integrations'): string {
  if (!returnTo) return fallback
  if (!returnTo.startsWith('/')) return fallback
  if (returnTo.startsWith('//')) return fallback
  return returnTo
}

function withQuery(path: string, key: string, value: string): string {
  const separator = path.includes('?') ? '&' : '?'
  return `${path}${separator}${key}=${encodeURIComponent(value)}`
}

function popupCompletionHtml(
  appOrigin: string,
  payload: { status: 'success' | 'error'; platform: string; error?: string; returnTo: string }
) {
  const safePayload = JSON.stringify(payload)
  const safeOrigin = JSON.stringify(appOrigin)
  return `<!DOCTYPE html>
<html>
  <head><meta charset="utf-8"><title>Connection Complete</title></head>
  <body style="font-family: sans-serif; padding: 24px;">
    <p>${payload.status === 'success' ? 'Connection successful. You can close this window.' : 'Connection failed. You can close this window.'}</p>
    <script>
      (function () {
        var payload = ${safePayload};
        var targetOrigin = ${safeOrigin};
        if (window.opener && !window.opener.closed) {
          window.opener.postMessage({ type: 'platform_oauth_result', payload: payload }, targetOrigin);
        }
        window.close();
      })();
    </script>
  </body>
</html>`
}

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
    const appBase = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3004'
    const appOrigin = new URL(appBase).origin

    const supabase = await createClient()

    let storedState: OAuthStateRow | null = null
    if (state) {
      const { data } = await supabase
        .from('oauth_states')
        .select('team_id, user_id, code_verifier, expires_at, team_slug, return_to, connect_mode')
        .eq('state_token', state)
        .single()
      storedState = (data as OAuthStateRow | null) || null
    }

    const fallbackPath = storedState?.team_slug
      ? `/${storedState.team_slug}/integrations`
      : '/dashboard/integrations'
    const baseReturnTo = sanitizeReturnTo(storedState?.return_to, fallbackPath)
    const isPopupFlow = storedState?.connect_mode === 'popup'

    if (error) {
      console.error(`${platform} OAuth error:`, error, errorDescription)
      const message = errorDescription || error
      if (state) {
        await supabase.from('oauth_states').delete().eq('state_token', state)
      }
      if (isPopupFlow) {
        return new Response(
          popupCompletionHtml(appOrigin, {
            status: 'error',
            platform,
            error: message,
            returnTo: baseReturnTo,
          }),
          { headers: { 'Content-Type': 'text/html; charset=utf-8' } }
        )
      }
      return NextResponse.redirect(`${appBase}${withQuery(baseReturnTo, 'error', message)}`)
    }

    if (!code || !state) {
      return NextResponse.redirect(`${appBase}/dashboard/integrations?error=missing_params`)
    }

    if (!storedState) {
      return NextResponse.redirect(`${appBase}/dashboard/integrations?error=invalid_state`)
    }

    // Check if state has expired
    const expiresAt = new Date(storedState.expires_at).getTime()
    if (Date.now() > expiresAt) {
      await supabase.from('oauth_states').delete().eq('state_token', state)
      if (isPopupFlow) {
        return new Response(
          popupCompletionHtml(appOrigin, {
            status: 'error',
            platform,
            error: 'state_expired',
            returnTo: baseReturnTo,
          }),
          { headers: { 'Content-Type': 'text/html; charset=utf-8' } }
        )
      }
      return NextResponse.redirect(`${appBase}${withQuery(baseReturnTo, 'error', 'state_expired')}`)
    }

    const teamId = storedState.team_id
    const userId = storedState.user_id

    // Exchange code for token
    const tokenResponse = await exchangeCodeForToken(platform, code, storedState.code_verifier || undefined)

    if (!tokenResponse.access_token) {
      await supabase.from('oauth_states').delete().eq('state_token', state)
      if (isPopupFlow) {
        return new Response(
          popupCompletionHtml(appOrigin, {
            status: 'error',
            platform,
            error: 'token_exchange_failed',
            returnTo: baseReturnTo,
          }),
          { headers: { 'Content-Type': 'text/html; charset=utf-8' } }
        )
      }
      return NextResponse.redirect(`${appBase}${withQuery(baseReturnTo, 'error', 'token_exchange_failed')}`)
    }

    // Store the platform account
    const { error: insertError } = await supabase
      .from('platform_accounts')
      .insert({
        team_id: teamId,
        user_id: userId,
        platform,
        account_id: tokenResponse.accountId || userId,
        account_name: tokenResponse.accountName || '',
        account_handle: tokenResponse.accountHandle || null,
        access_token: tokenResponse.access_token,
        refresh_token: tokenResponse.refresh_token,
        token_expires_at: tokenResponse.expires_at,
        scope: tokenResponse.scope,
        connection_mode: 'real_oauth',
        connection_status: 'connected',
      })

    if (insertError) {
      console.error('Error storing platform account:', insertError)
      await supabase.from('oauth_states').delete().eq('state_token', state)
      if (isPopupFlow) {
        return new Response(
          popupCompletionHtml(appOrigin, {
            status: 'error',
            platform,
            error: 'storage_failed',
            returnTo: baseReturnTo,
          }),
          { headers: { 'Content-Type': 'text/html; charset=utf-8' } }
        )
      }
      return NextResponse.redirect(`${appBase}${withQuery(baseReturnTo, 'error', 'storage_failed')}`)
    }

    await supabase.from('oauth_states').delete().eq('state_token', state)

    if (isPopupFlow) {
      return new Response(
        popupCompletionHtml(appOrigin, {
          status: 'success',
          platform,
          returnTo: baseReturnTo,
        }),
        { headers: { 'Content-Type': 'text/html; charset=utf-8' } }
      )
    }

    return NextResponse.redirect(`${appBase}${withQuery(baseReturnTo, 'connected', platform)}`)
  } catch (err) {
    console.error(`Error in ${platform} callback:`, err)
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3004'}/dashboard/integrations?error=internal_error`
    )
  }
}

async function exchangeCodeForToken(platform: string, code: string, codeVerifier?: string) {
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
    ...(codeVerifier ? { code_verifier: codeVerifier } : {}),
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
      accountHandle: '',
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
      accountHandle: '',
    }
  }

  if (platform === 'instagram') {
    // Get user profile
    let accountName = ''
    let accountId = ''
    try {
      const profileResponse = await fetch(`https://graph.instagram.com/me?fields=id,username,account_type&access_token=${data.access_token}`)
      if (profileResponse.ok) {
        const profile = await profileResponse.json()
        accountId = profile.id
        accountName = profile.username || ''
      }
    } catch (e) {
      console.error('Failed to fetch Instagram profile:', e)
    }

    return {
      access_token: data.access_token,
      refresh_token: data.refresh_token,
      expires_at: data.expires_in
        ? new Date(Date.now() + data.expires_in * 1000).toISOString()
        : null,
      scope: data.scope,
      accountId,
      accountName,
      accountHandle: accountName ? `@${accountName}` : '',
    }
  }

  if (platform === 'tiktok') {
    return {
      access_token: data.access_token,
      refresh_token: data.refresh_token || '',
      expires_at: data.expires_in
        ? new Date(Date.now() + data.expires_in * 1000).toISOString()
        : null,
      scope: data.scope,
      accountId: data.user_info?.user_id || '',
      accountName: data.user_info?.display_name || '',
      accountHandle: data.user_info?.username ? `@${data.user_info.username}` : '',
    }
  }

  if (platform === 'youtube') {
    // Get channel info
    let accountName = ''
    let accountId = ''
    try {
      const channelResponse = await fetch('https://www.googleapis.com/youtube/v3/channels?part=snippet&id=mine', {
        headers: { Authorization: `Bearer ${data.access_token}` },
      })
      if (channelResponse.ok) {
        const channel = await channelResponse.json()
        if (channel.items?.[0]) {
          accountId = channel.items[0].id
          accountName = channel.items[0].snippet.title
        }
      }
    } catch (e) {
      console.error('Failed to fetch YouTube channel:', e)
    }

    return {
      access_token: data.access_token,
      refresh_token: data.refresh_token,
      expires_at: data.expires_in
        ? new Date(Date.now() + data.expires_in * 1000).toISOString()
        : null,
      scope: data.scope,
      accountId,
      accountName,
      accountHandle: '',
    }
  }

  if (platform === 'threads') {
    // Get user profile
    let accountName = ''
    try {
      const profileResponse = await fetch('https://graph.threads.net/v1.0/me?fields=id,username,display_name', {
        headers: { Authorization: `Bearer ${data.access_token}` },
      })
      if (profileResponse.ok) {
        const profile = await profileResponse.json()
        accountName = profile.display_name || profile.username || ''
      }
    } catch (e) {
      console.error('Failed to fetch Threads profile:', e)
    }

    return {
      access_token: data.access_token,
      refresh_token: '',
      expires_at: data.expires_in
        ? new Date(Date.now() + data.expires_in * 1000).toISOString()
        : null,
      scope: data.scope,
      accountId: data.id || '',
      accountName,
      accountHandle: '',
    }
  }

  if (platform === 'bluesky') {
    return {
      access_token: data.accessJwt || data.access_token,
      refresh_token: '',
      expires_at: data.expiresAt || null,
      scope: 'write posts',
      accountId: data.did || '',
      accountName: data.handle || '',
      accountHandle: data.handle ? `@${data.handle}` : '',
    }
  }

  if (platform === 'mastodon') {
    return {
      access_token: data.access_token,
      refresh_token: data.refresh_token || '',
      expires_at: data.expires_in
        ? new Date(Date.now() + data.expires_in * 1000).toISOString()
        : null,
      scope: data.scope,
      accountId: data.user.id || '',
      accountName: data.user.username || '',
      accountHandle: data.user.username ? `@${data.user.username}` : '',
    }
  }

  if (platform === 'facebook') {
    // Get page list
    let accountName = ''
    try {
      const pagesResponse = await fetch('https://graph.facebook.com/v18.0/me/accounts?access_token=' + data.access_token)
      if (pagesResponse.ok) {
        const pages = await pagesResponse.json()
        if (pages.data?.[0]) {
          accountName = pages.data[0].name
        }
      }
    } catch (e) {
      console.error('Failed to fetch Facebook pages:', e)
    }

    return {
      access_token: data.access_token,
      refresh_token: '',
      expires_at: data.expires_in
        ? new Date(Date.now() + data.expires_in * 1000).toISOString()
        : null,
      scope: data.scope,
      accountId: data.application?.id || 'facebook_user',
      accountName,
      accountHandle: '',
    }
  }

  return data
}

function getTokenUrl(platform: string): string {
  const urls: Record<string, string> = {
    twitter: 'https://api.twitter.com/2/oauth2/token',
    linkedin: 'https://www.linkedin.com/oauth/v2/accessToken',
    instagram: 'https://graph.instagram.com/oauth/access_token',
    tiktok: 'https://open.tiktokapis.com/v2/oauth/token/',
    youtube: 'https://oauth2.googleapis.com/token',
    threads: 'https://threads.net/oauth/access_token',
    bluesky: 'https://bsky.social/xrpc/com.atproto.server.createSession',
    mastodon: 'https://mastodon.social/oauth/token',
    facebook: 'https://graph.facebook.com/v18.0/oauth/access_token',
  }
  return urls[platform] || ''
}
