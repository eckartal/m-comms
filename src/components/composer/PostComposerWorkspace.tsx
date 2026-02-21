'use client'

import type { ReactNode } from 'react'
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
import { Check, ChevronDown, Loader2, Plus, Settings2, X } from 'lucide-react'
import { cn } from '@/lib/utils'

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
  onAddThreadItem: () => void
  onRemoveThreadItem: (index: number) => void
  isBookmarked: boolean
  onToggleBookmark: () => void
  selectedPlatform: PlatformType
  onSelectedPlatformChange: (platform: PlatformType) => void
  platformMeta: Record<PlatformType, PlatformMeta>
  publishTargets: PlatformType[]
  targetSummary: string
  onToggleTargetPlatform: (platform: PlatformType) => void
  selectedPlatformConnected: boolean
  selectedPlatformPublishable: boolean
  connectionsLoading: boolean
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
  onAddThreadItem,
  onRemoveThreadItem,
  isBookmarked,
  onToggleBookmark,
  selectedPlatform,
  onSelectedPlatformChange,
  platformMeta,
  publishTargets,
  targetSummary,
  onToggleTargetPlatform,
  selectedPlatformConnected,
  selectedPlatformPublishable,
  connectionsLoading,
  connectingPlatform,
  onConnectPlatform,
  platformPickerOpen,
  onPlatformPickerOpenChange,
  platformRows,
  topSection,
  footerSection,
}: PostComposerWorkspaceProps) {
  const currentContent = thread[activeIndex]?.content || ''
  const maxChars = platformMeta[selectedPlatform].limit
  const characterCount = currentContent.length

  return (
    <>
      {topSection}

      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => onPlatformPickerOpenChange(true)}
          className="inline-flex items-center gap-2 rounded-[10px] border border-border bg-card px-3 py-2 text-sm text-foreground transition-colors hover:bg-accent"
        >
          <Settings2 className="h-4 w-4 text-muted-foreground" />
          <span className="font-medium">Platform Scope</span>
          <span className="text-muted-foreground">{targetSummary}</span>
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        </button>

        <div className="flex items-center gap-3">
          <span className="text-xs text-muted-foreground">Active: {platformMeta[selectedPlatform].name}</span>
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
              onClick={() => onToggleTargetPlatform(platform)}
              className="inline-flex items-center gap-2 rounded-full border border-border bg-background px-2.5 py-1.5 text-xs text-foreground transition-colors hover:bg-accent"
            >
              <PlatformIcon platform={platform} className="h-3.5 w-3.5" />
              <span>{platformMeta[platform].name}</span>
              <X className="h-3 w-3 text-muted-foreground" />
            </button>
          ))}
          {publishTargets.length === 0 ? (
            <span className="text-xs text-muted-foreground">No targets selected. Choose channels in Platform Scope.</span>
          ) : null}
        </div>
      </div>

      {!connectionsLoading && (!selectedPlatformConnected || !selectedPlatformPublishable) ? (
        <div className="mb-5 flex items-center justify-between rounded-[8px] border border-border bg-card px-3 py-2">
          <p className="text-[13px] text-muted-foreground">
            {selectedPlatformPublishable
              ? `Connect ${platformMeta[selectedPlatform].name} to publish without leaving the editor.`
              : `${platformMeta[selectedPlatform].name} is connect-only right now. Direct publishing is currently available for X and LinkedIn.`}
          </p>
          {!selectedPlatformConnected ? (
            <button
              onClick={() => void onConnectPlatform(selectedPlatform)}
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
            onChange={(e) => onTitleChange(e.target.value)}
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
                  onClick={() => onActiveIndexChange(index)}
                >
                  <div className="absolute left-0 top-3 w-8 flex items-center justify-center">
                    <span className={`text-[13px] font-medium ${isActive ? 'text-muted-foreground' : 'text-border'}`}>
                      {index + 1}
                    </span>
                  </div>

                  <div className="pl-12 pr-3">
                    <textarea
                      value={item.content}
                      onChange={(e) => onThreadItemChange(index, e.target.value)}
                      onFocus={() => onActiveIndexChange(index)}
                      placeholder={index === 0 ? `What is happening on ${platformMeta[selectedPlatform].name}?` : 'Add another block...'}
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
                                onRemoveThreadItem(index)
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
            onClick={onAddThreadItem}
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
            onBookmark={onToggleBookmark}
          />
        </div>
      </div>

      {footerSection}

      <Dialog open={platformPickerOpen} onOpenChange={onPlatformPickerOpenChange}>
        <DialogContent className="max-w-2xl border-border bg-card">
          <DialogHeader>
            <DialogTitle>Platform Scope</DialogTitle>
            <DialogDescription>
              Choose your active compose channel and manage connection state.
            </DialogDescription>
          </DialogHeader>

          <div className="max-h-[60vh] space-y-2 overflow-y-auto custom-scrollbar pr-1">
            {platformRows.map((platform) => {
              const isActive = selectedPlatform === platform.id
              const isTarget = publishTargets.includes(platform.id)

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
                      onClick={() => onToggleTargetPlatform(platform.id)}
                      disabled={!platform.connected || !platform.isPublishable}
                      className={cn(
                        'inline-flex items-center gap-1 rounded-[6px] px-2.5 py-1.5 text-xs font-medium',
                        platform.connected && platform.isPublishable
                          ? (isTarget ? 'bg-emerald-500/15 text-emerald-300' : 'border border-border text-foreground hover:bg-accent')
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
                      <button
                        type="button"
                        onClick={() => void onConnectPlatform(platform.id)}
                        disabled={connectingPlatform === platform.id}
                        className="inline-flex items-center rounded-[6px] border border-border px-2.5 py-1.5 text-xs text-foreground hover:bg-accent disabled:opacity-70"
                      >
                        {connectingPlatform === platform.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Connect'}
                      </button>
                    ) : null}

                    <button
                      type="button"
                      onClick={() => onSelectedPlatformChange(platform.id)}
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
    </>
  )
}
