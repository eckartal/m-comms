'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useRouter, useParams, usePathname, useSearchParams } from 'next/navigation'
import { PublishControls } from '@/components/publish/PublishControls'
import { useAppStore, useContentStore } from '@/stores'
import { createContent, updateContent } from '@/stores'
import type { PlatformType } from '@/types'
import {
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { connectPlatform, getConnectErrorMessage } from '@/lib/oauth/connectPlatform'
import { toast } from 'sonner'
import { DashboardContainer } from '@/components/layout/DashboardContainer'
import { getLocalConnectedPlatforms, getLocalConnectionAccounts } from '@/lib/oauth/localConnections'
import { useConnectionMode } from '@/hooks/useConnectionMode'
import { SandboxConfirmDialog } from '@/components/oauth/SandboxConfirmDialog'
import { PostComposerWorkspace, type ComposerPlatformRow } from '@/components/composer/PostComposerWorkspace'

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
  publishable?: boolean
  support_status?: 'publish_ready' | 'connect_only' | 'internal'
  oauth_configured?: boolean
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
  const [publishablePlatforms, setPublishablePlatforms] = useState<Set<PlatformType>>(new Set(['twitter', 'linkedin']))
  const [connectionsLoading, setConnectionsLoading] = useState(true)
  const [connectingPlatform, setConnectingPlatform] = useState<PlatformType | null>(null)
  const [platformPickerOpen, setPlatformPickerOpen] = useState(false)
  const [sandboxConnectPlatform, setSandboxConnectPlatform] = useState<PlatformType | null>(null)
  const { mode: connectionMode } = useConnectionMode(teamSlug)

  const currentContent = thread[activeIndex]?.content || ''
  const totalCharacters = thread.reduce((sum, item) => sum + item.content.length, 0)
  const isSaved = !saving
  const selectedPlatformConnected = connectedPlatforms.includes(selectedPlatform)
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
  const composerPlatformRows = useMemo<ComposerPlatformRow[]>(
    () =>
      platformRows.map((platform) => {
        const platformId = platform.id as PlatformType
        const primaryAccount = platform.accounts[0]
        return {
          id: platformId,
          name: platform.name,
          connected: connectedPlatforms.includes(platformId),
          isPublishable: publishablePlatforms.has(platformId),
          accountLabel: primaryAccount
            ? `${primaryAccount.account_name}${primaryAccount.account_handle ? ` • ${primaryAccount.account_handle}` : ''}${primaryAccount.source === 'local_sandbox' ? ' • Sandbox' : ''}`
            : undefined,
        }
      }),
    [platformRows, connectedPlatforms, publishablePlatforms]
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
      const merged = Array.from(new Set([...connected, ...localConnected])) as PlatformType[]
      setConnectedPlatforms(merged)
    } catch (error) {
      console.error('Failed to fetch connected platforms for composer:', error)
      setConnectedPlatforms(getLocalConnectedPlatforms(teamSlug, currentTeam?.id) as PlatformType[])
      setPlatformCatalog([])
      setPublishablePlatforms(new Set(['twitter', 'linkedin']))
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
          platforms: publishTargets.map((platform) => ({ platform, enabled: true })),
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
    if (!hasContent || !currentTeam) return

    const eligibleTargets = publishTargets.filter(
      (platform) => connectedPlatforms.includes(platform) && publishablePlatforms.has(platform)
    )

    if (eligibleTargets.length === 0) {
      toast.error('No publish-ready connected channels selected. Connect X or LinkedIn first.')
      return
    }

    setIsPublishing(true)

    try {
      const blocks = thread.map((item) => ({
        id: item.id || Date.now().toString(),
        type: 'text' as const,
        content: { text: item.content }
      }))

      let resolvedContentId = contentId

      // Create content in Supabase if not exists.
      if (!resolvedContentId) {
        const newContent = await createContent(currentTeam.id, {
          title: title || 'Untitled',
          blocks,
          status: 'DRAFT',
        })
        if (!newContent) throw new Error('Failed to create content before publishing')
        resolvedContentId = newContent.id
        setContentId(newContent.id)
      }

      if (!resolvedContentId) throw new Error('Missing content id after create')
      const finalContentId = resolvedContentId

      const updateOk = await updateContent(finalContentId, {
        title: title || 'Untitled',
        blocks,
        status: 'DRAFT',
        platforms: publishTargets.map((platform) => ({ platform, enabled: true })),
      })
      if (!updateOk) throw new Error('Failed to save latest changes before publishing')

      const publishResponse = await fetch(`/api/content/${finalContentId}/publish`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ platforms: eligibleTargets }),
      })

      const publishData = await publishResponse.json()
      if (!publishResponse.ok) {
        throw new Error(publishData?.error || 'Publish request failed')
      }

      const successful = Number(publishData?.data?.summary?.successful || 0)
      const failed = Number(publishData?.data?.summary?.failed || 0)

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
            platforms: publishTargets.map((platform) => ({ platform, enabled: true })),
          })
        }
      } else if (contentId) {
        await updateContent(contentId, {
          title: title || 'Untitled',
          blocks,
          status: 'SCHEDULED',
          platforms: publishTargets.map((platform) => ({ platform, enabled: true })),
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
          <PostComposerWorkspace
            title={title}
            onTitleChange={setTitle}
            thread={thread}
            activeIndex={activeIndex}
            onActiveIndexChange={setActiveIndex}
            onThreadItemChange={handleContentChange}
            onAddThreadItem={addTweet}
            onRemoveThreadItem={removeTweet}
            isBookmarked={isBookmarked}
            onToggleBookmark={() => setIsBookmarked(!isBookmarked)}
            selectedPlatform={selectedPlatform}
            onSelectedPlatformChange={setSelectedPlatform}
            platformMeta={PLATFORMS}
            publishTargets={publishTargets}
            targetSummary={targetSummary}
            onToggleTargetPlatform={toggleTargetPlatform}
            selectedPlatformConnected={selectedPlatformConnected}
            selectedPlatformPublishable={publishablePlatforms.has(selectedPlatform)}
            connectionsLoading={connectionsLoading}
            connectingPlatform={connectingPlatform}
            onConnectPlatform={handleConnectPlatform}
            platformPickerOpen={platformPickerOpen}
            onPlatformPickerOpenChange={setPlatformPickerOpen}
            platformRows={composerPlatformRows}
            footerSection={
              <div className="sticky bottom-0 z-20 -mx-2 mt-6 border-t border-border bg-background/95 px-2 pb-2 pt-4 backdrop-blur">
                <div className="mb-2 flex items-center justify-between text-xs text-muted-foreground">
                  <span>
                    Targets: {targetSummary}
                  </span>
                  {thread.length > 1 ? (
                    <span>{totalCharacters.toLocaleString()} chars • {thread.length} tweets</span>
                  ) : null}
                </div>
                <PublishControls
                  onPublish={handlePublish}
                  onSchedule={handleSchedule}
                  isPublishing={isPublishing}
                  disabled={totalCharacters === 0}
                  scheduledDate={null}
                />
              </div>
            }
          />
        </DashboardContainer>
      </div>

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
