import { createClient } from '@/lib/supabase/server'

export interface TwitterCredentials {
  accessToken: string
  accountId: string
}

export interface TwitterPost {
  text: string
}

export interface TwitterPostResult {
  id: string
  createdAt: string
}

type TwitterApiResponse = {
  data?: {
    id?: string
  }
  detail?: string
  title?: string
}

async function getTwitterCredentials(
  teamId: string,
  platformAccountId: string
): Promise<TwitterCredentials | null> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('platform_accounts')
    .select('access_token, account_id')
    .eq('id', platformAccountId)
    .eq('team_id', teamId)
    .eq('platform', 'twitter')
    .single()

  if (error || !data) {
    console.error('Error fetching Twitter credentials:', error)
    return null
  }

  return {
    accessToken: data.access_token,
    accountId: data.account_id,
  }
}

async function createTweet(
  accessToken: string,
  text: string,
  replyToTweetId?: string
): Promise<{ success: boolean; id?: string; error?: string }> {
  const payload: {
    text: string
    reply?: { in_reply_to_tweet_id: string }
  } = {
    text: text.slice(0, 280),
  }

  if (replyToTweetId) {
    payload.reply = { in_reply_to_tweet_id: replyToTweetId }
  }

  try {
    const response = await fetch('https://api.twitter.com/2/tweets', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    })

    const body = (await response.json().catch(() => ({}))) as TwitterApiResponse
    if (!response.ok) {
      return {
        success: false,
        error: body.detail || body.title || 'Failed to post to X',
      }
    }

    const id = body.data?.id
    if (!id) {
      return { success: false, error: 'X API did not return a post id' }
    }

    return { success: true, id }
  } catch (error) {
    console.error('Error posting to X:', error)
    return { success: false, error: 'Failed to connect to X API' }
  }
}

export async function postToTwitter(
  teamId: string,
  platformAccountId: string,
  post: TwitterPost
): Promise<{ success: boolean; data?: TwitterPostResult; error?: string }> {
  const credentials = await getTwitterCredentials(teamId, platformAccountId)
  if (!credentials) {
    return { success: false, error: 'X credentials not found' }
  }

  const result = await createTweet(credentials.accessToken, post.text)
  if (!result.success || !result.id) {
    return { success: false, error: result.error || 'Failed to post to X' }
  }

  return {
    success: true,
    data: {
      id: result.id,
      createdAt: new Date().toISOString(),
    },
  }
}

export async function postThreadToTwitter(
  teamId: string,
  platformAccountId: string,
  tweets: string[]
): Promise<{ success: boolean; data?: TwitterPostResult; error?: string }> {
  const credentials = await getTwitterCredentials(teamId, platformAccountId)
  if (!credentials) {
    return { success: false, error: 'X credentials not found' }
  }

  const normalized = tweets
    .map((tweet) => tweet.trim())
    .filter(Boolean)

  if (!normalized.length) {
    return { success: false, error: 'No tweets to publish' }
  }

  let firstTweetId: string | undefined
  let previousTweetId: string | undefined

  for (const tweet of normalized) {
    const result = await createTweet(credentials.accessToken, tweet, previousTweetId)
    if (!result.success || !result.id) {
      return {
        success: false,
        error: result.error || 'Failed to publish thread to X',
      }
    }

    if (!firstTweetId) {
      firstTweetId = result.id
    }
    previousTweetId = result.id
  }

  return {
    success: true,
    data: {
      id: firstTweetId || previousTweetId || '',
      createdAt: new Date().toISOString(),
    },
  }
}
