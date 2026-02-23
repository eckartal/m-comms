'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { toast } from 'sonner'
import type { Content, PlatformType } from '@/types'
import { cn } from '@/lib/utils'
import { useAppStore, useContentStore } from '@/stores'
import { DashboardContainer } from '@/components/layout/DashboardContainer'
import { PostComposerWorkspace, type ComposerPlatformRow } from '@/components/composer/PostComposerWorkspace'
import { PublishControls } from '@/components/publish/PublishControls'
import { SandboxConfirmDialog } from '@/components/oauth/SandboxConfirmDialog'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  buildPlatformConfigs,
  COMPOSER_PLATFORMS,
  isSupportedPlatform,
  serializeThreadToBlocks,
  type PlatformCopyModeMap,
  type PlatformCopyTextMap,
  type ThreadItem,
} from '@/components/composer/composerShared'
import { useComposerPlatforms } from '@/components/composer/useComposerPlatforms'
import { CalendarClock, CheckCircle2, Eye, FileText, Layers3, Sparkles } from 'lucide-react'

async function parseRequestError(response: Response, fallbackMessage: string) {
  const body = await response.json().catch(() => null)
  const message = typeof body?.error === 'string' ? body.error : fallbackMessage
  throw new Error(message)
}

type ContentMutationPayload = {
  title: string
  blocks: Content['blocks']
  platforms: Content['platforms']
  status?: Content['status']
  scheduled_at?: string | null
}

function emitContentUpdated(content: Content, teamId?: string) {
  if (typeof window === 'undefined') return
  window.dispatchEvent(
    new CustomEvent('content:updated', {
      detail: {
        content,
        team_id: teamId,
      },
    })
  )
}

