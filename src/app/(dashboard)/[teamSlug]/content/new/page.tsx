'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useRouter, useParams, usePathname, useSearchParams } from 'next/navigation'
import { EditorToolbar } from '@/components/editor/EditorToolbar'
import { PublishControls } from '@/components/publish/PublishControls'
import { useAppStore, useContentStore } from '@/stores'
import { PlatformIcon } from '@/components/oauth/PlatformIcon'
import { createContent, updateContent } from '@/stores'
import type { PlatformType } from '@/types'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import {
  Plus,
  X,
  Loader2,
  Settings2,
  ChevronDown,
  Check,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { connectPlatform, getConnectErrorMessage } from '@/lib/oauth/connectPlatform'
import { toast } from 'sonner'
import { DashboardContainer } from '@/components/layout/DashboardContainer'
import { getLocalConnectedPlatforms, getLocalConnectionAccounts } from '@/lib/oauth/localConnections'
import { useConnectionMode } from '@/hooks/useConnectionMode'
import { SandboxConfirmDialog } from '@/components/oauth/SandboxConfirmDialog'

// Platform configurations with character limits
const PLATFORMS: Record<PlatformType, { name: string; limit: number; icon: string }> = {
  twitter: { name: 'X (Twitter)', limit: 280, icon: '𝕏' },
  linkedin: { name: 'LinkedIn', limit: 3000, icon: 'in' },
  instagram: { name: 'Instagram', limit: 2200, icon: '📷' },
  tiktok: { name: 'TikTok', limit: 2200, icon: '🎵' },
  youtube: { name: 'YouTube', limit: 5000, icon: '▶️' },
  threads: { name: 'Threads', limit: 500, icon: '💬' },
  bluesky: { name: 'Bluesky', limit: 300, icon: '🔵' },
  mastodon: { name: 'Mastodon', limit: 500, icon: '🐘' },
  facebook: { name: 'Facebook', limit: 63000, icon: 'f' },
}


// Thread item type
interface ThreadItem {
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
}

const SUPPORTED_PLATFORM_KEYS = new Set(Object.keys(PLATFORMS))

function isSupportedPlatform(id: string): id is PlatformType {
  return SUPPORTED_PLATFORM_KEYS.has(id)
}

export default function NewContentPage() {
  const router = useRouter()
  const pathname = usePathname()
  const params = useParams()
  const searchParams = useSearchParams()
  const teamSlug = params.teamSlug as string
  const { currentUser, currentTeam } = useAppStore()
  const { saving, setSaving } = useContentStore()

  const [contentId, setContentId] = useState<string | null>(null)
  const [title, setTitle] = useState('')
  const [thread, setThread] = useState<ThreadItem[]>([{ id: '1', content: '' }])
  const [activeIndex, setActiveIndex] = useState(0)
  const [selectedPlatform, setSelectedPlatform] = useState<PlatformType>('twitter')
  const [targetPlatforms, setTargetPlatforms] = useState<PlatformType[]>(['twitter'])
  const [isBookmarked, setIsBookmarked] = useState(false)
  const [isPublishing, setIsPublishing] = useState(false)
  const [connectedPlatforms, setConnectedPlatforms] = useState<PlatformType[]>([])
  const [platformCatalog, setPlatformCatalog] = useState<PlatformCatalogItem[]>([])
  const [connectionsLoading, setConnectionsLoading] = useState(true)
  const [connectingPlatform, setConnectingPlatform] = useState<PlatformType | null>(null)
  const [platformPickerOpen, setPlatformPickerOpen] = useState(false)
  const [sandboxConnectPlatform, setSandboxConnectPlatform] = useState<PlatformType | null>(null)
  const { mode: connectionMode } = useConnectionMode(teamSlug)

  const maxChars = PLATFORMS[selectedPlatform].limit
  const currentContent = thread[activeIndex]?.content || ''
  const characterCount = currentContent.length
  const totalCharacters = thread.reduce((sum, item) => sum + item.content.length, 0)
  const isSaved = !saving
  const selectedPlatformConnected = connectedPlatforms.includes(selectedPlatform)
  const activePlatformMeta = PLATFORMS[selectedPlatform]
  const publishTargets = useMemo(() => {
    const targets = targetPlatforms.length > 0 ? targetPlatforms : [selectedPlatform]
    return Array.from(new Set(targets))
  }, [targetPlatforms, selectedPlatform])
  const targetSummary = useMemo(
    () => publishTargets.map((platform) => PLATFORMS[platform].name).join(', '),
    [publishTargets]
  )
  const platformRows = useMemo(
    () => (platformCatalog.length > 0
      ? platformCatalog.filter((platform) => isSupportedPlatform(platform.id))
      : (Object.keys(PLATFORMS) as PlatformType[]).map((platform) => ({
          id: platform,
          name: PLATFORMS[platform].name,
          connected: connectedPlatforms.includes(platform),
          accounts: [],
        }))
    ) as PlatformCatalogItem[],
    [platformCatalog, connectedPlatforms]
  )

  const fetchConnectedPlatforms = useCallback(async () => {
    try {
      setConnectionsLoading(true)
      const res = await fetch(`/api/platforms?teamSlug=${encodeURIComponent(teamSlug)}`)
      const data = await res.json()
      const localConnected = getLocalConnectedPlatforms(teamSlug, currentTeam?.id)
      const localConnections = getLocalConnectionAccounts(teamSlug, currentTeam?.id)
      if (!res.ok) {
        setConnectedPlatforms(localConnected as PlatformType[])
        setPlatformCatalog([])
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

      const connected = catalog
        .filter((platform) => platform.connected)
        .map((platform) => platform.id as PlatformType)
      const merged = Array.from(new Set([...connected, ...localConnected])) as PlatformType[]
      setConnectedPlatforms(merged)
    } catch (error) {
      console.error('Failed to fetch connected platforms for composer:', error)
      setConnectedPlatforms(getLocalConnectedPlatforms(teamSlug, currentTeam?.id) as PlatformType[])
      setPlatformCatalog([])
    } finally {
      setConnectionsLoading(false)
    }
  }, [teamSlug, currentTeam?.id])

  const runConnectPlatform = async (platform: PlatformType, skipSandboxConfirmation = false) => {
    setConnectingPlatform(platform)

    try {
      await connectPlatform({
        platform,
        teamId: currentTeam?.id,
        teamSlug,
        returnTo: `/${teamSlug}/content/new`,
        mode: 'popup',
        source: 'composer',
        skipSandboxConfirmation,
        onSuccess: async () => {
          await fetchConnectedPlatforms()
        },
      })
    } catch (error) {
      console.error('Failed to connect from composer:', error)
    } finally {
      setConnectingPlatform(null)
    }
  }

  const handleConnectPlatform = async (platform: PlatformType) => {
    if (connectionMode === 'local_sandbox') {
      setSandboxConnectPlatform(platform)
      return
    }
    await runConnectPlatform(platform)
  }

  // Load saved draft from localStorage on mount
  useEffect(() => {
    const savedDraft = localStorage.getItem(`draft_${teamSlug}`)
    if (savedDraft) {
      try {
        const data = JSON.parse(savedDraft)
        if (data.thread && Array.isArray(data.thread) && data.thread.length > 0) {
          setThread(data.thread)
          setActiveIndex(data.thread.length - 1)
        }
        setSelectedPlatform((data.platform as PlatformType) || 'twitter')
        if (Array.isArray(data.targets)) {
          const savedTargets = data.targets.filter((id: string) => isSupportedPlatform(id)) as PlatformType[]
          setTargetPlatforms(savedTargets.length > 0 ? savedTargets : ['twitter'])
        }
        setIsBookmarked(data.bookmarked || false)
      } catch (e) {
        console.error('Failed to load draft', e)
      }
    }
  }, [teamSlug])

  useEffect(() => {
    fetchConnectedPlatforms()
  }, [fetchConnectedPlatforms])

  useEffect(() => {
    if (connectedPlatforms.includes(selectedPlatform) && !targetPlatforms.includes(selectedPlatform)) {
      setTargetPlatforms((prev) => [...prev, selectedPlatform])
    }
  }, [selectedPlatform, connectedPlatforms, targetPlatforms])

  useEffect(() => {
    const connected = searchParams.get('connected')
    const error = searchParams.get('error')

    if (connected) {
      toast.success(`${connected.charAt(0).toUpperCase() + connected.slice(1)} connected.`)
      if (Object.keys(PLATFORMS).includes(connected)) {
        setSelectedPlatform(connected as PlatformType)
      }
      fetchConnectedPlatforms()
    }

    if (error) {
      toast.error(`Connection failed: ${getConnectErrorMessage(decodeURIComponent(error))}`)
    }

    if (connected || error) {
      router.replace(pathname)
    }
  }, [searchParams, fetchConnectedPlatforms, router, pathname])

  // Auto-save to Supabase and localStorage
  useEffect(() => {
    const timer = setTimeout(async () => {
      const blocks = thread.map((item) => ({
        id: item.id,
        type: 'text' as const,
        content: { text: item.content }
      }))

      const draftData = {
        thread,
        platform: selectedPlatform,
        targets: targetPlatforms,
        bookmarked: isBookmarked,
        savedAt: new Date().toISOString()
      }

      // Save to localStorage
      localStorage.setItem(`draft_${teamSlug}`, JSON.stringify(draftData))

      // If we have a contentId, sync to Supabase
      if (contentId && currentTeam) {
        setSaving(true)
        await updateContent(contentId, {
          title: title || 'Untitled',
          blocks,
          platforms: publishTargets.map((platform) => ({ type: platform })),
        })
        setSaving(false)
      }
    }, 1000)
    return () => clearTimeout(timer)
  }, [thread, selectedPlatform, targetPlatforms, isBookmarked, teamSlug, contentId, currentTeam, title, setSaving, publishTargets])

  // Handle text change
  const handleContentChange = (index: number, value: string) => {
    const newThread = [...thread]
    newThread[index] = { ...newThread[index], content: value }
    setThread(newThread)
  }

  // Add new tweet
  const addTweet = () => {
    const newId = Date.now().toString()
    setThread([...thread, { id: newId, content: '' }])
    setActiveIndex(thread.length)
  }

  // Remove tweet
  const removeTweet = (index: number) => {
    if (thread.length === 1) {
      setThread([{ id: '1', content: '' }])
      setActiveIndex(0)
      return
    }
    const newThread = thread.filter((_, i) => i !== index)
    setThread(newThread)
    setActiveIndex(Math.min(index, newThread.length - 1))
  }

  // Clear all
  const clearAll = () => {
    setThread([{ id: Date.now().toString(), content: '' }])
    setActiveIndex(0)
    localStorage.removeItem(`draft_${teamSlug}`)
  }

  const toggleTargetPlatform = (platform: PlatformType) => {
    if (!connectedPlatforms.includes(platform)) return

    setTargetPlatforms((prev) => {
      if (prev.includes(platform)) {
        return prev.filter((item) => item !== platform)
      }
      return [...prev, platform]
    })
  }

  const handlePublish = async () => {
    const hasContent = thread.some(t => t.content.trim().length > 0)
    if (!hasContent) return
    setIsPublishing(true)

    try {
      const blocks = thread.map((item) => ({
        id: item.id,
        type: 'thread' as const,
        content: { tweets: thread.map(t => ({ text: t.content })) }
      }))

      // Create content in Supabase if not exists
      if (!contentId && currentTeam) {
        const newContent = await createContent(currentTeam.id, {
          title: title || 'Untitled',
          blocks,
          status: 'PUBLISHED'
        })
        if (newContent) {
          setContentId(newContent.id)
          await updateContent(newContent.id, {
            platforms: publishTargets.map((platform) => ({ type: platform })),
          })
        }
      } else if (contentId) {
        await updateContent(contentId, {
          title: title || 'Untitled',
          blocks,
          status: 'PUBLISHED',
          platforms: publishTargets.map((platform) => ({ type: platform })),
        })
      }

      localStorage.removeItem(`draft_${teamSlug}`)
      router.push(`/${teamSlug}/content`)
    } catch (error) {
      console.error('Error publishing:', error)
    } finally {
      setIsPublishing(false)
    }
  }

  const handleSchedule = async (scheduledAt: Date = new Date()) => {
    const hasContent = thread.some(t => t.content.trim().length > 0)
    if (!hasContent) return

    const blocks = thread.map((item) => ({
      id: item.id,
      type: 'thread' as const,
      content: { tweets: thread.map(t => ({ text: t.content })) }
    }))

    try {
      if (!contentId && currentTeam) {
        const newContent = await createContent(currentTeam.id, {
          title: title || 'Untitled',
          blocks,
          status: 'SCHEDULED'
        })
        if (newContent) {
          setContentId(newContent.id)
          await updateContent(newContent.id, {
            platforms: publishTargets.map((platform) => ({ type: platform })),
          })
        }
      } else if (contentId) {
        await updateContent(contentId, {
          title: title || 'Untitled',
          blocks,
          status: 'SCHEDULED',
          platforms: publishTargets.map((platform) => ({ type: platform })),
          scheduled_at: scheduledAt.toISOString()
        })
      }

      localStorage.removeItem(`draft_${teamSlug}`)
      router.push(`/${teamSlug}/content`)
    } catch (error) {
      console.error('Error scheduling:', error)
    }
  }

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: globalThis.KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
        e.preventDefault()
        handlePublish()
      }
      // Cmd+Enter to add new tweet when in last tweet
      if ((e.metaKey || e.ctrlKey) && e.key === 'ArrowDown' && activeIndex === thread.length - 1 && currentContent.length > 0) {
        e.preventDefault()
        addTweet()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [activeIndex, thread.length, currentContent, addTweet, handlePublish])

  // Merge tweets indicator
  const canMerge = thread.length > 1 && activeIndex < thread.length - 1

  const platformSummary = publishTargets.length > 1
    ? `${PLATFORMS[publishTargets[0]].name} +${publishTargets.length - 1}`
    : PLATFORMS[publishTargets[0]].name

  return (
    <div className="flex min-h-full flex-col bg-background">
      {/* Account Header */}
      <header className="border-b border-border">
        <DashboardContainer className="max-w-[680px] py-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[14px] font-medium text-foreground">
                Logged in as @{currentUser?.email?.split('@')[0] || 'user'}
              </span>
              <div className="flex items-center gap-4">
                {/* Thread count */}
                {thread.length > 1 && (
                  <span className="text-xs text-muted-foreground">
                    {thread.length} tweets
                  </span>
                )}
                {/* Auto-save indicator */}
                <span className={cn(
                  'text-xs flex items-center gap-1',
                  isSaved ? 'text-muted-foreground' : 'text-primary'
                )}>
                  <span className={cn(
                    'w-2 h-2 rounded-full',
                    isSaved ? 'bg-emerald-500' : 'bg-primary animate-pulse'
                  )} />
                  {isSaved ? 'Saved' : 'Saving...'}
                </span>
              </div>
            </div>

            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Draft title (optional)"
              className="w-full bg-transparent border border-border rounded-[8px] px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
            />
          </div>
        </DashboardContainer>
      </header>

      {/* Composition Area */}
      <div className="flex-1 overflow-y-auto">
        <DashboardContainer className="max-w-[680px] py-6">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => setPlatformPickerOpen(true)}
              className="inline-flex items-center gap-2 rounded-[10px] border border-border bg-card px-3 py-2 text-sm text-foreground hover:bg-accent transition-colors"
            >
              <Settings2 className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">Platform Scope</span>
              <span className="text-muted-foreground">{platformSummary}</span>
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            </button>

            <div className="flex items-center gap-3">
              {/* Thread count */}
              <span className="text-xs text-muted-foreground">
                Active: {activePlatformMeta.name}
              </span>
              {thread.some(t => t.content) && (
                <button
                  onClick={clearAll}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-[13px] font-medium text-muted-foreground hover:text-red-500 transition-colors"
                >
                  Clear
                </button>
              )}
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
                  className="inline-flex items-center gap-2 rounded-full border border-border bg-background px-2.5 py-1.5 text-xs text-foreground hover:bg-accent transition-colors"
                >
                  <PlatformIcon platform={platform} className="h-3.5 w-3.5" />
                  <span>{PLATFORMS[platform].name}</span>
                  <X className="h-3 w-3 text-muted-foreground" />
                </button>
              ))}
              {publishTargets.length === 0 && (
                <span className="text-xs text-muted-foreground">No targets selected. Choose channels in Platform Scope.</span>
              )}
            </div>
          </div>

          {!connectionsLoading && !selectedPlatformConnected && (
            <div className="mb-5 rounded-[8px] border border-border bg-card px-3 py-2 flex items-center justify-between">
              <p className="text-[13px] text-muted-foreground">
                Connect {PLATFORMS[selectedPlatform].name} to publish without leaving the editor.
              </p>
              <button
                onClick={() => handleConnectPlatform(selectedPlatform)}
                disabled={connectingPlatform === selectedPlatform}
                className="inline-flex items-center rounded-[6px] bg-foreground px-3 py-1.5 text-[12px] font-medium text-background hover:bg-hover disabled:opacity-70"
              >
                {connectingPlatform === selectedPlatform ? (
                  <>
                    <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                    Connecting
                  </>
                ) : (
                  'Connect'
                )}
              </button>
            </div>
          )}

          {/* Thread Items */}
          <div className="space-y-0">
            {thread.map((item, index) => {
              const isActive = activeIndex === index
              const itemCharCount = item.content.length
              const itemOverLimit = itemCharCount > maxChars

              return (
                <div key={item.id}>
                  {/* Thread connector line */}
                  {index > 0 && (
                    <div className="flex">
                      <div className="w-8 flex items-center justify-center">
                        <div className="w-0.5 h-6 bg-border" />
                      </div>
                      <div className="flex-1" />
                    </div>
                  )}

                  {/* Tweet item */}
                  <div
                    className={cn(
                      'relative rounded-[8px] transition-all cursor-text',
                      isActive
                        ? 'bg-card'
                        : 'bg-transparent'
                    )}
                    onClick={() => setActiveIndex(index)}
                  >
                    {/* Tweet number */}
                    <div className="absolute left-0 top-3 w-8 flex items-center justify-center">
                      <span className={cn(
                        'text-[13px] font-medium',
                        isActive ? 'text-muted-foreground' : 'text-border'
                      )}>
                        {index + 1}
                      </span>
                    </div>

                    {/* Content area */}
                    <div className="pl-12 pr-4">
                      <textarea
                        placeholder={index === 0 ? `What is happening on ${PLATFORMS[selectedPlatform].name}?` : 'Add tweet...'}
                        value={item.content}
                        onChange={(e) => handleContentChange(index, e.target.value)}
                        onFocus={() => setActiveIndex(index)}
                        className={cn(
                          'w-full min-h-[80px] text-[16px] leading-[1.7] bg-transparent border-none outline-none resize-none placeholder:text-muted-foreground',
                          isActive && 'mt-3'
                        )}
                        style={{ height: Math.max(80, item.content.split('\n').length * 28 + 40) }}
                      />

                      {/* Character count & actions */}
                      {isActive && (
                        <div className="flex items-center justify-between py-2">
                          <div className="flex items-center gap-2">
                            {thread.length > 1 && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  removeTweet(index)
                                }}
                                className="p-1.5 text-muted-foreground hover:text-red-500 hover:bg-red-500/10 rounded transition-colors"
                                title="Remove tweet"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            )}
                            {canMerge && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleContentChange(index, item.content + ' ' + thread[index + 1].content)
                                  removeTweet(index + 1)
                                }}
                                className="flex items-center gap-1 px-2 py-1 text-xs text-muted-foreground hover:text-foreground hover:bg-muted rounded transition-colors"
                                title="Merge with next tweet"
                              >
                                <Plus className="w-3 h-3" />
                                Merge
                              </button>
                            )}
                          </div>
                          <span className={cn(
                            'text-[12px] tabular-nums',
                            itemOverLimit
                              ? 'text-red-500'
                              : itemCharCount > maxChars * 0.8
                              ? 'text-amber-500'
                              : 'text-muted-foreground'
                          )}>
                            {itemCharCount} / {maxChars}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Add Tweet Button */}
          {selectedPlatform === 'twitter' && (
            <button
              onClick={addTweet}
              className="mt-4 flex items-center gap-2 px-4 py-2 text-[14px] text-muted-foreground hover:text-foreground hover:bg-muted rounded-[6px] transition-colors"
            >
              <Plus className="w-4 h-4" />
              Add tweet
            </button>
          )}

          {/* Editor Toolbar */}
          <EditorToolbar
            characterCount={characterCount}
            maxCharacters={maxChars}
            isBookmarked={isBookmarked}
            onBookmark={() => setIsBookmarked(!isBookmarked)}
          />

          <div className="sticky bottom-0 z-20 -mx-2 mt-6 border-t border-border bg-background/95 px-2 pb-2 pt-4 backdrop-blur">
            <div className="mb-2 flex items-center justify-between text-xs text-muted-foreground">
              <span>
                Targets: {targetSummary}
              </span>
              {thread.length > 1 && (
                <span>{totalCharacters.toLocaleString()} chars • {thread.length} tweets</span>
              )}
            </div>
            <PublishControls
              onPublish={handlePublish}
              onSchedule={handleSchedule}
              isPublishing={isPublishing}
              disabled={totalCharacters === 0}
              scheduledDate={null}
            />
          </div>
        </DashboardContainer>
      </div>

      <Dialog open={platformPickerOpen} onOpenChange={setPlatformPickerOpen}>
        <DialogContent className="max-w-2xl bg-card border-border">
          <DialogHeader>
            <DialogTitle>Platform Scope</DialogTitle>
            <DialogDescription>
              Choose your active compose channel and manage connection state.
            </DialogDescription>
          </DialogHeader>

          <div className="max-h-[60vh] overflow-y-auto custom-scrollbar space-y-2 pr-1">
            {platformRows.map((platform) => {
                const platformId = platform.id as PlatformType
                const isActive = selectedPlatform === platformId
                const isConnected = connectedPlatforms.includes(platformId)
                const isTarget = publishTargets.includes(platformId)
                const primaryAccount = platform.accounts[0]
                return (
                  <div
                    key={platform.id}
                    className={cn(
                      'flex items-center justify-between rounded-[10px] border px-3 py-2',
                      isActive ? 'border-ring bg-accent/50' : 'border-border bg-background/60'
                    )}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <PlatformIcon platform={platform.id} className="h-4 w-4" />
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{platform.name}</p>
                        <p className="text-xs text-muted-foreground truncate">
                          {isConnected
                            ? (primaryAccount
                              ? `${primaryAccount.account_name}${primaryAccount.account_handle ? ` • ${primaryAccount.account_handle}` : ''}${primaryAccount.source === 'local_sandbox' ? ' • Sandbox' : ''}`
                              : 'Connected')
                            : 'Not connected'}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => toggleTargetPlatform(platformId)}
                        disabled={!isConnected}
                        className={cn(
                          'inline-flex items-center gap-1 rounded-[6px] px-2.5 py-1.5 text-xs font-medium',
                          isConnected
                            ? (isTarget
                              ? 'bg-emerald-500/15 text-emerald-300'
                              : 'border border-border text-foreground hover:bg-accent')
                            : 'border border-border text-muted-foreground opacity-70 cursor-not-allowed'
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
                          onClick={() => handleConnectPlatform(platformId)}
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
        open={Boolean(sandboxConnectPlatform)}
        platformName={sandboxConnectPlatform ? PLATFORMS[sandboxConnectPlatform].name : 'platform'}
        onCancel={() => setSandboxConnectPlatform(null)}
        onConfirm={async () => {
          const platform = sandboxConnectPlatform
          setSandboxConnectPlatform(null)
          if (platform) await runConnectPlatform(platform, true)
        }}
      />
    </div>
  )
}
