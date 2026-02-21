// Publish content to a specific platform
// POST /api/publish/[platform]

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { postToTwitter, postThreadToTwitter } from '@/lib/platforms/twitter'
import { postToLinkedIn, postArticleToLinkedIn } from '@/lib/platforms/linkedin'

type TeamMemberRow = { user_id: string }
type ContentBlockRow = {
  type?: string
  content?: {
    text?: string
    tweets?: string[]
    title?: string
    description?: string
    url?: string
    thumbnailUrl?: string
    [key: string]: unknown
  }
}

type PublishResult = { success: boolean; error?: string; data?: { id?: string } }

export async function POST(
  request: Request,
  { params }: { params: Promise<{ platform: string }> }
) {
  const { platform } = await params

  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { contentId, platformAccountId } = body

    if (!contentId || !platformAccountId) {
      return NextResponse.json(
        { error: 'contentId and platformAccountId are required' },
        { status: 400 }
      )
    }

    // Fetch content
    const { data: content, error: contentError } = await supabase
      .from('content')
      .select('*, blocks, team:teams(id, members:team_members(user_id))')
      .eq('id', contentId)
      .single()

    if (contentError || !content) {
      return NextResponse.json({ error: 'Content not found' }, { status: 404 })
    }

    // Verify user has access to the team
    const hasAccess = content.team.members.some(
      (m: TeamMemberRow) => m.user_id === user.id
    )

    if (!hasAccess) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // Fetch platform account
    const { data: platformAccount, error: platformError } = await supabase
      .from('platform_accounts')
      .select('*')
      .eq('id', platformAccountId)
      .eq('team_id', content.team_id)
      .single()

    if (platformError || !platformAccount) {
      return NextResponse.json({ error: 'Platform account not found' }, { status: 404 })
    }

    // Parse blocks
    const blocks = typeof content.blocks === 'string'
      ? (JSON.parse(content.blocks) as ContentBlockRow[])
      : ((content.blocks || []) as ContentBlockRow[])

    // Build post based on platform
    let result: PublishResult

    switch (platform.toLowerCase()) {
      case 'twitter': {
        // Extract tweets from blocks
        const threadTweets = blocks
          .filter((b) => b.type === 'thread')
          .flatMap((b) => b.content?.tweets || [])

        const textBlock = blocks.find((b) => b.type === 'text')
        if (textBlock && !threadTweets.length) {
          threadTweets.push(textBlock.content?.text || '')
        }

        if (threadTweets.length > 1) {
          result = await postThreadToTwitter(
            content.team_id,
            platformAccountId,
            threadTweets
          )
        } else if (threadTweets.length === 1) {
          result = await postToTwitter(content.team_id, platformAccountId, {
            text: threadTweets[0],
          })
        } else {
          result = { success: false, error: 'No content to post' }
        }
        break
      }

      case 'linkedin': {
        const textBlock = blocks.find((b) => b.type === 'text')
        const linkBlock = blocks.find((b) => b.type === 'link')
        const imageBlock = blocks.find((b) => b.type === 'image')

        if (linkBlock) {
          result = await postArticleToLinkedIn(content.team_id, platformAccountId, {
            title: linkBlock.content?.title || '',
            description: linkBlock.content?.description || '',
            url: linkBlock.content?.url || '',
            thumbnailUrl: linkBlock.content?.thumbnailUrl,
          })
        } else if (textBlock) {
          result = await postToLinkedIn(content.team_id, platformAccountId, {
            text: textBlock.content?.text || '',
            shareMediaCategory: imageBlock ? 'IMAGE' : 'NONE',
            mediaUrl: imageBlock?.content?.url,
          })
        } else {
          result = { success: false, error: 'No content to post' }
        }
        break
      }

      default:
        return NextResponse.json(
          { error: `Unsupported platform: ${platform}` },
          { status: 400 }
        )
    }

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 500 })
    }

    // Update content status and add to schedules
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
      metadata: { source: 'publish', platform },
    })

    // Create schedule record
    await supabase.from('content_schedule').insert({
      content_id: contentId,
      platform_account_id: platformAccountId,
      scheduled_at: new Date().toISOString(),
      status: 'SENT',
    })

    return NextResponse.json({
      success: true,
      platformPostId: result.data?.id,
      publishedAt: new Date().toISOString(),
    })
  } catch (error) {
    console.error(`Error publishing to ${platform}:`, error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