export default function NewContentPage() {
  const router = useRouter()
  const params = useParams()
  const teamSlug = params.teamSlug as string
  const { currentTeam } = useAppStore()
  const { saving, setSaving } = useContentStore()

  const [contentId, setContentId] = useState<string | null>(null)
  const [title, setTitle] = useState('')
  const [thread, setThread] = useState<ThreadItem[]>([{ id: 'thread-1', content: '' }])
  const [activeIndex, setActiveIndex] = useState(0)
  const [selectedPlatform, setSelectedPlatform] = useState<PlatformType>('twitter')
  const [targetPlatforms, setTargetPlatforms] = useState<PlatformType[]>(['twitter'])
  const [platformCopyMode, setPlatformCopyMode] = useState<PlatformCopyModeMap>({})
  const [platformCopyText, setPlatformCopyText] = useState<PlatformCopyTextMap>({})
  const [isPublishing, setIsPublishing] = useState(false)
  const [isScheduling, setIsScheduling] = useState(false)
  const [scheduledDate, setScheduledDate] = useState<Date | null>(null)
  const [platformPickerOpen, setPlatformPickerOpen] = useState(false)
  const [hasHydratedDraft, setHasHydratedDraft] = useState(false)
  const isCreatingInitialRecord = useRef(false)

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
    returnTo: `/${teamSlug}/content/new`,
  })

  const currentContent = thread[activeIndex]?.content || ''
  const hasContent = thread.some((item) => item.content.trim().length > 0)
  const hasDraftInput = hasContent || title.trim().length > 0
  const isSaved = !saving
  const postWordCount = useMemo(
    () =>
      thread
        .map((item) => item.content.trim())
        .join(' ')
        .split(/\s+/)
        .filter(Boolean).length,
    [thread]
  )
  const publishReadyPlatformSet = useMemo(
    () => new Set(composerPlatformRows.filter((row) => row.isPublishable).map((row) => row.id)),
    [composerPlatformRows]
  )

  const publishTargets = useMemo(() => {
    const targets = targetPlatforms.length > 0 ? targetPlatforms : [selectedPlatform]
    return Array.from(new Set(targets))
  }, [targetPlatforms, selectedPlatform])
  const sourcePlatform = useMemo<PlatformType>(() => {
    if (publishTargets.includes('twitter')) return 'twitter'
    return publishTargets[0] || selectedPlatform
  }, [publishTargets, selectedPlatform])
  const selectedPlatformAllowsThreadEditing = selectedPlatform === sourcePlatform

  const hasPublishReadyTarget = useMemo(
    () => publishTargets.some((platform) => connectedPlatforms.includes(platform) && publishablePlatforms.has(platform)),
    [publishTargets, connectedPlatforms, publishablePlatforms]
  )

  const buildMutationPayload = useCallback(
    (override?: Partial<Pick<ContentMutationPayload, 'status' | 'scheduled_at'>>): ContentMutationPayload => ({
      title: title.trim() || 'Untitled post',
      blocks: serializeThreadToBlocks(thread),
      platforms: buildPlatformConfigs({
        targets: publishTargets,
        modeByPlatform: platformCopyMode,
        textByPlatform: platformCopyText,
      }),
      status: override?.status,
      scheduled_at: override?.scheduled_at,
    }),
    [title, thread, publishTargets, platformCopyMode, platformCopyText]
  )

  const createContentRecord = useCallback(
    async (payload: ContentMutationPayload) => {
      if (!currentTeam?.id) throw new Error('Please select a team first.')

      const response = await fetch('/api/content', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          team_id: currentTeam.id,
          item_type: 'POST',
          title: payload.title,
          blocks: payload.blocks,
          platforms: payload.platforms,
          status: payload.status || 'DRAFT',
          scheduled_at: payload.scheduled_at,
        }),
      })

      if (!response.ok) {
        await parseRequestError(response, 'Failed to create post')
      }

      const body = await response.json()
      const created = body?.data as Content | undefined
      if (!created) throw new Error('Post draft was not returned by server')
      setContentId(created.id)
      emitContentUpdated(created, currentTeam.id)
      return created.id
    },
    [currentTeam?.id]
  )

  const updateContentRecord = useCallback(async (id: string, payload: ContentMutationPayload) => {
    const response = await fetch(`/api/content/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })

    if (!response.ok) {
      await parseRequestError(response, 'Failed to update post')
    }

    const body = await response.json().catch(() => null)
    const updated = (body?.data as Content | undefined) || null
    if (updated) {
      emitContentUpdated(updated, currentTeam?.id)
    }
    return updated
  }, [currentTeam?.id])

  const persistDraft = useCallback(
    async (override?: Partial<Pick<ContentMutationPayload, 'status' | 'scheduled_at'>>) => {
      const payload = buildMutationPayload(override)
      if (contentId) {
        try {
          await updateContentRecord(contentId, payload)
          return contentId
        } catch (error) {
          if (error instanceof Error && /not found/i.test(error.message)) {
            setContentId(null)
            return createContentRecord(payload)
          }
          throw error
        }
      }
      return createContentRecord(payload)
    },
    [buildMutationPayload, contentId, createContentRecord, updateContentRecord]
  )

  useEffect(() => {
    const savedDraft = localStorage.getItem(`draft_${teamSlug}`)
    if (!savedDraft) {
      setHasHydratedDraft(true)
      return
    }

    try {
      const data = JSON.parse(savedDraft)
      if (typeof data.contentId === 'string' && data.contentId.trim().length > 0) {
        setContentId(data.contentId)
      }
      if (Array.isArray(data.thread) && data.thread.length > 0) {
        setThread(data.thread)
        setActiveIndex(data.thread.length - 1)
      }
      if (typeof data.platform === 'string' && isSupportedPlatform(data.platform)) {
        setSelectedPlatform(data.platform)
      }
      if (Array.isArray(data.targets)) {
        const savedTargets = data.targets.filter((id: string) => isSupportedPlatform(id)) as PlatformType[]
        setTargetPlatforms(savedTargets.length > 0 ? savedTargets : ['twitter'])
      }
      if (data.platformCopyMode && typeof data.platformCopyMode === 'object') {
        setPlatformCopyMode(data.platformCopyMode as PlatformCopyModeMap)
      }
      if (data.platformCopyText && typeof data.platformCopyText === 'object') {
        setPlatformCopyText(data.platformCopyText as PlatformCopyTextMap)
      }
    } catch (error) {
      console.error('Failed to load draft', error)
    } finally {
      setHasHydratedDraft(true)
    }
  }, [teamSlug])

  useEffect(() => {
    void fetchConnectedPlatforms()
  }, [fetchConnectedPlatforms])

  useEffect(() => {
    if (!connectedPlatforms.includes(selectedPlatform)) return
    if (targetPlatforms.includes(selectedPlatform)) return
    setTargetPlatforms((prev) => [...prev, selectedPlatform])
  }, [selectedPlatform, connectedPlatforms, targetPlatforms])

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

  useEffect(() => {
    if (!hasHydratedDraft || !currentTeam?.id || contentId) return
    if (isCreatingInitialRecord.current) return

    isCreatingInitialRecord.current = true
    setSaving(true)

    void createContentRecord(buildMutationPayload({ status: 'DRAFT', scheduled_at: null }))
      .catch((error) => {
        console.error('Failed to initialize post draft:', error)
      })
      .finally(() => {
        isCreatingInitialRecord.current = false
        setSaving(false)
      })
  }, [
    hasHydratedDraft,
    currentTeam?.id,
    contentId,
    setSaving,
    createContentRecord,
    buildMutationPayload,
  ])

  useEffect(() => {
    const timer = setTimeout(async () => {
      const draftData = {
        contentId,
        thread,
        platform: selectedPlatform,
        targets: targetPlatforms,
        platformCopyMode,
        platformCopyText,
        savedAt: new Date().toISOString(),
      }
      localStorage.setItem(`draft_${teamSlug}`, JSON.stringify(draftData))

      if (!currentTeam?.id || !contentId || !hasDraftInput) return

      setSaving(true)
      try {
        await updateContentRecord(contentId, buildMutationPayload({ status: 'DRAFT', scheduled_at: null }))
      } catch (error) {
        console.error('Failed to autosave post draft:', error)
        if (error instanceof Error && /not found/i.test(error.message)) {
          setContentId(null)
        }
      } finally {
        setSaving(false)
      }
    }, 1000)

    return () => clearTimeout(timer)
  }, [
    thread,
    selectedPlatform,
    targetPlatforms,
    platformCopyMode,
    platformCopyText,
    teamSlug,
    contentId,
    hasDraftInput,
    currentTeam?.id,
    setSaving,
    updateContentRecord,
    buildMutationPayload,
  ])

  useEffect(() => {
    if (!contentId || !currentTeam?.id) return

    const timer = setTimeout(async () => {
      setSaving(true)
      try {
        await updateContentRecord(contentId, buildMutationPayload({ status: 'DRAFT', scheduled_at: null }))
      } catch (error) {
        console.error('Failed to update platform copy variants:', error)
      } finally {
        setSaving(false)
      }
    }, 450)

    return () => clearTimeout(timer)
  }, [platformCopyMode, platformCopyText, contentId, currentTeam?.id, updateContentRecord, buildMutationPayload, setSaving])

  const handleContentChange = (index: number, value: string) => {
    setThread((prev) => prev.map((item, itemIndex) => (itemIndex === index ? { ...item, content: value } : item)))
  }

  const addThreadItem = useCallback(() => {
    const newId = `thread-${Date.now()}`
    setThread((prev) => [...prev, { id: newId, content: '' }])
    setActiveIndex(thread.length)
  }, [thread.length])

  const removeThreadItem = (index: number) => {
    if (thread.length === 1) {
      setThread([{ id: thread[0]?.id || 'thread-1', content: '' }])
      setActiveIndex(0)
      return
    }
    const next = thread.filter((_, itemIndex) => itemIndex !== index)
    setThread(next)
    setActiveIndex(Math.min(index, next.length - 1))
  }

  const toggleTargetPlatform = (platform: PlatformType) => {
    if (!connectedPlatforms.includes(platform)) return
    setTargetPlatforms((prev) =>
      prev.includes(platform) ? prev.filter((item) => item !== platform) : [...prev, platform]
    )
  }

  const handlePlatformCopyModeChange = (platform: PlatformType, mode: 'sync' | 'custom') => {
    setPlatformCopyMode((prev) => ({ ...prev, [platform]: mode }))
    if (mode === 'custom') {
      setPlatformCopyText((prev) => {
        if (typeof prev[platform] === 'string') return prev
        const fallbackText = thread.map((item) => item.content).join('\n\n').trim()
        return { ...prev, [platform]: fallbackText }
      })
    }
  }

  const handlePublish = useCallback(async () => {
    if (!hasContent) return

    const eligibleTargets = publishTargets.filter(
      (platform) => connectedPlatforms.includes(platform) && publishablePlatforms.has(platform)
    )

    if (eligibleTargets.length === 0) {
      toast.error('Select at least one publish-ready channel.')
      return
    }

    setIsPublishing(true)
    try {
      const resolvedContentId = await persistDraft({ status: 'DRAFT', scheduled_at: null })
      const publishResponse = await fetch(`/api/content/${resolvedContentId}/publish`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ platforms: eligibleTargets }),
      })

      const publishData = await publishResponse.json().catch(() => null)
      if (!publishResponse.ok) {
        throw new Error((publishData as { error?: string } | null)?.error || 'Publish request failed')
      }

      const successful = Number(
        (publishData as { data?: { summary?: { successful?: number } } } | null)?.data?.summary?.successful || 0
      )
      const failed = Number(
        (publishData as { data?: { summary?: { failed?: number } } } | null)?.data?.summary?.failed || 0
      )
      if (successful === 0) {
        throw new Error('No platforms were published successfully')
      }

      if (failed > 0) {
        toast.error(`Published to ${successful} platform(s), but ${failed} failed. Check publish history for details.`)
      } else {
        toast.success(`Published to ${successful} platform${successful === 1 ? '' : 's'}.`)
      }

      localStorage.removeItem(`draft_${teamSlug}`)
      router.push(`/${teamSlug}/content`)
    } catch (error) {
      console.error('Error publishing:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to publish')
    } finally {
      setIsPublishing(false)
    }
  }, [
    connectedPlatforms,
    hasContent,
    persistDraft,
    publishTargets,
    publishablePlatforms,
    router,
    teamSlug,
  ])

  const handleSchedule = useCallback(async (scheduledAt: Date = new Date(Date.now() + 60 * 60 * 1000)) => {
    if (!hasContent) return

    setIsScheduling(true)
    try {
      await persistDraft({ status: 'SCHEDULED', scheduled_at: scheduledAt.toISOString() })
      setScheduledDate(scheduledAt)
      localStorage.removeItem(`draft_${teamSlug}`)
      router.push(`/${teamSlug}/content`)
    } catch (error) {
      console.error('Error scheduling:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to schedule')
    } finally {
      setIsScheduling(false)
    }
  }, [hasContent, persistDraft, router, teamSlug])

  const handleSaveDraft = useCallback(async () => {
    setSaving(true)
    try {
      await persistDraft({ status: 'DRAFT', scheduled_at: null })
      toast.success('Draft saved')
    } catch (error) {
      console.error('Error saving draft:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to save draft')
    } finally {
      setSaving(false)
    }
  }, [persistDraft, setSaving])

  const handlePreview = useCallback(() => {
    if (!hasDraftInput) {
      toast.message('Add a title or content to preview.')
      return
    }
    toast.message('Preview mode is coming next. Publish output already uses this content.')
  }, [hasDraftInput])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
        event.preventDefault()
        void handlePublish()
      }
      if (
        (event.metaKey || event.ctrlKey) &&
        event.key === 'ArrowDown' &&
        selectedPlatformAllowsThreadEditing &&
        activeIndex === thread.length - 1 &&
        currentContent.length > 0
      ) {
        event.preventDefault()
        addThreadItem()
      }
    }

    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [activeIndex, thread.length, currentContent, addThreadItem, handlePublish, selectedPlatformAllowsThreadEditing])

  return (
    <div className="flex min-h-full flex-col bg-background">
      <div className="flex-1 overflow-y-auto">
        <DashboardContainer className="max-w-[1320px] py-8">
          <div className="mb-6 rounded-2xl border border-[var(--sidebar-divider)] bg-card px-4 py-3 shadow-sm md:px-6">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div className="flex items-center gap-3">
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-[var(--sidebar-elevated)] text-muted-foreground">
                  <Sparkles className="h-4 w-4" />
                </span>
                <div>
                  <p className="text-sm font-medium text-foreground">New Post</p>
                  <p className="text-xs text-muted-foreground">Distraction-free composer with platform-ready output.</p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={cn(
                    'inline-flex items-center gap-1 rounded-full border border-[var(--sidebar-divider)] bg-[var(--sidebar-elevated)] px-2.5 py-1 text-[11px]',
                    isSaved ? 'text-muted-foreground' : 'text-primary'
                  )}
                >
                  <span className={cn('h-1.5 w-1.5 rounded-full', isSaved ? 'bg-emerald-500' : 'bg-primary animate-pulse')} />
                  {isSaved ? 'Saved just now' : 'Saving...'}
                </span>
                <Button variant="outline" className="h-9 rounded-xl px-3 text-xs" onClick={() => void handleSaveDraft()}>
                  Save draft
                </Button>
                <Button variant="ghost" className="h-9 rounded-xl px-3 text-xs" onClick={handlePreview}>
                  <Eye className="h-3.5 w-3.5" />
                  Preview
                </Button>
                <Button
                  className="h-9 rounded-xl px-3 text-xs"
                  disabled={!hasContent || !hasPublishReadyTarget || isPublishing || isScheduling}
                  onClick={() => void handlePublish()}
                >
                  Publish
                </Button>
              </div>
            </div>
          </div>

          <div className="grid gap-5 lg:grid-cols-[200px_minmax(0,1fr)_320px]">
            <aside className="space-y-2">
              {[
                { id: 'drafts', label: 'Drafts', icon: FileText, active: true },
                { id: 'scheduled', label: 'Scheduled', icon: CalendarClock, active: false },
                { id: 'published', label: 'Published', icon: CheckCircle2, active: false },
              ].map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className={cn(
                    'flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-left text-xs transition-colors',
                    item.active
                      ? 'border border-[var(--sidebar-divider)] bg-[var(--sidebar-elevated)] text-foreground'
                      : 'text-muted-foreground hover:bg-accent hover:text-foreground'
                  )}
                >
                  <item.icon className="h-3.5 w-3.5" />
                  {item.label}
                </button>
              ))}
            </aside>

            <section className="min-w-0">
              <PostComposerWorkspace
                title={title}
                onTitleChange={setTitle}
                thread={thread}
                activeIndex={activeIndex}
                onActiveIndexChange={setActiveIndex}
                onThreadItemChange={handleContentChange}
                onRemoveThreadItem={removeThreadItem}
                sourcePlatform={sourcePlatform}
                selectedPlatform={selectedPlatform}
                onSelectedPlatformChange={setSelectedPlatform}
                platformMeta={COMPOSER_PLATFORMS}
                publishTargets={publishTargets}
                onToggleTargetPlatform={toggleTargetPlatform}
                platformCopyMode={platformCopyMode}
                platformCopyText={platformCopyText}
                onPlatformCopyModeChange={handlePlatformCopyModeChange}
                onPlatformCopyTextChange={(platform, text) =>
                  setPlatformCopyText((prev) => ({ ...prev, [platform]: text }))
                }
                connectingPlatform={connectingPlatform}
                onConnectPlatform={connectFromComposer}
                platformPickerOpen={platformPickerOpen}
                onPlatformPickerOpenChange={setPlatformPickerOpen}
                platformRows={composerPlatformRows as ComposerPlatformRow[]}
                footerSection={
                  <div className="sticky bottom-0 z-20 mt-4 rounded-2xl border border-[var(--sidebar-divider)] bg-background/95 p-3 backdrop-blur-sm">
                    <PublishControls
                      onPublish={() => void handlePublish()}
                      onSchedule={(date) => handleSchedule(date)}
                      isPublishing={isPublishing}
                      isScheduling={isScheduling}
                      scheduleDisabled={!hasContent}
                      publishDisabled={!hasContent || !hasPublishReadyTarget}
                      publishHint={hasContent && !hasPublishReadyTarget ? 'Select a publish-ready target.' : null}
                      scheduledDate={scheduledDate}
                    />
                  </div>
                }
              />
            </section>

            <aside className="space-y-3">
              <Card className="rounded-2xl border-[var(--sidebar-divider)] bg-card/90 shadow-sm">
                <CardHeader className="pb-0">
                  <CardTitle className="text-sm">Post Setup</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-xs text-muted-foreground">
                  <div className="flex items-center justify-between">
                    <span>Source channel</span>
                    <span className="text-foreground">{COMPOSER_PLATFORMS[sourcePlatform].name}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Target channels</span>
                    <span className="text-foreground">{publishTargets.length}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Word count</span>
                    <span className="text-foreground">{postWordCount}</span>
                  </div>
                </CardContent>
              </Card>

              <Card className="rounded-2xl border-[var(--sidebar-divider)] bg-card/90 shadow-sm">
                <CardHeader className="pb-0">
                  <CardTitle className="text-sm">Quality Bar</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-xs text-muted-foreground">
                  <div className="flex items-center justify-between">
                    <span>Title</span>
                    <span className={title.trim() ? 'text-emerald-600' : 'text-amber-600'}>
                      {title.trim() ? 'Ready' : 'Missing'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Body</span>
                    <span className={hasContent ? 'text-emerald-600' : 'text-amber-600'}>
                      {hasContent ? 'Ready' : 'Missing'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Publish targets</span>
                    <span className={hasPublishReadyTarget ? 'text-emerald-600' : 'text-amber-600'}>
                      {hasPublishReadyTarget ? 'Ready' : 'Needs setup'}
                    </span>
                  </div>
                </CardContent>
              </Card>

              <Card className="rounded-2xl border-[var(--sidebar-divider)] bg-card/90 shadow-sm">
                <CardHeader className="pb-0">
                  <CardTitle className="flex items-center gap-2 text-sm">
                    <Layers3 className="h-3.5 w-3.5 text-muted-foreground" />
                    Publishing
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-xs text-muted-foreground">
                  Keyboard shortcut: <span className="font-medium text-foreground">Cmd/Ctrl + Enter</span>
                </CardContent>
              </Card>
            </aside>
          </div>
        </DashboardContainer>
      </div>

      <SandboxConfirmDialog
        open={Boolean(sandboxConnectPlatform)}
        platformName={sandboxConnectPlatform ? COMPOSER_PLATFORMS[sandboxConnectPlatform].name : 'platform'}
        onCancel={() => setSandboxConnectPlatform(null)}
        onConfirm={() => void confirmSandboxConnect()}
      />
    </div>
  )
}
