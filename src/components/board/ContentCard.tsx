'use client'

import { useMemo, useState } from 'react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { getBlockPreview } from '@/lib/contentText'
import { getTicketKey, inferTitleFromContent } from '@/lib/ticketPresentation'
import { useContentStore } from '@/stores'
import {
  Eye,
  Clock,
  MoreHorizontal,
  CheckCircle,
  FileText,
  Lightbulb,
  type LucideIcon,
} from 'lucide-react'
import { formatDistanceToNow } from '@/lib/utils'
import type { Content } from '@/types'

interface ContentCardProps {
  content: Content
  onClick?: () => void
  onStatusChange?: (contentId: string, newStatus: Content['status']) => void
  onConvertIdea?: (contentId: string) => void
  onOpenLinkedIdea?: (ideaId: string) => void
  onOpenLinkedPost?: (postId: string) => void
}

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: LucideIcon }> = {
  DRAFT: { label: 'Draft', color: 'bg-muted text-muted-foreground', icon: FileText },
  IN_REVIEW: { label: 'In Review', color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300', icon: Eye },
  APPROVED: { label: 'Approved', color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300', icon: CheckCircle },
  SCHEDULED: { label: 'Scheduled', color: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300', icon: Clock },
  PUBLISHED: { label: 'Shared', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300', icon: CheckCircle },
  ARCHIVED: { label: 'Archived', color: 'bg-muted text-muted-foreground', icon: FileText },
}

export function ContentCard({
  content,
  onClick,
  onStatusChange,
  onConvertIdea,
  onOpenLinkedIdea,
  onOpenLinkedPost,
}: ContentCardProps) {
  const [showHover, setShowHover] = useState(false)
  const allContents = useContentStore((state) => state.contents)

  const itemType = content.item_type || 'POST'
  const isIdea = itemType === 'IDEA'
  const isConvertedIdea = isIdea && content.idea_state === 'CONVERTED'
  const hasSourceIdea = !isIdea && !!content.source_idea_id
  const title = inferTitleFromContent(content)
  const ticketKey = useMemo(() => getTicketKey(content.id, allContents), [content.id, allContents])
  const preview = getBlockPreview(content.blocks)
  const statusConfig = STATUS_CONFIG[content.status] || STATUS_CONFIG.DRAFT
  const assignedUser = content.assignedTo || content.createdBy
  const ownerUser = content.assignedTo || null
  const creatorUser = content.createdBy || null
  const writerUser = content.writer || ownerUser || creatorUser || null
  const ownerName = assignedUser?.name || assignedUser?.email || null
  const createdAt = formatDistanceToNow(content.created_at)
  const latestUpdater = content.latest_activity?.user?.name || content.latest_activity?.user?.email || null
  const canChangeStatus = !isIdea && !!onStatusChange
  const linkedPostTicketKey = useMemo(() => {
    if (!content.converted_post_id) return null
    return getTicketKey(content.converted_post_id, allContents)
  }, [content.converted_post_id, allContents])
  const ideaStageLabel =
    content.idea_state === 'ARCHIVED'
      ? 'ARCHIVED'
      : content.idea_state === 'CONVERTED'
        ? 'CONVERTED'
        : 'IDEA INBOX'
  const platformLabel = useMemo(() => {
    if (!content.platforms?.length) return null
    return content.platforms.slice(0, 2).map((p) => p.platform).join(' · ')
  }, [content.platforms])

  const handlePrimaryOpen = (event?: { preventDefault: () => void; stopPropagation: () => void }) => {
    event?.preventDefault()
    event?.stopPropagation()
    onClick?.()
  }

  const renderRole = (label: 'O' | 'C' | 'W', user: typeof ownerUser) => (
    <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground">
      <span className="font-medium text-foreground/80">{label}:</span>
      {user ? (
        <Avatar className="h-4 w-4 border border-border/80">
          <AvatarImage src={user.avatar_url || undefined} />
          <AvatarFallback className="text-[9px]">
            {(user.name || user.email || '?').charAt(0).toUpperCase()}
          </AvatarFallback>
        </Avatar>
      ) : (
        <span className="text-[10px] text-muted-foreground">-</span>
      )}
    </span>
  )

  return (
    <div
      className={cn(
        'collab-card group relative cursor-pointer overflow-hidden rounded-md border border-border bg-card p-2.5 transition-colors hover:border-border hover:bg-accent/20'
      )}
      onMouseEnter={() => setShowHover(true)}
      onMouseLeave={() => setShowHover(false)}
      onClick={onClick}
    >
      <div className="space-y-3">
        {/* Card Header */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="rounded bg-muted px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-wide text-muted-foreground">
                {ticketKey}
              </span>
              <span
                className={cn(
                  'text-[9px] px-1.5 py-0.5 rounded uppercase tracking-wide',
                  isIdea ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300' : 'bg-muted text-muted-foreground'
                )}
              >
                {isIdea ? 'Idea' : 'Post'}
              </span>
            </div>
            <h4 className="mt-1 text-sm font-medium leading-tight text-foreground truncate pr-2">{title}</h4>
            {(ownerName || latestUpdater || isConvertedIdea || hasSourceIdea) ? (
              <p className="mt-1 text-[10px] text-muted-foreground truncate">
                {ownerName ? `Owner ${ownerName}` : ''}
                {ownerName && latestUpdater ? ' · ' : ''}
                {latestUpdater ? `Updated by ${latestUpdater}` : ''}
                {(ownerName || latestUpdater) && (isConvertedIdea || hasSourceIdea) ? ' · ' : ''}
                {isConvertedIdea ? 'Linked post' : hasSourceIdea ? 'From idea' : ''}
              </p>
            ) : null}
          </div>
          <div className="flex items-center gap-1 opacity-70">
            <Button
              variant="ghost"
              className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground"
              onClick={handlePrimaryOpen}
            >
              <MoreHorizontal className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>

        {/* Content Preview */}
        {preview && (
          <div className="text-[11px] text-muted-foreground line-clamp-2">
            {preview}
          </div>
        )}

        {platformLabel ? <div className="text-[10px] text-muted-foreground">{platformLabel}</div> : null}

        {/* Footer */}
        <div className="flex items-center justify-between pt-1">
          <div className="flex items-center gap-2">
            {/* Status Badge */}
            {isIdea ? (
              <Badge variant="outline" className="h-5 rounded border-0 bg-amber-100 px-1.5 text-[10px] text-amber-700 dark:bg-amber-950/40 dark:text-amber-300">
                <Lightbulb className="h-2.5 w-2.5 mr-1" />
                {ideaStageLabel}
              </Badge>
            ) : (
              <>
                <Badge variant="outline" className={cn(statusConfig.color, 'h-5 rounded border-0 px-1.5 text-[10px]')}>
                  <statusConfig.icon className="h-2.5 w-2.5 mr-1" />
                  {statusConfig.label}
                </Badge>
                {canChangeStatus ? (
                  <select
                    className="h-5 rounded border border-border bg-card px-1 text-[10px] text-muted-foreground"
                    value={content.status}
                    onClick={(event) => {
                      event.preventDefault()
                      event.stopPropagation()
                    }}
                    onChange={(event) =>
                      onStatusChange?.(content.id, event.target.value as Content['status'])
                    }
                  >
                    <option value="DRAFT">Draft</option>
                    <option value="IN_REVIEW">In Review</option>
                    <option value="APPROVED">Approved</option>
                    <option value="SCHEDULED">Scheduled</option>
                    <option value="PUBLISHED">Shared</option>
                    <option value="ARCHIVED">Archived</option>
                  </select>
                ) : null}
              </>
            )}

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

        <div className={cn('flex items-center justify-between gap-1 border-t border-border/80 pt-1', showHover ? 'opacity-100' : 'opacity-70 transition-opacity')}>
          <div className="flex items-center gap-2">
            {renderRole('O', ownerUser)}
            {renderRole('C', creatorUser)}
            {renderRole('W', writerUser)}
          </div>
          <div className="flex items-center gap-1">
          {isIdea && !isConvertedIdea && onConvertIdea ? (
            <Button
              variant="ghost"
              className="h-6 px-1.5 text-[11px] text-amber-700 hover:text-amber-600 dark:text-amber-300 dark:hover:text-amber-200"
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
              className="h-5 rounded border border-emerald-200/70 bg-emerald-50/70 px-1.5 text-[10px] font-medium text-emerald-800 hover:bg-emerald-100/70 dark:border-emerald-900/70 dark:bg-emerald-950/40 dark:text-emerald-300 dark:hover:bg-emerald-900/50"
              onClick={(event) => {
                event.preventDefault()
                event.stopPropagation()
                onOpenLinkedPost(content.converted_post_id as string)
              }}
            >
              {linkedPostTicketKey || 'POST'}
            </Button>
          ) : null}
          {hasSourceIdea && content.source_idea_id && onOpenLinkedIdea ? (
            <Button
              variant="ghost"
              className="h-6 px-1.5 text-[11px] text-blue-700 hover:text-blue-600 dark:text-blue-300 dark:hover:text-blue-200"
              onClick={(event) => {
                event.preventDefault()
                event.stopPropagation()
                onOpenLinkedIdea(content.source_idea_id as string)
              }}
            >
              Open Idea
            </Button>
          ) : null}
          </div>
        </div>
      </div>
    </div>
  )
}
