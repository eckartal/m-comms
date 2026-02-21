'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import {
  MessageSquare,
  Eye,
  Clock,
  User,
  MoreHorizontal,
  Calendar,
  CheckCircle,
  FileText,
  Share2,
  Edit,
  ChevronRight,
} from 'lucide-react'
import { formatDistanceToNow } from '@/lib/utils'
import type { Content } from '@/types'

interface ContentCardProps {
  content: Content
  onClick?: () => void
}

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: any }> = {
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

export function ContentCard({ content, onClick }: ContentCardProps) {
  const [showHover, setShowHover] = useState(false)

  const statusConfig = STATUS_CONFIG[content.status] || STATUS_CONFIG.DRAFT
  const assignedUser = content.assignedTo || content.createdBy
  const ownerName = assignedUser?.name || assignedUser?.email || null
  const createdAt = formatDistanceToNow(content.created_at)

  return (
    <Card
      className="bg-[#0a0a0a] border-[#262626] rounded-lg p-3 hover:border-[#3d3d3d] transition-colors cursor-pointer group"
      onMouseEnter={() => setShowHover(true)}
      onMouseLeave={() => setShowHover(false)}
      onClick={onClick}
    >
      <CardContent className="p-0 space-y-3">
        {/* Card Header */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h4 className="text-sm font-medium text-foreground truncate pr-2">{content.title}</h4>
              {ownerName && (
                <span className="text-[10px] text-muted-foreground bg-gray-900 px-2 py-0.5 rounded-full truncate max-w-[120px]">
                  Owner {ownerName}
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1">
            <Button variant="ghost" className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground">
              <MoreHorizontal className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>

        {/* Content Preview */}
        {content.blocks.length > 0 && (
          <div className="text-xs text-muted-foreground line-clamp-2">
            {content.blocks[0].type === 'heading' ? content.blocks[0].content : content.blocks[0].content}
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
            <Badge variant="outline" className={cn(statusConfig.color, 'border-0 text-[10px]')}>
              <statusConfig.icon className="h-2.5 w-2.5 mr-1" />
              {statusConfig.label}
            </Badge>

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
          <Button variant="ghost" className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground">
            <Eye className="h-3.5 w-3.5 mr-1" />
            {content.views_count || 0}
          </Button>
          <div className="flex-1" />
          <Button variant="ghost" className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground">
            <Share2 className="h-3.5 w-3.5 mr-1" />
            Share
          </Button>
          <Link href={`/${content.team_id}/content/${content.id}`}>
            <Button variant="ghost" className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground">
              <Edit className="h-3.5 w-3.5 mr-1" />
              Edit
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  )
}
