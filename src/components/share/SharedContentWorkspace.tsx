'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import type { ContentBlock } from '@/types'
import { cn } from '@/lib/utils'

type ShareAnnotationComment = {
  id: string
  annotation_id: string
  text: string
  author_name: string
  author_session_id: string
  created_at: string
  updated_at: string
}

type ShareAnnotation = {
  id: string
  content_id: string
  block_id: string
  start_offset: number
  end_offset: number
  text_snapshot: string
  status: 'OPEN' | 'RESOLVED'
  created_by_name: string
  created_by_session_id: string
  created_at: string
  resolved_at: string | null
  comments: ShareAnnotationComment[]
}

type SelectionDraft = {
  blockId: string
  startOffset: number
  endOffset: number
  textSnapshot: string
}

interface SharedContentWorkspaceProps {
  contentId: string
  token: string
  title: string
  blocks: ContentBlock[]
  sharedBy: string
  allowComments: boolean
  allowEditing: boolean
}

const VISITOR_NAME_KEY_PREFIX = 'share_visitor_name'
const VISITOR_SESSION_KEY_PREFIX = 'share_visitor_session'

function keyFor(prefix: string, contentId: string, token: string) {
  return `${prefix}:${contentId}:${token}`
}

function getBlockText(block: ContentBlock): string {
  if (typeof block.content === 'string') return block.content
  if (block.content && typeof block.content === 'object') {
    const maybeText = (block.content as { text?: unknown }).text
    return typeof maybeText === 'string' ? maybeText : ''
  }
  return ''
}

function withBlockText(block: ContentBlock, value: string) {
  if (typeof block.content === 'string') return { ...block, content: value }
  if (block.content && typeof block.content === 'object') {
    return { ...block, content: { ...(block.content as Record<string, unknown>), text: value } }
  }
  return { ...block, content: value }
}

function isTextBlock(block: ContentBlock) {
  return ['text', 'heading', 'quote', 'thread'].includes(block.type)
}

function renderHighlightedText(
  text: string,
  annotations: ShareAnnotation[],
  activeAnnotationId: string | null,
  onPick: (annotationId: string) => void
) {
  if (!annotations.length) return <span>{text || ' '}</span>

  const sorted = [...annotations]
    .filter((item) => item.start_offset < item.end_offset && item.start_offset >= 0)
    .sort((a, b) => a.start_offset - b.start_offset)

  const parts: Array<{ text: string; annotation?: ShareAnnotation }> = []
  let cursor = 0

  for (const annotation of sorted) {
    if (annotation.start_offset > text.length) continue
    const start = Math.max(cursor, annotation.start_offset)
    const end = Math.min(text.length, annotation.end_offset)
    if (start > cursor) {
      parts.push({ text: text.slice(cursor, start) })
    }
    if (end > start) {
      parts.push({ text: text.slice(start, end), annotation })
      cursor = end
    }
  }

  if (cursor < text.length) {
    parts.push({ text: text.slice(cursor) })
  }

  return (
    <>
      {parts.map((part, index) => {
        if (!part.annotation) return <span key={`part-${index}`}>{part.text}</span>
        const isActive = part.annotation.id === activeAnnotationId
        const isResolved = part.annotation.status === 'RESOLVED'
        return (
          <button
            key={`${part.annotation.id}-${index}`}
            type="button"
            onClick={() => onPick(part.annotation!.id)}
            className={cn(
              'inline rounded-sm px-0.5 text-left transition-colors',
              isResolved ? 'bg-muted text-muted-foreground' : 'bg-amber-100 text-foreground hover:bg-amber-200',
              isActive ? 'ring-1 ring-ring' : ''
            )}
          >
            {part.text}
          </button>
        )
      })}
    </>
  )
}

function shortDate(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return date.toLocaleString()
}

