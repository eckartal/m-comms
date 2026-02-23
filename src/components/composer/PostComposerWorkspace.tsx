'use client'

import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import type { PlatformType } from '@/types'
import { EditorToolbar } from '@/components/editor/EditorToolbar'
import { PlatformIcon } from '@/components/oauth/PlatformIcon'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Check, Loader2, Paperclip, Plus, RefreshCw, Trash2, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { PlatformCopyModeMap, PlatformCopyTextMap } from '@/components/composer/composerShared'
import { toast } from 'sonner'

type ThreadItem = {
  id: string
  content: string
}

type PlatformMeta = {
  name: string
  limit: number
}

export type ComposerPlatformRow = {
  id: PlatformType
  name: string
  connected: boolean
  isPublishable: boolean
  accountLabel?: string
}

type PostComposerWorkspaceProps = {
  title: string
  onTitleChange: (value: string) => void
  thread: ThreadItem[]
  activeIndex: number
  onActiveIndexChange: (index: number) => void
  onThreadItemChange: (index: number, value: string) => void
  onRemoveThreadItem: (index: number) => void
  sourcePlatform: PlatformType
  selectedPlatform: PlatformType
  onSelectedPlatformChange: (platform: PlatformType) => void
  platformMeta: Record<PlatformType, PlatformMeta>
  publishTargets: PlatformType[]
  onToggleTargetPlatform: (platform: PlatformType) => void
  platformCopyMode: PlatformCopyModeMap
  platformCopyText: PlatformCopyTextMap
  onPlatformCopyModeChange: (platform: PlatformType, mode: 'sync' | 'custom') => void
  onPlatformCopyTextChange: (platform: PlatformType, text: string) => void
  connectingPlatform: PlatformType | null
  onConnectPlatform: (platform: PlatformType) => void | Promise<void>
  platformPickerOpen: boolean
  onPlatformPickerOpenChange: (open: boolean) => void
  platformRows: ComposerPlatformRow[]
  topSection?: ReactNode
  footerSection?: ReactNode
}

