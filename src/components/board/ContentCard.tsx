'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { getBlockPreview, getContentTitle } from '@/lib/contentText'
import {
  MessageSquare,
  Eye,
  Clock,
  MoreHorizontal,
  CheckCircle,
  FileText,
  Share2,
  Edit,
  Lightbulb,
  type LucideIcon,
} from 'lucide-react'
import { formatDistanceToNow } from '@/lib/utils'
import type { Content } from '@/types'

interface ContentCardProps {
  content: Content
  onClick?: () => void
  onConvertIdea?: (contentId: string) => void
  onOpenLinkedIdea?: (ideaId: string) => void
  onOpenLinkedPost?: (postId: string) => void
}

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: LucideIcon }> = {
  DRAFT: { label: 'Draft', color: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300', icon: FileText },
  IN_REVIEW: { label: 'In Review', color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400', icon: Eye },
  APPROVED: { label: 'Approved', color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400', icon: CheckCircle },
  SCHEDULED: { label: 'Scheduled', color: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400', icon: Clock },
  PUBLISHED: { label: 'Shared', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400', icon: CheckCircle },
  ARCHIVED: { label: 'Archived', color: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300', icon: FileText },
}

const PLATFORM_ICONS: Record<string, string> = {
  twitter: '𝕏',
  linkedin: 'in',
  instagram: '📷',
  blog: '📝',
}

export function ContentCard({
  content,
  onClick,
  onConvertIdea,
  onOpenLinkedIdea,
  onOpenLinkedPost,
}: ContentCardProps) {
  const [showHover, setShowHover] = useState(false)

  const itemType = content.item_type || 'POST'
  const isIdea = itemType === 'IDEA'
  const isConvertedIdea = isIdea && content.idea_state === 'CONVERTED'
  const hasSourceIdea = !isIdea && !!content.source_idea_id
  const title = getContentTitle(content.title)
  const preview = getBlockPreview(content.blocks)
  const statusConfig = STATUS_CONFIG[content.status] || STATUS_CONFIG.DRAFT
  const assignedUser = content.assignedTo || content.createdBy
  const ownerName = assignedUser?.name || assignedUser?.email || null
  const createdAt = formatDistanceToNow(content.created_at)
  const latestUpdater = content.latest_activity?.user?.name || content.latest_activity?.user?.email || null
  const activityCount = content.activity_count || 0

  return (
    <Card
      className={cn(
        'bg-[#0a0a0a] border-[#262626] rounded-lg p-3 hover:border-[#3d3d3d] transition-colors cursor-pointer group relative overflow-hidden',
        isIdea ? 'border-amber-900/50' : 'border-blue-900/50'
      )}
      onMouseEnter={() => setShowHover(true)}
      onMouseLeave={() => setShowHover(false)}
      onClick={onClick}
    >
      <span
        className={cn(
          'absolute left-0 top-0 h-full w-[3px]',
          isIdea ? 'bg-amber-500/70' : 'bg-blue-500/70'
        )}
      />
      <CardContent className="p-0 space-y-3">
        {/* Card Header */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span
                className={cn(
                  'text-[9px] px-1.5 py-0.5 rounded uppercase tracking-wide',
                  isIdea ? 'bg-amber-950/50 text-amber-300' : 'bg-blue-950/50 text-blue-300'
                )}
              >
                {isIdea ? 'Idea' : 'Post'}
              </span>
              <h4 className="text-sm font-medium text-foreground truncate pr-2">{title}</h4>
              {ownerName && (
                <span className="text-[10px] text-muted-foreground bg-gray-900 px-2 py-0.5 rounded-full truncate max-w-[120px]">
                  Owner {ownerName}
                </span>
              )}
              {latestUpdater && (
                <span className="text-[10px] text-muted-foreground bg-gray-900 px-2 py-0.5 rounded-full truncate max-w-[140px]">
                  Updated by {latestUpdater}
                </span>
              )}
              {isConvertedIdea && content.converted_post_id ? (
                <span className="text-[10px] text-emerald-300 bg-emerald-950/40 px-2 py-0.5 rounded-full">
                  Linked Post
                </span>
              ) : null}
              {hasSourceIdea ? (
                <span className="text-[10px] text-blue-300 bg-blue-950/40 px-2 py-0.5 rounded-full">
                  From Idea
                </span>
              ) : null}
            </div>
          </div>
          <div className="flex items-center gap-1">
            <Button variant="ghost" className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground">
              <MoreHorizontal className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>

        {/* Content Preview */}
        {preview && (
          <div className="text-xs text-muted-foreground line-clamp-2">
            {preview}
          </div>
        )}

        {/* Platforms */}
        {content.platforms.length > 0 && (
          <div className="flex items-center gap-1.5">
            {content.platforms.slice(0, 3).map((platform, i) => (
              <span
                key={i}
                className="flex items-center justify-center w-5 h-5 rounded bg-gray-900 text-[9px] font-medium text-muted-foreground"
              >
                {PLATFORM_ICONS[platform.platform] || platform.platform}
              </span>
            ))}
            {content.platforms.length > 3 && (
              <span className="text-[9px] text-muted-foreground">+{content.platforms.length - 3}</span>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between pt-1">
          <div className="flex items-center gap-2">
            {/* Status Badge */}
            {isIdea ? (
              <Badge variant="outline" className="border-0 text-[10px] bg-amber-950/40 text-amber-300">
                <Lightbulb className="h-2.5 w-2.5 mr-1" />
                {content.idea_state || 'INBOX'}
              </Badge>
            ) : (
              <Badge variant="outline" className={cn(statusConfig.color, 'border-0 text-[10px]')}>
                <statusConfig.icon className="h-2.5 w-2.5 mr-1" />
                {statusConfig.label}
              </Badge>
            )}

            {/* Date */}
            <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
              <Clock className="h-3 w-3" />
              <span>{createdAt}</span>
            </div>
          </div>

          {/* Avatar */}
          {assignedUser && (
            <div className="flex items-center gap-1.5">
              <Avatar className="h-5 w-5">
                <AvatarImage src={assignedUser.avatar_url || undefined} />
                <AvatarFallback>{assignedUser.name?.charAt(0) || 'U'}</AvatarFallback>
              </Avatar>
              {ownerName && (
                <span className="text-[10px] text-muted-foreground max-w-[90px] truncate">
                  {ownerName}
                </span>
              )}
            </div>
          )}
        </div>

        {/* Hover Actions */}
        <div className={cn('flex items-center gap-1 pt-1 border-t border-gray-900', showHover ? 'opacity-100' : 'opacity-0 transition-opacity')}>
          <Button variant="ghost" className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground">
            <MessageSquare className="h-3.5 w-3.5 mr-1" />
            {content.comments_count || 0}
          </Button>
          {activityCount > 0 && (
            <span className="text-[10px] text-muted-foreground bg-gray-900 px-2 py-0.5 rounded-full">
              {activityCount} updates
            </span>
          )}
          <Button variant="ghost" className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground">
            <Eye className="h-3.5 w-3.5 mr-1" />
            {content.views_count || 0}
          </Button>
          <div className="flex-1" />
          {isIdea && !isConvertedIdea && onConvertIdea ? (
            <Button
              variant="ghost"
              className="h-7 px-2 text-xs text-amber-300 hover:text-amber-200"
              onClick={(event) => {
                event.preventDefault()
                event.stopPropagation()
                onConvertIdea(content.id)
              }}
            >
              Convert
            </Button>
          ) : null}
          {isConvertedIdea && content.converted_post_id && onOpenLinkedPost ? (
            <Button
              variant="ghost"
              className="h-7 px-2 text-xs text-emerald-300 hover:text-emerald-200"
              onClick={(event) => {
                event.preventDefault()
                event.stopPropagation()
                onOpenLinkedPost(content.converted_post_id as string)
              }}
            >
              Open Post
            </Button>
          ) : null}
          {hasSourceIdea && content.source_idea_id && onOpenLinkedIdea ? (
            <Button
              variant="ghost"
              className="h-7 px-2 text-xs text-blue-300 hover:text-blue-200"
              onClick={(event) => {
                event.preventDefault()
                event.stopPropagation()
                onOpenLinkedIdea(content.source_idea_id as string)
              }}
            >
              Open Idea
            </Button>
          ) : null}
          <Button variant="ghost" className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground">
            <Share2 className="h-3.5 w-3.5 mr-1" />
            Share
          </Button>
          {!isIdea ? (
            <Link href={`/${content.team_id}/content/${content.id}`}>
              <Button variant="ghost" className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground">
                <Edit className="h-3.5 w-3.5 mr-1" />
                Edit
              </Button>
            </Link>
          ) : (
            <Button
              variant="ghost"
              className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
              onClick={(event) => {
                event.preventDefault()
                event.stopPropagation()
                onClick?.()
              }}
            >
              <Edit className="h-3.5 w-3.5 mr-1" />
              Open Idea
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
