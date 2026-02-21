'use client'

import { KeyboardEvent, useEffect, useState } from 'react'
import type { Content } from '@/types'
import { ContentCard } from './ContentCard'
import { Column } from './Column'
import { inferTitleFromContent, getTicketKey } from '@/lib/ticketPresentation'
import { useContentStore } from '@/stores'
import { List, Calendar } from 'lucide-react'

interface KanbanBoardProps {
  content: Content[]
  onStatusChange?: (contentId: string, newStatus: Content['status']) => void
  onConvertIdea?: (contentId: string) => void
  onOpenLinkedIdea?: (ideaId: string) => void
  onOpenLinkedPost?: (postId: string) => void
  onOpenFullEditor?: (postId: string) => void
  onRemoveContent?: (contentId: string) => void
  onCardClick?: (content: Content) => void
  view?: 'kanban' | 'list' | 'calendar'
  onViewChange?: (view: 'kanban' | 'list' | 'calendar') => void
  teamMembers?: Array<{
    id: string
    user?: {
      id: string
      name?: string | null
      full_name?: string | null
      email?: string | null
      avatar_url?: string | null
    } | null
  }>
  onAssign?: (contentId: string, userId: string | null) => void
}

type ContentWithActivity = Content & {
  latest_activity?: {
    user?: {
      name?: string | null
      email?: string | null
    } | null
  } | null
  activity_count?: number
}

// Group content by status
function groupByStatus(content: Content[]): Record<string, Content[]> {
  const grouped: Record<string, Content[]> = {
    IDEA_INBOX: [],
    DRAFT: [],
    IN_REVIEW: [],
    APPROVED: [],
    SCHEDULED: [],
    PUBLISHED: [],
    ARCHIVED: [],
  }

  content.forEach((item) => {
    const itemType = item.item_type || 'POST'
    if (itemType === 'IDEA') {
      // Keep collaboration pipeline simple:
      // - Active ideas stay in Idea Inbox
      // - Archived ideas appear with archived content
      const isArchivedIdea = item.idea_state === 'ARCHIVED'
      const key = isArchivedIdea ? 'ARCHIVED' : 'IDEA_INBOX'
      grouped[key].push(item)
      return
    }

    if (grouped[item.status]) {
      grouped[item.status].push(item)
    }
  })

  return grouped
}

const STATUS_COLUMNS: { id: Content['status']; label: string; color: string }[] = [
  { id: 'DRAFT', label: 'Drafts', color: 'bg-zinc-400/80' },
  { id: 'IN_REVIEW', label: 'In Review', color: 'bg-amber-500/80' },
  { id: 'APPROVED', label: 'Approved', color: 'bg-emerald-500/80' },
  { id: 'SCHEDULED', label: 'Scheduled', color: 'bg-indigo-500/80' },
  { id: 'PUBLISHED', label: 'Shared', color: 'bg-blue-500/80' },
  { id: 'ARCHIVED', label: 'Archived', color: 'bg-zinc-500/70' },
]

const IDEA_COLUMNS = [
  { id: 'IDEA_INBOX', label: 'Ideas Inbox', color: 'bg-amber-400/80' },
] as const

const EMPTY_COLUMN_COPY: Record<Content['status'], string> = {
  DRAFT: 'No drafts yet',
  IN_REVIEW: 'Nothing in review yet',
  APPROVED: 'No approved posts yet',
  SCHEDULED: 'Nothing scheduled yet',
  PUBLISHED: 'No shared posts yet',
  ARCHIVED: 'No archived posts',
}

const POST_STATUS_OPTIONS: Content['status'][] = [
  'DRAFT',
  'IN_REVIEW',
  'APPROVED',
  'SCHEDULED',
  'PUBLISHED',
  'ARCHIVED',
]

