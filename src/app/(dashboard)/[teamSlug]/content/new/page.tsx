'use client'

import { useState, useEffect, KeyboardEvent, useCallback } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { EditorToolbar } from '@/components/editor/EditorToolbar'
import { PublishControls } from '@/components/publish/PublishControls'
import { useAppStore, useContentStore } from '@/stores'
import { PlatformIcon, platformIcons } from '@/components/oauth/PlatformIcon'
import { createContent, updateContent, autoSaveContent } from '@/stores'
import {
  Plus,
  X,
} from 'lucide-react'
import { cn } from '@/lib/utils'

// Platform configurations with character limits
const PLATFORMS: Record<PlatformType, { name: string; limit: number; icon: string }> = {
  twitter: { name: 'X (Twitter)', limit: 280, icon: '𝕏' },
  linkedin: { name: 'LinkedIn', limit: 3000, icon: 'in' },
  instagram: { name: 'Instagram', limit: 2200, icon: '📷' },
}


// Thread item type
interface ThreadItem {
  id: string
  content: string
}

export default function NewContentPage() {
  const router = useRouter()
  const params = useParams()
  const teamSlug = params.teamSlug as string
  const { currentUser } = useAppStore()
  const { currentTeam, saving, lastSaved, setSaving } = useContentStore()

  const [contentId, setContentId] = useState<string | null>(null)
  const [title, setTitle] = useState('')
  const [thread, setThread] = useState<ThreadItem[]>([{ id: '1', content: '' }])
  const [activeIndex, setActiveIndex] = useState(0)
  const [selectedPlatform, setSelectedPlatform] = useState<PlatformType>('twitter')
  const [isBookmarked, setIsBookmarked] = useState(false)
  const [isPublishing, setIsPublishing] = useState(false)

  const maxChars = PLATFORMS[selectedPlatform].limit
  const currentContent = thread[activeIndex]?.content || ''
  const characterCount = currentContent.length
  const isOverLimit = characterCount > maxChars
  const isNearLimit = characterCount > maxChars * 0.8
  const totalCharacters = thread.reduce((sum, item) => sum + item.content.length, 0)
  const isSaved = !saving

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
        setIsBookmarked(data.bookmarked || false)
      } catch (e) {
        console.error('Failed to load draft', e)
      }
    }
  }, [teamSlug])

  // Auto-save to Supabase and localStorage
  useEffect(() => {
    const timer = setTimeout(async () => {
      const blocks = thread.map((item, index) => ({
        id: item.id,
        type: 'text' as const,
        content: { text: item.content }
      }))

      const draftData = {
        thread,
        platform: selectedPlatform,
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
          platforms: [{ type: selectedPlatform }],
        })
        setSaving(false)
      }
    }, 1000)
    return () => clearTimeout(timer)
  }, [thread, selectedPlatform, isBookmarked, teamSlug, contentId, currentTeam, title, setSaving])

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

  const handlePublish = async () => {
    const hasContent = thread.some(t => t.content.trim().length > 0)
    if (!hasContent) return
    setIsPublishing(true)

    try {
      const blocks = thread.map((item, index) => ({
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
        }
      } else if (contentId) {
        await updateContent(contentId, {
          title: title || 'Untitled',
          blocks,
          status: 'PUBLISHED'
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

  const handleSchedule = async (scheduledAt: Date) => {
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
        }
      } else if (contentId) {
        await updateContent(contentId, {
          title: title || 'Untitled',
          blocks,
          status: 'SCHEDULED',
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

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Account Header */}
      <header className="px-12 py-4 border-b border-border">
        <div className="flex items-center justify-between">
          <span className="text-[14px] font-medium text-foreground">@{currentUser?.name?.toLowerCase() || 'asimov'}</span>
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
      </header>

      {/* Composition Area */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-[680px] mx-auto px-12 py-8">
          {/* Platform Selector & Quick Actions */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-1">
              {Object.entries(PLATFORMS).map(([key, config]) => {
                const isSelected = selectedPlatform === key
                return (
                  <button
                    key={key}
                    onClick={() => setSelectedPlatform(key as PlatformType)}
                    className={cn(
                      'flex items-center gap-2 px-3 py-2 rounded-[8px] transition-all duration-200',
                      isSelected
                        ? 'bg-[#171717] text-white border border-[#262626] shadow-sm'
                        : 'bg-transparent text-muted-foreground hover:bg-[#171717] hover:text-foreground'
                    )}
                  >
                    <PlatformIcon platform={key} className={cn('h-4 w-4', isSelected ? 'text-white' : 'text-current')} />
                    <span className={cn('text-[13px] font-medium transition-colors', isSelected ? 'text-white' : '')}>
                      {config.name.split(' ')[0]}
                    </span>
                  </button>
                )
              })}
            </div>

            <div className="flex items-center gap-2">
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
            onAddThread={selectedPlatform === 'twitter' ? addTweet : undefined}
          />

          {/* Publish Controls */}
          <PublishControls
            onPublish={handlePublish}
            onSchedule={handleSchedule}
            isPublishing={isPublishing}
            disabled={totalCharacters === 0}
            scheduledDate={null}
          />

          {/* Total character count (for threads) */}
          {thread.length > 1 && (
            <div className="mt-4 flex items-center justify-center gap-4">
              <span className="text-[12px] text-muted-foreground">
                {totalCharacters.toLocaleString()} total characters • {thread.length} tweets
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
