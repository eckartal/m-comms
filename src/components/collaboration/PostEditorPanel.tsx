'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useParams, usePathname } from 'next/navigation'
import type { Content, PlatformType } from '@/types'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { getTicketKey, inferTitleFromNotes } from '@/lib/ticketPresentation'
import { useContentStore } from '@/stores'
import { SandboxConfirmDialog } from '@/components/oauth/SandboxConfirmDialog'
import { toast } from 'sonner'
import { Link2 } from 'lucide-react'
import { PostComposerWorkspace, type ComposerPlatformRow } from '@/components/composer/PostComposerWorkspace'
import {
  buildPlatformConfigs,
  COMPOSER_PLATFORMS,
  getEnabledTargets,
  parsePlatformCopyConfig,
  parseThreadFromBlocks,
  serializeThreadToBlocks,
  type PlatformCopyModeMap,
  type PlatformCopyTextMap,
  type ThreadItem,
} from '@/components/composer/composerShared'
import { useComposerPlatforms } from '@/components/composer/useComposerPlatforms'
import { PublishControls } from '@/components/publish/PublishControls'

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

function extractIdeaNotes(blocks: unknown): string {
  const [first] = parseThreadFromBlocks(blocks)
  return first?.content || ''
}

const UNTITLED_TITLE_RE = /^untitled(\s+idea|\s+post)?$/i

