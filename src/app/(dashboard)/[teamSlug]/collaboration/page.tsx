'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { KanbanBoard } from '@/components/board/KanbanBoard'
import { Button } from '@/components/ui/button'
import { Plus, LayoutGrid, List, Calendar, Search } from 'lucide-react'
import { useAppStore } from '@/stores'
import { Input } from '@/components/ui/input'
import type { Content } from '@/types'
import { cn } from '@/lib/utils'
import { CollabSkeleton } from '@/components/collaboration/CollabSkeleton'
import { CollabErrorState } from '@/components/collaboration/CollabErrorState'
import { CollabEmptyState } from '@/components/collaboration/CollabEmptyState'
import { PipelineSummary } from '@/components/collaboration/PipelineSummary'
import { CollabRightRail } from '@/components/collaboration/CollabRightRail'
import { DashboardContainer } from '@/components/layout/DashboardContainer'

type TeamMemberItem = {
  id: string
  role: string
  user: {
    id: string
    email: string | null
    name: string | null
    full_name?: string | null
    avatar_url?: string | null
  } | null
}

class RequestError extends Error {
  status: number
  code?: string
  retryable: boolean

  constructor(message: string, status: number, code?: string, retryable = true) {
    super(message)
    this.name = 'RequestError'
    this.status = status
    this.code = code
    this.retryable = retryable
  }
}

type ViewState =
  | 'loading'
  | 'error'
  | 'empty_permission'
  | 'empty_first_use'
  | 'empty_filtered'
  | 'ready'

type QuickFilter = 'all' | 'mine' | 'unassigned' | 'needs_review' | 'overdue' | 'approved'

function isOverdue(item: Content) {
  if (!item.scheduled_at) return false
  if (item.status === 'PUBLISHED' || item.status === 'ARCHIVED') return false
  return new Date(item.scheduled_at).getTime() < Date.now()
}

function trackCollabEvent(name: string, payload: Record<string, unknown> = {}) {
  if (typeof window === 'undefined') return
  window.dispatchEvent(
    new CustomEvent('collaboration:analytics', {
      detail: {
        name,
        payload,
        ts: Date.now(),
      },
    })
  )
}

