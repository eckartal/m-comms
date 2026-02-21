// LinkedIn Platform Integration
// Documentation: https://learn.microsoft.com/en-us/linkedin/

import { createClient } from '@/lib/supabase/server'

export interface LinkedInCredentials {
  accessToken: string
  personId: string
  organizationId?: string
}

export interface LinkedInPost {
  text: string
  shareMediaCategory?: 'NONE' | 'ARTICLE' | 'IMAGE'
  mediaUrl?: string
  mediaTitle?: string
  mediaDescription?: string
}

export interface LinkedInPostResult {
  id: string
  createdAt: string
}

type LinkedInShareMedia = {
  status: 'READY'
  originalUrl: string
  title: string
  description: string
}

type LinkedInShareContent = {
  shareCommentary: { text: string }
  shareMediaCategory: 'NONE' | 'ARTICLE' | 'IMAGE'
  media?: LinkedInShareMedia[]
}

export async function getLinkedInCredentials(
  teamId: string,
  platformAccountId: string
): Promise<LinkedInCredentials | null> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('platform_accounts')
    .select('access_token, account_id, settings')
    .eq('id', platformAccountId)
    .eq('team_id', teamId)
    .eq('platform', 'linkedin')
    .single()

  if (error || !data) {
    console.error('Error fetching LinkedIn credentials:', error)
    return null
  }

  return {
    accessToken: data.access_token,
    personId: data.account_id,
  }
}

export async function postToLinkedIn(
  teamId: string,
  platformAccountId: string,
  post: LinkedInPost
): Promise<{ success: boolean; data?: LinkedInPostResult; error?: string }> {
  const credentials = await getLinkedInCredentials(teamId, platformAccountId)

  if (!credentials) {
    return { success: false, error: 'LinkedIn credentials not found' }
  }

  try {
    const shareContent: LinkedInShareContent = {
      shareCommentary: {
        text: post.text,
      },
      shareMediaCategory: post.shareMediaCategory || 'NONE',
    }

    if (post.shareMediaCategory === 'ARTICLE' && post.mediaUrl) {
      shareContent.media = [
        {
          status: 'READY',
          originalUrl: post.mediaUrl,
          title: post.mediaTitle || '',
          description: post.mediaDescription || '',
        },
      ]
    }

    // LinkedIn UGC Posts API
    const response = await fetch(
      `https://api.linkedin.com/v2/ugcPosts?author=urn:li:person:${credentials.personId}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${credentials.accessToken}`,
          'X-Restli-Protocol-Version': '2.0.0',
        },
        body: JSON.stringify({
          author: `urn:li:person:${credentials.personId}`,
          lifecycleState: 'PUBLISHED',
          specificContent: {
            'com.linkedin.ugc.ShareContent': shareContent,
          },
          visibility: {
            'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC',
          },
        }),
      }
    )

    if (!response.ok) {
      const errorData = await response.json()
      console.error('LinkedIn API error:', errorData)
      return {
        success: false,
        error: errorData.message || errorData.error || 'Failed to post to LinkedIn',
      }
    }

    const data = await response.json()

    return {
      success: true,
      data: {
        id: data.id,
        createdAt: new Date().toISOString(),
      },
    }
  } catch (error) {
    console.error('Error posting to LinkedIn:', error)
    return { success: false, error: 'Failed to connect to LinkedIn API' }
  }
}

export async function postArticleToLinkedIn(
  teamId: string,
  platformAccountId: string,
  article: {
    title: string
    description: string
    url: string
    thumbnailUrl?: string
  }
): Promise<{ success: boolean; data?: LinkedInPostResult; error?: string }> {
  const credentials = await getLinkedInCredentials(teamId, platformAccountId)

  if (!credentials) {
    return { success: false, error: 'LinkedIn credentials not found' }
  }

  try {
    const response = await fetch(
      `https://api.linkedin.com/v2/ugcPosts?author=urn:li:person:${credentials.personId}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${credentials.accessToken}`,
          'X-Restli-Protocol-Version': '2.0.0',
        },
        body: JSON.stringify({
          author: `urn:li:person:${credentials.personId}`,
          lifecycleState: 'PUBLISHED',
          specificContent: {
            'com.linkedin.ugc.ShareContent': {
              shareCommentary: {
                text: `${article.title}\n\n${article.description}`,
              },
              shareMediaCategory: 'ARTICLE',
              media: [
                {
                  status: 'READY',
                  originalUrl: article.url,
                  title: article.title,
                  description: article.description,
                },
              ],
            },
          },
          visibility: {
            'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC',
          },
        }),
      }
    )

    if (!response.ok) {
      const errorData = await response.json()
      return {
        success: false,
        error: errorData.message || errorData.error || 'Failed to post article to LinkedIn',
      }
    }

    const data = await response.json()

    return {
      success: true,
      data: {
        id: data.id,
        createdAt: new Date().toISOString(),
      },
    }
  } catch (error) {
    console.error('Error posting article to LinkedIn:', error)
    return { success: false, error: 'Failed to post article to LinkedIn' }
  }
}

export async function deleteLinkedInPost(
  teamId: string,
  platformAccountId: string,
  postId: string
): Promise<{ success: boolean; error?: string }> {
  const credentials = await getLinkedInCredentials(teamId, platformAccountId)

  if (!credentials) {
    return { success: false, error: 'LinkedIn credentials not found' }
  }

  try {
    const response = await fetch(`https://api.linkedin.com/v2/ugcPosts/${postId}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${credentials.accessToken}`,
      },
    })

    if (!response.ok && response.status !== 204) {
      const errorData = await response.json()
      return {
        success: false,
        error: errorData.message || errorData.error || 'Failed to delete LinkedIn post',
      }
    }

    return { success: true }
  } catch (error) {
    console.error('Error deleting LinkedIn post:', error)
    return { success: false, error: 'Failed to delete LinkedIn post' }
  }
}
