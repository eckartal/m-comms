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
  { id: 'PUBLISHED', label: 'Published', color: 'bg-blue-950/30' },
  { id: 'ARCHIVED', label: 'Archived', color: 'bg-gray-900' },
]

export function KanbanBoard({ content, onStatusChange, onCardClick, teamId }: KanbanBoardProps) {
  const [groupedContent, setGroupedContent] = useState<Record<string, Content[]>>({})
  const [view, setView] = useState<'kanban' | 'list' | 'calendar'>('kanban')

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

  if (view === 'list') {
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
            content.map((item) => <ContentCard key={item.id} content={item} onClick={() => handleCardClick(item)} />)
          )}
        </div>
      </div>
    )
  }

  if (view === 'calendar') {
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
          </div>
        </div>
        <div className="flex-1 flex items-center justify-center p-8">
          <div className="text-center text-muted-foreground">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-900 mb-4">
              <Calendar className="h-8 w-8 text-muted-foreground" />
            </div>
            <p className="text-sm">Calendar view coming soon</p>
          </div>
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