export function KanbanBoard({
  content,
  onStatusChange,
  onCardClick,
  onConvertIdea,
  onOpenLinkedIdea,
  onOpenLinkedPost,
  onOpenFullEditor,
  onRemoveContent,
  view,
  teamMembers,
  onAssign,
}: KanbanBoardProps) {
  const [groupedContent, setGroupedContent] = useState<Record<string, Content[]>>({})
  const allContents = useContentStore((state) => state.contents)
  const activeView = view ?? 'kanban'

  useEffect(() => {
    setGroupedContent(groupByStatus(content))
  }, [content])

  const handleCardClick = (content: Content) => {
    if (onCardClick) {
      onCardClick(content)
    }
  }

  const handleAssign = (contentId: string, userId: string | null) => {
    if (onAssign) {
      onAssign(contentId, userId)
    }
  }

  const handleRowKeyDown = (event: KeyboardEvent<HTMLElement>, item: Content) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      handleCardClick(item)
    }
  }

  const kanbanColumns = [...IDEA_COLUMNS, ...STATUS_COLUMNS]

  if (activeView === 'list') {
    return (
      <div className="flex flex-col h-full overflow-hidden">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <h2 className="text-sm font-medium text-foreground">All Content</h2>
          <List className="h-4 w-4 text-muted-foreground" />
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
          {content.length === 0 ? (
            <div className="text-center text-muted-foreground py-12">
              <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                <List className="h-6 w-6 text-muted-foreground" />
              </div>
              <p className="text-sm">No content yet</p>
            </div>
          ) : (
            <div className="overflow-hidden rounded-lg border border-border">
              <div className="grid grid-cols-[2fr,1fr,1fr,1fr] gap-3 bg-muted/40 px-4 py-2 text-[11px] uppercase tracking-wide text-muted-foreground">
                <span>Title</span>
                <span>Status</span>
                <span>Owner</span>
                <span>Last updated</span>
              </div>
              <div className="divide-y divide-border">
                    {content.map((item) => {
                      const itemWithActivity = item as ContentWithActivity
                      const ownerName =
                        item.assignedTo?.name ||
                        item.assignedTo?.email ||
                        item.createdBy?.name ||
                        item.createdBy?.email ||
                        'Unassigned'
                      const ownerId = item.assignedTo?.id || null
                      const latestUpdater =
                        itemWithActivity.latest_activity?.user?.name ||
                        itemWithActivity.latest_activity?.user?.email ||
                        null
                      const activityCount = itemWithActivity.activity_count || 0
                      const dateStr = item.published_at || item.scheduled_at
                      const dateLabel = dateStr
                        ? new Date(dateStr).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            hour: 'numeric',
                            minute: '2-digit',
                          })
                        : '—'
                      const statusLabel =
                        (item.item_type || 'POST') === 'IDEA'
                          ? item.idea_state === 'ARCHIVED'
                            ? 'ARCHIVED'
                            : 'IDEA INBOX'
                          : item.status.replace('_', ' ')
                  return (
                    <div
                      key={item.id}
                      role="button"
                      tabIndex={0}
                      className="grid w-full grid-cols-[2fr,1fr,1fr,1fr] gap-3 px-4 py-3 text-left transition-colors hover:bg-accent/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
                      onClick={() => handleCardClick(item)}
                      onKeyDown={(event) => handleRowKeyDown(event, item)}
                    >
                      <div className="min-w-0">
                        <span className="block text-[10px] uppercase tracking-wide text-muted-foreground truncate">
                          {getTicketKey(item.id, allContents)}
                        </span>
                        <span className="block text-sm text-foreground truncate">{inferTitleFromContent(item)}</span>
                        {(latestUpdater || activityCount > 0) && (
                          <span className="block text-[10px] text-muted-foreground truncate">
                            {latestUpdater ? `Updated by ${latestUpdater}` : ''}
                            {latestUpdater && activityCount > 0 ? ' · ' : ''}
                            {activityCount > 0 ? `${activityCount} updates` : ''}
                          </span>
                        )}
                      </div>
                      {(item.item_type || 'POST') === 'IDEA' || !onStatusChange ? (
                        <span className="text-xs text-muted-foreground">{statusLabel}</span>
                      ) : (
                        <select
                          className="rounded border border-border bg-card px-2 py-1 text-xs text-muted-foreground"
                          value={item.status}
                          onMouseDown={(event) => event.stopPropagation()}
                          onClick={(event) => event.stopPropagation()}
                          onChange={(event) =>
                            onStatusChange(item.id, event.target.value as Content['status'])
                          }
                        >
                          {POST_STATUS_OPTIONS.map((status) => (
                            <option key={status} value={status}>
                              {status.replace('_', ' ')}
                            </option>
                          ))}
                        </select>
                      )}
                      {teamMembers && onAssign ? (
                        <select
                          className="rounded border border-border bg-card px-2 py-1 text-xs text-muted-foreground"
                          value={ownerId || ''}
                          onMouseDown={(event) => event.stopPropagation()}
                          onClick={(event) => event.stopPropagation()}
                          onChange={(event) => handleAssign(item.id, event.target.value || null)}
                        >
                          <option value="">Unassigned</option>
                          {teamMembers
                            .filter((member) => member.user?.id)
                            .map((member) => {
                              const label =
                                member.user?.full_name ||
                                member.user?.name ||
                                member.user?.email ||
                                'Unknown'
                              return (
                                <option key={member.id} value={member.user?.id}>
                                  {label}
                                </option>
                              )
                            })}
                        </select>
                      ) : (
                        <span className="text-xs text-muted-foreground truncate">{ownerName}</span>
                      )}
                      <span className="text-xs text-muted-foreground">{dateLabel}</span>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    )
  }

  if (activeView === 'calendar') {
    const calendarItems = content
      .map((item) => ({
        item,
        dateStr: item.published_at || item.scheduled_at,
      }))
      .filter((entry) => entry.dateStr)
      .sort((a, b) => new Date(a.dateStr as string).getTime() - new Date(b.dateStr as string).getTime())

    const groupedByDate = calendarItems.reduce<Record<string, Content[]>>((acc, entry) => {
      const key = (entry.dateStr as string).slice(0, 10)
      acc[key] = acc[key] || []
      acc[key].push(entry.item)
      return acc
    }, {})

    const dateKeys = Object.keys(groupedByDate)

    return (
      <div className="flex flex-col h-full overflow-hidden">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <h2 className="text-sm font-medium text-foreground">Content Calendar</h2>
          <Calendar className="h-4 w-4 text-muted-foreground" />
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
          {dateKeys.length === 0 ? (
            <div className="text-center text-muted-foreground py-12">
              <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                <Calendar className="h-6 w-6 text-muted-foreground" />
              </div>
              <p className="text-sm">No scheduled or shared content</p>
            </div>
          ) : (
            dateKeys.map((dateKey) => {
              const date = new Date(dateKey)
              return (
                <div key={dateKey} className="overflow-hidden rounded-lg border border-border">
                  <div className="bg-muted/40 px-4 py-2 text-xs text-muted-foreground">
                    {date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                  </div>
                  <div className="divide-y divide-border">
                    {groupedByDate[dateKey].map((item) => {
                      const dateStr = item.published_at || item.scheduled_at
                      const time = dateStr
                        ? new Date(dateStr).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
                        : ''
                      const ownerName =
                        item.assignedTo?.name ||
                        item.assignedTo?.email ||
                        item.createdBy?.name ||
                        item.createdBy?.email ||
                        null

                      return (
                        <button
                          key={item.id}
                          className="w-full px-4 py-3 text-left transition-colors hover:bg-accent/40"
                          onClick={() => handleCardClick(item)}
                        >
                          <div className="flex items-center justify-between gap-3">
                            <div className="min-w-0">
                              <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
                                {getTicketKey(item.id, allContents)}
                              </p>
                              <p className="text-sm font-medium text-foreground truncate">{inferTitleFromContent(item)}</p>
                              <p className="text-xs text-muted-foreground">{time}</p>
                              {ownerName && (
                                <p className="text-[10px] text-muted-foreground truncate">Owner {ownerName}</p>
                              )}
                            </div>
                            <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
                              {(item.item_type || 'POST') === 'IDEA'
                                ? item.idea_state === 'ARCHIVED'
                                  ? 'ARCHIVED'
                                  : 'IDEA INBOX'
                                : item.status === 'PUBLISHED'
                                  ? 'Shared'
                                  : 'Scheduled'}
                            </span>
                          </div>
                        </button>
                      )
                    })}
                  </div>
                </div>
              )
            })
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-full flex-1 overflow-x-auto overflow-y-hidden">
      {/* Kanban View */}
      <div className="flex flex-1 gap-3 p-3 custom-scrollbar">
        {kanbanColumns.map((column) => {
          const isIdeasColumn = String(column.id).startsWith('IDEA_')
          return (
          <Column
            key={column.id}
            title={column.label}
            count={groupedContent[String(column.id)]?.length || 0}
            color={column.color}
            className={
              isIdeasColumn
                ? 'rounded-xl border border-zinc-300/70 bg-zinc-100/45 dark:border-zinc-800/80 dark:bg-zinc-900/45'
                : 'rounded-xl border border-border/80 bg-card'
            }
            headerClassName={isIdeasColumn ? 'bg-zinc-100/60 dark:bg-zinc-900/60' : undefined}
            bodyClassName={isIdeasColumn ? 'bg-zinc-100/35 dark:bg-zinc-900/40' : undefined}
          >
            {groupedContent[String(column.id)]?.map((item) => (
              <ContentCard
                key={item.id}
                content={item}
                onClick={() => handleCardClick(item)}
                onOpenFullEditor={onOpenFullEditor}
                onRemove={onRemoveContent}
                onStatusChange={onStatusChange}
                onConvertIdea={onConvertIdea}
                onOpenLinkedIdea={onOpenLinkedIdea}
                onOpenLinkedPost={onOpenLinkedPost}
              />
            ))}
            {groupedContent[String(column.id)]?.length === 0 && (
              <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-border/80 py-8 text-muted-foreground">
                <p className="text-xs">
                  {'id' in column && String(column.id).startsWith('IDEA_')
                    ? 'No ideas'
                    : EMPTY_COLUMN_COPY[column.id as Content['status']]}
                </p>
              </div>
            )}
          </Column>
          )
        })}
      </div>
    </div>
  )
}
