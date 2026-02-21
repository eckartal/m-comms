'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import type { Content } from '@/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { getTicketKey, inferTitleFromNotes } from '@/lib/ticketPresentation'
import { useContentStore } from '@/stores'

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
  onOpenFullEditor: (postId: string) => void
}

function extractPrimaryNotes(blocks: unknown): string {
  if (!Array.isArray(blocks) || blocks.length === 0) return ''
  const first = blocks[0] as { content?: unknown } | null
  if (!first || typeof first !== 'object') return ''

  if (typeof first.content === 'string') return first.content
  if (
    first.content &&
    typeof first.content === 'object' &&
    'text' in (first.content as Record<string, unknown>) &&
    typeof (first.content as { text?: unknown }).text === 'string'
  ) {
    return (first.content as { text: string }).text
  }
  return ''
}

export function PostEditorPanel({
  open,
  post,
  teamMembers,
  onOpenChange,
  onPostUpdated,
  onOpenFullEditor,
}: PostEditorPanelProps) {
  const allContents = useContentStore((state) => state.contents)
  const [title, setTitle] = useState('')
  const [notes, setNotes] = useState('')
  const [status, setStatus] = useState<'DRAFT' | 'IN_REVIEW' | 'APPROVED' | 'SCHEDULED' | 'PUBLISHED' | 'ARCHIVED'>('DRAFT')
  const [assignedTo, setAssignedTo] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null)
  const [isAutoSaving, setIsAutoSaving] = useState(false)
  const [titleTouched, setTitleTouched] = useState(false)

  useEffect(() => {
    if (!post) return
    setTitle(post.title || '')
    setNotes(extractPrimaryNotes(post.blocks))
    setStatus(post.status)
    setAssignedTo(post.assigned_to || '')
    setSaveError(null)
    setLastSavedAt(null)
    setIsAutoSaving(false)
    setTitleTouched(false)
  }, [post?.id, post])

  const ticketKey = useMemo(() => {
    if (!post) return null
    return getTicketKey(post.id, allContents)
  }, [post, allContents])

  const hasChanges = useMemo(() => {
    if (!post) return false
    const initialTitle = post.title || ''
    const initialNotes = extractPrimaryNotes(post.blocks)
    const initialStatus = post.status
    const initialAssignee = post.assigned_to || ''
    return (
      title !== initialTitle ||
      notes !== initialNotes ||
      status !== initialStatus ||
      assignedTo !== initialAssignee
    )
  }, [post, title, notes, status, assignedTo])

  const buildPayload = useCallback(() => {
    const normalizedTitle = titleTouched
      ? (title.trim() || 'Untitled post')
      : inferTitleFromNotes(notes, 'POST', title)
    const blocks = notes.trim()
      ? [{ id: `post-note-${Date.now()}`, type: 'text', content: notes.trim() }]
      : []

    return {
      title: normalizedTitle,
      blocks,
      status,
      assigned_to: assignedTo || null,
    }
  }, [titleTouched, title, notes, status, assignedTo])

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
  }, [
    open,
    post?.id,
    post,
    title,
    notes,
    status,
    assignedTo,
    hasChanges,
    isSaving,
    isAutoSaving,
    handleSave,
  ])

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        showOverlay={false}
        className="w-full gap-0 overflow-hidden border-l border-border bg-white p-0 text-foreground shadow-none dark:bg-[#050505] sm:max-w-xl"
      >
        <SheetHeader className="border-b border-border bg-white px-4 py-2.5 dark:bg-[#050505]">
          <SheetTitle className="text-sm font-semibold text-foreground">Post</SheetTitle>
          <SheetDescription className="text-xs text-muted-foreground">
            Edit this post without leaving collaboration.
          </SheetDescription>
        </SheetHeader>

        {post ? (
          <div className="flex min-h-0 flex-1 flex-col">
            <div className="flex-1 space-y-3.5 overflow-y-auto bg-white p-4 custom-scrollbar dark:bg-[#050505]">
              <div className="text-[10px] uppercase tracking-wide text-muted-foreground">
                {ticketKey || 'POST'}
              </div>

              <div className="space-y-2">
                <label className="text-[11px] uppercase tracking-wide text-muted-foreground">Title</label>
                <Input
                  value={title}
                  onChange={(e) => {
                    setTitleTouched(true)
                    setTitle(e.target.value)
                  }}
                  placeholder="Untitled post"
                  className="h-8 border-border bg-card text-xs text-foreground placeholder:text-muted-foreground"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[11px] uppercase tracking-wide text-muted-foreground">Draft Notes</label>
                <Textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Write the post content..."
                  className="min-h-[140px] border-border bg-card text-xs text-foreground placeholder:text-muted-foreground"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <label className="text-[11px] uppercase tracking-wide text-muted-foreground">Status</label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as typeof status)}
                    className="h-8 w-full rounded-sm border border-border bg-card px-2 text-xs text-foreground"
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
                    className="h-8 w-full rounded-sm border border-border bg-card px-2 text-xs text-foreground"
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

              {saveError ? (
                <div className="rounded-sm border border-red-950/50 bg-red-950/20 px-3 py-2 text-xs text-red-200">
                  {saveError}
                </div>
              ) : null}
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
                  Open Full Editor
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