export function SharedContentWorkspace({
  contentId,
  token,
  title: initialTitle,
  blocks: initialBlocks,
  sharedBy,
  allowComments,
  allowEditing,
}: SharedContentWorkspaceProps) {
  const readRefs = useRef<Record<string, HTMLDivElement | null>>({})
  const [visitorName, setVisitorName] = useState('')
  const [pendingVisitorName, setPendingVisitorName] = useState('')
  const [visitorSessionId, setVisitorSessionId] = useState('')
  const [title] = useState(initialTitle)
  const [blocks, setBlocks] = useState<ContentBlock[]>(initialBlocks)
  const [annotations, setAnnotations] = useState<ShareAnnotation[]>([])
  const [activeAnnotationId, setActiveAnnotationId] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'OPEN' | 'RESOLVED'>('OPEN')
  const [selectionDraft, setSelectionDraft] = useState<SelectionDraft | null>(null)
  const [newThreadText, setNewThreadText] = useState('')
  const [replyByAnnotationId, setReplyByAnnotationId] = useState<Record<string, string>>({})
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null)
  const [editingCommentText, setEditingCommentText] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [isPostingThread, setIsPostingThread] = useState(false)
  const [postingReplyId, setPostingReplyId] = useState<string | null>(null)
  const [isLoadingAnnotations, setIsLoadingAnnotations] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  useEffect(() => {
    const nameKey = keyFor(VISITOR_NAME_KEY_PREFIX, contentId, token)
    const sessionKey = keyFor(VISITOR_SESSION_KEY_PREFIX, contentId, token)
    const storedName = localStorage.getItem(nameKey)
    let storedSession = localStorage.getItem(sessionKey)

    if (!storedSession) {
      storedSession = crypto.randomUUID()
      localStorage.setItem(sessionKey, storedSession)
    }

    if (storedName) {
      setVisitorName(storedName)
      setPendingVisitorName(storedName)
    }

    setVisitorSessionId(storedSession)
  }, [contentId, token])

  useEffect(() => {
    if (!visitorName || !allowComments) return

    const fetchAnnotations = async () => {
      setIsLoadingAnnotations(true)
      setErrorMessage(null)
      try {
        const response = await fetch(`/api/share/${contentId}/annotations?token=${encodeURIComponent(token)}`)
        if (!response.ok) {
          const payload = await response.json().catch(() => null)
          throw new Error(payload?.error || 'Failed to load comments')
        }
        const { data } = await response.json()
        const items = Array.isArray(data) ? (data as ShareAnnotation[]) : []
        setAnnotations(items)
        setActiveAnnotationId((prev) => prev || items[0]?.id || null)
      } catch (error) {
        console.error(error)
        setErrorMessage(error instanceof Error ? error.message : 'Failed to load comments')
      } finally {
        setIsLoadingAnnotations(false)
      }
    }

    void fetchAnnotations()
  }, [allowComments, contentId, token, visitorName])

  const visibleAnnotations = useMemo(
    () => annotations.filter((item) => item.status === activeTab),
    [annotations, activeTab]
  )

  const openCount = useMemo(() => annotations.filter((item) => item.status === 'OPEN').length, [annotations])
  const resolvedCount = useMemo(() => annotations.filter((item) => item.status === 'RESOLVED').length, [annotations])

  const handleJoin = () => {
    const trimmed = pendingVisitorName.trim()
    if (!trimmed) return
    localStorage.setItem(keyFor(VISITOR_NAME_KEY_PREFIX, contentId, token), trimmed)
    setVisitorName(trimmed)
    setErrorMessage(null)
  }

  const handleSave = async () => {
    if (!allowEditing) return
    setIsSaving(true)
    setErrorMessage(null)
    try {
      const response = await fetch(`/api/share/${contentId}/content`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          visitorName,
          visitorSessionId,
          title,
          blocks,
        }),
      })
      if (!response.ok) {
        const payload = await response.json().catch(() => null)
        throw new Error(payload?.error || 'Failed to save changes')
      }
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Failed to save changes')
    } finally {
      setIsSaving(false)
    }
  }

  const handleSelectFromTextArea = (blockId: string, target: HTMLTextAreaElement) => {
    const start = target.selectionStart || 0
    const end = target.selectionEnd || 0
    if (end <= start) {
      setSelectionDraft(null)
      return
    }
    const selected = target.value.slice(start, end).trim()
    if (!selected) {
      setSelectionDraft(null)
      return
    }
    setSelectionDraft({
      blockId,
      startOffset: start,
      endOffset: end,
      textSnapshot: selected,
    })
  }

  const handleSelectFromReadView = (blockId: string) => {
    const root = readRefs.current[blockId]
    if (!root) return
    const selection = window.getSelection()
    if (!selection || selection.rangeCount === 0 || selection.isCollapsed) {
      setSelectionDraft(null)
      return
    }
    const range = selection.getRangeAt(0)
    if (!root.contains(range.startContainer) || !root.contains(range.endContainer)) {
      setSelectionDraft(null)
      return
    }
    const preRange = range.cloneRange()
    preRange.selectNodeContents(root)
    preRange.setEnd(range.startContainer, range.startOffset)
    const startOffset = preRange.toString().length
    const textSnapshot = range.toString().trim()
    const endOffset = startOffset + textSnapshot.length
    if (!textSnapshot || endOffset <= startOffset) {
      setSelectionDraft(null)
      return
    }
    setSelectionDraft({ blockId, startOffset, endOffset, textSnapshot })
  }

  const handleCreateThread = async () => {
    if (!selectionDraft || !newThreadText.trim() || !allowComments) return
    setIsPostingThread(true)
    setErrorMessage(null)
    try {
      const response = await fetch(`/api/share/${contentId}/annotations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          visitorName,
          visitorSessionId,
          blockId: selectionDraft.blockId,
          startOffset: selectionDraft.startOffset,
          endOffset: selectionDraft.endOffset,
          textSnapshot: selectionDraft.textSnapshot,
          commentText: newThreadText.trim(),
        }),
      })

      if (!response.ok) {
        const payload = await response.json().catch(() => null)
        throw new Error(payload?.error || 'Failed to create comment thread')
      }

      const { data } = await response.json()
      setAnnotations((prev) => [...prev, data as ShareAnnotation])
      setActiveTab('OPEN')
      setActiveAnnotationId((data as ShareAnnotation).id)
      setSelectionDraft(null)
      setNewThreadText('')
      window.getSelection()?.removeAllRanges()
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Failed to create comment thread')
    } finally {
      setIsPostingThread(false)
    }
  }

  const handleToggleResolved = async (annotation: ShareAnnotation) => {
    setErrorMessage(null)
    try {
      const nextStatus = annotation.status === 'OPEN' ? 'RESOLVED' : 'OPEN'
      const response = await fetch(`/api/share/annotations/${annotation.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          status: nextStatus,
        }),
      })

      if (!response.ok) {
        const payload = await response.json().catch(() => null)
        throw new Error(payload?.error || 'Failed to update thread')
      }

      const { data } = await response.json()
      setAnnotations((prev) =>
        prev.map((item) => (item.id === annotation.id ? { ...item, ...(data as Partial<ShareAnnotation>) } : item))
      )
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Failed to update thread')
    }
  }

  const handleReply = async (annotationId: string) => {
    const text = (replyByAnnotationId[annotationId] || '').trim()
    if (!text) return
    setPostingReplyId(annotationId)
    setErrorMessage(null)
    try {
      const response = await fetch(`/api/share/annotations/${annotationId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          visitorName,
          visitorSessionId,
          text,
        }),
      })
      if (!response.ok) {
        const payload = await response.json().catch(() => null)
        throw new Error(payload?.error || 'Failed to reply')
      }
      const { data } = await response.json()
      setAnnotations((prev) =>
        prev.map((item) =>
          item.id === annotationId
            ? { ...item, comments: [...item.comments, data as ShareAnnotationComment] }
            : item
        )
      )
      setReplyByAnnotationId((prev) => ({ ...prev, [annotationId]: '' }))
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Failed to reply')
    } finally {
      setPostingReplyId(null)
    }
  }

  const handleStartEditComment = (comment: ShareAnnotationComment) => {
    setEditingCommentId(comment.id)
    setEditingCommentText(comment.text)
  }

  const handleSaveCommentEdit = async (commentId: string) => {
    const text = editingCommentText.trim()
    if (!text) return

    setErrorMessage(null)
    try {
      const response = await fetch(`/api/share/annotation-comments/${commentId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          visitorSessionId,
          text,
        }),
      })
      if (!response.ok) {
        const payload = await response.json().catch(() => null)
        throw new Error(payload?.error || 'Failed to edit comment')
      }
      const { data } = await response.json()
      setAnnotations((prev) =>
        prev.map((annotation) => ({
          ...annotation,
          comments: annotation.comments.map((comment) =>
            comment.id === commentId ? { ...comment, ...(data as Partial<ShareAnnotationComment>) } : comment
          ),
        }))
      )
      setEditingCommentId(null)
      setEditingCommentText('')
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Failed to edit comment')
    }
  }

  const handleDeleteComment = async (commentId: string) => {
    setErrorMessage(null)
    try {
      const response = await fetch(
        `/api/share/annotation-comments/${commentId}?token=${encodeURIComponent(token)}&visitorSessionId=${encodeURIComponent(visitorSessionId)}`,
        { method: 'DELETE' }
      )
      if (!response.ok) {
        const payload = await response.json().catch(() => null)
        throw new Error(payload?.error || 'Failed to delete comment')
      }
      setAnnotations((prev) =>
        prev.map((annotation) => ({
          ...annotation,
          comments: annotation.comments.filter((comment) => comment.id !== commentId),
        }))
      )
      if (editingCommentId === commentId) {
        setEditingCommentId(null)
        setEditingCommentText('')
      }
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Failed to delete comment')
    }
  }

  if (!visitorName) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-5 space-y-3">
          <h1 className="text-lg font-semibold text-foreground">Join feedback</h1>
          <Input
            placeholder="Your name"
            value={pendingVisitorName}
            onChange={(event) => setPendingVisitorName(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault()
                handleJoin()
              }
            }}
          />
          <Button className="w-full" onClick={handleJoin} disabled={!pendingVisitorName.trim()}>
            Continue
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-[1100px] px-4 py-6">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold text-foreground">{title || 'Untitled'}</h1>
            <p className="text-xs text-muted-foreground">
              Shared by {sharedBy} · {visitorName}
            </p>
          </div>
          {allowEditing ? (
            <Button size="sm" onClick={() => void handleSave()} disabled={isSaving}>
              {isSaving ? 'Saving...' : 'Save'}
            </Button>
          ) : null}
        </div>

        {errorMessage ? (
          <div className="mb-4 rounded-xl border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700">{errorMessage}</div>
        ) : null}

        <div className={cn('grid gap-4', allowComments ? 'lg:grid-cols-[minmax(0,1fr)_340px]' : 'grid-cols-1')}>
          <div className="space-y-4 rounded-2xl border border-border bg-card p-4">
            {blocks.map((block) => {
              const blockText = getBlockText(block)
              const blockAnnotations = annotations.filter((item) => item.block_id === block.id)
              const openBlockCount = blockAnnotations.filter((item) => item.status === 'OPEN').length
              const imageUrl =
                typeof block.content === 'object' && block.content && 'url' in block.content
                  ? String((block.content as { url?: string }).url || '')
                  : ''

              return (
                <div key={block.id} className="rounded-xl border border-border/70 bg-background p-3">
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-[11px] uppercase tracking-wide text-muted-foreground">{block.type}</span>
                    {openBlockCount > 0 ? (
                      <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] text-amber-700">
                        {openBlockCount} open
                      </span>
                    ) : null}
                  </div>

                  {block.type === 'image' && imageUrl ? (
                    // Object URLs can come from user uploads in shared editor mode.
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={imageUrl} alt="" className="max-h-[520px] rounded-lg border border-border" />
                  ) : isTextBlock(block) ? (
                    allowEditing ? (
                      <Textarea
                        value={blockText}
                        onChange={(event) =>
                          setBlocks((prev) =>
                            prev.map((item) => (item.id === block.id ? withBlockText(item, event.target.value) : item))
                          )
                        }
                        onMouseUp={(event) => handleSelectFromTextArea(block.id, event.currentTarget)}
                        onKeyUp={(event) => handleSelectFromTextArea(block.id, event.currentTarget)}
                        className="min-h-[120px] resize-y border-border/70 bg-card leading-7"
                      />
                    ) : (
                      <div
                        ref={(node) => {
                          readRefs.current[block.id] = node
                        }}
                        onMouseUp={() => handleSelectFromReadView(block.id)}
                        className="whitespace-pre-wrap text-[15px] leading-7 text-foreground"
                      >
                        {renderHighlightedText(blockText, blockAnnotations, activeAnnotationId, setActiveAnnotationId)}
                      </div>
                    )
                  ) : (
                    <p className="text-sm text-muted-foreground">Unsupported block for shared feedback.</p>
                  )}

                  {selectionDraft?.blockId === block.id && allowComments ? (
                    <div className="mt-3 rounded-xl border border-border bg-card p-3 space-y-2">
                      <p className="text-xs text-muted-foreground">
                        Selected: &quot;{selectionDraft.textSnapshot}&quot;
                      </p>
                      <Textarea
                        value={newThreadText}
                        onChange={(event) => setNewThreadText(event.target.value)}
                        placeholder="Write feedback..."
                        rows={3}
                      />
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSelectionDraft(null)
                            setNewThreadText('')
                          }}
                        >
                          Cancel
                        </Button>
                        <Button size="sm" onClick={() => void handleCreateThread()} disabled={isPostingThread || !newThreadText.trim()}>
                          {isPostingThread ? 'Adding...' : 'Add comment'}
                        </Button>
                      </div>
                    </div>
                  ) : null}
                </div>
              )
            })}
          </div>

          {allowComments ? (
            <aside className="rounded-2xl border border-border bg-card p-3">
              <div className="mb-3 flex items-center gap-2 rounded-xl bg-background p-1">
                <button
                  type="button"
                  onClick={() => setActiveTab('OPEN')}
                  className={cn(
                    'flex-1 rounded-lg px-2 py-1.5 text-xs',
                    activeTab === 'OPEN' ? 'bg-foreground text-background' : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  Open ({openCount})
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('RESOLVED')}
                  className={cn(
                    'flex-1 rounded-lg px-2 py-1.5 text-xs',
                    activeTab === 'RESOLVED' ? 'bg-foreground text-background' : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  Resolved ({resolvedCount})
                </button>
              </div>

              {isLoadingAnnotations ? (
                <p className="text-sm text-muted-foreground px-1 py-2">Loading comments...</p>
              ) : visibleAnnotations.length === 0 ? (
                <p className="text-sm text-muted-foreground px-1 py-2">
                  {activeTab === 'OPEN' ? 'No open threads.' : 'No resolved threads.'}
                </p>
              ) : (
                <div className="space-y-3">
                  {visibleAnnotations.map((annotation) => (
                    <article
                      key={annotation.id}
                      className={cn(
                        'rounded-xl border p-3',
                        activeAnnotationId === annotation.id ? 'border-ring bg-background' : 'border-border bg-background/60'
                      )}
                    >
                      <div className="mb-2 flex items-center justify-between gap-2">
                        <button
                          type="button"
                          className="text-left"
                          onClick={() => setActiveAnnotationId(annotation.id)}
                        >
                          <p className="text-xs text-muted-foreground">{annotation.created_by_name}</p>
                          <p className="text-[11px] text-muted-foreground">{shortDate(annotation.created_at)}</p>
                        </button>
                        <Button
                          size="xs"
                          variant="outline"
                          onClick={() => void handleToggleResolved(annotation)}
                        >
                          {annotation.status === 'OPEN' ? 'Resolve' : 'Reopen'}
                        </Button>
                      </div>

                      <p className="mb-2 rounded-md bg-muted px-2 py-1 text-xs text-muted-foreground">
                        “{annotation.text_snapshot}”
                      </p>

                      <div className="space-y-2">
                        {annotation.comments.map((comment) => {
                          const isOwnComment = comment.author_session_id === visitorSessionId
                          const isEditing = editingCommentId === comment.id
                          return (
                            <div key={comment.id} className="rounded-lg border border-border/70 bg-card p-2">
                              <div className="mb-1 flex items-center justify-between gap-2">
                                <span className="text-xs font-medium text-foreground">{comment.author_name}</span>
                                <span className="text-[11px] text-muted-foreground">{shortDate(comment.created_at)}</span>
                              </div>

                              {isEditing ? (
                                <div className="space-y-2">
                                  <Textarea
                                    rows={2}
                                    value={editingCommentText}
                                    onChange={(event) => setEditingCommentText(event.target.value)}
                                  />
                                  <div className="flex justify-end gap-2">
                                    <Button variant="ghost" size="xs" onClick={() => setEditingCommentId(null)}>
                                      Cancel
                                    </Button>
                                    <Button size="xs" onClick={() => void handleSaveCommentEdit(comment.id)}>
                                      Save
                                    </Button>
                                  </div>
                                </div>
                              ) : (
                                <p className="whitespace-pre-wrap text-sm text-foreground">{comment.text}</p>
                              )}

                              {isOwnComment && !isEditing ? (
                                <div className="mt-2 flex justify-end gap-1">
                                  <Button size="xs" variant="ghost" onClick={() => handleStartEditComment(comment)}>
                                    Edit
                                  </Button>
                                  <Button size="xs" variant="ghost" onClick={() => void handleDeleteComment(comment.id)}>
                                    Delete
                                  </Button>
                                </div>
                              ) : null}
                            </div>
                          )
                        })}
                      </div>

                      {annotation.status === 'OPEN' ? (
                        <div className="mt-2 space-y-2">
                          <Textarea
                            rows={2}
                            placeholder="Reply..."
                            value={replyByAnnotationId[annotation.id] || ''}
                            onChange={(event) =>
                              setReplyByAnnotationId((prev) => ({ ...prev, [annotation.id]: event.target.value }))
                            }
                          />
                          <div className="flex justify-end">
                            <Button
                              size="xs"
                              onClick={() => void handleReply(annotation.id)}
                              disabled={postingReplyId === annotation.id || !(replyByAnnotationId[annotation.id] || '').trim()}
                            >
                              {postingReplyId === annotation.id ? 'Sending...' : 'Reply'}
                            </Button>
                          </div>
                        </div>
                      ) : null}
                    </article>
                  ))}
                </div>
              )}
            </aside>
          ) : null}
        </div>
      </div>
    </div>
  )
}
