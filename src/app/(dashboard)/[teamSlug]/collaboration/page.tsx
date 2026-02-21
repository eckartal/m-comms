'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import { KanbanBoard } from '@/components/board/KanbanBoard'
import { Button } from '@/components/ui/button'
import {
  LayoutGrid,
  List,
  Calendar,
  Search,
  SlidersHorizontal,
  Check,
  Lightbulb,
} from 'lucide-react'
import { useAppStore, useContentStore } from '@/stores'
import { Input } from '@/components/ui/input'
import type { Content } from '@/types'
import { cn } from '@/lib/utils'
import { getContentTitle } from '@/lib/contentText'
import { QuickFilter, getOwnerId, isUnassigned, parseQuickFilter } from '@/lib/collaborationMetrics'
import { CollabSkeleton } from '@/components/collaboration/CollabSkeleton'
import { CollabErrorState } from '@/components/collaboration/CollabErrorState'
import { CollabEmptyState } from '@/components/collaboration/CollabEmptyState'
import { IdeaEditorPanel } from '@/components/collaboration/IdeaEditorPanel'
import { PostEditorPanel } from '@/components/collaboration/PostEditorPanel'
import { DashboardContainer } from '@/components/layout/DashboardContainer'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

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

type ItemTypeFilter = 'all' | 'IDEA' | 'POST'
const COLLAB_UI_VERSION = '2026-02-21-linear-v3'

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
  const params = useParams()
  const router = useRouter()
  const searchParams = useSearchParams()
  const { currentTeam, currentUser } = useAppStore()
  const routeTeamSlug = params.teamSlug as string
  const setContents = useContentStore((state) => state.setContents)
  const [content, setContent] = useState<Content[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [assigneeFilter, setAssigneeFilter] = useState('all')
  const [teamMembers, setTeamMembers] = useState<TeamMemberItem[]>([])
  const [loadError, setLoadError] = useState<string | null>(null)
  const [loadErrorStatus, setLoadErrorStatus] = useState<number | null>(null)
  const [loadErrorRetryable, setLoadErrorRetryable] = useState(true)
  const [actionError, setActionError] = useState<string | null>(null)
  const [view, setView] = useState<'kanban' | 'list' | 'calendar'>('kanban')
  const [quickFilter, setQuickFilter] = useState<QuickFilter>('all')
  const [itemTypeFilter, setItemTypeFilter] = useState<ItemTypeFilter>('all')
  const [isCreatingIdea, setIsCreatingIdea] = useState(false)
  const [selectedIdeaId, setSelectedIdeaId] = useState<string | null>(null)
  const [isIdeaPanelOpen, setIsIdeaPanelOpen] = useState(false)
  const [selectedPostId, setSelectedPostId] = useState<string | null>(null)
  const [isPostPanelOpen, setIsPostPanelOpen] = useState(false)
  const hasTrackedViewLoaded = useRef(false)
  const lastTrackedEmptyState = useRef<string | null>(null)
  const quickFilterFromQuery = parseQuickFilter(searchParams.get('quickFilter'))

  useEffect(() => {
    setQuickFilter(quickFilterFromQuery)
  }, [quickFilterFromQuery])

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
    setLoadError(null)
    setLoadErrorStatus(null)
    setLoadErrorRetryable(true)

    const [contentResult, teamMembersResult] = await Promise.allSettled([
      fetchContentData(currentTeam.id),
      fetchTeamMembersData(currentTeam.id),
    ])

    if (contentResult.status === 'fulfilled') {
      setContent(contentResult.value)
      setContents(contentResult.value)
    } else {
      const reason = contentResult.reason
      const isRequestError = reason instanceof RequestError
      setContent([])
      setContents([])
      setLoadError(isRequestError ? reason.message : 'Failed to load content')
      setLoadErrorStatus(isRequestError ? reason.status : 500)
      setLoadErrorRetryable(isRequestError ? reason.retryable : true)
      console.error('Failed to load collaboration content:', reason)
    }

    if (teamMembersResult.status === 'fulfilled') {
      setTeamMembers(teamMembersResult.value)
    } else {
      setTeamMembers([])
      console.error('Failed to load team members:', teamMembersResult.reason)
    }

    setIsLoading(false)
  }, [currentTeam?.id, fetchContentData, fetchTeamMembersData, setContents])

  useEffect(() => {
    if (currentTeam?.id) {
      loadData()
    }
  }, [currentTeam?.id, loadData])

  useEffect(() => {
    if (!currentTeam?.id) return

    const onFocus = () => {
      loadData()
    }

    const onVisibility = () => {
      if (document.visibilityState === 'visible') {
        loadData()
      }
    }

    const onContentUpdated = (event: Event) => {
      const custom = event as CustomEvent<{ content?: Content; team_id?: string }>
      const updated = custom.detail?.content
      if (!updated) return
      if (custom.detail?.team_id && custom.detail.team_id !== currentTeam.id) return

      setContent((prev) => {
        const exists = prev.some((item) => item.id === updated.id)
        const next = exists
          ? prev.map((item) => (item.id === updated.id ? { ...item, ...updated } : item))
          : [updated, ...prev]
        setContents(next)
        return next
      })
    }

    window.addEventListener('focus', onFocus)
    document.addEventListener('visibilitychange', onVisibility)
    window.addEventListener('content:updated', onContentUpdated as EventListener)

    return () => {
      window.removeEventListener('focus', onFocus)
      document.removeEventListener('visibilitychange', onVisibility)
      window.removeEventListener('content:updated', onContentUpdated as EventListener)
    }
  }, [currentTeam?.id, loadData, setContents])

  const handleStatusChange = async (contentId: string, newStatus: Content['status']) => {
    const previous = content
    const optimistic = previous.map((item) => (item.id === contentId ? { ...item, status: newStatus } : item))
    setContent(optimistic)
    setContents(optimistic)

    try {
      const response = await fetch(`/api/content/${contentId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: newStatus,
          change_reason: null,
        }),
      })

      if (!response.ok) {
        await parseRequestError(response, 'Failed to update status')
      }

      const { data } = await response.json()
      if (data) {
        const next = optimistic.map((item) => (item.id === contentId ? { ...item, ...data } : item))
        setContent(next)
        setContents(next)
      }

    } catch (err) {
      console.error(err)
      setActionError(err instanceof Error ? err.message : 'Failed to update status')
      setContent(previous)
      setContents(previous)
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
      const next = content.map((item) =>
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
                    created_at:
                      item.assignedTo?.created_at ||
                      item.createdBy?.created_at ||
                      new Date().toISOString(),
                  }
                : undefined,
            }
          : item
      )
      setContent(next)
      setContents(next)
    } catch (err) {
      console.error(err)
      setActionError(err instanceof Error ? err.message : 'Failed to update owner')
    }
  }

  const handleRemoveContent = async (contentId: string) => {
    try {
      const response = await fetch(`/api/content/${contentId}`, {
        method: 'DELETE',
      })
      if (!response.ok) {
        await parseRequestError(response, 'Failed to remove content')
      }

      setContent((prev) => {
        const next = prev.filter((item) => item.id !== contentId)
        setContents(next)
        return next
      })

      if (selectedIdeaId === contentId) {
        setIsIdeaPanelOpen(false)
        setSelectedIdeaId(null)
      }
      if (selectedPostId === contentId) {
        setIsPostPanelOpen(false)
        setSelectedPostId(null)
      }
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed to remove content')
    }
  }

  const openPost = (postId: string) => {
    if (routeTeamSlug) {
      router.push(`/${routeTeamSlug}/content/${postId}`)
    }
  }

  const openPostPanelById = (postId: string) => {
    const exists = content.some(
      (item) => item.id === postId && (item.item_type || 'POST') === 'POST'
    )
    if (!exists) {
      setActionError('Linked post is not loaded in this view yet. Opening full editor.')
      openPost(postId)
      return
    }
    setSelectedPostId(postId)
    setIsPostPanelOpen(true)
  }

  const openLinkedPostById = (postId: string, source: 'idea_card' | 'idea_panel') => {
    const exists = content.some(
      (item) => item.id === postId && (item.item_type || 'POST') === 'POST'
    )

    trackCollabEvent('idea_linked_post_opened', {
      post_id: postId,
      source,
      team_id: currentTeam?.id || null,
      post_loaded: exists,
    })
    openPostPanelById(postId)
  }

  const handleCardClick = (contentItem: Content) => {
    if ((contentItem.item_type || 'POST') === 'IDEA') {
      setSelectedIdeaId(contentItem.id)
      setIsIdeaPanelOpen(true)
      return
    }

    setSelectedPostId(contentItem.id)
    setIsPostPanelOpen(true)
  }

  const openIdeaById = (ideaId: string) => {
    const exists = content.some((item) => item.id === ideaId && (item.item_type || 'POST') === 'IDEA')
    if (!exists) {
      setActionError('Linked idea is not available in this view.')
      return
    }
    setSelectedIdeaId(ideaId)
    setIsIdeaPanelOpen(true)
  }

  const hasActiveFilters =
    searchQuery.trim().length > 0 ||
    assigneeFilter !== 'all' ||
    quickFilter !== 'all' ||
    itemTypeFilter !== 'all'
  const activeAdvancedFilterCount =
    (assigneeFilter !== 'all' ? 1 : 0) + (itemTypeFilter !== 'all' ? 1 : 0)

  const filteredContent = useMemo(
    () =>
      content.filter((item) => {
        const matchesSearch = getContentTitle(item.title, '').toLowerCase().includes(searchQuery.toLowerCase())
        if (!matchesSearch) return false
        if (itemTypeFilter !== 'all' && (item.item_type || 'POST') !== itemTypeFilter) return false

        if (quickFilter === 'mine') {
          const ownerId = getOwnerId(item)
          if (!currentUser?.id || ownerId !== currentUser.id) return false
        }
        if (quickFilter === 'unassigned' && !isUnassigned(item)) return false
        if (quickFilter === 'needs_review' && item.status !== 'IN_REVIEW') return false
        if (quickFilter === 'overdue' && !isOverdue(item)) return false
        if (quickFilter === 'approved' && item.status !== 'APPROVED') return false

        if (assigneeFilter === 'all') return true
        const assignedId = getOwnerId(item)
        return assignedId === assigneeFilter
      }),
    [content, searchQuery, assigneeFilter, quickFilter, itemTypeFilter, currentUser?.id]
  )

  const quickFilterMeta = useMemo(
    () => [
      { id: 'all' as const, label: 'All', count: content.length },
      {
        id: 'mine' as const,
        label: 'Mine',
        count: content.filter((item) => {
          const ownerId = getOwnerId(item)
          return !!currentUser?.id && ownerId === currentUser.id
        }).length,
      },
      {
        id: 'unassigned' as const,
        label: 'Unassigned',
        count: content.filter(isUnassigned).length,
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

  const clearFilters = () => {
    setSearchQuery('')
    setAssigneeFilter('all')
    setQuickFilter('all')
    setItemTypeFilter('all')
  }

  const viewState: ViewState = useMemo(() => {
    if (isLoading) return 'loading'
    if (loadErrorStatus === 401 || loadErrorStatus === 403) return 'empty_permission'
    if (loadError) return 'error'
    if (content.length === 0) return 'empty_first_use'
    if (filteredContent.length === 0 && hasActiveFilters) return 'empty_filtered'
    return 'ready'
  }, [isLoading, loadErrorStatus, loadError, content.length, filteredContent.length, hasActiveFilters])

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
    if (routeTeamSlug) {
      router.push(`/${routeTeamSlug}/team`)
    }
  }

  const goToNewPost = () => {
    if (routeTeamSlug) {
      router.push(`/${routeTeamSlug}/content/new`)
    }
  }

  const goToIdeaMoodboard = () => {
    if (routeTeamSlug) {
      router.push(`/${routeTeamSlug}/collaboration/idea-inbox`)
    }
  }

  const createIdea = async () => {
    if (!currentTeam?.id) return

    try {
      setIsCreatingIdea(true)
      const response = await fetch('/api/content', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          team_id: currentTeam.id,
          title: 'Untitled idea',
          blocks: [],
          platforms: [],
          item_type: 'IDEA',
          idea_state: 'INBOX',
        }),
      })

      if (!response.ok) {
        await parseRequestError(response, 'Failed to create idea')
      }

      const body = await response.json()
      const idea = body?.data as Content | undefined
      if (!idea) return

      const next = [idea, ...content]
      setContent(next)
      setContents(next)
      setSearchQuery('')
      setAssigneeFilter('all')
      setQuickFilter('all')
      setItemTypeFilter('IDEA')
      setView('kanban')
      setSelectedIdeaId(idea.id)
      setIsIdeaPanelOpen(true)
      trackCollabEvent('idea_created', {
        team_id: currentTeam.id,
        idea_id: idea.id,
      })
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed to create idea')
    } finally {
      setIsCreatingIdea(false)
    }
  }

  const handleConvertIdea = async (
    ideaId: string,
    options?: {
      post_title?: string
      post_status?: string
      assigned_to?: string | null
      include_notes?: boolean
    }
  ) => {
    if (!currentTeam?.slug) return

    try {
      const response = await fetch(`/api/ideas/${ideaId}/convert`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(options || {}),
      })
      if (!response.ok) {
        await parseRequestError(response, 'Failed to convert idea')
      }

      const body = await response.json()
      const updatedIdea = body?.data?.idea as Content | undefined
      const post = body?.data?.post as Content | undefined
      const alreadyConverted = Boolean(body?.data?.already_converted)

      if (updatedIdea || post) {
        setContent((prev) => {
          let next = prev

          if (updatedIdea) {
            next = next.map((item) =>
              item.id === updatedIdea.id ? { ...item, ...updatedIdea } : item
            )
          }

          if (post && !next.some((item) => item.id === post.id)) {
            next = [post, ...next]
          }

          setContents(next)
          return next
        })
      }

      if (post) {
        trackCollabEvent('idea_converted_to_post', {
          idea_id: ideaId,
          post_id: post.id,
          already_converted: alreadyConverted,
          team_id: currentTeam.id,
        })
        setIsIdeaPanelOpen(false)
        setSelectedPostId(post.id)
        setIsPostPanelOpen(true)
      }
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed to convert idea')
      trackCollabEvent('idea_conversion_failed', {
        idea_id: ideaId,
        team_id: currentTeam.id,
      })
    }
  }

  if (!currentTeam) {
    return (
      <div className="flex min-h-full items-center justify-center text-muted-foreground">
        <p>Please select a team</p>
      </div>
    )
  }

  const selectedIdea = content.find(
    (item) => item.id === selectedIdeaId && (item.item_type || 'POST') === 'IDEA'
  ) || null
  const selectedPost = content.find(
    (item) => item.id === selectedPostId && (item.item_type || 'POST') === 'POST'
  ) || null

  return (
    <DashboardContainer className="flex h-full flex-1 flex-col py-3 md:py-4">
      <div className="collab-toolbar flex flex-wrap items-center justify-between gap-3 px-0 py-3">
        <div className="flex min-w-[220px] items-center gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-semibold text-foreground">Collaboration</h1>
              <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                UI {COLLAB_UI_VERSION}
              </span>
            </div>
            <p className="text-[11px] text-muted-foreground">Manage content workflow</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-end gap-2">
          <div className="relative min-w-[220px] flex-1 sm:flex-none">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search content..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-8 w-full sm:w-[210px] pl-9 bg-card border-border text-xs"
            />
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="h-8 gap-2 rounded-md text-xs">
                <SlidersHorizontal className="h-3.5 w-3.5" />
                Filters
                {activeAdvancedFilterCount > 0 ? (
                  <span className="rounded bg-accent px-1.5 py-0.5 text-[10px] text-foreground">
                    {activeAdvancedFilterCount}
                  </span>
                ) : null}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>Item Type</DropdownMenuLabel>
              <DropdownMenuItem onClick={() => setItemTypeFilter('all')}>
                <span className="mr-2 inline-flex h-3.5 w-3.5 items-center justify-center">
                  {itemTypeFilter === 'all' ? <Check className="h-3 w-3" /> : null}
                </span>
                All types
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setItemTypeFilter('IDEA')}>
                <span className="mr-2 inline-flex h-3.5 w-3.5 items-center justify-center">
                  {itemTypeFilter === 'IDEA' ? <Check className="h-3 w-3" /> : null}
                </span>
                Ideas
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setItemTypeFilter('POST')}>
                <span className="mr-2 inline-flex h-3.5 w-3.5 items-center justify-center">
                  {itemTypeFilter === 'POST' ? <Check className="h-3 w-3" /> : null}
                </span>
                Posts
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuLabel>Owner</DropdownMenuLabel>
              <DropdownMenuItem onClick={() => setAssigneeFilter('all')}>
                <span className="mr-2 inline-flex h-3.5 w-3.5 items-center justify-center">
                  {assigneeFilter === 'all' ? <Check className="h-3 w-3" /> : null}
                </span>
                All owners
              </DropdownMenuItem>
              {teamMembers
                .filter((member) => member.user?.id)
                .map((member) => {
                  const ownerId = member.user?.id || ''
                  const ownerLabel =
                    member.user?.name || member.user?.full_name || member.user?.email || 'Unknown'
                  return (
                    <DropdownMenuItem key={member.id} onClick={() => setAssigneeFilter(ownerId)}>
                      <span className="mr-2 inline-flex h-3.5 w-3.5 items-center justify-center">
                        {assigneeFilter === ownerId ? <Check className="h-3 w-3" /> : null}
                      </span>
                      <span className="truncate">{ownerLabel}</span>
                    </DropdownMenuItem>
                  )
                })}
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={clearFilters}>Reset filters</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <div className="hidden h-6 w-px bg-border md:block" />

          <div className="flex rounded-md border border-border bg-card p-0.5">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setView('kanban')
                trackCollabEvent('collab_view_changed', { view: 'kanban', team_id: currentTeam.id })
              }}
              className={cn(
                'h-7 rounded-sm px-2',
                view === 'kanban' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
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
                'h-7 rounded-sm px-2',
                view === 'list' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
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
                'h-7 rounded-sm px-2',
                view === 'calendar' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <Calendar className="h-4 w-4" />
            </Button>
          </div>

          <Button
            variant="outline"
            className="h-8 rounded-md text-xs"
            onClick={goToIdeaMoodboard}
          >
            <Lightbulb className="mr-1 h-3.5 w-3.5" />
            Idea Moodboard
          </Button>
          <Button
            variant="outline"
            className="h-8 rounded-md text-xs"
            onClick={goToNewPost}
          >
            New Post
          </Button>
          <Button
            className="h-8 rounded-md bg-foreground text-background hover:bg-foreground/90 text-xs"
            onClick={createIdea}
            disabled={isCreatingIdea}
          >
            {isCreatingIdea ? 'Creating Idea...' : 'New Idea'}
          </Button>
        </div>
      </div>

      <div className="collab-toolbar flex items-center gap-0.5 overflow-x-auto px-0 py-2">
        {quickFilterMeta.map((filter) => (
          <Button
            key={filter.id}
            size="sm"
            variant="ghost"
            className={cn(
              'h-7 whitespace-nowrap rounded px-2 text-[11px] font-medium',
              quickFilter === filter.id
                ? 'bg-muted text-foreground'
                : 'text-muted-foreground hover:bg-accent/60 hover:text-foreground'
            )}
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
            className="ml-1 h-7 rounded px-2 text-[11px] text-muted-foreground hover:bg-accent/60 hover:text-foreground"
            onClick={clearFilters}
          >
            Clear filters
          </Button>
        ) : null}
      </div>

      {actionError ? (
        <div className="border-b border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700 dark:border-red-900/50 dark:bg-red-950/20 dark:text-red-200">
          {actionError}
        </div>
      ) : null}

      <div className="flex-1 overflow-hidden">
        {viewState === 'loading' ? <CollabSkeleton view={view} /> : null}

        {viewState === 'error' ? (
          <CollabErrorState
            message={loadError || 'Failed to load collaboration data'}
            showRetry={loadErrorRetryable}
            onRetry={() => {
              trackCollabEvent('collab_retry_clicked', {
                team_id: currentTeam.id,
                error_status: loadErrorStatus,
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
            onClearFilters={clearFilters}
            onGoToTeam={goToTeam}
          />
        ) : null}

        {viewState === 'empty_first_use' ? (
          <CollabEmptyState
            variant="first_use"
            onCreatePost={goToNewPost}
            onClearFilters={clearFilters}
            onGoToTeam={goToTeam}
          />
        ) : null}

        {viewState === 'empty_filtered' ? (
          <CollabEmptyState
            variant="filtered"
            onCreatePost={goToNewPost}
            onClearFilters={clearFilters}
            onGoToTeam={goToTeam}
          />
        ) : null}

        {viewState === 'ready' ? (
          <div className="flex h-full min-w-0">
            <KanbanBoard
              content={filteredContent}
              onStatusChange={handleStatusChange}
              onCardClick={handleCardClick}
              onOpenFullEditor={openPost}
              onRemoveContent={handleRemoveContent}
              view={view}
              onViewChange={setView}
              teamMembers={teamMembers}
              onAssign={handleAssign}
              onConvertIdea={handleConvertIdea}
              onOpenLinkedIdea={openIdeaById}
              onOpenLinkedPost={(postId) => openLinkedPostById(postId, 'idea_card')}
            />
          </div>
        ) : null}
      </div>

      <IdeaEditorPanel
        open={isIdeaPanelOpen}
        idea={selectedIdea}
        teamMembers={teamMembers}
        onOpenChange={setIsIdeaPanelOpen}
        onIdeaUpdated={(updatedIdea) => {
          const next = content.map((item) =>
            item.id === updatedIdea.id ? { ...item, ...updatedIdea } : item
          )
          setContent(next)
          setContents(next)
        }}
        onConvertIdea={handleConvertIdea}
        onOpenLinkedPost={(postId) => openLinkedPostById(postId, 'idea_panel')}
      />

      <PostEditorPanel
        open={isPostPanelOpen}
        post={selectedPost}
        teamMembers={teamMembers}
        onOpenChange={setIsPostPanelOpen}
        onPostUpdated={(updatedPost) => {
          setContent((prev) => {
            const next = prev.map((item) =>
              item.id === updatedPost.id ? { ...item, ...updatedPost } : item
            )
            setContents(next)
            return next
          })
        }}
        onOpenFullEditor={openPost}
      />
    </DashboardContainer>
  )
}
