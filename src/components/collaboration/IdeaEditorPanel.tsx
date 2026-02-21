'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { Content } from '@/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { getTicketKey, inferTitleFromNotes } from '@/lib/ticketPresentation'
import { useContentStore } from '@/stores'
import { ChevronDown } from 'lucide-react'

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

const UNTITLED_TITLE_RE = /^untitled(\s+idea|\s+post)?$/i

function resolveIdeaTitle(params: {
  currentTitle: string
  notes: string
  titleTouched: boolean
}) {
  const rawTitle = params.currentTitle.trim()
  const hasMeaningfulTitle = rawTitle.length > 0 && !UNTITLED_TITLE_RE.test(rawTitle)

  if (params.titleTouched) {
    return rawTitle || 'Untitled idea'
  }

  if (hasMeaningfulTitle) {
    return rawTitle
  }

  return inferTitleFromNotes(params.notes, 'IDEA', params.currentTitle)
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
  const allContents = useContentStore((state) => state.contents)
  const titleInputRef = useRef<HTMLInputElement | null>(null)
  const [title, setTitle] = useState('')
  const [notes, setNotes] = useState('')
  const [ideaState, setIdeaState] = useState<'INBOX' | 'CONVERTED' | 'ARCHIVED'>('INBOX')
  const [assignedTo, setAssignedTo] = useState<string>('')
  const [writerId, setWriterId] = useState<string>('')
  const [isSaving, setIsSaving] = useState(false)
  const [isConverting, setIsConverting] = useState(false)
  const [isAutoSaving, setIsAutoSaving] = useState(false)
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [convertTitle, setConvertTitle] = useState('')
  const [convertStatus, setConvertStatus] = useState<'DRAFT' | 'IN_REVIEW' | 'APPROVED'>('DRAFT')
  const [convertAssignee, setConvertAssignee] = useState('')
  const [includeNotes, setIncludeNotes] = useState(true)
  const [titleTouched, setTitleTouched] = useState(false)
  const [isConversionSetupOpen, setIsConversionSetupOpen] = useState(true)

  useEffect(() => {
    if (!idea) return
    setTitle(idea.title || 'Untitled idea')
    setNotes(extractIdeaNotes(idea.blocks))
    const incomingIdeaState = idea.idea_state || 'INBOX'
    const normalizedIdeaState =
      incomingIdeaState === 'ARCHIVED' || incomingIdeaState === 'CONVERTED' ? incomingIdeaState : 'INBOX'
    setIdeaState(normalizedIdeaState as 'INBOX' | 'CONVERTED' | 'ARCHIVED')
    setAssignedTo(idea.assigned_to || '')
    setWriterId(idea.writer_id || idea.assigned_to || '')
    setConvertTitle(idea.title || 'Untitled idea')
    setConvertStatus('DRAFT')
    setConvertAssignee(idea.assigned_to || '')
    setIncludeNotes(true)
    setSaveError(null)
    setIsAutoSaving(false)
    setLastSavedAt(null)
    setTitleTouched(false)
    setIsConversionSetupOpen(true)
  }, [idea?.id, idea])

  const hasChanges = useMemo(() => {
    if (!idea) return false
    const initialTitle = idea.title || 'Untitled idea'
    const initialNotes = extractIdeaNotes(idea.blocks)
    const initialState = idea.idea_state || 'INBOX'
    const initialAssigned = idea.assigned_to || ''
    const initialWriter = idea.writer_id || idea.assigned_to || ''

    return (
      title !== initialTitle ||
      notes !== initialNotes ||
      ideaState !== initialState ||
      assignedTo !== initialAssigned ||
      writerId !== initialWriter
    )
  }, [idea, title, notes, ideaState, assignedTo, writerId])

  const linkedPostMissing = ideaState === 'CONVERTED' && !idea?.converted_post_id
  const isNewIdea =
    !!idea &&
    idea.title === 'Untitled idea' &&
    extractIdeaNotes(idea.blocks).trim().length === 0 &&
    !idea.converted_post_id
  const linkedPostTicketKey = useMemo(() => {
    if (!idea?.converted_post_id) return null
    return getTicketKey(idea.converted_post_id, allContents)
  }, [idea?.converted_post_id, allContents])

  useEffect(() => {
    if (!open || !idea) return
    const timer = setTimeout(() => {
      titleInputRef.current?.focus()
      titleInputRef.current?.select()
    }, 60)
    return () => clearTimeout(timer)
  }, [open, idea])

  const buildSavePayload = useCallback(() => {
    const normalizedTitle = resolveIdeaTitle({
      currentTitle: title,
      notes,
      titleTouched,
    })
    const blocks = notes.trim()
      ? [{ id: `idea-note-${Date.now()}`, type: 'text', content: notes.trim() }]
      : []

    return {
      title: normalizedTitle,
      blocks,
      idea_state: ideaState,
      assigned_to: assignedTo || null,
      writer_id: writerId || null,
      normalizedTitle,
    }
  }, [titleTouched, title, notes, ideaState, assignedTo, writerId])

  const handleSave = useCallback(async (mode: 'manual' | 'auto' = 'manual') => {
    if (!idea) return false
    if (mode === 'manual') {
      setIsSaving(true)
      setSaveError(null)
    } else {
      setIsAutoSaving(true)
    }

    try {
      const payload = buildSavePayload()

      const response = await fetch(`/api/content/${idea.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      const body = await response.json().catch(() => null)
      if (!response.ok) {
        const baseMessage = typeof body?.error === 'string' ? body.error : 'Failed to save idea'
        const code = typeof body?.code === 'string' ? body.code : null
        throw new Error(code ? `${baseMessage} (${code})` : baseMessage)
      }

      if (body?.data) {
        onIdeaUpdated(body.data as Content)
        setTitle(payload.normalizedTitle)
        setConvertTitle((prev) =>
          prev.trim() && prev.trim().toLowerCase() !== 'untitled idea'
            ? prev
            : payload.normalizedTitle
        )
        setLastSavedAt(new Date().toISOString())
        setSaveError(null)
      }
      return true
    } catch (error) {
      if (mode === 'manual') {
        setSaveError(error instanceof Error ? error.message : 'Failed to save idea')
      } else {
        setSaveError(error instanceof Error ? `Autosave failed: ${error.message}` : 'Autosave failed')
      }
      return false
    } finally {
      if (mode === 'manual') {
        setIsSaving(false)
      } else {
        setIsAutoSaving(false)
      }
    }
  }, [idea, buildSavePayload, onIdeaUpdated])

  const handleConvert = async () => {
    if (!idea) return
    setIsConverting(true)
    setSaveError(null)
    try {
      if (hasChanges) {
        const saved = await handleSave('manual')
        if (!saved) {
          return
        }
      }

      await onConvertIdea(idea.id, {
        post_title: convertTitle.trim() || inferTitleFromNotes(notes, 'POST', title),
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

  useEffect(() => {
    if (!open || !idea || !hasChanges || isSaving || isConverting || isAutoSaving) return
    const timer = setTimeout(() => {
      handleSave('auto')
    }, 1200)

    return () => clearTimeout(timer)
  }, [
    open,
    idea,
    hasChanges,
    isSaving,
    isConverting,
    isAutoSaving,
    title,
    notes,
    ideaState,
    assignedTo,
    writerId,
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
          <SheetTitle className="text-sm font-semibold text-foreground">
            {isNewIdea ? 'New Idea' : 'Idea'}
          </SheetTitle>
          <SheetDescription className="text-xs text-muted-foreground">
            {isNewIdea ? 'Capture the core thought first, then convert it to a post.' : 'Shape your idea before converting to a post.'}
          </SheetDescription>
        </SheetHeader>

        {idea ? (
          <div className="flex min-h-0 flex-1 flex-col">
            <div className="flex-1 space-y-3.5 overflow-y-auto bg-white p-4 custom-scrollbar dark:bg-[#050505]">
            <div className="text-[10px] uppercase tracking-wide text-muted-foreground">
              {getTicketKey(idea.id, allContents)}
            </div>
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
                onChange={(e) => {
                  setTitleTouched(true)
                  setTitle(e.target.value)
                }}
                placeholder="Untitled idea"
                className="h-8 border-border bg-card text-xs text-foreground placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-primary/50"
              />
            </div>

            <div className="grid grid-cols-3 gap-3 rounded-sm border border-border bg-card p-3">
              <div className="space-y-2">
                <label className="text-[11px] uppercase tracking-wide text-muted-foreground">Idea State</label>
                <select
                  value={ideaState}
                  onChange={(e) => setIdeaState(e.target.value as 'INBOX' | 'CONVERTED' | 'ARCHIVED')}
                  className="h-8 w-full rounded-sm border border-border bg-background px-2 text-xs text-foreground"
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
                  className="h-8 w-full rounded-sm border border-border bg-background px-2 text-xs text-foreground"
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

              <div className="space-y-2">
                <label className="text-[11px] uppercase tracking-wide text-muted-foreground">Writer</label>
                <select
                  value={writerId}
                  onChange={(e) => setWriterId(e.target.value)}
                  className="h-8 w-full rounded-sm border border-border bg-background px-2 text-xs text-foreground"
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

            <div className="space-y-2">
              <label className="text-[11px] uppercase tracking-wide text-muted-foreground">Notes</label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Capture context, source, details, and next steps..."
                className="min-h-[300px] border-border bg-card text-xs text-foreground placeholder:text-muted-foreground"
              />
            </div>

            {!idea.converted_post_id ? (
              <div className="rounded-sm border border-border bg-card">
                <button
                  type="button"
                  className="flex w-full items-center justify-between px-3 py-2 text-left"
                  onClick={() => setIsConversionSetupOpen((prev) => !prev)}
                >
                  <span className="text-[11px] uppercase tracking-wide text-muted-foreground">Conversion Setup</span>
                  <ChevronDown
                    className={`h-4 w-4 text-muted-foreground transition-transform ${isConversionSetupOpen ? 'rotate-180' : ''}`}
                  />
                </button>

                {isConversionSetupOpen ? (
                  <div className="space-y-3 border-t border-border px-3 pb-3 pt-2">

                <div className="space-y-2">
                  <label className="text-[11px] uppercase tracking-wide text-muted-foreground">Post Title</label>
                  <Input
                    value={convertTitle}
                    onChange={(e) => setConvertTitle(e.target.value)}
                    placeholder="Title for the post"
                    className="h-8 border-border bg-background text-xs text-foreground placeholder:text-muted-foreground"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <label className="text-[11px] uppercase tracking-wide text-muted-foreground">Initial Status</label>
                    <select
                      value={convertStatus}
                      onChange={(e) => setConvertStatus(e.target.value as 'DRAFT' | 'IN_REVIEW' | 'APPROVED')}
                      className="h-8 w-full rounded-sm border border-border bg-background px-2 text-xs text-foreground"
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
                      className="h-8 w-full rounded-sm border border-border bg-background px-2 text-xs text-foreground"
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
              </div>
            ) : null}

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
                {isSaving ? 'Saving...' : 'Save Idea'}
              </Button>

              {idea.converted_post_id ? (
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 border-emerald-200/70 bg-emerald-50/70 px-2 text-[10px] font-medium text-emerald-800 hover:bg-emerald-100/80 dark:border-emerald-900/70 dark:bg-emerald-950/40 dark:text-emerald-300 dark:hover:bg-emerald-900/50"
                  onClick={() => onOpenLinkedPost(idea.converted_post_id as string)}
                >
                  {linkedPostTicketKey || 'POST'}
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
              <div className="ml-auto text-[10px] text-muted-foreground">
                {isAutoSaving
                  ? 'Autosaving...'
                  : lastSavedAt
                    ? `Saved ${new Date(lastSavedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
                    : 'Autosave on'}
              </div>
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