export function PostComposerWorkspace({
  title,
  onTitleChange,
  thread,
  activeIndex,
  onActiveIndexChange,
  onThreadItemChange,
  onRemoveThreadItem,
  sourcePlatform,
  selectedPlatform,
  onSelectedPlatformChange,
  platformMeta,
  publishTargets,
  onToggleTargetPlatform,
  platformCopyMode,
  platformCopyText,
  onPlatformCopyModeChange,
  onPlatformCopyTextChange,
  connectingPlatform,
  onConnectPlatform,
  platformPickerOpen,
  onPlatformPickerOpenChange,
  platformRows,
  topSection,
  footerSection,
}: PostComposerWorkspaceProps) {
  const MAX_MEDIA_ITEMS = 8
  const MAX_MEDIA_BYTES = 25 * 1024 * 1024

  type MediaPreview = {
    id: string
    name: string
    url: string
    kind: 'image' | 'video' | 'file'
  }

  type MediaItem = {
    id: string
    file: File
  }

  const getPlatformLabel = (platform: PlatformType) =>
    platformMeta[platform].name === 'X (Twitter)' ? 'X' : platformMeta[platform].name

  const platformRowById = new Map(platformRows.map((row) => [row.id, row]))
  const visiblePlatformTabs = publishTargets.filter((platform) => platformRowById.get(platform)?.isPublishable ?? true)
  const disconnectedRows = platformRows.filter((platform) => !platform.connected)
  const connectedRows = platformRows.filter((platform) => platform.connected)
  const currentContent = thread[activeIndex]?.content || ''
  const maxChars = platformMeta[selectedPlatform].limit
  const characterCount = currentContent.length
  const isSourcePlatform = selectedPlatform === sourcePlatform
  const selectedPlatformCopyMode = isSourcePlatform ? 'sync' : (platformCopyMode[selectedPlatform] || 'sync')
  const isSyncedWithSource = selectedPlatformCopyMode !== 'custom'
  const isCustomPlatformEditor = !isSourcePlatform && !isSyncedWithSource
  const isSyncedReadOnlyEditor = !isSourcePlatform && isSyncedWithSource
  const selectedPlatformCustomText = platformCopyText[selectedPlatform] || ''
  const selectedPlatformCustomCount = selectedPlatformCustomText.length
  const selectedPlatformCustomOverLimit = selectedPlatformCustomCount > maxChars
  const [mediaItems, setMediaItems] = useState<MediaItem[]>([])
  const [mediaError, setMediaError] = useState<string | null>(null)
  const [replaceMediaId, setReplaceMediaId] = useState<string | null>(null)
  const removedMediaRef = useRef<{ item: MediaItem; index: number; timer: number } | null>(null)
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const replaceInputRef = useRef<HTMLInputElement | null>(null)
  const mediaPreviews = useMemo<MediaPreview[]>(
    () =>
      mediaItems.map((item) => ({
        id: item.id,
        name: item.file.name,
        url: URL.createObjectURL(item.file),
        kind: item.file.type.startsWith('image/')
          ? 'image'
          : item.file.type.startsWith('video/')
            ? 'video'
            : 'file',
      })),
    [mediaItems]
  )

  useEffect(
    () => () => {
      mediaPreviews.forEach((preview) => URL.revokeObjectURL(preview.url))
    },
    [mediaPreviews]
  )

  useEffect(
    () => () => {
      if (removedMediaRef.current) {
        window.clearTimeout(removedMediaRef.current.timer)
      }
    },
    []
  )

  const fileKey = (file: File) => `${file.name}:${file.size}:${file.lastModified}`

  const normalizeMediaFiles = (files: FileList | null, existing: MediaItem[]) => {
    if (!files || files.length === 0) return [] as MediaItem[]

    const next: MediaItem[] = []
    let invalidTypeCount = 0
    let oversizeCount = 0
    let duplicateCount = 0
    const existingKeys = new Set(existing.map((item) => fileKey(item.file)))

    for (const file of Array.from(files)) {
      if (!file.type.startsWith('image/') && !file.type.startsWith('video/')) {
        invalidTypeCount += 1
        continue
      }
      if (file.size > MAX_MEDIA_BYTES) {
        oversizeCount += 1
        continue
      }
      const key = fileKey(file)
      if (existingKeys.has(key)) {
        duplicateCount += 1
        continue
      }
      next.push({ id: crypto.randomUUID(), file })
      existingKeys.add(key)
    }

    if (invalidTypeCount > 0 || oversizeCount > 0 || duplicateCount > 0) {
      const parts = [
        invalidTypeCount > 0 ? `${invalidTypeCount} unsupported` : null,
        oversizeCount > 0 ? `${oversizeCount} over 25MB` : null,
        duplicateCount > 0 ? `${duplicateCount} duplicate` : null,
      ].filter(Boolean)
      setMediaError(parts.length > 0 ? `Some files were skipped: ${parts.join(', ')}.` : null)
    } else {
      setMediaError(null)
    }

    return next
  }

  const handleMediaSelect = (files: FileList | null) => {
    const normalized = normalizeMediaFiles(files, mediaItems)
    if (normalized.length === 0) return

    setMediaItems((prev) => {
      const room = Math.max(0, MAX_MEDIA_ITEMS - prev.length)
      if (room === 0) {
        setMediaError(`You can attach up to ${MAX_MEDIA_ITEMS} files.`)
        return prev
      }
      return [...prev, ...normalized.slice(0, room)]
    })
  }

  const handleReplaceMedia = (files: FileList | null) => {
    if (!replaceMediaId) return
    const current = mediaItems.find((item) => item.id === replaceMediaId)
    if (!current) return

    const normalized = normalizeMediaFiles(files, mediaItems.filter((item) => item.id !== replaceMediaId))
    const replacement = normalized[0]
    if (!replacement) {
      setReplaceMediaId(null)
      return
    }

    setMediaItems((prev) =>
      prev.map((item) => (item.id === replaceMediaId ? { id: item.id, file: replacement.file } : item))
    )
    setReplaceMediaId(null)
  }

  const undoRemovedMedia = () => {
    const removed = removedMediaRef.current
    if (!removed) return
    window.clearTimeout(removed.timer)
    setMediaItems((prev) => {
      const next = [...prev]
      const index = Math.max(0, Math.min(removed.index, next.length))
      next.splice(index, 0, removed.item)
      return next
    })
    removedMediaRef.current = null
  }

  const handleRemoveMedia = (id: string) => {
    setMediaItems((prev) => {
      const index = prev.findIndex((item) => item.id === id)
      if (index < 0) return prev

      const removedItem = prev[index]
      const next = prev.filter((item) => item.id !== id)

      if (removedMediaRef.current) {
        window.clearTimeout(removedMediaRef.current.timer)
      }
      const timer = window.setTimeout(() => {
        removedMediaRef.current = null
      }, 5000)
      removedMediaRef.current = {
        item: removedItem,
        index,
        timer,
      }

      toast('Media removed', {
        action: {
          label: 'Undo',
          onClick: undoRemovedMedia,
        },
      })

      return next
    })
  }

  const mediaPreviewSection = mediaItems.length > 0 ? (
    <div className="px-4 pb-2 pt-1">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-xs text-muted-foreground">{mediaItems.length} media</span>
        {!isSyncedReadOnlyEditor ? (
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex items-center gap-1 rounded-md border border-[var(--sidebar-divider)] bg-background px-2 py-1 text-[11px] text-foreground hover:bg-accent"
            >
              <Plus className="h-3 w-3" />
              Add
            </button>
            {mediaItems.length > 1 ? (
              <button
                type="button"
                onClick={() => setMediaItems([])}
                className="inline-flex items-center gap-1 rounded-md border border-[var(--sidebar-divider)] bg-background px-2 py-1 text-[11px] text-foreground hover:bg-accent"
              >
                <Trash2 className="h-3 w-3" />
                Clear
              </button>
            ) : null}
          </div>
        ) : null}
      </div>

      {mediaError ? (
        <p className="mb-2 text-xs text-amber-600 dark:text-amber-400">{mediaError}</p>
      ) : null}

      <div className={cn('grid gap-2', mediaPreviews.length === 1 ? 'grid-cols-1' : 'grid-cols-2 sm:grid-cols-3')}>
        {mediaPreviews.map((preview, index) => (
          <div
            key={`${preview.id}-${index}`}
            className="group relative overflow-hidden rounded-[19px] border border-[var(--sidebar-divider)] bg-[var(--sidebar-elevated)]"
          >
            {preview.kind === 'image' ? (
              <div className="flex items-center justify-center bg-background p-1">
                {/* Object URLs from local uploads cannot be optimized by next/image. */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={preview.url}
                  alt={preview.name}
                  className={cn(
                    'w-full object-contain',
                    mediaPreviews.length === 1 ? 'max-h-[460px]' : 'max-h-[260px]'
                  )}
                />
              </div>
            ) : preview.kind === 'video' ? (
              <div className="flex items-center justify-center bg-background p-1">
                <video
                  src={preview.url}
                  className={cn(
                    'w-full object-contain',
                    mediaPreviews.length === 1 ? 'max-h-[460px]' : 'max-h-[260px]'
                  )}
                  muted
                  playsInline
                  controls
                />
              </div>
            ) : (
              <div className="flex h-24 items-center justify-center text-muted-foreground">
                <Paperclip className="h-5 w-5" />
              </div>
            )}

            {!isSyncedReadOnlyEditor ? (
              <div className="absolute right-2 top-2 flex items-center gap-1 opacity-100 transition-opacity sm:opacity-0 sm:group-hover:opacity-100">
                <button
                  type="button"
                  onClick={() => {
                    setReplaceMediaId(preview.id)
                    replaceInputRef.current?.click()
                  }}
                  className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-border bg-background/95 text-foreground shadow-sm hover:bg-background"
                  title="Replace media"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => handleRemoveMedia(preview.id)}
                  className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-border bg-background/95 text-foreground shadow-sm hover:bg-background"
                  title="Remove media"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  ) : null

  return (
    <>
      {topSection}

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="inline-flex flex-wrap items-center gap-1.5 rounded-2xl border border-[var(--sidebar-divider)] bg-card p-1.5 shadow-sm">
          {visiblePlatformTabs.map((platform) => (
            <button
              key={platform}
              type="button"
              onClick={() => onSelectedPlatformChange(platform)}
              className={cn(
                'inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs transition-colors',
                selectedPlatform === platform
                  ? 'border-foreground bg-foreground text-background'
                  : 'border-transparent bg-transparent text-foreground hover:border-[var(--sidebar-divider)] hover:bg-[var(--sidebar-elevated)]'
              )}
              title={`Edit ${getPlatformLabel(platform)} copy`}
            >
              <PlatformIcon platform={platform} className="h-3.5 w-3.5" />
              <span>{getPlatformLabel(platform)}</span>
              {platform === sourcePlatform ? (
                <span className={cn('h-1.5 w-1.5 rounded-full', selectedPlatform === platform ? 'bg-background/70' : 'bg-emerald-500')} />
              ) : null}
            </button>
          ))}
          {visiblePlatformTabs.length === 0 ? (
            <button
              type="button"
              onClick={() => onPlatformPickerOpenChange(true)}
              className="rounded-xl border border-[var(--sidebar-divider)] bg-[var(--sidebar-elevated)] px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            >
              Add publishable channels
            </button>
          ) : null}
          <button
            type="button"
            onClick={() => onPlatformPickerOpenChange(true)}
            className="inline-flex h-8 w-8 items-center justify-center rounded-xl border border-[var(--sidebar-divider)] bg-background text-foreground transition-colors hover:bg-accent"
            title="Manage channels"
            aria-label="Manage channels"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>
      </div>

      {!isSourcePlatform && visiblePlatformTabs.includes(selectedPlatform) ? (
        <div className="mb-4 flex items-center rounded-2xl border border-[var(--sidebar-divider)] bg-card px-3 py-2">
          <label className="inline-flex items-center gap-3 text-sm text-foreground">
            <button
              type="button"
              role="switch"
              aria-checked={isSyncedWithSource}
              aria-label={`Same as ${getPlatformLabel(sourcePlatform)}`}
              onClick={() => onPlatformCopyModeChange(selectedPlatform, isSyncedWithSource ? 'custom' : 'sync')}
              className={cn(
                'relative inline-flex h-6 w-11 shrink-0 rounded-full border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50',
                isSyncedWithSource
                  ? 'border-blue-500/70 bg-blue-500'
                  : 'border-[var(--sidebar-divider)] bg-[var(--sidebar-elevated)]'
              )}
            >
              <span
                className={cn(
                  'absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform',
                  isSyncedWithSource ? 'translate-x-[22px]' : 'translate-x-0.5'
                )}
              />
            </button>
            <span className="leading-none">Same as {getPlatformLabel(sourcePlatform)}</span>
          </label>
        </div>
      ) : null}

      <div
        className="rounded-2xl border border-[var(--sidebar-divider)] bg-card shadow-sm"
        onDrop={(event) => {
          event.preventDefault()
          if (isSyncedReadOnlyEditor) return
          handleMediaSelect(event.dataTransfer.files)
        }}
        onDragOver={(event) => event.preventDefault()}
      >
        <div className="px-4 pt-4">
          <Input
            value={title}
            onChange={(e) => onTitleChange(e.target.value)}
            placeholder="Title"
            className="h-12 rounded-xl border-transparent bg-transparent px-0 text-[22px] font-semibold text-foreground placeholder:text-muted-foreground focus-visible:ring-0"
          />
        </div>

        {isCustomPlatformEditor ? (
          <div className="px-4 pb-4 pt-3">
            <textarea
              value={selectedPlatformCustomText}
              onChange={(event) => onPlatformCopyTextChange(selectedPlatform, event.target.value)}
              placeholder="Write your platform-specific copy..."
              className="min-h-[280px] w-full resize-y rounded-xl border border-[var(--sidebar-divider)] bg-[var(--sidebar-elevated)] px-4 py-3 text-[16px] leading-[1.7] text-foreground outline-none placeholder:text-muted-foreground"
            />
            <div className="mt-2 flex items-center justify-end">
              <span className={cn('text-xs tabular-nums', selectedPlatformCustomOverLimit ? 'text-red-500' : 'text-muted-foreground')}>
                {selectedPlatformCustomCount} / {maxChars}
              </span>
            </div>
          </div>
        ) : (
          <>
            <div className="space-y-0 px-3 py-2">
              {thread.map((item, index) => {
                const isActive = activeIndex === index
                const itemCharCount = item.content.length
                const itemOverLimit = itemCharCount > maxChars

                return (
                  <div key={item.id}>
                    <div
                      className={cn(
                        'relative rounded-xl border px-1 transition-colors',
                        isActive ? 'border-[var(--sidebar-divider)] bg-[var(--sidebar-elevated)]' : 'border-transparent bg-transparent hover:bg-accent/40'
                      )}
                      onClick={() => onActiveIndexChange(index)}
                    >
                      <div className="absolute left-0 top-3 flex w-8 items-center justify-center">
                        <span className={cn('text-xs font-medium', isActive ? 'text-muted-foreground' : 'text-border')}>
                          {index + 1}
                        </span>
                      </div>

                      <div className="pl-12 pr-3">
                        <textarea
                          value={item.content}
                          onChange={(e) => {
                            if (isSyncedReadOnlyEditor) return
                            onThreadItemChange(index, e.target.value)
                          }}
                          onFocus={() => onActiveIndexChange(index)}
                          readOnly={isSyncedReadOnlyEditor}
                          placeholder="Start writing…"
                          className={`w-full resize-none border-none bg-transparent text-[16px] leading-[1.7] text-foreground outline-none placeholder:text-muted-foreground ${isActive ? 'mt-2 min-h-[100px]' : 'min-h-[72px]'} ${isSyncedReadOnlyEditor ? 'cursor-default' : ''}`}
                          style={{ height: Math.max(80, item.content.split('\n').length * 28 + 40) }}
                        />

                        {isActive ? (
                          <div className="flex items-center justify-between pb-2">
                            <div className="flex items-center gap-2">
                              {thread.length > 1 && !isSyncedReadOnlyEditor ? (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    onRemoveThreadItem(index)
                                  }}
                                  className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-red-500/10 hover:text-red-500"
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

            {mediaPreviewSection}

            <div className="px-4 pb-3">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,video/*"
                multiple
                className="hidden"
                onChange={(event) => {
                  handleMediaSelect(event.target.files)
                  event.currentTarget.value = ''
                }}
              />
              <input
                ref={replaceInputRef}
                type="file"
                accept="image/*,video/*"
                className="hidden"
                onChange={(event) => {
                  handleReplaceMedia(event.target.files)
                  event.currentTarget.value = ''
                }}
              />
              <EditorToolbar
                characterCount={characterCount}
                maxCharacters={maxChars}
                showCharacterCount={false}
                onImageUpload={isSyncedReadOnlyEditor ? undefined : () => fileInputRef.current?.click()}
              />
              <p className="mt-2 text-xs text-muted-foreground">Cmd/Ctrl + Enter to publish</p>
            </div>
          </>
        )}

        {isCustomPlatformEditor ? mediaPreviewSection : null}
      </div>

      {footerSection}

      <Dialog open={platformPickerOpen} onOpenChange={onPlatformPickerOpenChange}>
        <DialogContent className="max-w-2xl rounded-2xl border-[var(--sidebar-divider)] bg-card">
          <DialogHeader>
            <DialogTitle>Channels</DialogTitle>
            <DialogDescription>
              Choose where this post can publish.
            </DialogDescription>
          </DialogHeader>

          <div className="max-h-[60vh] space-y-4 overflow-y-auto custom-scrollbar pr-1">
            {disconnectedRows.length > 0 ? (
              <div>
                <p className="mb-2 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Not Connected</p>
                <div className="space-y-2">
                  {disconnectedRows.map((platform) => {
                    const isTarget = publishTargets.includes(platform.id)

                    return (
                      <div
                        key={platform.id}
                        className="flex items-center justify-between rounded-[10px] border border-border bg-background/60 px-3 py-2"
                      >
                        <div className="min-w-0 flex items-center gap-3">
                          <PlatformIcon platform={platform.id} className="h-4 w-4" />
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium text-foreground">{platform.name}</p>
                            <p className="truncate text-xs text-muted-foreground">
                              Not connected
                              {!platform.isPublishable ? ' • Connect-only' : ''}
                              {isTarget ? ' • Selected' : ''}
                            </p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => void onConnectPlatform(platform.id)}
                          disabled={connectingPlatform === platform.id}
                          className="inline-flex items-center rounded-md border border-border px-2.5 py-1.5 text-xs text-foreground hover:bg-accent disabled:opacity-70"
                        >
                          {connectingPlatform === platform.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Connect'}
                        </button>
                      </div>
                    )
                  })}
                </div>
              </div>
            ) : null}

            <div>
              <p className="mb-2 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Connected</p>
              <div className="space-y-2">
                {connectedRows.map((platform) => {
              const isActive = selectedPlatform === platform.id
              const isTarget = publishTargets.includes(platform.id)

              return (
                <div
                  key={platform.id}
                  className={cn(
                    'flex items-center justify-between rounded-[10px] border px-3 py-2 transition-colors',
                    isActive ? 'border-ring bg-accent/50' : 'border-border bg-background/60'
                  )}
                  onClick={() => {
                    if (!platform.isPublishable) return
                    onSelectedPlatformChange(platform.id)
                  }}
                >
                  <div className="min-w-0 flex items-center gap-3">
                    <PlatformIcon platform={platform.id} className="h-4 w-4" />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-foreground">{platform.name}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {platform.connected
                          ? (platform.accountLabel || 'Connected')
                          : 'Not connected'}
                        {platform.connected && !platform.isPublishable ? ' • Connect-only' : ''}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation()
                        onToggleTargetPlatform(platform.id)
                      }}
                      disabled={!platform.connected || !platform.isPublishable}
                      className={cn(
                        'inline-flex items-center gap-1 rounded-md px-2.5 py-1.5 text-xs font-medium',
                        platform.connected && platform.isPublishable
                          ? (isTarget ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300' : 'border border-border text-foreground hover:bg-accent')
                          : 'cursor-not-allowed border border-border text-muted-foreground opacity-70'
                      )}
                    >
                      {isTarget ? (
                        <>
                          <Check className="h-3.5 w-3.5" />
                          Target
                        </>
                      ) : platform.connected ? 'Add target' : 'Connect first'}
                    </button>

                    {!platform.connected ? (
                      <span className="text-xs text-muted-foreground">Not connected</span>
                    ) : null}
                    {isActive ? (
                      <span className="inline-flex items-center gap-1 rounded-md bg-foreground px-2.5 py-1.5 text-xs font-medium text-background">
                        <Check className="h-3.5 w-3.5" />
                        Active
                      </span>
                    ) : null}
                  </div>
                </div>
              )
            })}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
