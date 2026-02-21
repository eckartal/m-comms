'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useParams, usePathname } from 'next/navigation'
import type { Content, ContentBlock, PlatformType } from '@/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { getTicketKey, inferTitleFromNotes } from '@/lib/ticketPresentation'
import { useAppStore, useContentStore } from '@/stores'
import { EditorToolbar } from '@/components/editor/EditorToolbar'
import { PlatformIcon } from '@/components/oauth/PlatformIcon'
import { connectPlatform } from '@/lib/oauth/connectPlatform'
import { getLocalConnectedPlatforms, getLocalConnectionAccounts } from '@/lib/oauth/localConnections'
import { useConnectionMode } from '@/hooks/useConnectionMode'
import { SandboxConfirmDialog } from '@/components/oauth/SandboxConfirmDialog'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import { ChevronLeft, ChevronRight, Link2, Plus, X, Settings2, ChevronDown, Check, Loader2 } from 'lucide-react'

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
  publishable?: boolean
  support_status?: 'publish_ready' | 'connect_only' | 'internal'
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
  if (!Array.isArray(blocks) || blocks.length === 0) {
    return [{ id: 'thread-1', content: '' }]
  }

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
    if (text.length > 0 || items.length === 0) {
      items.push({ id: blockId, content: text })
    }
  }

  if (items.length === 0) return [{ id: 'thread-1', content: '' }]
  return items
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
            accounts: [
              {
                id: `local:${platform.id}`,
                account_name: localAccount.account_name,
                account_handle: localAccount.account_handle,
                source: localAccount.source,
              },
            ],
          }
        })

      setPlatformCatalog(catalog)

      const publishableFromApi = ((data?.meta?.publishable_platforms || []) as string[])
        .filter((id) => isSupportedPlatform(id))
      setPublishablePlatforms(
        publishableFromApi.length > 0
          ? new Set(publishableFromApi as PlatformType[])
          : new Set(['twitter', 'linkedin'])
      )

      const connected = catalog
        .filter((platform) => platform.connected)
        .map((platform) => platform.id as PlatformType)
      const merged = Array.from(new Set([...connected, ...localConnected]))
        .filter((id) => isSupportedPlatform(id)) as PlatformType[]
      setConnectedPlatforms(merged)
    } catch {
      setConnectedPlatforms(getLocalConnectedPlatforms(teamSlug, currentTeam?.id).filter((id) => isSupportedPlatform(id)) as PlatformType[])
      setPlatformCatalog([])
      setPublishablePlatforms(new Set(['twitter', 'linkedin']))
    } finally {
      setConnectionsLoading(false)
    }
  }, [teamSlug, currentTeam?.id])

  useEffect(() => {
    if (!open) return
    fetchConnectedPlatforms()
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

  const ticketKey = useMemo(() => {
    if (!post) return null
    return getTicketKey(post.id, allContents)
  }, [post, allContents])

  const linkedIdeaTicket = useMemo(() => {
    if (!linkedIdea?.id) return null
    return getTicketKey(linkedIdea.id, allContents)
  }, [linkedIdea?.id, allContents])

  const linkedIdeaNotes = useMemo(() => extractIdeaNotes(linkedIdea?.blocks), [linkedIdea?.blocks])
  const hasLinkedIdeaContext = !!post?.source_idea_id

  const initialTargetsKey = useMemo(() => {
    if (!post) return ''
    return getEnabledTargets(post.platforms).slice().sort().join(',')
  }, [post])

  const currentTargetsKey = useMemo(() => targetPlatforms.slice().sort().join(','), [targetPlatforms])

  const hasChanges = useMemo(() => {
    if (!post) return false
    const initialTitle = post.title || ''
    const initialThreadText = parseThreadFromBlocks(post.blocks).map((item) => item.content)
    const currentThreadText = thread.map((item) => item.content)
    const initialStatus = post.status
    const initialAssignee = post.assigned_to || ''

    return (
      title !== initialTitle ||
      JSON.stringify(currentThreadText) !== JSON.stringify(initialThreadText) ||
      status !== initialStatus ||
      assignedTo !== initialAssignee ||
      currentTargetsKey !== initialTargetsKey
    )
  }, [post, title, thread, status, assignedTo, currentTargetsKey, initialTargetsKey])

  const publishTargets = useMemo(() => {
    const targets = targetPlatforms.length > 0 ? targetPlatforms : [selectedPlatform]
    return Array.from(new Set(targets))
  }, [targetPlatforms, selectedPlatform])

  const targetSummary = useMemo(
    () => publishTargets.map((platform) => PLATFORMS[platform].name).join(', '),
    [publishTargets]
  )

  const platformRows = useMemo(
    () =>
      (platformCatalog.length > 0
        ? platformCatalog.filter((platform) => isSupportedPlatform(platform.id))
        : (Object.keys(PLATFORMS) as PlatformType[]).map((platform) => ({
            id: platform,
            name: PLATFORMS[platform].name,
            connected: connectedPlatforms.includes(platform),
            accounts: [],
          }))) as PlatformCatalogItem[],
    [platformCatalog, connectedPlatforms]
  )

  const currentContent = thread[activeIndex]?.content || ''
  const characterCount = currentContent.length
  const maxChars = PLATFORMS[selectedPlatform].limit
  const hasContent = thread.some((item) => item.content.trim().length > 0)
  const selectedPlatformConnected = connectedPlatforms.includes(selectedPlatform)

  const buildPayload = useCallback((override?: Partial<{ status: Content['status']; scheduled_at: string | null }>) => {
    const notes = thread.map((item) => item.content).join('\n\n').trim()
    const normalizedTitle = resolvePostTitle({
      currentTitle: title,
      notes,
      titleTouched,
    })

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
      const payload = buildPayload(override)
      const response = await fetch(`/api/content/${post.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
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
      if (mode === 'manual') {
        setSaveError(error instanceof Error ? error.message : 'Failed to save post')
      } else {
        setSaveError(error instanceof Error ? `Autosave failed: ${error.message}` : 'Autosave failed')
      }
      return false
    } finally {
      if (mode === 'manual') {
        setIsSaving(false)
      } else {
        setIsAutoSaving(false)
      }
    }
  }, [post, buildPayload, onPostUpdated])

  const handleSave = useCallback(async () => {
    await persistPost('manual')
  }, [persistPost])

  useEffect(() => {
    if (!open || !post || !hasChanges || isSaving || isAutoSaving) return
    const timer = setTimeout(() => {
      void persistPost('auto')
    }, 1200)

    return () => clearTimeout(timer)
  }, [open, post, hasChanges, isSaving, isAutoSaving, title, thread, status, assignedTo, targetPlatforms, persistPost])

  const handleContentChange = (index: number, value: string) => {
    setThread((prev) => prev.map((item, idx) => (idx === index ? { ...item, content: value } : item)))
  }

  const addThreadItem = () => {
    const next = [...thread, { id: `thread-${Date.now()}`, content: '' }]
    setThread(next)
    setActiveIndex(next.length - 1)
  }

  const removeThreadItem = (index: number) => {
    if (thread.length === 1) {
      setThread([{ id: thread[0]?.id || 'thread-1', content: '' }])
      setActiveIndex(0)
      return
    }
    const next = thread.filter((_, idx) => idx !== index)
    setThread(next)
    setActiveIndex(Math.min(index, next.length - 1))
  }

  const toggleTargetPlatform = (platform: PlatformType) => {
    if (!connectedPlatforms.includes(platform)) return

    setTargetPlatforms((prev) => {
      if (prev.includes(platform)) return prev.filter((item) => item !== platform)
      return [...prev, platform]
    })
  }

  const handlePublish = useCallback(async () => {
    if (!post) return
    if (!hasContent) {
      toast.error('Add some content before publishing.')
      return
    }

    const eligibleTargets = publishTargets.filter(
      (platform) => connectedPlatforms.includes(platform) && publishablePlatforms.has(platform)
    )

    if (eligibleTargets.length === 0) {
      toast.error('No publish-ready connected channels selected. Connect X or LinkedIn first.')
      return
    }

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
      if (!publishResponse.ok) {
        throw new Error((publishData as { error?: string } | null)?.error || 'Publish request failed')
      }

      const successful = Number((publishData as { data?: { summary?: { successful?: number } } } | null)?.data?.summary?.successful || 0)
      const failed = Number((publishData as { data?: { summary?: { failed?: number } } } | null)?.data?.summary?.failed || 0)

      if (successful === 0) throw new Error('No platforms were published successfully')

      if (failed > 0) {
        toast.error(`Published to ${successful} platform(s), but ${failed} failed. Check publish history for details.`)
      } else {
        toast.success(`Published to ${successful} platform${successful === 1 ? '' : 's'}.`)
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to publish')
    } finally {
      setIsPublishing(false)
    }
  }, [post, hasContent, publishTargets, connectedPlatforms, publishablePlatforms, persistPost])

  const handleSchedule = useCallback(async () => {
    if (!post) return
    if (!hasContent) {
      toast.error('Add some content before scheduling.')
      return
    }

    setIsScheduling(true)
    try {
      const scheduledAt = new Date(Date.now() + 60 * 60 * 1000)
      const saved = await persistPost('manual', {
        status: 'SCHEDULED',
        scheduled_at: scheduledAt.toISOString(),
      })

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

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        showOverlay={false}
        className="w-full gap-0 overflow-hidden border-l border-border bg-white p-0 text-foreground shadow-none dark:bg-[#050505] sm:max-w-[1120px]"
      >
        <SheetHeader className="border-b border-border bg-white px-4 py-2.5 dark:bg-[#050505]">
          <SheetTitle className="text-sm font-semibold text-foreground">Post</SheetTitle>
          <SheetDescription className="text-xs text-muted-foreground">
            Edit this post without leaving collaboration.
          </SheetDescription>
        </SheetHeader>

        {post ? (
          <div className="flex min-h-0 flex-1 flex-col">
            <div className="flex-1 overflow-y-auto bg-white p-4 custom-scrollbar dark:bg-[#050505]">
              <div className="mb-3 flex items-center justify-between">
                <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{ticketKey || 'POST'}</div>
                {hasLinkedIdeaContext ? (
                  <Button
                    size="xs"
                    variant="outline"
                    className="h-6 px-2 text-[10px]"
                    onClick={() => setShowIdeaContext((prev) => !prev)}
                  >
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
                            <span className="rounded bg-muted px-1.5 py-0.5 text-[9px] text-muted-foreground">
                              {linkedIdeaTicket || 'IDEA'}
                            </span>
                            <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[9px] text-amber-700 dark:bg-amber-950/40 dark:text-amber-300">
                              IDEA
                            </span>
                          </div>
                          <p className="text-xs font-medium text-foreground">{linkedIdea.title || 'Untitled idea'}</p>
                          <div className="max-h-[200px] overflow-y-auto rounded-[8px] border border-amber-200/60 bg-white p-2 text-[11px] leading-5 text-muted-foreground dark:border-amber-900/70 dark:bg-black/20">
                            {linkedIdeaNotes || 'No idea notes available.'}
                          </div>
                          {onOpenLinkedIdea ? (
                            <Button
                              size="xs"
                              variant="outline"
                              className="h-6 px-2 text-[10px]"
                              onClick={() => onOpenLinkedIdea(linkedIdea.id)}
                            >
                              Open Idea
                            </Button>
                          ) : null}
                        </div>
                      ) : (
                        <p className="text-xs text-muted-foreground">No linked idea found.</p>
                      )}
                    </div>
                  </aside>
                ) : null}

                <div className="flex-1">
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

                  <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
                    <button
                      type="button"
                      onClick={() => setPlatformPickerOpen(true)}
                      className="inline-flex items-center gap-2 rounded-[10px] border border-border bg-card px-3 py-2 text-sm text-foreground transition-colors hover:bg-accent"
                    >
                      <Settings2 className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">Platform Scope</span>
                      <span className="text-muted-foreground">{targetSummary}</span>
                      <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    </button>

                    <div className="flex items-center gap-3">
                      <span className="text-xs text-muted-foreground">Active: {PLATFORMS[selectedPlatform].name}</span>
                    </div>
                  </div>

                  <div className="mb-5 rounded-[10px] border border-border bg-card/60 px-3 py-3">
                    <div className="mb-2 flex items-center justify-between gap-3">
                      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Share to</p>
                      <span className="text-xs text-muted-foreground">
                        {publishTargets.length} target{publishTargets.length === 1 ? '' : 's'}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {publishTargets.map((platform) => (
                        <button
                          key={platform}
                          type="button"
                          onClick={() => toggleTargetPlatform(platform)}
                          className="inline-flex items-center gap-2 rounded-full border border-border bg-background px-2.5 py-1.5 text-xs text-foreground transition-colors hover:bg-accent"
                        >
                          <PlatformIcon platform={platform} className="h-3.5 w-3.5" />
                          <span>{PLATFORMS[platform].name}</span>
                          <X className="h-3 w-3 text-muted-foreground" />
                        </button>
                      ))}
                      {publishTargets.length === 0 ? (
                        <span className="text-xs text-muted-foreground">No targets selected. Choose channels in Platform Scope.</span>
                      ) : null}
                    </div>
                  </div>

                  {!connectionsLoading && (!selectedPlatformConnected || !publishablePlatforms.has(selectedPlatform)) ? (
                    <div className="mb-5 flex items-center justify-between rounded-[8px] border border-border bg-card px-3 py-2">
                      <p className="text-[13px] text-muted-foreground">
                        {publishablePlatforms.has(selectedPlatform)
                          ? `Connect ${PLATFORMS[selectedPlatform].name} to publish without leaving the editor.`
                          : `${PLATFORMS[selectedPlatform].name} is connect-only right now. Direct publishing is currently available for X and LinkedIn.`}
                      </p>
                      {!selectedPlatformConnected ? (
                        <button
                          onClick={() => handleConnectPlatform(selectedPlatform)}
                          disabled={connectingPlatform === selectedPlatform}
                          className="inline-flex items-center rounded-[6px] bg-foreground px-3 py-1.5 text-[12px] font-medium text-background hover:bg-hover disabled:opacity-70"
                        >
                          {connectingPlatform === selectedPlatform ? (
                            <>
                              <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                              Connecting
                            </>
                          ) : (
                            'Connect'
                          )}
                        </button>
                      ) : null}
                    </div>
                  ) : null}

                  <div className="rounded-[10px] border border-border bg-card/50">
                    <div className="border-b border-border px-4 py-3">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm font-medium text-foreground">Composer</span>
                        <span className="text-[11px] text-muted-foreground">
                          {thread.length} block{thread.length === 1 ? '' : 's'}
                        </span>
                      </div>
                      <Input
                        value={title}
                        onChange={(e) => {
                          setTitleTouched(true)
                          setTitle(e.target.value)
                        }}
                        placeholder="Draft title (optional)"
                        className="mt-2 h-10 rounded-[8px] border-border bg-background px-3 text-sm text-foreground placeholder:text-muted-foreground"
                      />
                    </div>

                    <div className="space-y-0 px-3 py-3">
                      {thread.map((item, index) => {
                        const isActive = activeIndex === index
                        const itemCharCount = item.content.length
                        const itemOverLimit = itemCharCount > maxChars

                        return (
                          <div key={item.id}>
                            {index > 0 ? (
                              <div className="flex">
                                <div className="w-8 flex items-center justify-center">
                                  <div className="h-5 w-0.5 bg-border" />
                                </div>
                                <div className="flex-1" />
                              </div>
                            ) : null}

                            <div
                              className={`relative rounded-[8px] transition-all ${isActive ? 'bg-background' : 'bg-transparent'}`}
                              onClick={() => setActiveIndex(index)}
                            >
                              <div className="absolute left-0 top-3 w-8 flex items-center justify-center">
                                <span className={`text-[13px] font-medium ${isActive ? 'text-muted-foreground' : 'text-border'}`}>
                                  {index + 1}
                                </span>
                              </div>

                              <div className="pl-12 pr-3">
                                <textarea
                                  value={item.content}
                                  onChange={(e) => handleContentChange(index, e.target.value)}
                                  onFocus={() => setActiveIndex(index)}
                                  placeholder={index === 0 ? `What is happening on ${PLATFORMS[selectedPlatform].name}?` : 'Add another block...'}
                                  className={`w-full resize-none border-none bg-transparent text-[16px] leading-[1.7] text-foreground outline-none placeholder:text-muted-foreground ${isActive ? 'mt-2 min-h-[100px]' : 'min-h-[72px]'}`}
                                  style={{ height: Math.max(80, item.content.split('\n').length * 28 + 40) }}
                                />

                                {isActive ? (
                                  <div className="flex items-center justify-between pb-2">
                                    <div className="flex items-center gap-2">
                                      {thread.length > 1 ? (
                                        <button
                                          type="button"
                                          onClick={(e) => {
                                            e.stopPropagation()
                                            removeThreadItem(index)
                                          }}
                                          className="rounded p-1.5 text-muted-foreground transition-colors hover:bg-red-500/10 hover:text-red-500"
                                          title="Remove block"
                                        >
                                          <X className="h-4 w-4" />
                                        </button>
                                      ) : null}
                                    </div>

                                    <span
                                      className={`text-[12px] tabular-nums ${itemOverLimit ? 'text-red-500' : itemCharCount > maxChars * 0.8 ? 'text-amber-500' : 'text-muted-foreground'}`}
                                    >
                                      {itemCharCount} / {maxChars}
                                    </span>
                                  </div>
                                ) : null}
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </div>

                    <div className="px-4 pb-3">
                      <button
                        type="button"
                        onClick={addThreadItem}
                        className="flex items-center gap-2 rounded-[6px] px-3 py-1.5 text-[13px] text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                      >
                        <Plus className="h-4 w-4" />
                        Add block
                      </button>
                    </div>

                    <div className="px-4 pb-3">
                      <EditorToolbar
                        characterCount={characterCount}
                        maxCharacters={maxChars}
                        isBookmarked={isBookmarked}
                        onBookmark={() => setIsBookmarked((prev) => !prev)}
                      />
                    </div>
                  </div>

                  {saveError ? (
                    <div className="mt-3 rounded-sm border border-red-950/50 bg-red-950/20 px-3 py-2 text-xs text-red-200">
                      {saveError}
                    </div>
                  ) : null}
                </div>
              </div>
            </div>

            <div className="sticky bottom-0 border-t border-border bg-white px-4 py-2.5 dark:bg-[#050505]">
              <div className="flex flex-wrap items-center gap-2">
                <Button size="sm" className="h-8" onClick={handleSave} disabled={isSaving || !hasChanges}>
                  {isSaving ? 'Saving...' : 'Save Post'}
                </Button>
                <Button size="sm" variant="outline" className="h-8" onClick={() => void handleSchedule()} disabled={isScheduling || isPublishing || !hasContent}>
                  {isScheduling ? 'Scheduling...' : 'Schedule'}
                </Button>
                <Button size="sm" className="h-8" onClick={() => void handlePublish()} disabled={isPublishing || isScheduling || !hasContent}>
                  {isPublishing ? 'Publishing...' : 'Publish'}
                </Button>
                <Button size="sm" variant="outline" className="h-8" onClick={() => onOpenFullEditor(post.id)}>
                  Open Page Editor
                </Button>
                <div className="ml-auto text-[10px] text-muted-foreground">
                  {isAutoSaving
                    ? 'Autosaving...'
                    : lastSavedAt
                      ? `Saved ${new Date(lastSavedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
                      : 'Autosave on'}
                </div>
              </div>
              <div className="mt-1 text-right text-[10px] text-muted-foreground">Press Ctrl/Cmd + Enter to publish</div>
            </div>
          </div>
        ) : (
          <div className="p-4 text-xs text-muted-foreground">No post selected</div>
        )}

        <Dialog open={platformPickerOpen} onOpenChange={setPlatformPickerOpen}>
          <DialogContent className="max-w-2xl border-border bg-card">
            <DialogHeader>
              <DialogTitle>Platform Scope</DialogTitle>
              <DialogDescription>
                Choose your active compose channel and manage connection state.
              </DialogDescription>
            </DialogHeader>

            <div className="max-h-[60vh] space-y-2 overflow-y-auto custom-scrollbar pr-1">
              {platformRows.map((platform) => {
                const platformId = platform.id as PlatformType
                const isActive = selectedPlatform === platformId
                const isConnected = connectedPlatforms.includes(platformId)
                const isTarget = publishTargets.includes(platformId)
                const isPublishable = publishablePlatforms.has(platformId)
                const primaryAccount = platform.accounts[0]

                return (
                  <div
                    key={platform.id}
                    className={cn(
                      'flex items-center justify-between rounded-[10px] border px-3 py-2',
                      isActive ? 'border-ring bg-accent/50' : 'border-border bg-background/60'
                    )}
                  >
                    <div className="min-w-0 flex items-center gap-3">
                      <PlatformIcon platform={platform.id} className="h-4 w-4" />
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-foreground">{platform.name}</p>
                        <p className="truncate text-xs text-muted-foreground">
                          {isConnected
                            ? (primaryAccount
                              ? `${primaryAccount.account_name}${primaryAccount.account_handle ? ` • ${primaryAccount.account_handle}` : ''}${primaryAccount.source === 'local_sandbox' ? ' • Sandbox' : ''}`
                              : 'Connected')
                            : 'Not connected'}
                          {isConnected && !isPublishable ? ' • Connect-only' : ''}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => toggleTargetPlatform(platformId)}
                        disabled={!isConnected || !isPublishable}
                        className={cn(
                          'inline-flex items-center gap-1 rounded-[6px] px-2.5 py-1.5 text-xs font-medium',
                          isConnected && isPublishable
                            ? (isTarget ? 'bg-emerald-500/15 text-emerald-300' : 'border border-border text-foreground hover:bg-accent')
                            : 'cursor-not-allowed border border-border text-muted-foreground opacity-70'
                        )}
                      >
                        {isTarget ? (
                          <>
                            <Check className="h-3.5 w-3.5" />
                            Target
                          </>
                        ) : isConnected ? 'Add target' : 'Connect first'}
                      </button>

                      {!isConnected ? (
                        <button
                          type="button"
                          onClick={() => void handleConnectPlatform(platformId)}
                          disabled={connectingPlatform === platformId}
                          className="inline-flex items-center rounded-[6px] border border-border px-2.5 py-1.5 text-xs text-foreground hover:bg-accent disabled:opacity-70"
                        >
                          {connectingPlatform === platformId ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Connect'}
                        </button>
                      ) : null}

                      <button
                        type="button"
                        onClick={() => setSelectedPlatform(platformId)}
                        className={cn(
                          'inline-flex items-center gap-1 rounded-[6px] px-2.5 py-1.5 text-xs font-medium',
                          isActive
                            ? 'bg-foreground text-background'
                            : 'border border-border text-foreground hover:bg-accent'
                        )}
                      >
                        {isActive ? (
                          <>
                            <Check className="h-3.5 w-3.5" />
                            Active
                          </>
                        ) : (
                          'Use'
                        )}
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          </DialogContent>
        </Dialog>

        <SandboxConfirmDialog
          open={sandboxConnectPlatform !== null}
          platformName={sandboxConnectPlatform ? PLATFORMS[sandboxConnectPlatform].name : 'platform'}
          onCancel={() => {
            setSandboxConnectPlatform(null)
          }}
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
