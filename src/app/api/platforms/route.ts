import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET /api/platforms - List connected platform accounts
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const teamId = searchParams.get('teamId')

    if (!teamId) {
      return NextResponse.json({ error: 'Team ID is required' }, { status: 400 })
    }

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get connected platform accounts
    const { data: accounts, error } = await supabase
      .from('platform_accounts')
      .select('*')
      .eq('team_id', teamId)

    if (error) {
      console.error('Error fetching platform accounts:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    type PlatformAccount = { platform: string; id: string; account_name: string }

    // Build integration list with connection status
    const integrations: Array<{
      id: string
      name: string
      description: string
      icon: string
      connected: boolean
      accounts: PlatformAccount[]
    }> = [
      {
        id: 'twitter',
        name: 'Twitter/X',
        description: 'Post threads, schedule tweets, and track engagement',
        icon: '𝕏',
        connected: (accounts as PlatformAccount[])?.some(a => a.platform === 'twitter') || false,
        accounts: (accounts as PlatformAccount[])?.filter(a => a.platform === 'twitter') || [],
      },
      {
        id: 'linkedin',
        name: 'LinkedIn',
        description: 'Share articles, updates, and company news',
        icon: 'in',
        connected: (accounts as PlatformAccount[])?.some(a => a.platform === 'linkedin') || false,
        accounts: (accounts as PlatformAccount[])?.filter(a => a.platform === 'linkedin') || [],
      },
      {
        id: 'instagram',
        name: 'Instagram',
        description: 'Post images, stories, and track visual content',
        icon: '📷',
        connected: (accounts as PlatformAccount[])?.some(a => a.platform === 'instagram') || false,
        accounts: (accounts as PlatformAccount[])?.filter(a => a.platform === 'instagram') || [],
      },
      {
        id: 'blog',
        name: 'Blog / CMS',
        description: 'Publish to WordPress or other CMS platforms',
        icon: '📝',
        connected: false,
        accounts: [],
      },
    ]

    return NextResponse.json({ data: integrations })
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
    const { platform, teamId } = body

    if (!platform || !teamId) {
      return NextResponse.json({ error: 'Platform and team ID are required' }, { status: 400 })
    }

    // OAuth configurations
    const oauthConfigs: Record<string, { clientId: string; authUrl: string; scope: string }> = {
      twitter: {
        clientId: process.env.TWITTER_CLIENT_ID || '',
        authUrl: 'https://twitter.com/i/oauth2/authorize',
        scope: 'tweet.read tweet.write users.read',
      },
      linkedin: {
        clientId: process.env.LINKEDIN_CLIENT_ID || '',
        authUrl: 'https://www.linkedin.com/oauth/v2/authorization',
        scope: 'r_liteprofile w_member_social',
      },
      instagram: {
        clientId: process.env.INSTAGRAM_CLIENT_ID || '',
        authUrl: 'https://api.instagram.com/oauth/authorize',
        scope: 'instagram_basic media_repository',
      },
    }

    const config = oauthConfigs[platform]
    if (!config) {
      return NextResponse.json({ error: 'Unsupported platform' }, { status: 400 })
    }

    if (!config.clientId) {
      return NextResponse.json({ error: `${platform} OAuth not configured` }, { status: 500 })
    }

    // Generate PKCE code verifier
    const codeVerifier = generateCodeVerifier()
    const codeChallenge = await generateCodeChallenge(codeVerifier)

    // Store code verifier for callback
    await supabase
      .from('oauth_states')
      .insert({
        user_id: user.id,
        team_id: teamId,
        platform,
        code_verifier: codeVerifier,
        expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(), // 10 minutes
      })

    // Build OAuth URL
    const params = new URLSearchParams({
      response_type: 'code',
      client_id: config.clientId,
      redirect_uri: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3004'}/api/platforms/${platform}/callback`,
      scope: config.scope,
      state: `${teamId}:${user.id}`,
      code_challenge: codeChallenge,
      code_challenge_method: 'S256',
    })

    // Platform-specific params
    if (platform === 'twitter') {
      params.set('code_challenge', codeChallenge)
    }

    return NextResponse.json({
      authUrl: `${config.authUrl}?${params.toString()}`,
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

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error in DELETE /api/platforms:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

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

function base64UrlEncode(buffer: Uint8Array): string {
  const base64 = btoa(String.fromCharCode(...buffer))
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}