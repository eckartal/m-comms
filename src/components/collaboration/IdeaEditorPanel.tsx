'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import type { Content } from '@/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet'

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

interface IdeaEditorPanelProps {
  open: boolean
  idea: Content | null
  teamMembers: TeamMemberItem[]
  onOpenChange: (open: boolean) => void
  onIdeaUpdated: (idea: Content) => void
  onConvertIdea: (
    ideaId: string,
    options?: {
      post_title?: string
      post_status?: string
      assigned_to?: string | null
      include_notes?: boolean
    }
  ) => Promise<void>
  onOpenLinkedPost: (postId: string) => void
}

function extractIdeaNotes(blocks: unknown): string {
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

export function IdeaEditorPanel({
  open,
  idea,
  teamMembers,
  onOpenChange,
  onIdeaUpdated,
  onConvertIdea,
  onOpenLinkedPost,
}: IdeaEditorPanelProps) {
  const titleInputRef = useRef<HTMLInputElement | null>(null)
  const [title, setTitle] = useState('')
  const [notes, setNotes] = useState('')
  const [ideaState, setIdeaState] = useState<'INBOX' | 'CONVERTED' | 'ARCHIVED'>('INBOX')
  const [assignedTo, setAssignedTo] = useState<string>('')
  const [isSaving, setIsSaving] = useState(false)
  const [isConverting, setIsConverting] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [convertTitle, setConvertTitle] = useState('')
  const [convertStatus, setConvertStatus] = useState<'DRAFT' | 'IN_REVIEW' | 'APPROVED'>('DRAFT')
  const [convertAssignee, setConvertAssignee] = useState('')
  const [includeNotes, setIncludeNotes] = useState(true)

  useEffect(() => {
    if (!idea) return
    setTitle(idea.title || 'Untitled idea')
    setNotes(extractIdeaNotes(idea.blocks))
    const incomingIdeaState = idea.idea_state || 'INBOX'
    const normalizedIdeaState =
      incomingIdeaState === 'ARCHIVED' || incomingIdeaState === 'CONVERTED' ? incomingIdeaState : 'INBOX'
    setIdeaState(normalizedIdeaState as 'INBOX' | 'CONVERTED' | 'ARCHIVED')
    setAssignedTo(idea.assigned_to || '')
    setConvertTitle(idea.title || 'Untitled idea')
    setConvertStatus('DRAFT')
    setConvertAssignee(idea.assigned_to || '')
    setIncludeNotes(true)
    setSaveError(null)
  }, [idea?.id, idea])

  const hasChanges = useMemo(() => {
    if (!idea) return false
    const initialTitle = idea.title || 'Untitled idea'
    const initialNotes = extractIdeaNotes(idea.blocks)
    const initialState = idea.idea_state || 'INBOX'
    const initialAssigned = idea.assigned_to || ''

    return (
      title !== initialTitle ||
      notes !== initialNotes ||
      ideaState !== initialState ||
      assignedTo !== initialAssigned
    )
  }, [idea, title, notes, ideaState, assignedTo])

  const linkedPostMissing = ideaState === 'CONVERTED' && !idea?.converted_post_id
  const isNewIdea =
    !!idea &&
    idea.title === 'Untitled idea' &&
    extractIdeaNotes(idea.blocks).trim().length === 0 &&
    !idea.converted_post_id

  useEffect(() => {
    if (!open || !idea) return
    const timer = setTimeout(() => {
      titleInputRef.current?.focus()
      titleInputRef.current?.select()
    }, 60)
    return () => clearTimeout(timer)
  }, [open, idea])

  const handleSave = async () => {
    if (!idea) return false
    setIsSaving(true)
    setSaveError(null)

    try {
      const blocks = notes.trim()
        ? [{ id: `idea-note-${Date.now()}`, type: 'text', content: notes.trim() }]
        : []

      const response = await fetch(`/api/content/${idea.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim() || 'Untitled idea',
          blocks,
          idea_state: ideaState,
          assigned_to: assignedTo || null,
        }),
      })

      const body = await response.json().catch(() => null)
      if (!response.ok) {
        throw new Error(body?.error || 'Failed to save idea')
      }

      if (body?.data) {
        onIdeaUpdated(body.data as Content)
      }
      return true
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : 'Failed to save idea')
      return false
    } finally {
      setIsSaving(false)
    }
  }

  const handleConvert = async () => {
    if (!idea) return
    setIsConverting(true)
    setSaveError(null)
    try {
      if (hasChanges) {
        const saved = await handleSave()
        if (!saved) {
          return
        }
      }

      await onConvertIdea(idea.id, {
        post_title: convertTitle.trim() || title.trim() || 'Untitled from Idea',
        post_status: convertStatus,
        assigned_to: convertAssignee || null,
        include_notes: includeNotes,
      })
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : 'Failed to convert idea')
    } finally {
      setIsConverting(false)
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full border-l border-border bg-background p-0 text-foreground shadow-2xl sm:max-w-xl"
      >
        <SheetHeader className="border-b border-border bg-background p-4">
          <SheetTitle className="text-sm font-semibold text-foreground">
            {isNewIdea ? 'New Idea' : 'Idea'}
          </SheetTitle>
          <SheetDescription className="text-xs text-muted-foreground">
            {isNewIdea ? 'Capture the core thought first, then convert it to a post.' : 'Shape your idea before converting to a post.'}
          </SheetDescription>
        </SheetHeader>

        {idea ? (
          <div className="flex h-full flex-col">
            <div className="flex-1 space-y-4 overflow-y-auto bg-background p-4 custom-scrollbar">
            {isNewIdea ? (
              <div className="rounded-md border border-amber-300/40 bg-amber-100 px-3 py-2 text-xs text-amber-900">
                You are creating a new idea. Start with the title, then add notes.
              </div>
            ) : null}

            <div className="space-y-2">
              <label className="text-[11px] uppercase tracking-wide text-muted-foreground">Title</label>
              <Input
                ref={titleInputRef}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Untitled idea"
                className="border-border bg-card text-foreground placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-primary/50"
              />
            </div>

            <div className="space-y-2">
              <label className="text-[11px] uppercase tracking-wide text-muted-foreground">Notes</label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Write the idea details..."
                className="min-h-[160px] border-border bg-card text-foreground placeholder:text-muted-foreground"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <label className="text-[11px] uppercase tracking-wide text-muted-foreground">Idea State</label>
                <select
                  value={ideaState}
                  onChange={(e) => setIdeaState(e.target.value as 'INBOX' | 'CONVERTED' | 'ARCHIVED')}
                  className="h-9 w-full rounded-sm border border-border bg-card px-2 text-xs text-foreground"
                >
                  <option value="INBOX">Inbox</option>
                  <option value="CONVERTED">Converted</option>
                  <option value="ARCHIVED">Archived</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-[11px] uppercase tracking-wide text-muted-foreground">Owner</label>
                <select
                  value={assignedTo}
                  onChange={(e) => setAssignedTo(e.target.value)}
                  className="h-9 w-full rounded-sm border border-border bg-card px-2 text-xs text-foreground"
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

            {!idea.converted_post_id ? (
              <div className="space-y-3 rounded-sm border border-border bg-card p-3">
                <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Conversion Setup</p>

                <div className="space-y-2">
                  <label className="text-[11px] uppercase tracking-wide text-muted-foreground">Post Title</label>
                  <Input
                    value={convertTitle}
                    onChange={(e) => setConvertTitle(e.target.value)}
                    placeholder="Title for the post"
                    className="border-border bg-background text-foreground placeholder:text-muted-foreground"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <label className="text-[11px] uppercase tracking-wide text-muted-foreground">Initial Status</label>
                    <select
                      value={convertStatus}
                      onChange={(e) => setConvertStatus(e.target.value as 'DRAFT' | 'IN_REVIEW' | 'APPROVED')}
                      className="h-9 w-full rounded-sm border border-border bg-background px-2 text-xs text-foreground"
                    >
                      <option value="DRAFT">Draft</option>
                      <option value="IN_REVIEW">In Review</option>
                      <option value="APPROVED">Approved</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[11px] uppercase tracking-wide text-muted-foreground">Post Owner</label>
                    <select
                      value={convertAssignee}
                      onChange={(e) => setConvertAssignee(e.target.value)}
                      className="h-9 w-full rounded-sm border border-border bg-background px-2 text-xs text-foreground"
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

                <label className="flex items-center gap-2 text-xs text-muted-foreground">
                  <input
                    type="checkbox"
                    checked={includeNotes}
                    onChange={(e) => setIncludeNotes(e.target.checked)}
                    className="h-3.5 w-3.5 rounded border border-border bg-transparent"
                  />
                  Copy idea notes into post draft
                </label>
              </div>
            ) : null}

            {saveError ? (
              <div className="rounded-sm border border-red-950/50 bg-red-950/20 px-3 py-2 text-xs text-red-200">
                {saveError}
              </div>
            ) : null}
            </div>

            <div className="sticky bottom-0 border-t border-border bg-background px-4 py-3">
              <div className="flex items-center gap-2">
              <Button
                size="sm"
                className="h-8"
                onClick={handleSave}
                disabled={isSaving || !hasChanges}
              >
                {isSaving ? 'Saving...' : 'Save Idea'}
              </Button>

              {idea.converted_post_id ? (
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8"
                  onClick={() => onOpenLinkedPost(idea.converted_post_id as string)}
                >
                  Open Post
                </Button>
              ) : (
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8"
                  onClick={handleConvert}
                  disabled={isConverting}
                >
                  {isConverting ? 'Converting...' : linkedPostMissing ? 'Recreate Linked Post' : 'Convert to Post'}
                </Button>
              )}
            </div>
            </div>

            {linkedPostMissing ? (
              <div className="mx-4 mb-4 rounded-sm border border-amber-950/50 bg-amber-950/20 px-3 py-2 text-xs text-amber-200">
                This idea is marked converted but the linked post is missing. Use “Recreate Linked Post”.
              </div>
            ) : null}
          </div>
        ) : (
          <div className="p-4 text-xs text-muted-foreground">No idea selected</div>
        )}
      </SheetContent>
    </Sheet>
  )
}