export default function CollaborationPage() {
  const router = useRouter()
  const { currentTeam, currentUser } = useAppStore()
  const [content, setContent] = useState<Content[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [assigneeFilter, setAssigneeFilter] = useState('all')
  const [teamMembers, setTeamMembers] = useState<TeamMemberItem[]>([])
  const [error, setError] = useState<string | null>(null)
  const [errorStatus, setErrorStatus] = useState<number | null>(null)
  const [errorRetryable, setErrorRetryable] = useState(true)
  const [view, setView] = useState<'kanban' | 'list' | 'calendar'>('kanban')
  const [quickFilter, setQuickFilter] = useState<QuickFilter>('all')
  const [changeReason, setChangeReason] = useState('')
  const [showReasonPrompt, setShowReasonPrompt] = useState(false)
  const hasTrackedViewLoaded = useRef(false)
  const lastTrackedEmptyState = useRef<string | null>(null)

  const parseRequestError = async (response: Response, fallbackMessage: string) => {
    let message = fallbackMessage
    let code: string | undefined
    let retryable = response.status >= 500
    try {
      const body = await response.json()
      if (typeof body?.error === 'string' && body.error.trim()) {
        message = body.error
      }
      if (typeof body?.code === 'string') {
        code = body.code
      }
      if (typeof body?.retryable === 'boolean') {
        retryable = body.retryable
      }
    } catch {
      // Ignore JSON parsing errors and use fallback message.
    }

    throw new RequestError(message, response.status, code, retryable)
  }

  const fetchContentData = useCallback(async (teamId: string) => {
    const response = await fetch(`/api/content?team_id=${encodeURIComponent(teamId)}`, { cache: 'no-store' })
    if (!response.ok) {
      await parseRequestError(response, 'Failed to fetch content')
    }

    const data = await response.json()
    return Array.isArray(data.data) ? (data.data as Content[]) : []
  }, [])

  const fetchTeamMembersData = useCallback(async (teamId: string) => {
    const response = await fetch(`/api/teams/${teamId}/members`, { cache: 'no-store' })
    if (!response.ok) {
      await parseRequestError(response, 'Failed to fetch team members')
    }

    const data = await response.json()
    return Array.isArray(data.data) ? (data.data as TeamMemberItem[]) : []
  }, [])

  const loadData = useCallback(async () => {
    if (!currentTeam?.id) return

    setIsLoading(true)
    setError(null)
    setErrorStatus(null)
    setErrorRetryable(true)

    const [contentResult, teamMembersResult] = await Promise.allSettled([
      fetchContentData(currentTeam.id),
      fetchTeamMembersData(currentTeam.id),
    ])

    if (contentResult.status === 'fulfilled') {
      setContent(contentResult.value)
    } else {
      const reason = contentResult.reason
      const isRequestError = reason instanceof RequestError
      setContent([])
      setError(isRequestError ? reason.message : 'Failed to load content')
      setErrorStatus(isRequestError ? reason.status : 500)
      setErrorRetryable(isRequestError ? reason.retryable : true)
      console.error('Failed to load collaboration content:', reason)
    }

    if (teamMembersResult.status === 'fulfilled') {
      setTeamMembers(teamMembersResult.value)
    } else {
      setTeamMembers([])
      console.error('Failed to load team members:', teamMembersResult.reason)
    }

    setIsLoading(false)
  }, [currentTeam?.id, fetchContentData, fetchTeamMembersData])

  useEffect(() => {
    if (currentTeam?.id) {
      loadData()
    }
  }, [currentTeam?.id, loadData])

  const handleStatusChange = async (contentId: string, newStatus: Content['status']) => {
    const previous = content
    setContent((prev) =>
      prev.map((item) => (item.id === contentId ? { ...item, status: newStatus } : item))
    )

    try {
      const response = await fetch(`/api/content/${contentId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: newStatus,
          change_reason: changeReason.trim() || null,
        }),
      })

      if (!response.ok) {
        await parseRequestError(response, 'Failed to update status')
      }

      const { data } = await response.json()
      if (data) {
        setContent((prev) =>
          prev.map((item) => (item.id === contentId ? { ...item, ...data } : item))
        )
      }

      setChangeReason('')
      setShowReasonPrompt(false)
    } catch (err) {
      console.error(err)
      setError(err instanceof Error ? err.message : 'Failed to update status')
      setContent(previous)
    }
  }

  const handleAssign = async (contentId: string, userId: string | null) => {
    try {
      const response = await fetch(`/api/content/${contentId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assigned_to: userId }),
      })

      if (!response.ok) {
        await parseRequestError(response, 'Failed to update owner')
      }

      const member = teamMembers.find((m) => m.user?.id === userId) || null
      setContent((prev) =>
        prev.map((item) =>
          item.id === contentId
            ? {
                ...item,
                assigned_to: userId,
                assignedTo: member?.user
                  ? {
                      id: member.user.id,
                      name: member.user.name || member.user.full_name || null,
                      email: member.user.email || '',
                      avatar_url: member.user.avatar_url || null,
                    }
                  : null,
              }
            : item
        )
      )
    } catch (err) {
      console.error(err)
      setError(err instanceof Error ? err.message : 'Failed to update owner')
    }
  }

  const handleCardClick = (contentItem: Content) => {
    if (currentTeam?.slug) {
      window.location.href = `/${currentTeam.slug}/content/${contentItem.id}`
    }
  }

  const hasActiveFilters =
    searchQuery.trim().length > 0 || assigneeFilter !== 'all' || quickFilter !== 'all'

  const filteredContent = useMemo(
    () =>
      content.filter((item) => {
        const matchesSearch = item.title.toLowerCase().includes(searchQuery.toLowerCase())
        if (!matchesSearch) return false

        if (quickFilter === 'mine') {
          const ownerId = item.assigned_to || item.assignedTo?.id
          if (!currentUser?.id || ownerId !== currentUser.id) return false
        }
        if (quickFilter === 'unassigned' && (item.assigned_to || item.assignedTo?.id)) return false
        if (quickFilter === 'needs_review' && item.status !== 'IN_REVIEW') return false
        if (quickFilter === 'overdue' && !isOverdue(item)) return false
        if (quickFilter === 'approved' && item.status !== 'APPROVED') return false

        if (assigneeFilter === 'all') return true
        const assignedId = item.assigned_to || item.assignedTo?.id
        return assignedId === assigneeFilter
      }),
    [content, searchQuery, assigneeFilter, quickFilter, currentUser?.id]
  )

  const quickFilterMeta = useMemo(
    () => [
      { id: 'all' as const, label: 'All', count: content.length },
      {
        id: 'mine' as const,
        label: 'Mine',
        count: content.filter((item) => {
          const ownerId = item.assigned_to || item.assignedTo?.id
          return !!currentUser?.id && ownerId === currentUser.id
        }).length,
      },
      {
        id: 'unassigned' as const,
        label: 'Unassigned',
        count: content.filter((item) => !item.assigned_to && !item.assignedTo?.id).length,
      },
      {
        id: 'needs_review' as const,
        label: 'Needs Review',
        count: content.filter((item) => item.status === 'IN_REVIEW').length,
      },
      {
        id: 'overdue' as const,
        label: 'Overdue',
        count: content.filter(isOverdue).length,
      },
      {
        id: 'approved' as const,
        label: 'Approved',
        count: content.filter((item) => item.status === 'APPROVED').length,
      },
    ],
    [content, currentUser?.id]
  )

  const viewState: ViewState = useMemo(() => {
    if (isLoading) return 'loading'
    if (errorStatus === 401 || errorStatus === 403) return 'empty_permission'
    if (error) return 'error'
    if (content.length === 0) return 'empty_first_use'
    if (filteredContent.length === 0 && hasActiveFilters) return 'empty_filtered'
    return 'ready'
  }, [isLoading, errorStatus, error, content.length, filteredContent.length, hasActiveFilters])

  useEffect(() => {
    if (!hasTrackedViewLoaded.current && viewState === 'ready') {
      hasTrackedViewLoaded.current = true
      trackCollabEvent('collab_view_loaded', {
        team_id: currentTeam?.id || null,
        content_count: content.length,
      })
    }
  }, [viewState, currentTeam?.id, content.length])

  useEffect(() => {
    const emptyVariant =
      viewState === 'empty_permission'
        ? 'permission'
        : viewState === 'empty_first_use'
          ? 'first_use'
          : viewState === 'empty_filtered'
            ? 'filtered'
            : null

    if (!emptyVariant) return
    if (lastTrackedEmptyState.current === emptyVariant) return
    lastTrackedEmptyState.current = emptyVariant

    trackCollabEvent('collab_empty_state_seen', {
      variant: emptyVariant,
      team_id: currentTeam?.id || null,
    })
  }, [viewState, currentTeam?.id])

  const goToTeam = () => {
    if (currentTeam?.slug) {
      router.push(`/${currentTeam.slug}/team`)
    }
  }

  const goToNewPost = () => {
    if (currentTeam?.slug) {
      router.push(`/${currentTeam.slug}/content/new`)
    }
  }

  if (!currentTeam) {
    return (
      <div className="flex min-h-full items-center justify-center text-muted-foreground">
        <p>Please select a team</p>
      </div>
    )
  }

  return (
    <DashboardContainer className="flex h-full flex-1 flex-col py-4 md:py-5">
      <div className="flex items-center justify-between border-b border-gray-900 px-0 py-4">
        <div className="flex items-center gap-4">
          <div>
            <h1 className="text-lg font-semibold text-foreground">Collaboration</h1>
            <p className="text-xs text-muted-foreground">Manage content workflow</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
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
                  {member.user?.name || member.user?.full_name || member.user?.email || 'Unknown'}
                </option>
              ))}
          </select>

          <div className="h-6 w-px bg-gray-900" />

          <div className="flex bg-[#0a0a0a] rounded-lg p-0.5 border border-gray-900">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setView('kanban')
                trackCollabEvent('collab_view_changed', { view: 'kanban', team_id: currentTeam.id })
              }}
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
              onClick={() => {
                setView('list')
                trackCollabEvent('collab_view_changed', { view: 'list', team_id: currentTeam.id })
              }}
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
              onClick={() => {
                setView('calendar')
                trackCollabEvent('collab_view_changed', { view: 'calendar', team_id: currentTeam.id })
              }}
              className={cn(
                'h-7 px-2',
                view === 'calendar' ? 'text-foreground' : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <Calendar className="h-4 w-4" />
            </Button>
          </div>

          <Button className="h-8 bg-white text-black hover:bg-gray-200 text-xs" onClick={goToNewPost}>
            <Plus className="h-3.5 w-3.5 mr-2" />
            New Post
          </Button>
        </div>
      </div>

      <PipelineSummary
        content={content}
        activeFilter={
          quickFilter === 'needs_review' ||
          quickFilter === 'unassigned' ||
          quickFilter === 'overdue' ||
          quickFilter === 'approved'
            ? quickFilter
            : null
        }
        onSelectFilter={(filter) => {
          setQuickFilter(filter)
          trackCollabEvent('collab_pipeline_filter_selected', {
            filter,
            team_id: currentTeam.id,
          })
        }}
      />
      <div className="flex items-center gap-2 overflow-x-auto border-b border-gray-900 bg-[#050505] px-0 py-2">
        {quickFilterMeta.map((filter) => (
          <Button
            key={filter.id}
            size="sm"
            variant={quickFilter === filter.id ? 'default' : 'outline'}
            className="h-7 text-xs whitespace-nowrap"
            onClick={() => {
              setQuickFilter(filter.id)
              trackCollabEvent('collab_quick_filter_selected', {
                filter: filter.id,
                count: filter.count,
                team_id: currentTeam.id,
              })
            }}
          >
            {filter.label} ({filter.count})
          </Button>
        ))}
        {hasActiveFilters ? (
          <Button
            size="sm"
            variant="ghost"
            className="h-7 text-xs text-muted-foreground hover:text-foreground ml-1"
            onClick={() => {
              setSearchQuery('')
              setAssigneeFilter('all')
              setQuickFilter('all')
            }}
          >
            Clear filters
          </Button>
        ) : null}
      </div>

      <div className="border-b border-gray-900 px-0 py-2">
        <button
          type="button"
          onClick={() => setShowReasonPrompt((prev) => !prev)}
          className="text-xs text-muted-foreground hover:text-foreground"
        >
          {showReasonPrompt ? 'Hide reason' : 'Add reason for changes (optional)'}
        </button>
        {showReasonPrompt && (
          <div className="mt-2 max-w-xl">
            <Input
              type="text"
              placeholder="Why are you changing the status?"
              value={changeReason}
              onChange={(e) => setChangeReason(e.target.value)}
              className="h-8 bg-[#0a0a0a] border-gray-900 text-xs"
            />
          </div>
        )}
      </div>

      <div className="flex-1 overflow-hidden">
        {viewState === 'loading' ? <CollabSkeleton view={view} /> : null}

        {viewState === 'error' ? (
          <CollabErrorState
            message={error || 'Failed to load collaboration data'}
            showRetry={errorRetryable}
            onRetry={() => {
              trackCollabEvent('collab_retry_clicked', {
                team_id: currentTeam.id,
                error_status: errorStatus,
              })
              loadData()
            }}
            onGoToTeam={goToTeam}
          />
        ) : null}

        {viewState === 'empty_permission' ? (
          <CollabEmptyState
            variant="permission"
            onCreatePost={goToNewPost}
            onClearFilters={() => {
              setSearchQuery('')
              setAssigneeFilter('all')
              setQuickFilter('all')
            }}
            onGoToTeam={goToTeam}
          />
        ) : null}

        {viewState === 'empty_first_use' ? (
          <CollabEmptyState
            variant="first_use"
            onCreatePost={goToNewPost}
            onClearFilters={() => {
              setSearchQuery('')
              setAssigneeFilter('all')
              setQuickFilter('all')
            }}
            onGoToTeam={goToTeam}
          />
        ) : null}

        {viewState === 'empty_filtered' ? (
          <CollabEmptyState
            variant="filtered"
            onCreatePost={goToNewPost}
            onClearFilters={() => {
              setSearchQuery('')
              setAssigneeFilter('all')
              setQuickFilter('all')
            }}
            onGoToTeam={goToTeam}
          />
        ) : null}

        {viewState === 'ready' ? (
          <div className="flex h-full">
            <div className="min-w-0 flex-1">
              <KanbanBoard
                content={filteredContent}
                onStatusChange={handleStatusChange}
                onCardClick={handleCardClick}
                teamId={currentTeam.id}
                view={view}
                onViewChange={setView}
                teamMembers={teamMembers}
                onAssign={handleAssign}
              />
            </div>
            <CollabRightRail content={content} onOpenContent={handleCardClick} />
          </div>
        ) : null}
      </div>
    </DashboardContainer>
  )
}
