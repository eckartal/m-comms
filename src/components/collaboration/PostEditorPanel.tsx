'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import type { Content, ContentBlock } from '@/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { getTicketKey, inferTitleFromNotes } from '@/lib/ticketPresentation'
import { useContentStore } from '@/stores'
import { EditorToolbar } from '@/components/editor/EditorToolbar'
import { ChevronLeft, ChevronRight, Link2, Plus, X } from 'lucide-react'

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

  if (items.length === 0) {
    return [{ id: 'thread-1', content: '' }]
  }

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
  const [title, setTitle] = useState('')
  const [thread, setThread] = useState<ThreadItem[]>([{ id: 'thread-1', content: '' }])
  const [activeIndex, setActiveIndex] = useState(0)
  const [isBookmarked, setIsBookmarked] = useState(false)
  const [status, setStatus] = useState<'DRAFT' | 'IN_REVIEW' | 'APPROVED' | 'SCHEDULED' | 'PUBLISHED' | 'ARCHIVED'>('DRAFT')
  const [assignedTo, setAssignedTo] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null)
  const [isAutoSaving, setIsAutoSaving] = useState(false)
  const [titleTouched, setTitleTouched] = useState(false)
  const [showIdeaContext, setShowIdeaContext] = useState(true)

  useEffect(() => {
    if (!post) return
    setTitle(post.title || '')
    const nextThread = parseThreadFromBlocks(post.blocks)
    setThread(nextThread)
    setActiveIndex(0)
    setStatus(post.status)
    setAssignedTo(post.assigned_to || '')
    setSaveError(null)
    setLastSavedAt(null)
    setIsAutoSaving(false)
    setTitleTouched(false)
  }, [post?.id, post])

  useEffect(() => {
    setShowIdeaContext(true)
  }, [post?.id])

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
      assignedTo !== initialAssignee
    )
  }, [post, title, thread, status, assignedTo])

  const currentContent = thread[activeIndex]?.content || ''
  const characterCount = currentContent.length
  const maxChars = 3000

  const buildPayload = useCallback(() => {
    const notes = thread.map((item) => item.content).join('\n\n').trim()
    const normalizedTitle = resolvePostTitle({
      currentTitle: title,
      notes,
      titleTouched,
    })

    return {
      title: normalizedTitle,
      blocks: serializeThreadToBlocks(thread),
      status,
      assigned_to: assignedTo || null,
    }
  }, [titleTouched, title, thread, status, assignedTo])

  const handleSave = useCallback(async (mode: 'manual' | 'auto' = 'manual') => {
    if (!post) return

    if (mode === 'manual') {
      setIsSaving(true)
      setSaveError(null)
    } else {
      setIsAutoSaving(true)
    }

    try {
      const payload = buildPayload()
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
    } catch (error) {
      if (mode === 'manual') {
        setSaveError(error instanceof Error ? error.message : 'Failed to save post')
      } else {
        setSaveError(error instanceof Error ? `Autosave failed: ${error.message}` : 'Autosave failed')
      }
    } finally {
      if (mode === 'manual') {
        setIsSaving(false)
      } else {
        setIsAutoSaving(false)
      }
    }
  }, [post, buildPayload, onPostUpdated])

  useEffect(() => {
    if (!open || !post || !hasChanges || isSaving || isAutoSaving) return
    const timer = setTimeout(() => {
      handleSave('auto')
    }, 1200)

    return () => clearTimeout(timer)
  }, [open, post, hasChanges, isSaving, isAutoSaving, title, thread, status, assignedTo, handleSave])

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
                <div className="text-[10px] uppercase tracking-wide text-muted-foreground">
                  {ticketKey || 'POST'}
                </div>
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

                  <div className="rounded-[10px] border border-border bg-card/50">
                    <div className="border-b border-border px-4 py-3">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm font-medium text-foreground">Composer</span>
                        <span className="text-[11px] text-muted-foreground">{thread.length} block{thread.length === 1 ? '' : 's'}</span>
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
                                  placeholder={index === 0 ? 'What is happening?' : 'Add another block...'}
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
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  className="h-8"
                  onClick={() => handleSave('manual')}
                  disabled={isSaving || !hasChanges}
                >
                  {isSaving ? 'Saving...' : 'Save Post'}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8"
                  onClick={() => onOpenFullEditor(post.id)}
                >
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
            </div>
          </div>
        ) : (
          <div className="p-4 text-xs text-muted-foreground">No post selected</div>
        )}
      </SheetContent>
    </Sheet>
  )
}
