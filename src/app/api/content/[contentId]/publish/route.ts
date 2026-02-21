import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { postToTwitter, postThreadToTwitter } from '@/lib/platforms/twitter'
import { postToLinkedIn } from '@/lib/platforms/linkedin'

type ContentBlock = {
  type?: string
  content?: unknown
}

type PublishResult = {
  platform: string
  accountId?: string
  accountName?: string | null
  success: boolean
  postId?: string
  error?: string
}

const PUBLISHABLE_PLATFORMS = new Set(['twitter', 'linkedin'])

function normalizeRequestedPlatforms(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return Array.from(
    new Set(
      value
        .filter((item): item is string => typeof item === 'string')
        .map((item) => item.trim().toLowerCase())
        .filter(Boolean)
    )
  )
}

function extractTweetTexts(blocks: ContentBlock[]): string[] {
  const tweets: string[] = []

  for (const block of blocks) {
    if (!block || typeof block !== 'object') continue

    if (block.type === 'thread' && block.content && typeof block.content === 'object') {
      const threadContent = block.content as { tweets?: unknown }
      if (Array.isArray(threadContent.tweets)) {
        for (const entry of threadContent.tweets) {
          if (typeof entry === 'string' && entry.trim()) tweets.push(entry.trim())
          if (entry && typeof entry === 'object' && 'text' in entry) {
            const text = (entry as { text?: unknown }).text
            if (typeof text === 'string' && text.trim()) tweets.push(text.trim())
          }
        }
      }
    }

    if (block.type === 'text' && block.content && typeof block.content === 'object') {
      const text = (block.content as { text?: unknown }).text
      if (typeof text === 'string' && text.trim()) tweets.push(text.trim())
    }
  }

  return tweets
}

function extractLinkedInText(blocks: ContentBlock[]): string {
  const parts: string[] = []

  for (const block of blocks) {
    if (!block || typeof block !== 'object') continue
    if (!block.content || typeof block.content !== 'object') continue

    if (block.type === 'text') {
      const text = (block.content as { text?: unknown }).text
      if (typeof text === 'string' && text.trim()) parts.push(text.trim())
      continue
    }

    if (block.type === 'thread') {
      const thread = block.content as { tweets?: unknown }
      if (!Array.isArray(thread.tweets)) continue
      for (const entry of thread.tweets) {
        if (typeof entry === 'string' && entry.trim()) parts.push(entry.trim())
        if (entry && typeof entry === 'object' && 'text' in entry) {
          const text = (entry as { text?: unknown }).text
          if (typeof text === 'string' && text.trim()) parts.push(text.trim())
        }
      }
    }
  }

  return parts.join('\n\n').trim()
}

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
    const requestedPlatforms = normalizeRequestedPlatforms(body?.platforms)

    if (requestedPlatforms.length === 0) {
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
      .in('platform', requestedPlatforms)

    const accountsByPlatform = new Map<string, Array<Record<string, unknown>>>()
    for (const account of accounts || []) {
      const platform = String(account.platform || '')
      if (!accountsByPlatform.has(platform)) accountsByPlatform.set(platform, [])
      accountsByPlatform.get(platform)?.push(account as Record<string, unknown>)
    }

    const blocks = Array.isArray(content.blocks)
      ? (content.blocks as ContentBlock[])
      : []

    const results: PublishResult[] = []

    // Publish to each platform
    for (const platform of requestedPlatforms) {
      if (!PUBLISHABLE_PLATFORMS.has(platform)) {
        results.push({
          platform,
          success: false,
          error: 'Publishing is not implemented for this platform yet',
        })
        continue
      }

      const platformAccounts = accountsByPlatform.get(platform) || []
      if (platformAccounts.length === 0) {
        results.push({
          platform,
          success: false,
          error: 'No connected account for this platform',
        })
        continue
      }

      for (const account of platformAccounts) {
        const platformAccountId = String(account.id || '')
        const accountName = typeof account.account_name === 'string' ? account.account_name : null

        try {
          let postId: string | undefined

          if (platform === 'twitter') {
            const tweets = extractTweetTexts(blocks)
            if (!tweets.length) {
              results.push({
                platform,
                accountId: platformAccountId,
                accountName,
                success: false,
                error: 'No tweet content found to publish',
              })
              continue
            }

            const publishResult = tweets.length > 1
              ? await postThreadToTwitter(content.team_id, platformAccountId, tweets)
              : await postToTwitter(content.team_id, platformAccountId, { text: tweets[0] })

            if (!publishResult.success) {
              throw new Error(publishResult.error || 'Failed to post to X')
            }

            postId = publishResult.data?.id
          } else if (platform === 'linkedin') {
            const textContent = extractLinkedInText(blocks)
            if (!textContent) {
              results.push({
                platform,
                accountId: platformAccountId,
                accountName,
                success: false,
                error: 'No text content found to publish',
              })
              continue
            }

            const publishResult = await postToLinkedIn(content.team_id, platformAccountId, {
              text: textContent.slice(0, 3000),
              shareMediaCategory: 'NONE',
            })

            if (!publishResult.success) {
              throw new Error(publishResult.error || 'Failed to post to LinkedIn')
            }

            postId = publishResult.data?.id
          } else {
            results.push({
              platform,
              accountId: platformAccountId,
              accountName,
              success: false,
              error: 'Publishing is not implemented for this platform yet',
            })
            continue
          }

          await supabase.from('content_schedule').insert({
            content_id: contentId,
            platform_account_id: platformAccountId,
            platform_post_id: postId,
            scheduled_at: new Date().toISOString(),
            status: 'SENT',
          })

          results.push({
            platform,
            accountId: platformAccountId,
            accountName,
            success: true,
            postId,
          })
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error'
          console.error(`Error publishing to ${platform}:`, error)

          if (platformAccountId) {
            await supabase.from('content_schedule').insert({
              content_id: contentId,
              platform_account_id: platformAccountId,
              scheduled_at: new Date().toISOString(),
              status: 'FAILED',
              error_message: errorMessage,
            })
          }

          results.push({
            platform,
            accountId: platformAccountId || undefined,
            accountName,
            success: false,
            error: errorMessage,
          })
        }
      }
    }

    const successCount = results.filter(r => r.success).length

    if (successCount > 0) {
      await supabase
        .from('content')
        .update({
          status: 'PUBLISHED',
          published_at: new Date().toISOString(),
        })
        .eq('id', contentId)

      await supabase.from('content_activity').insert({
        content_id: contentId,
        team_id: content.team_id,
        user_id: user.id,
        action: 'STATUS_CHANGED',
        from_status: content.status,
        to_status: 'PUBLISHED',
        metadata: { source: 'publish' },
      })
    }

    return NextResponse.json({
      data: {
        results,
        summary: {
          requested: requestedPlatforms.length,
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
