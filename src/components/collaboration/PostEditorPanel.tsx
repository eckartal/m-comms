'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useParams, usePathname } from 'next/navigation'
import type { Content, ContentBlock, PlatformType } from '@/types'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { getTicketKey, inferTitleFromNotes } from '@/lib/ticketPresentation'
import { useAppStore, useContentStore } from '@/stores'
import { connectPlatform } from '@/lib/oauth/connectPlatform'
import { getLocalConnectedPlatforms, getLocalConnectionAccounts } from '@/lib/oauth/localConnections'
import { useConnectionMode } from '@/hooks/useConnectionMode'
import { SandboxConfirmDialog } from '@/components/oauth/SandboxConfirmDialog'
import { toast } from 'sonner'
import { ChevronLeft, ChevronRight, Link2 } from 'lucide-react'
import { PostComposerWorkspace, type ComposerPlatformRow } from '@/components/composer/PostComposerWorkspace'

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

interface PostEditorPanelProps {
  open: boolean
  post: Content | null
  teamMembers: TeamMemberItem[]
  onOpenChange: (open: boolean) => void
  onPostUpdated: (post: Content) => void
  linkedIdea?: Content | null
  linkedIdeaLoading?: boolean
  linkedIdeaError?: string | null
  onOpenLinkedIdea?: (ideaId: string) => void
  onOpenFullEditor: (postId: string) => void
}

type ThreadItem = {
  id: string
  content: string
}

type PlatformAccountItem = {
  id: string
  account_name: string
  account_handle?: string | null
  source?: 'real_oauth' | 'local_sandbox' | 'unknown'
}

type PlatformCatalogItem = {
  id: string
  name: string
  connected: boolean
  accounts: PlatformAccountItem[]
  oauth_configured?: boolean
}

const PLATFORMS: Record<PlatformType, { name: string; limit: number }> = {
  twitter: { name: 'X (Twitter)', limit: 280 },
  linkedin: { name: 'LinkedIn', limit: 3000 },
  instagram: { name: 'Instagram', limit: 2200 },
  tiktok: { name: 'TikTok', limit: 2200 },
  youtube: { name: 'YouTube', limit: 5000 },
  threads: { name: 'Threads', limit: 500 },
  bluesky: { name: 'Bluesky', limit: 300 },
  mastodon: { name: 'Mastodon', limit: 500 },
  facebook: { name: 'Facebook', limit: 63000 },
}

const SUPPORTED_PLATFORM_KEYS = new Set(Object.keys(PLATFORMS))

function isSupportedPlatform(id: string): id is PlatformType {
  return SUPPORTED_PLATFORM_KEYS.has(id)
}

function extractBlockText(content: unknown): string {
  if (typeof content === 'string') return content
  if (content && typeof content === 'object') {
    const value = (content as { text?: unknown }).text
    if (typeof value === 'string') return value
  }
  return ''
}

function parseThreadFromBlocks(blocks: unknown): ThreadItem[] {
  if (!Array.isArray(blocks) || blocks.length === 0) return [{ id: 'thread-1', content: '' }]

  const items: ThreadItem[] = []
  for (const rawBlock of blocks) {
    const block = rawBlock as { id?: unknown; type?: unknown; content?: unknown } | null
    if (!block || typeof block !== 'object') continue
    const blockId = typeof block.id === 'string' ? block.id : `thread-${items.length + 1}`

    if (block.type === 'thread' && block.content && typeof block.content === 'object') {
      const tweets = (block.content as { tweets?: unknown }).tweets
      if (Array.isArray(tweets)) {
        for (const tweet of tweets) {
          if (!tweet || typeof tweet !== 'object') continue
          const tweetText = (tweet as { text?: unknown }).text
          if (typeof tweetText === 'string') {
            items.push({ id: `${blockId}-${items.length + 1}`, content: tweetText })
          }
        }
      }
      continue
    }

    const text = extractBlockText(block.content)
    if (text.length > 0 || items.length === 0) items.push({ id: blockId, content: text })
  }

  return items.length > 0 ? items : [{ id: 'thread-1', content: '' }]
}

