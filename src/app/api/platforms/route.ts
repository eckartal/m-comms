import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// Helper functions
function generateCodeVerifier(): string {
  const array = new Uint8Array(32)
  crypto.getRandomValues(array)
  return base64UrlEncode(array)
}

async function generateCodeChallenge(verifier: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(verifier)
  const hash = await crypto.subtle.digest('SHA-256', data)
  return base64UrlEncode(new Uint8Array(hash))
}

function generateRandomStateToken(): string {
  const array = new Uint8Array(32)
  crypto.getRandomValues(array)
  return base64UrlEncode(array)
}

function base64UrlEncode(buffer: Uint8Array): string {
  const base64 = btoa(String.fromCharCode(...buffer))
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function sanitizeReturnTo(returnTo?: string | null, fallback = '/dashboard/integrations'): string {
  if (!returnTo) return fallback
  if (!returnTo.startsWith('/')) return fallback
  if (returnTo.startsWith('//')) return fallback
  return returnTo
}

function isDevConnectEnabled() {
  return process.env.ENABLE_DEV_PLATFORM_CONNECT === 'true' || process.env.NODE_ENV === 'development'
}

function shouldForceDevConnect() {
  if (!isDevConnectEnabled()) return false
  return process.env.FORCE_REAL_OAUTH_IN_DEV !== 'true'
}

const PUBLISHABLE_PLATFORMS = new Set(['twitter', 'linkedin'])

async function resolveTeamContext(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  input: { teamId?: string; teamSlug?: string }
) {
  if (input.teamSlug) {
    const { data: teamBySlug } = await supabase
      .from('teams')
      .select('id, slug')
      .eq('slug', input.teamSlug)
      .single()

    if (!teamBySlug) return null

    const { data: membershipBySlug } = await supabase
      .from('team_members')
      .select('team_id')
      .eq('user_id', userId)
      .eq('team_id', teamBySlug.id)
      .single()

    if (!membershipBySlug) return null
    return {
      teamId: membershipBySlug.team_id,
      teamSlug: teamBySlug.slug || input.teamSlug,
    }
  }

  if (!input.teamId) return null

  const { data: membershipById } = await supabase
    .from('team_members')
    .select('team_id')
    .eq('team_id', input.teamId)
    .eq('user_id', userId)
    .single()

  if (!membershipById) return null

  const { data: teamById } = await supabase
    .from('teams')
    .select('slug')
    .eq('id', membershipById.team_id)
    .single()

  return {
    teamId: membershipById.team_id,
    teamSlug: teamById?.slug || '',
  }
}

// GET /api/platforms - List connected platform accounts
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const teamId = searchParams.get('teamId')
    const teamSlug = searchParams.get('teamSlug')

    if (!teamId && !teamSlug) {
      return NextResponse.json({ error: 'Team ID or team slug is required' }, { status: 400 })
    }

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const resolvedTeam = await resolveTeamContext(supabase, user.id, {
      teamId: teamId || undefined,
      teamSlug: teamSlug || undefined,
    })
    if (!resolvedTeam) {
      return NextResponse.json({ error: 'You do not have access to this team' }, { status: 403 })
    }

    // Get connected platform accounts
    const { data: accounts, error } = await supabase
      .from('platform_accounts')
      .select('*')
      .eq('team_id', resolvedTeam.teamId)

    if (error) {
      console.error('Error fetching platform accounts:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    type PlatformAccount = {
      platform: string
      id: string
      account_name: string
      account_id: string
      account_handle?: string | null
      connection_mode?: string | null
      connection_status?: string | null
      connected_at?: string | null
      created_at?: string | null
    }

    // Build integration list with connection status
    const integrations: Array<{
      id: string
      name: string
      description: string
      icon: string
      connected: boolean
      accounts: Array<{
        id: string
        account_name: string
        account_id: string
        account_handle: string | null
        source: 'real_oauth' | 'local_sandbox' | 'unknown'
        status: 'connected' | 'degraded'
        connected_at: string | null
      }>
      connection_status: 'connected' | 'degraded' | 'disconnected'
      connectable?: boolean
      publishable?: boolean
      support_status?: 'publish_ready' | 'connect_only' | 'internal'
    }> = [
      {
        id: 'twitter',
        name: 'X (Twitter)',
        description: 'Post threads, schedule tweets, and track engagement',
        icon: '𝕏',
        connected: (accounts as PlatformAccount[])?.some(a => a.platform === 'twitter') || false,
        accounts: ((accounts as PlatformAccount[])?.filter(a => a.platform === 'twitter') || []).map((a) => ({
          id: a.id,
          account_name: a.account_name,
          account_id: a.account_id,
          account_handle: a.account_handle || null,
          source: a.connection_mode === 'local_sandbox' ? 'local_sandbox' : 'real_oauth',
          status: a.connection_status === 'degraded' ? 'degraded' : 'connected',
          connected_at: a.connected_at || a.created_at || null,
        })),
        connection_status: ((accounts as PlatformAccount[])?.some(a => a.platform === 'twitter') || false) ? 'connected' : 'disconnected',
      },
      {
        id: 'linkedin',
        name: 'LinkedIn',
        description: 'Share articles, updates, and company news',
        icon: 'in',
        connected: (accounts as PlatformAccount[])?.some(a => a.platform === 'linkedin') || false,
        accounts: ((accounts as PlatformAccount[])?.filter(a => a.platform === 'linkedin') || []).map((a) => ({
          id: a.id,
          account_name: a.account_name,
          account_id: a.account_id,
          account_handle: a.account_handle || null,
          source: a.connection_mode === 'local_sandbox' ? 'local_sandbox' : 'real_oauth',
          status: a.connection_status === 'degraded' ? 'degraded' : 'connected',
          connected_at: a.connected_at || a.created_at || null,
        })),
        connection_status: ((accounts as PlatformAccount[])?.some(a => a.platform === 'linkedin') || false) ? 'connected' : 'disconnected',
      },
      {
        id: 'instagram',
        name: 'Instagram',
        description: 'Post images, stories, and track visual content',
        icon: '📷',
        connected: (accounts as PlatformAccount[])?.some(a => a.platform === 'instagram') || false,
        accounts: ((accounts as PlatformAccount[])?.filter(a => a.platform === 'instagram') || []).map((a) => ({
          id: a.id,
          account_name: a.account_name,
          account_id: a.account_id,
          account_handle: a.account_handle || null,
          source: a.connection_mode === 'local_sandbox' ? 'local_sandbox' : 'real_oauth',
          status: a.connection_status === 'degraded' ? 'degraded' : 'connected',
          connected_at: a.connected_at || a.created_at || null,
        })),
        connection_status: ((accounts as PlatformAccount[])?.some(a => a.platform === 'instagram') || false) ? 'connected' : 'disconnected',
      },
      {
        id: 'tiktok',
        name: 'TikTok',
        description: 'Create viral video content and reach wider audiences',
        icon: '🎵',
        connected: (accounts as PlatformAccount[])?.some(a => a.platform === 'tiktok') || false,
        accounts: ((accounts as PlatformAccount[])?.filter(a => a.platform === 'tiktok') || []).map((a) => ({
          id: a.id,
          account_name: a.account_name,
          account_id: a.account_id,
          account_handle: a.account_handle || null,
          source: a.connection_mode === 'local_sandbox' ? 'local_sandbox' : 'real_oauth',
          status: a.connection_status === 'degraded' ? 'degraded' : 'connected',
          connected_at: a.connected_at || a.created_at || null,
        })),
        connection_status: ((accounts as PlatformAccount[])?.some(a => a.platform === 'tiktok') || false) ? 'connected' : 'disconnected',
      },
      {
        id: 'youtube',
        name: 'YouTube',
        description: 'Publish videos and grow your channel',
        icon: '▶️',
        connected: (accounts as PlatformAccount[])?.some(a => a.platform === 'youtube') || false,
        accounts: ((accounts as PlatformAccount[])?.filter(a => a.platform === 'youtube') || []).map((a) => ({
          id: a.id,
          account_name: a.account_name,
          account_id: a.account_id,
          account_handle: a.account_handle || null,
          source: a.connection_mode === 'local_sandbox' ? 'local_sandbox' : 'real_oauth',
          status: a.connection_status === 'degraded' ? 'degraded' : 'connected',
          connected_at: a.connected_at || a.created_at || null,
        })),
        connection_status: ((accounts as PlatformAccount[])?.some(a => a.platform === 'youtube') || false) ? 'connected' : 'disconnected',
      },
      {
        id: 'threads',
        name: 'Threads',
        description: 'Share short text posts and join conversations',
        icon: '💬',
        connected: (accounts as PlatformAccount[])?.some(a => a.platform === 'threads') || false,
        accounts: ((accounts as PlatformAccount[])?.filter(a => a.platform === 'threads') || []).map((a) => ({
          id: a.id,
          account_name: a.account_name,
          account_id: a.account_id,
          account_handle: a.account_handle || null,
          source: a.connection_mode === 'local_sandbox' ? 'local_sandbox' : 'real_oauth',
          status: a.connection_status === 'degraded' ? 'degraded' : 'connected',
          connected_at: a.connected_at || a.created_at || null,
        })),
        connection_status: ((accounts as PlatformAccount[])?.some(a => a.platform === 'threads') || false) ? 'connected' : 'disconnected',
      },
      {
        id: 'bluesky',
        name: 'Bluesky',
        description: 'Decentralized social network with community moderation',
        icon: '🔵',
        connected: (accounts as PlatformAccount[])?.some(a => a.platform === 'bluesky') || false,
        accounts: ((accounts as PlatformAccount[])?.filter(a => a.platform === 'bluesky') || []).map((a) => ({
          id: a.id,
          account_name: a.account_name,
          account_id: a.account_id,
          account_handle: a.account_handle || null,
          source: a.connection_mode === 'local_sandbox' ? 'local_sandbox' : 'real_oauth',
          status: a.connection_status === 'degraded' ? 'degraded' : 'connected',
          connected_at: a.connected_at || a.created_at || null,
        })),
        connection_status: ((accounts as PlatformAccount[])?.some(a => a.platform === 'bluesky') || false) ? 'connected' : 'disconnected',
      },
      {
        id: 'mastodon',
        name: 'Mastodon',
        description: 'Federated social network with server diversity',
        icon: '🐘',
        connected: (accounts as PlatformAccount[])?.some(a => a.platform === 'mastodon') || false,
        accounts: ((accounts as PlatformAccount[])?.filter(a => a.platform === 'mastodon') || []).map((a) => ({
          id: a.id,
          account_name: a.account_name,
          account_id: a.account_id,
          account_handle: a.account_handle || null,
          source: a.connection_mode === 'local_sandbox' ? 'local_sandbox' : 'real_oauth',
          status: a.connection_status === 'degraded' ? 'degraded' : 'connected',
          connected_at: a.connected_at || a.created_at || null,
        })),
        connection_status: ((accounts as PlatformAccount[])?.some(a => a.platform === 'mastodon') || false) ? 'connected' : 'disconnected',
      },
      {
        id: 'facebook',
        name: 'Facebook',
        description: 'Post to your business page and reach customers',
        icon: 'f',
        connected: (accounts as PlatformAccount[])?.some(a => a.platform === 'facebook') || false,
        accounts: ((accounts as PlatformAccount[])?.filter(a => a.platform === 'facebook') || []).map((a) => ({
          id: a.id,
          account_name: a.account_name,
          account_id: a.account_id,
          account_handle: a.account_handle || null,
          source: a.connection_mode === 'local_sandbox' ? 'local_sandbox' : 'real_oauth',
          status: a.connection_status === 'degraded' ? 'degraded' : 'connected',
          connected_at: a.connected_at || a.created_at || null,
        })),
        connection_status: ((accounts as PlatformAccount[])?.some(a => a.platform === 'facebook') || false) ? 'connected' : 'disconnected',
      },
      {
        id: 'blog',
        name: 'Blog / CMS',
        description: 'Publish to WordPress or other CMS platforms',
        icon: '📝',
        connected: false,
        accounts: [],
        connection_status: 'disconnected',
      },
    ]

    const integrationsWithCapabilities = integrations.map((integration) => {
      const connectable = integration.id !== 'blog'
      const publishable = PUBLISHABLE_PLATFORMS.has(integration.id)
      return {
        ...integration,
        connectable,
        publishable,
        support_status: publishable
          ? 'publish_ready'
          : connectable
          ? 'connect_only'
          : 'internal',
      }
    })

    return NextResponse.json({
      data: integrationsWithCapabilities,
      meta: {
        default_connection_mode: shouldForceDevConnect() ? 'local_sandbox' : 'real_oauth',
        environment: process.env.NODE_ENV || 'development',
        publishable_platforms: Array.from(PUBLISHABLE_PLATFORMS),
      },
    })
  } catch (error) {
    console.error('Error in GET /api/platforms:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/platforms - Initiate OAuth flow
export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const {
      platform,
      teamId,
      teamSlug,
      returnTo,
      connectMode,
    }: {
      platform?: string
      teamId?: string
      teamSlug?: string
      returnTo?: string
      connectMode?: 'redirect' | 'popup'
    } = body

    if (!platform || (!teamId && !teamSlug)) {
      return NextResponse.json({ error: 'Platform and team context are required' }, { status: 400 })
    }

    const resolvedTeam = await resolveTeamContext(supabase, user.id, {
      teamId,
      teamSlug,
    })
    if (!resolvedTeam) {
      return NextResponse.json({ error: 'You do not have access to this team' }, { status: 403 })
    }

    const resolvedTeamId = resolvedTeam.teamId
    const resolvedTeamSlug = resolvedTeam.teamSlug

    const fallbackReturnPath = resolvedTeamSlug
      ? `/${resolvedTeamSlug}/integrations`
      : '/dashboard/integrations'
    const safeReturnTo = sanitizeReturnTo(returnTo, fallbackReturnPath)
    const safeConnectMode: 'redirect' | 'popup' = connectMode === 'popup' ? 'popup' : 'redirect'

    // OAuth configurations
    const oauthConfigs: Record<string, { clientId: string; clientSecret?: string; authUrl: string; scope: string }> = {
      twitter: {
        clientId: process.env.TWITTER_CLIENT_ID || '',
        clientSecret: process.env.TWITTER_CLIENT_SECRET || '',
        authUrl: 'https://twitter.com/i/oauth2/authorize',
        scope: 'tweet.read tweet.write users.read',
      },
      linkedin: {
        clientId: process.env.LINKEDIN_CLIENT_ID || '',
        clientSecret: process.env.LINKEDIN_CLIENT_SECRET || '',
        authUrl: 'https://www.linkedin.com/oauth/v2/authorization',
        scope: 'r_liteprofile w_member_social',
      },
      instagram: {
        clientId: process.env.INSTAGRAM_CLIENT_ID || '',
        clientSecret: process.env.INSTAGRAM_CLIENT_SECRET || '',
        authUrl: 'https://api.instagram.com/oauth/authorize',
        scope: 'instagram_basic user_profile',
      },
      tiktok: {
        clientId: process.env.TIKTOK_CLIENT_ID || '',
        clientSecret: process.env.TIKTOK_CLIENT_SECRET || '',
        authUrl: 'https://www.tiktok.com/v2/auth/authorize/',
        scope: 'user.info.basic feed.video.upload',
      },
      youtube: {
        clientId: process.env.YOUTUBE_CLIENT_ID || '',
        clientSecret: process.env.YOUTUBE_CLIENT_SECRET || '',
        authUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
        scope: 'https://www.googleapis.com/auth/youtube https://www.googleapis.com/auth/youtube.upload',
      },
      threads: {
        clientId: process.env.THREADS_CLIENT_ID || '',
        clientSecret: process.env.THREADS_CLIENT_SECRET || '',
        authUrl: 'https://threads.net/oauth/authorize',
        scope: 'threads_basic',
      },
      bluesky: {
        clientId: process.env.BSKY_CLIENT_ID || '',
        clientSecret: process.env.BSKY_CLIENT_SECRET || '',
        authUrl: 'https://bsky.social/oauth/authorize',
        scope: 'write posts',
      },
      mastodon: {
        clientId: process.env.MASTODON_CLIENT_ID || '',
        clientSecret: process.env.MASTODON_CLIENT_SECRET || '',
        authUrl: 'https://mastodon.social/oauth/authorize',
        scope: 'read write follow',
      },
      facebook: {
        clientId: process.env.FACEBOOK_CLIENT_ID || '',
        clientSecret: process.env.FACEBOOK_CLIENT_SECRET || '',
        authUrl: 'https://www.facebook.com/v18.0/dialog/oauth',
        scope: 'pages_show_list pages_manage_posts',
      },
    }

    const config = oauthConfigs[platform]
    if (!config) {
      return NextResponse.json({ error: 'Unsupported platform' }, { status: 400 })
    }

    if (shouldForceDevConnect()) {
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3004'
      const devParams = new URLSearchParams({
        platform,
        teamId: resolvedTeamId,
        returnTo: safeReturnTo,
        mode: safeConnectMode,
      })
      return NextResponse.json({
        data: {
          authUrl: `${appUrl}/api/platforms/dev-connect?${devParams.toString()}`,
        },
      })
    }

    if (!config.clientId || !config.clientSecret) {
      return NextResponse.json(
        { error: `${platform} OAuth not configured (missing client credentials)` },
        { status: 500 }
      )
    }

    // Generate PKCE code verifier and random state token
    const codeVerifier = generateCodeVerifier()
    const codeChallenge = await generateCodeChallenge(codeVerifier)
    const stateToken = generateRandomStateToken()

    // Store both code verifier and state token for callback verification
    await supabase
      .from('oauth_states')
      .insert({
        user_id: user.id,
        team_id: resolvedTeamId,
        platform,
        code_verifier: codeVerifier,
        state_token: stateToken,
        team_slug: resolvedTeamSlug || null,
        return_to: safeReturnTo,
        connect_mode: safeConnectMode,
        expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(), // 10 minutes
      })

    // Build OAuth URL
    const params = new URLSearchParams({
      response_type: 'code',
      client_id: config.clientId,
      redirect_uri: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3004'}/api/platforms/${platform}/callback`,
      scope: config.scope,
      state: stateToken,
      code_challenge: codeChallenge,
      code_challenge_method: 'S256',
    })

    // Platform-specific params
    if (platform === 'twitter') {
      params.set('code_challenge', codeChallenge)
    }

    return NextResponse.json({
      data: {
        authUrl: `${config.authUrl}?${params.toString()}`,
      },
    })
  } catch (error) {
    console.error('Error in POST /api/platforms:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE /api/platforms - Disconnect platform account
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const accountId = searchParams.get('accountId')

    if (!accountId) {
      return NextResponse.json({ error: 'Account ID is required' }, { status: 400 })
    }

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify user has access to this account
    const { data: account } = await supabase
      .from('platform_accounts')
      .select('team_id')
      .eq('id', accountId)
      .single()

    if (!account) {
      return NextResponse.json({ error: 'Account not found' }, { status: 404 })
    }

    // Check team membership
    const { data: member } = await supabase
      .from('team_members')
      .select('role')
      .eq('team_id', account.team_id)
      .eq('user_id', user.id)
      .single()

    if (!member || (member.role !== 'OWNER' && member.role !== 'ADMIN')) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const { error } = await supabase
      .from('platform_accounts')
      .delete()
      .eq('id', accountId)

    if (error) {
      console.error('Error disconnecting platform:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ data: { success: true } })
  } catch (error) {
    console.error('Error in DELETE /api/platforms:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
