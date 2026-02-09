import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// POST /api/content/[id]/publish - Publish content to platforms
export async function POST(
  request: Request,
  { params }: { params: Promise<{ contentId: string }> }
) {
  try {
    const { contentId } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { platforms } = body // Array of platform names: ['twitter', 'linkedin']

    if (!platforms || !Array.isArray(platforms) || platforms.length === 0) {
      return NextResponse.json({ error: 'At least one platform is required' }, { status: 400 })
    }

    // Get content
    const { data: content, error: contentError } = await supabase
      .from('content')
      .select('*, team_id')
      .eq('id', contentId)
      .single()

    if (contentError || !content) {
      return NextResponse.json({ error: 'Content not found' }, { status: 404 })
    }

    // Check permissions
    const { data: member } = await supabase
      .from('team_members')
      .select('role')
      .eq('team_id', content.team_id)
      .eq('user_id', user.id)
      .single()

    if (!member || !['OWNER', 'ADMIN', 'EDITOR'].includes(member.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    // Get connected platform accounts
    const { data: accounts } = await supabase
      .from('platform_accounts')
      .select('*')
      .eq('team_id', content.team_id)
      .in('platform', platforms)

    if (!accounts || accounts.length === 0) {
      return NextResponse.json(
        { error: 'No connected accounts for the specified platforms' },
        { status: 400 }
      )
    }

    const results: Array<{
      platform: string
      success: boolean
      postId?: string
      error?: string
    }> = []

    // Generate text content from blocks
    const textContent = content.blocks
      .map((block: { content: string }) => block.content)
      .filter(Boolean)
      .join('\n\n')

    // Publish to each platform
    for (const account of accounts) {
      try {
        let postId: string | undefined

        if (account.platform === 'twitter') {
          postId = await publishToTwitter(account, textContent)
        } else if (account.platform === 'linkedin') {
          postId = await publishToLinkedIn(account, textContent)
        }

        // Record the publication
        await supabase.from('content_schedule').insert({
          content_id: contentId,
          platform_account_id: account.id,
          platform_post_id: postId,
          scheduled_at: new Date().toISOString(),
          status: 'SENT',
        })

        results.push({
          platform: account.platform,
          success: true,
          postId,
        })
      } catch (error) {
        console.error(`Error publishing to ${account.platform}:`, error)
        results.push({
          platform: account.platform,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        })
      }
    }

    // Update content status
    await supabase
      .from('content')
      .update({
        status: 'PUBLISHED',
        published_at: new Date().toISOString(),
      })
      .eq('id', contentId)

    const successCount = results.filter(r => r.success).length

    return NextResponse.json({
      data: {
        results,
        summary: {
          total: results.length,
          successful: successCount,
          failed: results.length - successCount,
        },
      },
    })
  } catch (error) {
    console.error('Error in POST /api/content/[id]/publish:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// Twitter/X posting helper
async function publishToTwitter(
  account: { account_id: string; access_token: string },
  text: string
): Promise<string> {
  // Truncate to Twitter's character limit
  const tweetText = text.slice(0, 280)

  const response = await fetch('https://api.twitter.com/2/tweets', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${account.access_token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      text: tweetText,
    }),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.detail || 'Failed to post to Twitter')
  }

  const data = await response.json()
  return data.data.id
}

// LinkedIn posting helper
async function publishToLinkedIn(
  account: { account_id: string; access_token: string },
  text: string
): Promise<string> {
  const response = await fetch(`https://api.linkedin.com/v2/ugcPosts`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${account.access_token}`,
      'Content-Type': 'application/json',
      'X-Restli-Protocol-Version': '2.0.0',
    },
    body: JSON.stringify({
      author: `urn:li:person:${account.account_id}`,
      lifecycleState: 'PUBLISHED',
      specificContent: {
        'com.linkedin.ugc.ShareContent': {
          shareCommentary: {
            text: text.slice(0, 3000), // LinkedIn's limit
          },
          shareMediaCategory: 'NONE',
        },
      },
      visibility: {
        'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC',
      },
    }),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.message || 'Failed to post to LinkedIn')
  }

  const data = await response.json()
  return data.id
}

// GET /api/content/[id]/publish - Get publish status
export async function GET(
  request: Request,
  { params }: { params: Promise<{ contentId: string }> }
) {
  try {
    const { contentId } = await params
    const supabase = await createClient()

    // Get publish history
    const { data: schedule } = await supabase
      .from('content_schedule')
      .select('*')
      .eq('content_id', contentId)
      .order('scheduled_at', { ascending: false })

    // Get connected platforms
    const { data: content } = await supabase
      .from('content')
      .select('team_id, status, published_at')
      .eq('id', contentId)
      .single()

    const { data: accounts } = await supabase
      .from('platform_accounts')
      .select('platform, account_name')
      .eq('team_id', content?.team_id)

    return NextResponse.json({
      data: {
        status: content?.status,
        publishedAt: content?.published_at,
        connectedPlatforms: accounts?.map(a => a.platform) || [],
        publishHistory: schedule || [],
      },
    })
  } catch (error) {
    console.error('Error in GET /api/content/[id]/publish:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}