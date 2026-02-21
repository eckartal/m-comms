// User & Team Types
export interface User {
  id: string
  email: string
  name: string | null
  avatar_url: string | null
  created_at: string
}

export interface Team {
  id: string
  name: string
  slug: string
  logo: string | null
  settings: TeamSettings
  created_at: string
}

export interface TeamSettings {
  default_platforms?: string[]
  timezone?: string
  working_hours?: {
    start: string
    end: string
  }
}

export interface TeamMember {
  id: string
  user_id: string
  team_id: string
  role: 'OWNER' | 'ADMIN' | 'EDITOR' | 'VIEWER'
  created_at: string
  user?: User
  team?: Team
}

// Content Types
export type ContentStatus =
  | 'DRAFT'
  | 'IN_REVIEW'
  | 'APPROVED'
  | 'SCHEDULED'
  | 'PUBLISHED'
  | 'ARCHIVED'

export type ContentItemType = 'IDEA' | 'POST'
export type IdeaState = 'INBOX' | 'SHAPING' | 'READY' | 'CONVERTED' | 'ARCHIVED'

export interface ContentBlock {
  id: string
  type:
    | 'text'
    | 'heading'
    | 'bullet_list'
    | 'numbered_list'
    | 'image'
    | 'code'
    | 'quote'
    | 'divider'
    | 'thread'
    | 'link'
    | 'video'
    | 'poll'
  content: unknown
  props?: Record<string, unknown>
}

export interface Content {
  id: string
  team_id: string
  item_type?: ContentItemType
  idea_state?: IdeaState | null
  source_idea_id?: string | null
  converted_post_id?: string | null
  converted_at?: string | null
  converted_by?: string | null
  title: string
  blocks: ContentBlock[]
  status: ContentStatus
  scheduled_at: string | null
  published_at: string | null
  platforms: PlatformConfig[]
  created_by: string
  assigned_to: string | null
  created_at: string
  updated_at: string
  share_token?: string | null
  share_settings?: ShareSettings | null
  createdBy?: User
  assignedTo?: User
  comments_count?: number
  views_count?: number
  activity_count?: number
  latest_activity?: {
    user?: {
      name?: string | null
      email?: string | null
    } | null
  } | null
}

export interface ShareSettings {
  allow_comments?: boolean
  allow_editing?: boolean
}

export interface PlatformConfig {
  platform:
    | 'twitter'
    | 'linkedin'
    | 'instagram'
    | 'tiktok'
    | 'youtube'
    | 'threads'
    | 'bluesky'
    | 'mastodon'
    | 'facebook'
  enabled: boolean
  text?: string
  media?: string[]
  thread_index?: number
}

// Scheduling Types
export interface ContentSchedule {
  id: string
  content_id: string
  platform_account_id: string
  scheduled_at: string
  status: 'PENDING' | 'SENT' | 'FAILED'
  platform_post_id?: string
  error_message?: string
}

export interface PlatformAccount {
  id: string
  team_id: string
  user_id: string
  platform: string
  account_id: string
  account_name: string | null
  avatar_url: string | null
  settings: Record<string, unknown>
}

// Template Types
export interface Template {
  id: string
  team_id: string
  name: string
  category: string | null
  blocks: ContentBlock[]
  is_public: boolean
  created_at: string
}

// Comment Types
export interface Comment {
  id: string
  content_id: string
  user_id: string
  parent_id: string | null
  text: string
  mentions: string[]
  resolved_at: string | null
  created_at: string
  user?: User
  replies?: Comment[]
}

// Analytics Types
export interface PostAnalytics {
  platform: string
  impressions: number
  engagements: number
  clicks: number
  shares: number
  comments: number
}

export interface TeamAnalytics {
  total_posts: number
  total_engagements: number
  top_performing_posts: Content[]
  weekly_growth: number
}

// Content Version Type
export interface ContentVersion {
  id: string
  content_id: string
  blocks: ContentBlock[]
  created_by: string
  created_at: string
  createdBy?: User
}

// Platform Types
export type PlatformType =
  | 'twitter'
  | 'linkedin'
  | 'instagram'
  | 'tiktok'
  | 'youtube'
  | 'threads'
  | 'bluesky'
  | 'mastodon'
  | 'facebook'

export interface PlatformStats {
  platform: PlatformType
  followers: number
  posts: number
  engagement: number
  growth: number
}
