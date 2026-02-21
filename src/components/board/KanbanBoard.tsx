'use client'

import { useEffect, useState } from 'react'
import type { Content } from '@/types'
import { ContentCard } from './ContentCard'
import { Column } from './Column'
import { Button } from '@/components/ui/button'
import { Plus, LayoutKanban, List, Calendar } from 'lucide-react'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'

interface KanbanBoardProps {
  content: Content[]
  onStatusChange?: (contentId: string, newStatus: Content['status']) => void
  onCardClick?: (content: Content) => void
  teamId: string
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

// Group content by status
function groupByStatus(content: Content[]): Record<string, Content[]> {
  const grouped: Record<string, Content[]> = {
    DRAFT: [],
    IN_REVIEW: [],
    APPROVED: [],
    SCHEDULED: [],
    PUBLISHED: [],
    ARCHIVED: [],
  }

  content.forEach((item) => {
    if (grouped[item.status]) {
      grouped[item.status].push(item)
    }
  })

  return grouped
}

const STATUS_COLUMNS: { id: Content['status']; label: string; color: string }[] = [
  { id: 'DRAFT', label: 'Drafts', color: 'bg-gray-900' },
  { id: 'IN_REVIEW', label: 'In Review', color: 'bg-amber-950/30' },
  { id: 'APPROVED', label: 'Approved', color: 'bg-emerald-950/30' },
  { id: 'SCHEDULED', label: 'Scheduled', color: 'bg-indigo-950/30' },
  { id: 'PUBLISHED', label: 'Shared', color: 'bg-blue-950/30' },
  { id: 'ARCHIVED', label: 'Archived', color: 'bg-gray-900' },
]

export function KanbanBoard({
  content,
  onStatusChange,
  onCardClick,
  teamId,
  view,
  onViewChange,
  teamMembers,
  onAssign,
}: KanbanBoardProps) {
  const [groupedContent, setGroupedContent] = useState<Record<string, Content[]>>({})
  const [internalView, setInternalView] = useState<'kanban' | 'list' | 'calendar'>('kanban')
  const activeView = view ?? internalView
  const setView = onViewChange ?? setInternalView

  useEffect(() => {
    setGroupedContent(groupByStatus(content))
  }, [content])

  const handleStatusChange = (contentId: string, newStatus: Content['status']) => {
    if (onStatusChange) {
      onStatusChange(contentId, newStatus)
    }
  }

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

  if (activeView === 'list') {
    return (
      <div className="flex flex-col h-full overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-900">
          <h2 className="text-sm font-medium text-foreground">All Content</h2>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => setView('kanban')} className="h-8 px-2">
              <LayoutKanban className="h-4 w-4 mr-2" />
              Kanban
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setView('list')} className="h-8 px-2 text-primary">
              <List className="h-4 w-4 mr-2" />
              List
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setView('calendar')} className="h-8 px-2">
              <Calendar className="h-4 w-4 mr-2" />
              Calendar
            </Button>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
          {content.length === 0 ? (
            <div className="text-center text-muted-foreground py-12">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-gray-900 mb-4">
                <List className="h-6 w-6 text-muted-foreground" />
              </div>
              <p className="text-sm">No content yet</p>
            </div>
          ) : (
            <div className="border border-[#262626] rounded-lg overflow-hidden">
              <div className="grid grid-cols-[2fr,1fr,1fr,1fr] gap-3 px-4 py-2 text-[11px] uppercase tracking-wide text-muted-foreground bg-[#0f0f0f]">
                <span>Title</span>
                <span>Status</span>
                <span>Owner</span>
                <span>Schedule</span>
              </div>
              <div className="divide-y divide-[#1f1f1f]">
                    {content.map((item) => {
                      const ownerName =
                        item.assignedTo?.name ||
                        item.assignedTo?.email ||
                        item.createdBy?.name ||
                        item.createdBy?.email ||
                        'Unassigned'
                      const ownerId = item.assignedTo?.id || null
                      const latestUpdater =
                        (item as any).latest_activity?.user?.name ||
                        (item as any).latest_activity?.user?.email ||
                        null
                      const activityCount = (item as any).activity_count || 0
                      const dateStr = item.published_at || item.scheduled_at
                      const dateLabel = dateStr
                        ? new Date(dateStr).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            hour: 'numeric',
                            minute: '2-digit',
                          })
                        : '—'
                  return (
                    <button
                      key={item.id}
                      className="w-full text-left grid grid-cols-[2fr,1fr,1fr,1fr] gap-3 px-4 py-3 hover:bg-[#0a0a0a] transition-colors"
                      onClick={() => handleCardClick(item)}
                    >
                      <div className="min-w-0">
                        <span className="block text-sm text-foreground truncate">{item.title}</span>
                        {(latestUpdater || activityCount > 0) && (
                          <span className="block text-[10px] text-muted-foreground truncate">
                            {latestUpdater ? `Updated by ${latestUpdater}` : ''}
                            {latestUpdater && activityCount > 0 ? ' · ' : ''}
                            {activityCount > 0 ? `${activityCount} updates` : ''}
                          </span>
                        )}
                      </div>
                      <span className="text-xs text-muted-foreground">{item.status.replace('_', ' ')}</span>
                      {teamMembers && onAssign ? (
                        <select
                          className="text-xs text-muted-foreground bg-[#0a0a0a] border border-[#262626] rounded px-2 py-1"
                          value={ownerId || ''}
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
                    </button>
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
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-900">
          <h2 className="text-sm font-medium text-foreground">Content Calendar</h2>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => setView('kanban')} className="h-8 px-2">
              <LayoutKanban className="h-4 w-4 mr-2" />
              Kanban
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setView('list')} className="h-8 px-2">
              <List className="h-4 w-4 mr-2" />
              List
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setView('calendar')} className="h-8 px-2 text-primary">
              <Calendar className="h-4 w-4 mr-2" />
              Calendar
            </Button>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
          {dateKeys.length === 0 ? (
            <div className="text-center text-muted-foreground py-12">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-gray-900 mb-4">
                <Calendar className="h-6 w-6 text-muted-foreground" />
              </div>
              <p className="text-sm">No scheduled or shared content</p>
            </div>
          ) : (
            dateKeys.map((dateKey) => {
              const date = new Date(dateKey)
              return (
                <div key={dateKey} className="border border-[#262626] rounded-lg overflow-hidden">
                  <div className="px-4 py-2 bg-[#0f0f0f] text-xs text-muted-foreground">
                    {date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                  </div>
                  <div className="divide-y divide-[#1f1f1f]">
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
                          className="w-full text-left px-4 py-3 hover:bg-[#0a0a0a] transition-colors"
                          onClick={() => handleCardClick(item)}
                        >
                          <div className="flex items-center justify-between gap-3">
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-foreground truncate">{item.title}</p>
                              <p className="text-xs text-muted-foreground">{time}</p>
                              {ownerName && (
                                <p className="text-[10px] text-muted-foreground truncate">Owner {ownerName}</p>
                              )}
                            </div>
                            <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
                              {item.status === 'PUBLISHED' ? 'Shared' : 'Scheduled'}
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
    <div className="flex flex-1 h-full overflow-x-auto overflow-y-hidden">
      {/* Kanban View */}
      <div className="flex flex-1 gap-4 p-4 custom-scrollbar">
        {STATUS_COLUMNS.map((column) => (
          <Column
            key={column.id}
            title={column.label}
            count={groupedContent[column.id]?.length || 0}
            color={column.color}
            className="bg-[#050505] border border-[#262626] rounded-xl"
          >
            {groupedContent[column.id]?.map((item) => (
              <ContentCard
                key={item.id}
                content={item}
                onClick={() => handleCardClick(item)}
              />
            ))}
            {groupedContent[column.id]?.length === 0 && (
              <div className="flex flex-col items-center justify-center py-8 text-muted-foreground border-2 border-dashed border-gray-800 rounded-lg">
                <p className="text-xs">No content</p>
              </div>
            )}
          </Column>
        ))}
      </div>
    </div>
  )
}