function serializeThreadToBlocks(thread: ThreadItem[]): ContentBlock[] {
  return thread
    .map((item, index) => ({
      id: item.id || `thread-${index + 1}`,
      type: 'text' as const,
      content: { text: item.content },
    }))
    .filter((block) => extractBlockText(block.content).trim().length > 0)
}

function extractIdeaNotes(blocks: unknown): string {
  const [first] = parseThreadFromBlocks(blocks)
  return first?.content || ''
}

function getEnabledTargets(platforms: Content['platforms'] | undefined): PlatformType[] {
  if (!Array.isArray(platforms)) return ['twitter']
  const enabled = platforms
    .map((item) => item?.platform)
    .filter((platform): platform is PlatformType => typeof platform === 'string' && isSupportedPlatform(platform))
  return enabled.length > 0 ? Array.from(new Set(enabled)) : ['twitter']
}

const UNTITLED_TITLE_RE = /^untitled(\s+idea|\s+post)?$/i

function resolvePostTitle(params: {
  currentTitle: string
  notes: string
  titleTouched: boolean
}) {
  const rawTitle = params.currentTitle.trim()
  const hasMeaningfulTitle = rawTitle.length > 0 && !UNTITLED_TITLE_RE.test(rawTitle)

  if (params.titleTouched) return rawTitle || 'Untitled post'
  if (hasMeaningfulTitle) return rawTitle
  return inferTitleFromNotes(params.notes, 'POST', params.currentTitle)
}

