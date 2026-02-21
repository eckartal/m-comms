'use client'

import { useEffect, useMemo, useState } from 'react'
import type { Content } from '@/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet'

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
  onConvertIdea: (ideaId: string) => Promise<void>
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
  const [title, setTitle] = useState('')
  const [notes, setNotes] = useState('')
  const [ideaState, setIdeaState] = useState<'INBOX' | 'SHAPING' | 'READY' | 'CONVERTED' | 'ARCHIVED'>('INBOX')
  const [assignedTo, setAssignedTo] = useState<string>('')
  const [isSaving, setIsSaving] = useState(false)
  const [isConverting, setIsConverting] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  useEffect(() => {
    if (!idea) return
    setTitle(idea.title || 'Untitled idea')
    setNotes(extractIdeaNotes(idea.blocks))
    setIdeaState((idea.idea_state || 'INBOX') as 'INBOX' | 'SHAPING' | 'READY' | 'CONVERTED' | 'ARCHIVED')
    setAssignedTo(idea.assigned_to || '')
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

  const handleSave = async () => {
    if (!idea) return
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
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : 'Failed to save idea')
    } finally {
      setIsSaving(false)
    }
  }

  const handleConvert = async () => {
    if (!idea) return
    setIsConverting(true)
    setSaveError(null)
    try {
      await onConvertIdea(idea.id)
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : 'Failed to convert idea')
    } finally {
      setIsConverting(false)
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-lg bg-[#070707] border-l border-[#262626] p-0">
        <SheetHeader className="border-b border-[#1f1f1f] p-4">
          <SheetTitle className="text-sm font-semibold text-foreground">Idea</SheetTitle>
          <SheetDescription className="text-xs text-muted-foreground">
            Shape your idea before converting to a post.
          </SheetDescription>
        </SheetHeader>

        {idea ? (
          <div className="p-4 space-y-4 overflow-y-auto">
            <div className="space-y-2">
              <label className="text-[11px] uppercase tracking-wide text-muted-foreground">Title</label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Untitled idea"
                className="bg-[#0b0b0b] border-[#262626]"
              />
            </div>

            <div className="space-y-2">
              <label className="text-[11px] uppercase tracking-wide text-muted-foreground">Notes</label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Write the idea details..."
                className="min-h-[160px] bg-[#0b0b0b] border-[#262626]"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <label className="text-[11px] uppercase tracking-wide text-muted-foreground">Idea State</label>
                <select
                  value={ideaState}
                  onChange={(e) => setIdeaState(e.target.value as 'INBOX' | 'SHAPING' | 'READY' | 'CONVERTED' | 'ARCHIVED')}
                  className="h-9 w-full rounded-sm border border-[#262626] bg-[#0b0b0b] px-2 text-xs text-foreground"
                >
                  <option value="INBOX">Inbox</option>
                  <option value="SHAPING">Shaping</option>
                  <option value="READY">Ready</option>
                  <option value="CONVERTED">Converted</option>
                  <option value="ARCHIVED">Archived</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-[11px] uppercase tracking-wide text-muted-foreground">Owner</label>
                <select
                  value={assignedTo}
                  onChange={(e) => setAssignedTo(e.target.value)}
                  className="h-9 w-full rounded-sm border border-[#262626] bg-[#0b0b0b] px-2 text-xs text-foreground"
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

            <div className="flex items-center gap-2 pt-2">
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
                  {isConverting ? 'Converting...' : 'Convert to Post'}
                </Button>
              )}
            </div>
          </div>
        ) : (
          <div className="p-4 text-xs text-muted-foreground">No idea selected</div>
        )}
      </SheetContent>
    </Sheet>
  )
}
