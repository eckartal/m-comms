'use client'

import { useState, useEffect } from 'react'
import { KanbanBoard } from '@/components/board/KanbanBoard'
import { Button } from '@/components/ui/button'
import { Plus, LayoutGrid, List, Calendar, Search } from 'lucide-react'
import { useAppStore } from '@/stores'
import { Input } from '@/components/ui/input'
import type { Content } from '@/types'
import { cn } from '@/lib/utils'

type TeamMemberItem = {
  id: string
  role: string
  user: {
    id: string
    email: string
    full_name: string | null
    avatar_url?: string | null
  } | null
}

export default function CollaborationPage() {
  const { currentTeam } = useAppStore()
  const [content, setContent] = useState<Content[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [assigneeFilter, setAssigneeFilter] = useState('all')
  const [teamMembers, setTeamMembers] = useState<TeamMemberItem[]>([])
  const [error, setError] = useState<string | null>(null)
  const [view, setView] = useState<'kanban' | 'list' | 'calendar'>('kanban')

  useEffect(() => {
    if (currentTeam) {
      fetchContent()
      fetchTeamMembers()
    }
  }, [currentTeam])

  const fetchContent = async () => {
    try {
      setIsLoading(true)
      setError(null)

      const response = await fetch('/api/content')
      if (!response.ok) {
        throw new Error('Failed to fetch content')
      }

      const data = await response.json()
      setContent(data || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load content')
      console.error(err)
    } finally {
      setIsLoading(false)
    }
  }

  const fetchTeamMembers = async () => {
    try {
      const response = await fetch(`/api/teams/${currentTeam?.id}/members`)
      if (response.ok) {
        const data = await response.json()
        setTeamMembers(Array.isArray(data.data) ? data.data : [])
      }
    } catch (err) {
      console.error(err)
    }
  }

  const handleStatusChange = async (contentId: string, newStatus: Content['status']) => {
    try {
      const response = await fetch(`/api/content/${contentId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })

      if (!response.ok) {
        throw new Error('Failed to update status')
      }

      fetchContent()
    } catch (err) {
      console.error(err)
      setError('Failed to update status')
    }
  }

  const handleCardClick = (contentItem: Content) => {
    // Navigate to content detail page
    if (currentTeam?.slug) {
      window.location.href = `/${currentTeam.slug}/content/${contentItem.id}`
    }
  }

  const filteredContent = content.filter((item) => {
    const matchesSearch = item.title.toLowerCase().includes(searchQuery.toLowerCase())
    if (!matchesSearch) return false
    if (assigneeFilter === 'all') return true
    const assignedId = (item as any).assigned_to || (item as any).assignedTo?.id
    return assignedId === assigneeFilter
  })

  if (!currentTeam) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground">
        <p>Please select a team</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full overflow-hidden bg-black">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-900">
        <div className="flex items-center gap-4">
          <div>
            <h1 className="text-lg font-semibold text-foreground">Collaboration</h1>
            <p className="text-xs text-muted-foreground">Manage content workflow</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search content..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-8 pl-9 bg-[#0a0a0a] border-gray-900 text-xs"
            />
          </div>

          {/* Assignee Filter */}
          <select
            value={assigneeFilter}
            onChange={(e) => setAssigneeFilter(e.target.value)}
            className="h-8 px-2 bg-[#0a0a0a] border border-gray-900 text-xs text-foreground rounded"
          >
            <option value="all">All owners</option>
            {teamMembers
              .filter((member) => member.user?.id)
              .map((member) => (
                <option key={member.id} value={member.user?.id}>
                  {member.user?.full_name || member.user?.email || 'Unknown'}
                </option>
              ))}
          </select>

          <div className="h-6 w-px bg-gray-900" />

          {/* View Toggle */}
          <div className="flex bg-[#0a0a0a] rounded-lg p-0.5 border border-gray-900">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setView('kanban')}
              className={cn(
                'h-7 px-2',
                view === 'kanban' ? 'text-foreground' : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <LayoutGrid className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setView('list')}
              className={cn(
                'h-7 px-2',
                view === 'list' ? 'text-foreground' : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <List className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setView('calendar')}
              className={cn(
                'h-7 px-2',
                view === 'calendar' ? 'text-foreground' : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <Calendar className="h-4 w-4" />
            </Button>
          </div>

          <Button className="h-8 bg-white text-black hover:bg-gray-200 text-xs">
            <Plus className="h-3.5 w-3.5 mr-2" />
            New Post
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center h-full text-muted-foreground">
            <div className="flex items-center gap-2">
              <div className="h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
              <span className="text-sm">Loading content...</span>
            </div>
          </div>
        ) : error ? (
          <div className="flex items-center justify-center h-full text-red-500">
            {error}
          </div>
        ) : (
          <KanbanBoard
            content={filteredContent}
            onStatusChange={handleStatusChange}
            onCardClick={handleCardClick}
            teamId={currentTeam.id}
            view={view}
            onViewChange={setView}
          />
        )}
      </div>
    </div>
  )
}