export function PostEditorPanel({
  open,
  post,
  teamMembers,
  onOpenChange,
  onPostUpdated,
  linkedIdea,
  linkedIdeaLoading = false,
  linkedIdeaError = null,
  onOpenLinkedIdea,
  onOpenFullEditor,
}: PostEditorPanelProps) {
  const allContents = useContentStore((state) => state.contents)
  const { currentTeam } = useAppStore()
  const params = useParams<{ teamSlug?: string }>()
  const pathname = usePathname()
  const teamSlug = typeof params?.teamSlug === 'string' ? params.teamSlug : undefined
  const { mode: connectionMode } = useConnectionMode(teamSlug)

  const [title, setTitle] = useState('')
  const [thread, setThread] = useState<ThreadItem[]>([{ id: 'thread-1', content: '' }])
  const [activeIndex, setActiveIndex] = useState(0)
  const [isBookmarked, setIsBookmarked] = useState(false)
  const [status, setStatus] = useState<'DRAFT' | 'IN_REVIEW' | 'APPROVED' | 'SCHEDULED' | 'PUBLISHED' | 'ARCHIVED'>('DRAFT')
  const [assignedTo, setAssignedTo] = useState('')
  const [selectedPlatform, setSelectedPlatform] = useState<PlatformType>('twitter')
  const [targetPlatforms, setTargetPlatforms] = useState<PlatformType[]>(['twitter'])
  const [connectedPlatforms, setConnectedPlatforms] = useState<PlatformType[]>([])
  const [platformCatalog, setPlatformCatalog] = useState<PlatformCatalogItem[]>([])
  const [publishablePlatforms, setPublishablePlatforms] = useState<Set<PlatformType>>(new Set(['twitter', 'linkedin']))
  const [connectionsLoading, setConnectionsLoading] = useState(true)
  const [connectingPlatform, setConnectingPlatform] = useState<PlatformType | null>(null)
  const [platformPickerOpen, setPlatformPickerOpen] = useState(false)
  const [sandboxConnectPlatform, setSandboxConnectPlatform] = useState<PlatformType | null>(null)
  const [showIdeaContext, setShowIdeaContext] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null)
  const [isAutoSaving, setIsAutoSaving] = useState(false)
  const [titleTouched, setTitleTouched] = useState(false)
  const [isPublishing, setIsPublishing] = useState(false)
  const [isScheduling, setIsScheduling] = useState(false)

  useEffect(() => {
    if (!post) return
    setTitle(post.title || '')
    setThread(parseThreadFromBlocks(post.blocks))
    setActiveIndex(0)
    setStatus(post.status)
    setAssignedTo(post.assigned_to || '')

    const initialTargets = getEnabledTargets(post.platforms)
    setTargetPlatforms(initialTargets)
    setSelectedPlatform(initialTargets[0] || 'twitter')

    setSaveError(null)
    setLastSavedAt(null)
    setIsAutoSaving(false)
    setTitleTouched(false)
  }, [post?.id, post])

  useEffect(() => {
    setShowIdeaContext(true)
  }, [post?.id])

  const fetchConnectedPlatforms = useCallback(async () => {
    if (!teamSlug) return

    try {
      setConnectionsLoading(true)
      const res = await fetch(`/api/platforms?teamSlug=${encodeURIComponent(teamSlug)}`)
      const data = await res.json()
      const localConnected = getLocalConnectedPlatforms(teamSlug, currentTeam?.id)
      const localConnections = getLocalConnectionAccounts(teamSlug, currentTeam?.id)

      if (!res.ok) {
        setConnectedPlatforms(localConnected.filter((id) => isSupportedPlatform(id)) as PlatformType[])
        setPlatformCatalog([])
        setPublishablePlatforms(new Set(['twitter', 'linkedin']))
        return
      }

      const catalog = ((data.data || []) as PlatformCatalogItem[])
        .filter((platform) => isSupportedPlatform(platform.id))
        .map((platform) => {
          const localAccount = localConnections[platform.id]
          if (!localAccount || platform.accounts.length > 0) return platform
          return {
            ...platform,
            connected: true,
            accounts: [{
              id: `local:${platform.id}`,
              account_name: localAccount.account_name,
              account_handle: localAccount.account_handle,
              source: localAccount.source,
            }],
          }
        })

      setPlatformCatalog(catalog)

      const publishableFromApi = ((data?.meta?.publishable_platforms || []) as string[])
        .filter((id) => isSupportedPlatform(id))
      setPublishablePlatforms(
        publishableFromApi.length > 0 ? new Set(publishableFromApi as PlatformType[]) : new Set(['twitter', 'linkedin'])
      )

      const connected = catalog.filter((platform) => platform.connected).map((platform) => platform.id as PlatformType)
      const merged = Array.from(new Set([...connected, ...localConnected]))
        .filter((id) => isSupportedPlatform(id)) as PlatformType[]
      setConnectedPlatforms(merged)
    } catch {
      setConnectedPlatforms(
        getLocalConnectedPlatforms(teamSlug, currentTeam?.id).filter((id) => isSupportedPlatform(id)) as PlatformType[]
      )
      setPlatformCatalog([])
      setPublishablePlatforms(new Set(['twitter', 'linkedin']))
    } finally {
      setConnectionsLoading(false)
    }
  }, [teamSlug, currentTeam?.id])

  useEffect(() => {
    if (!open) return
    void fetchConnectedPlatforms()
  }, [open, fetchConnectedPlatforms])

  const runConnectPlatform = async (platform: PlatformType, skipSandboxConfirmation = false) => {
    setConnectingPlatform(platform)
    try {
      await connectPlatform({
        platform,
        teamId: currentTeam?.id,
        teamSlug,
        returnTo: pathname || `/${teamSlug}/collaboration`,
        mode: 'popup',
        source: 'composer',
        skipSandboxConfirmation,
        onSuccess: async () => {
          await fetchConnectedPlatforms()
          toast.success(`${PLATFORMS[platform].name} connected.`)
        },
      })
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to connect')
    } finally {
      setConnectingPlatform(null)
    }
  }

  const handleConnectPlatform = async (platform: PlatformType) => {
    const selected = platformCatalog.find((item) => item.id === platform)
    const requiresConfiguration = connectionMode === 'real_oauth' && selected?.oauth_configured === false
    if (requiresConfiguration) {
      toast.error(`${selected?.name || platform} is not configured. Add client credentials first.`)
      return
    }

    if (connectionMode === 'local_sandbox') {
      setSandboxConnectPlatform(platform)
      return
    }

    await runConnectPlatform(platform)
  }

  const ticketKey = useMemo(() => (post ? getTicketKey(post.id, allContents) : null), [post, allContents])
  const linkedIdeaTicket = useMemo(() => (linkedIdea?.id ? getTicketKey(linkedIdea.id, allContents) : null), [linkedIdea?.id, allContents])
  const linkedIdeaNotes = useMemo(() => extractIdeaNotes(linkedIdea?.blocks), [linkedIdea?.blocks])
  const hasLinkedIdeaContext = !!post?.source_idea_id

  const initialTargetsKey = useMemo(() => (post ? getEnabledTargets(post.platforms).slice().sort().join(',') : ''), [post])
  const currentTargetsKey = useMemo(() => targetPlatforms.slice().sort().join(','), [targetPlatforms])

  const hasChanges = useMemo(() => {
    if (!post) return false
    const initialTitle = post.title || ''
    const initialThreadText = parseThreadFromBlocks(post.blocks).map((item) => item.content)
    const currentThreadText = thread.map((item) => item.content)
    return (
      title !== initialTitle ||
      JSON.stringify(currentThreadText) !== JSON.stringify(initialThreadText) ||
      status !== post.status ||
      assignedTo !== (post.assigned_to || '') ||
      currentTargetsKey !== initialTargetsKey
    )
  }, [post, title, thread, status, assignedTo, currentTargetsKey, initialTargetsKey])

  const publishTargets = useMemo(() => {
    const targets = targetPlatforms.length > 0 ? targetPlatforms : [selectedPlatform]
    return Array.from(new Set(targets))
  }, [targetPlatforms, selectedPlatform])

  const targetSummary = useMemo(() => publishTargets.map((platform) => PLATFORMS[platform].name).join(', '), [publishTargets])

  const platformRows: ComposerPlatformRow[] = useMemo(() => {
    if (platformCatalog.length > 0) {
      return platformCatalog
        .filter((platform) => isSupportedPlatform(platform.id))
        .map((platform) => ({
          id: platform.id as PlatformType,
          name: platform.name,
          connected: connectedPlatforms.includes(platform.id as PlatformType),
          isPublishable: publishablePlatforms.has(platform.id as PlatformType),
          accountLabel: platform.accounts[0]
            ? `${platform.accounts[0].account_name}${platform.accounts[0].account_handle ? ` • ${platform.accounts[0].account_handle}` : ''}${platform.accounts[0].source === 'local_sandbox' ? ' • Sandbox' : ''}`
            : undefined,
        }))
    }

    return (Object.keys(PLATFORMS) as PlatformType[]).map((platform) => ({
      id: platform,
      name: PLATFORMS[platform].name,
      connected: connectedPlatforms.includes(platform),
      isPublishable: publishablePlatforms.has(platform),
    }))
  }, [platformCatalog, connectedPlatforms, publishablePlatforms])

  const hasContent = thread.some((item) => item.content.trim().length > 0)

  const buildPayload = useCallback((override?: Partial<{ status: Content['status']; scheduled_at: string | null }>) => {
    const notes = thread.map((item) => item.content).join('\n\n').trim()
    const normalizedTitle = resolvePostTitle({ currentTitle: title, notes, titleTouched })
    return {
      title: normalizedTitle,
      blocks: serializeThreadToBlocks(thread),
      status: override?.status || status,
      scheduled_at: override?.scheduled_at,
      assigned_to: assignedTo || null,
      platforms: publishTargets.map((platform) => ({ platform, enabled: true })),
    }
  }, [titleTouched, title, thread, status, assignedTo, publishTargets])

  const persistPost = useCallback(async (mode: 'manual' | 'auto' = 'manual', override?: Partial<{ status: Content['status']; scheduled_at: string | null }>) => {
    if (!post) return false

    if (mode === 'manual') {
      setIsSaving(true)
      setSaveError(null)
    } else {
      setIsAutoSaving(true)
    }

    try {
      const response = await fetch(`/api/content/${post.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(buildPayload(override)),
      })
      const body = await response.json().catch(() => null)

      if (!response.ok) {
        const baseMessage = typeof body?.error === 'string' ? body.error : 'Failed to save post'
        const code = typeof body?.code === 'string' ? body.code : null
        throw new Error(code ? `${baseMessage} (${code})` : baseMessage)
      }

      if (body?.data) {
        onPostUpdated(body.data as Content)
        setLastSavedAt(new Date().toISOString())
        setSaveError(null)
      }
      return true
    } catch (error) {
      setSaveError(error instanceof Error ? (mode === 'manual' ? error.message : `Autosave failed: ${error.message}`) : (mode === 'manual' ? 'Failed to save post' : 'Autosave failed'))
      return false
    } finally {
      if (mode === 'manual') setIsSaving(false)
      else setIsAutoSaving(false)
    }
  }, [post, buildPayload, onPostUpdated])

  useEffect(() => {
    if (!open || !post || !hasChanges || isSaving || isAutoSaving) return
    const timer = setTimeout(() => {
      void persistPost('auto')
    }, 1200)
    return () => clearTimeout(timer)
  }, [open, post, hasChanges, isSaving, isAutoSaving, title, thread, status, assignedTo, targetPlatforms, persistPost])

  const handlePublish = useCallback(async () => {
    if (!post) return
    if (!hasContent) return toast.error('Add some content before publishing.')

    const eligibleTargets = publishTargets.filter((platform) => connectedPlatforms.includes(platform) && publishablePlatforms.has(platform))
    if (eligibleTargets.length === 0) return toast.error('No publish-ready connected channels selected. Connect X or LinkedIn first.')

    setIsPublishing(true)
    try {
      const saved = await persistPost('manual')
      if (!saved) throw new Error('Failed to save latest changes before publishing')

      const publishResponse = await fetch(`/api/content/${post.id}/publish`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ platforms: eligibleTargets }),
      })
      const publishData = await publishResponse.json().catch(() => null)
      if (!publishResponse.ok) throw new Error((publishData as { error?: string } | null)?.error || 'Publish request failed')

      const successful = Number((publishData as { data?: { summary?: { successful?: number } } } | null)?.data?.summary?.successful || 0)
      const failed = Number((publishData as { data?: { summary?: { failed?: number } } } | null)?.data?.summary?.failed || 0)
      if (successful === 0) throw new Error('No platforms were published successfully')
      if (failed > 0) toast.error(`Published to ${successful} platform(s), but ${failed} failed. Check publish history for details.`)
      else toast.success(`Published to ${successful} platform${successful === 1 ? '' : 's'}.`)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to publish')
    } finally {
      setIsPublishing(false)
    }
  }, [post, hasContent, publishTargets, connectedPlatforms, publishablePlatforms, persistPost])

  const handleSchedule = useCallback(async () => {
    if (!post) return
    if (!hasContent) return toast.error('Add some content before scheduling.')

    setIsScheduling(true)
    try {
      const scheduledAt = new Date(Date.now() + 60 * 60 * 1000)
      const saved = await persistPost('manual', { status: 'SCHEDULED', scheduled_at: scheduledAt.toISOString() })
      if (!saved) throw new Error('Failed to schedule post')
      setStatus('SCHEDULED')
      toast.success(`Scheduled for ${scheduledAt.toLocaleString()}`)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to schedule')
    } finally {
      setIsScheduling(false)
    }
  }, [post, hasContent, persistPost])

  useEffect(() => {
    if (!open) return
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
        event.preventDefault()
        void handlePublish()
      }
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [open, handlePublish])

  const topSection = (
    <div className="mb-4 grid grid-cols-1 gap-3 md:grid-cols-2">
      <div className="space-y-2">
        <label className="text-[11px] uppercase tracking-wide text-muted-foreground">Status</label>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value as typeof status)}
          className="h-10 w-full rounded-[8px] border border-border bg-card px-3 text-sm text-foreground"
        >
          <option value="DRAFT">Draft</option>
          <option value="IN_REVIEW">In Review</option>
          <option value="APPROVED">Approved</option>
          <option value="SCHEDULED">Scheduled</option>
          <option value="PUBLISHED">Shared</option>
          <option value="ARCHIVED">Archived</option>
        </select>
      </div>

      <div className="space-y-2">
        <label className="text-[11px] uppercase tracking-wide text-muted-foreground">Owner</label>
        <select
          value={assignedTo}
          onChange={(e) => setAssignedTo(e.target.value)}
          className="h-10 w-full rounded-[8px] border border-border bg-card px-3 text-sm text-foreground"
        >
          <option value="">Unassigned</option>
          {teamMembers
            .filter((member) => member.user?.id)
            .map((member) => (
              <option key={member.id} value={member.user?.id || ''}>
                {member.user?.name || member.user?.full_name || member.user?.email || 'Unknown'}
              </option>
            ))}
        </select>
      </div>
    </div>
  )

  const footerSection = saveError ? (
    <div className="mt-3 rounded-sm border border-red-950/50 bg-red-950/20 px-3 py-2 text-xs text-red-200">{saveError}</div>
  ) : null

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        showOverlay={false}
        className="w-full gap-0 overflow-hidden border-l border-border bg-white p-0 text-foreground shadow-none dark:bg-[#050505] sm:max-w-[1120px]"
      >
        <SheetHeader className="border-b border-border bg-white px-4 py-2.5 dark:bg-[#050505]">
          <SheetTitle className="text-sm font-semibold text-foreground">Post</SheetTitle>
          <SheetDescription className="text-xs text-muted-foreground">Edit this post without leaving collaboration.</SheetDescription>
        </SheetHeader>

        {post ? (
          <div className="flex min-h-0 flex-1 flex-col">
            <div className="flex-1 overflow-y-auto bg-white p-4 custom-scrollbar dark:bg-[#050505]">
              <div className="mb-3 flex items-center justify-between">
                <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{ticketKey || 'POST'}</div>
                {hasLinkedIdeaContext ? (
                  <Button size="xs" variant="outline" className="h-6 px-2 text-[10px]" onClick={() => setShowIdeaContext((prev) => !prev)}>
                    {showIdeaContext ? <ChevronLeft className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                    {showIdeaContext ? 'Hide Context' : 'Show Context'}
                  </Button>
                ) : null}
              </div>

              <div className="flex flex-col gap-3 lg:flex-row">
                {hasLinkedIdeaContext && showIdeaContext ? (
                  <aside className="w-full shrink-0 lg:w-[220px]">
                    <div className="sticky top-0 space-y-2 rounded-[10px] border border-amber-200/80 bg-amber-50/95 p-3 shadow-sm dark:border-amber-900/70 dark:bg-amber-950/30">
                      <div className="flex items-center gap-2 text-[10px] uppercase tracking-wide text-amber-700 dark:text-amber-300">
                        <Link2 className="h-3 w-3" />
                        Idea Context
                      </div>
                      {linkedIdeaLoading ? (
                        <p className="text-xs text-muted-foreground">Loading linked idea...</p>
                      ) : linkedIdeaError ? (
                        <p className="text-xs text-red-400">{linkedIdeaError}</p>
                      ) : linkedIdea ? (
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <span className="rounded bg-muted px-1.5 py-0.5 text-[9px] text-muted-foreground">{linkedIdeaTicket || 'IDEA'}</span>
                            <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[9px] text-amber-700 dark:bg-amber-950/40 dark:text-amber-300">IDEA</span>
                          </div>
                          <p className="text-xs font-medium text-foreground">{linkedIdea.title || 'Untitled idea'}</p>
                          <div className="max-h-[200px] overflow-y-auto rounded-[8px] border border-amber-200/60 bg-white p-2 text-[11px] leading-5 text-muted-foreground dark:border-amber-900/70 dark:bg-black/20">{linkedIdeaNotes || 'No idea notes available.'}</div>
                          {onOpenLinkedIdea ? (
                            <Button size="xs" variant="outline" className="h-6 px-2 text-[10px]" onClick={() => onOpenLinkedIdea(linkedIdea.id)}>Open Idea</Button>
                          ) : null}
                        </div>
                      ) : (
                        <p className="text-xs text-muted-foreground">No linked idea found.</p>
                      )}
                    </div>
                  </aside>
                ) : null}

                <div className="flex-1">
                  <PostComposerWorkspace
                    title={title}
                    onTitleChange={(value) => {
                      setTitleTouched(true)
                      setTitle(value)
                    }}
                    thread={thread}
                    activeIndex={activeIndex}
                    onActiveIndexChange={setActiveIndex}
                    onThreadItemChange={(index, value) => setThread((prev) => prev.map((item, idx) => idx === index ? { ...item, content: value } : item))}
                    onAddThreadItem={() => {
                      const next = [...thread, { id: `thread-${Date.now()}`, content: '' }]
                      setThread(next)
                      setActiveIndex(next.length - 1)
                    }}
                    onRemoveThreadItem={(index) => {
                      if (thread.length === 1) {
                        setThread([{ id: thread[0]?.id || 'thread-1', content: '' }])
                        setActiveIndex(0)
                        return
                      }
                      const next = thread.filter((_, idx) => idx !== index)
                      setThread(next)
                      setActiveIndex(Math.min(index, next.length - 1))
                    }}
                    isBookmarked={isBookmarked}
                    onToggleBookmark={() => setIsBookmarked((prev) => !prev)}
                    selectedPlatform={selectedPlatform}
                    onSelectedPlatformChange={setSelectedPlatform}
                    platformMeta={PLATFORMS}
                    publishTargets={publishTargets}
                    targetSummary={targetSummary}
                    onToggleTargetPlatform={(platform) => {
                      if (!connectedPlatforms.includes(platform)) return
                      setTargetPlatforms((prev) => prev.includes(platform) ? prev.filter((item) => item !== platform) : [...prev, platform])
                    }}
                    selectedPlatformConnected={connectedPlatforms.includes(selectedPlatform)}
                    selectedPlatformPublishable={publishablePlatforms.has(selectedPlatform)}
                    connectionsLoading={connectionsLoading}
                    connectingPlatform={connectingPlatform}
                    onConnectPlatform={handleConnectPlatform}
                    platformPickerOpen={platformPickerOpen}
                    onPlatformPickerOpenChange={setPlatformPickerOpen}
                    platformRows={platformRows}
                    topSection={topSection}
                    footerSection={footerSection}
                  />
                </div>
              </div>
            </div>

            <div className="sticky bottom-0 border-t border-border bg-white px-4 py-2.5 dark:bg-[#050505]">
              <div className="flex flex-wrap items-center gap-2">
                <Button size="sm" className="h-8" onClick={() => void persistPost('manual')} disabled={isSaving || !hasChanges}>{isSaving ? 'Saving...' : 'Save Post'}</Button>
                <Button size="sm" variant="outline" className="h-8" onClick={() => void handleSchedule()} disabled={isScheduling || isPublishing || !hasContent}>{isScheduling ? 'Scheduling...' : 'Schedule'}</Button>
                <Button size="sm" className="h-8" onClick={() => void handlePublish()} disabled={isPublishing || isScheduling || !hasContent}>{isPublishing ? 'Publishing...' : 'Publish'}</Button>
                <Button size="sm" variant="outline" className="h-8" onClick={() => onOpenFullEditor(post.id)}>Open Page Editor</Button>
                <div className="ml-auto text-[10px] text-muted-foreground">
                  {isAutoSaving ? 'Autosaving...' : lastSavedAt ? `Saved ${new Date(lastSavedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : 'Autosave on'}
                </div>
              </div>
              <div className="mt-1 text-right text-[10px] text-muted-foreground">Press Ctrl/Cmd + Enter to publish</div>
            </div>
          </div>
        ) : (
          <div className="p-4 text-xs text-muted-foreground">No post selected</div>
        )}

        <SandboxConfirmDialog
          open={sandboxConnectPlatform !== null}
          platformName={sandboxConnectPlatform ? PLATFORMS[sandboxConnectPlatform].name : 'platform'}
          onCancel={() => setSandboxConnectPlatform(null)}
          onConfirm={() => {
            if (!sandboxConnectPlatform) return
            const selected = sandboxConnectPlatform
            setSandboxConnectPlatform(null)
            void runConnectPlatform(selected, true)
          }}
        />
      </SheetContent>
    </Sheet>
  )
}