function resolvePostTitle(params: {
  currentTitle: string
  notes: string
  titleTouched: boolean
}) {
  const rawTitle = params.currentTitle.trim()
  const hasMeaningfulTitle = rawTitle.length > 0 && !UNTITLED_TITLE_RE.test(rawTitle)

  if (params.titleTouched) return rawTitle || 'New post'
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
  const params = useParams<{ teamSlug?: string }>()
  const pathname = usePathname()
  const teamSlug = typeof params?.teamSlug === 'string' ? params.teamSlug : undefined

  const [title, setTitle] = useState('')
  const [thread, setThread] = useState<ThreadItem[]>([{ id: 'thread-1', content: '' }])
  const [activeIndex, setActiveIndex] = useState(0)
  const [status, setStatus] = useState<'DRAFT' | 'IN_REVIEW' | 'APPROVED' | 'SCHEDULED' | 'PUBLISHED' | 'ARCHIVED'>('DRAFT')
  const [assignedTo, setAssignedTo] = useState('')
  const [selectedPlatform, setSelectedPlatform] = useState<PlatformType>('twitter')
  const [targetPlatforms, setTargetPlatforms] = useState<PlatformType[]>(['twitter'])
  const [platformCopyMode, setPlatformCopyMode] = useState<PlatformCopyModeMap>({})
  const [platformCopyText, setPlatformCopyText] = useState<PlatformCopyTextMap>({})
  const [platformPickerOpen, setPlatformPickerOpen] = useState(false)
  const [showIdeaContext, setShowIdeaContext] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null)
  const [isAutoSaving, setIsAutoSaving] = useState(false)
  const [titleTouched, setTitleTouched] = useState(false)
  const [isPublishing, setIsPublishing] = useState(false)
  const [isScheduling, setIsScheduling] = useState(false)
  const [scheduledDate, setScheduledDate] = useState<Date | null>(null)

  const {
    connectedPlatforms,
    publishablePlatforms,
    connectingPlatform,
    sandboxConnectPlatform,
    setSandboxConnectPlatform,
    fetchConnectedPlatforms,
    connectFromComposer,
    confirmSandboxConnect,
    composerPlatformRows,
  } = useComposerPlatforms({
    teamSlug,
    returnTo: pathname || `/${teamSlug}/collaboration`,
  })

  useEffect(() => {
    if (!post) return
    setTitle(post.title || '')
    setThread(parseThreadFromBlocks(post.blocks))
    setActiveIndex(0)
    setStatus(post.status)
    setAssignedTo(post.assigned_to || '')
    setScheduledDate(post.scheduled_at ? new Date(post.scheduled_at) : null)

    const initialTargets = getEnabledTargets(post.platforms)
    const initialPlatformCopy = parsePlatformCopyConfig(post.platforms)
    setTargetPlatforms(initialTargets)
    setSelectedPlatform(initialTargets[0] || 'twitter')
    setPlatformCopyMode(initialPlatformCopy.modeByPlatform)
    setPlatformCopyText(initialPlatformCopy.textByPlatform)

    setSaveError(null)
    setLastSavedAt(null)
    setIsAutoSaving(false)
    setTitleTouched(false)
  }, [post?.id, post])

  useEffect(() => {
    setShowIdeaContext(true)
  }, [post?.id])

  useEffect(() => {
    if (!open) return
    void fetchConnectedPlatforms()
  }, [open, fetchConnectedPlatforms])

  const publishReadyPlatformSet = useMemo(
    () => new Set(composerPlatformRows.filter((row) => row.isPublishable).map((row) => row.id)),
    [composerPlatformRows]
  )

  useEffect(() => {
    setTargetPlatforms((prev) => {
      const filtered = prev.filter((platform) => publishReadyPlatformSet.has(platform))
      if (filtered.length > 0) return filtered
      return publishReadyPlatformSet.has('twitter') ? ['twitter'] : prev
    })
  }, [publishReadyPlatformSet])

  useEffect(() => {
    if (publishReadyPlatformSet.has(selectedPlatform)) return
    if (publishReadyPlatformSet.has('twitter')) {
      setSelectedPlatform('twitter')
      return
    }
    const nextPlatform = targetPlatforms.find((platform) => publishReadyPlatformSet.has(platform))
    if (nextPlatform) {
      setSelectedPlatform(nextPlatform)
    }
  }, [publishReadyPlatformSet, selectedPlatform, targetPlatforms])

  const ticketKey = useMemo(() => (post ? getTicketKey(post.id, allContents) : null), [post, allContents])
  const linkedIdeaTicket = useMemo(() => (linkedIdea?.id ? getTicketKey(linkedIdea.id, allContents) : null), [linkedIdea?.id, allContents])
  const linkedIdeaNotes = useMemo(() => extractIdeaNotes(linkedIdea?.blocks), [linkedIdea?.blocks])
  const hasLinkedIdeaContext = !!post?.source_idea_id

  const initialTargetsKey = useMemo(() => (post ? getEnabledTargets(post.platforms).slice().sort().join(',') : ''), [post])
  const currentTargetsKey = useMemo(() => targetPlatforms.slice().sort().join(','), [targetPlatforms])
  const initialPlatformVariantsKey = useMemo(() => {
    if (!post) return ''
    const { modeByPlatform, textByPlatform } = parsePlatformCopyConfig(post.platforms)
    return JSON.stringify({
      modeByPlatform,
      textByPlatform,
    })
  }, [post])
  const currentPlatformVariantsKey = useMemo(
    () =>
      JSON.stringify({
        modeByPlatform: platformCopyMode,
        textByPlatform: platformCopyText,
      }),
    [platformCopyMode, platformCopyText]
  )

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
      currentTargetsKey !== initialTargetsKey ||
      currentPlatformVariantsKey !== initialPlatformVariantsKey
    )
  }, [post, title, thread, status, assignedTo, currentTargetsKey, initialTargetsKey, currentPlatformVariantsKey, initialPlatformVariantsKey])

  const publishTargets = useMemo(() => {
    const targets = targetPlatforms.length > 0 ? targetPlatforms : [selectedPlatform]
    return Array.from(new Set(targets))
  }, [targetPlatforms, selectedPlatform])
  const sourcePlatform = useMemo<PlatformType>(() => {
    if (publishTargets.includes('twitter')) return 'twitter'
    return publishTargets[0] || selectedPlatform
  }, [publishTargets, selectedPlatform])

  const hasContent = thread.some((item) => item.content.trim().length > 0)
  const hasPublishReadyTarget = useMemo(
    () => publishTargets.some((platform) => connectedPlatforms.includes(platform) && publishablePlatforms.has(platform)),
    [publishTargets, connectedPlatforms, publishablePlatforms]
  )

  const buildPayload = useCallback((override?: Partial<{ status: Content['status']; scheduled_at: string | null }>) => {
    const notes = thread.map((item) => item.content).join('\n\n').trim()
    const normalizedTitle = resolvePostTitle({ currentTitle: title, notes, titleTouched })
    return {
      title: normalizedTitle,
      blocks: serializeThreadToBlocks(thread),
      status: override?.status || status,
      scheduled_at: override?.scheduled_at,
      assigned_to: assignedTo || null,
      platforms: buildPlatformConfigs({
        targets: publishTargets,
        modeByPlatform: platformCopyMode,
        textByPlatform: platformCopyText,
      }),
    }
  }, [titleTouched, title, thread, status, assignedTo, publishTargets, platformCopyMode, platformCopyText])

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
  }, [open, post, hasChanges, isSaving, isAutoSaving, title, thread, status, assignedTo, targetPlatforms, platformCopyMode, platformCopyText, persistPost])

  const handlePlatformCopyModeChange = useCallback((platform: PlatformType, mode: 'sync' | 'custom') => {
    setPlatformCopyMode((prev) => ({ ...prev, [platform]: mode }))
    if (mode === 'custom') {
      setPlatformCopyText((prev) => {
        if (typeof prev[platform] === 'string') return prev
        const fallbackText = thread.map((item) => item.content).join('\n\n').trim()
        return { ...prev, [platform]: fallbackText }
      })
    }
  }, [thread])

  const handlePublish = useCallback(async () => {
    if (!post) return
    if (!hasContent) return toast.error('Add some content before publishing.')

    const eligibleTargets = publishTargets.filter((platform) => connectedPlatforms.includes(platform) && publishablePlatforms.has(platform))
    if (eligibleTargets.length === 0) return toast.error('Select at least one publish-ready channel.')

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

      const refreshed = await fetch(`/api/content/${post.id}`, { cache: 'no-store' })
      if (refreshed.ok) {
        const refreshedBody = await refreshed.json().catch(() => null)
        if (refreshedBody?.data) {
          onPostUpdated(refreshedBody.data as Content)
        }
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to publish')
    } finally {
      setIsPublishing(false)
    }
  }, [post, hasContent, publishTargets, connectedPlatforms, publishablePlatforms, persistPost, onPostUpdated])

  const handleSchedule = useCallback(async (requestedDate?: Date) => {
    if (!post) return
    if (!hasContent) return toast.error('Add some content before scheduling.')

    setIsScheduling(true)
    try {
      const scheduledAt = requestedDate || new Date(Date.now() + 60 * 60 * 1000)
      const saved = await persistPost('manual', { status: 'SCHEDULED', scheduled_at: scheduledAt.toISOString() })
      if (!saved) throw new Error('Failed to schedule post')
      setStatus('SCHEDULED')
      setScheduledDate(scheduledAt)
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
    <div className="mb-3 flex flex-wrap items-center gap-2">
      <span className="rounded-full border border-border bg-card px-2.5 py-1 text-[10px] uppercase tracking-wide text-muted-foreground">
        {ticketKey || 'POST'}
      </span>
      <select
        aria-label="Post status"
        value={status}
        onChange={(e) => setStatus(e.target.value as typeof status)}
        className="h-9 min-w-[128px] rounded-full border border-border bg-card px-3 text-xs text-foreground"
      >
        <option value="DRAFT">Draft</option>
        <option value="IN_REVIEW">In Review</option>
        <option value="APPROVED">Approved</option>
        <option value="SCHEDULED">Scheduled</option>
        <option value="PUBLISHED">Shared</option>
        <option value="ARCHIVED">Archived</option>
      </select>
      <select
        aria-label="Post owner"
        value={assignedTo}
        onChange={(e) => setAssignedTo(e.target.value)}
        className="h-9 min-w-[150px] rounded-full border border-border bg-card px-3 text-xs text-foreground"
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
      {hasLinkedIdeaContext ? (
        <Button size="xs" variant="outline" className="h-8 rounded-full px-3 text-[11px]" onClick={() => setShowIdeaContext((prev) => !prev)}>
          {showIdeaContext ? 'Hide idea context' : 'Show idea context'}
        </Button>
      ) : null}
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
                    sourcePlatform={sourcePlatform}
                    selectedPlatform={selectedPlatform}
                    onSelectedPlatformChange={setSelectedPlatform}
                    platformMeta={COMPOSER_PLATFORMS}
                    publishTargets={publishTargets}
                    onToggleTargetPlatform={(platform) => {
                      if (!connectedPlatforms.includes(platform)) return
                      setTargetPlatforms((prev) => prev.includes(platform) ? prev.filter((item) => item !== platform) : [...prev, platform])
                    }}
                    platformCopyMode={platformCopyMode}
                    platformCopyText={platformCopyText}
                    onPlatformCopyModeChange={handlePlatformCopyModeChange}
                    onPlatformCopyTextChange={(platform, text) => setPlatformCopyText((prev) => ({ ...prev, [platform]: text }))}
                    connectingPlatform={connectingPlatform}
                    onConnectPlatform={connectFromComposer}
                    platformPickerOpen={platformPickerOpen}
                    onPlatformPickerOpenChange={setPlatformPickerOpen}
                    platformRows={composerPlatformRows as ComposerPlatformRow[]}
                    topSection={topSection}
                    footerSection={footerSection}
                  />
                </div>
              </div>
            </div>

            <div className="sticky bottom-0 border-t border-border bg-white px-4 py-2.5 dark:bg-[#050505]">
              <div className="flex flex-wrap items-center gap-2 pb-2">
                <Button size="sm" className="h-8" onClick={() => void persistPost('manual')} disabled={isSaving || !hasChanges}>{isSaving ? 'Saving...' : 'Save Post'}</Button>
                <Button size="sm" variant="outline" className="h-8" onClick={() => onOpenFullEditor(post.id)}>Open Page Editor</Button>
                <div className="ml-auto text-[10px] text-muted-foreground">
                  {isAutoSaving ? 'Autosaving...' : lastSavedAt ? `Saved ${new Date(lastSavedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : 'Autosave on'}
                </div>
              </div>
              <PublishControls
                onPublish={() => void handlePublish()}
                onSchedule={(date) => void handleSchedule(date)}
                isPublishing={isPublishing}
                isScheduling={isScheduling}
                scheduleDisabled={!hasContent}
                publishDisabled={!hasContent || !hasPublishReadyTarget}
                publishHint={hasContent && !hasPublishReadyTarget ? 'Select a publish-ready target.' : null}
                scheduledDate={scheduledDate}
              />
            </div>
          </div>
        ) : (
          <div className="p-4 text-xs text-muted-foreground">No post selected</div>
        )}

        <SandboxConfirmDialog
          open={sandboxConnectPlatform !== null}
          platformName={sandboxConnectPlatform ? COMPOSER_PLATFORMS[sandboxConnectPlatform].name : 'platform'}
          onCancel={() => setSandboxConnectPlatform(null)}
          onConfirm={() => void confirmSandboxConnect()}
        />
      </SheetContent>
    </Sheet>
  )
}
