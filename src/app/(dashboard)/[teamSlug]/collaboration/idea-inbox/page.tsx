'use client'

import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { DashboardContainer } from '@/components/layout/DashboardContainer'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { cn } from '@/lib/utils'
import { useAppStore } from '@/stores'
import type { InspirationItem } from '@/types'
import { ExternalLink, Plus, Sparkles, Lightbulb, Link2, FileText, CheckSquare, Trash2, Layers } from 'lucide-react'

type LoadState = 'loading' | 'ready' | 'error'

function extractUrlFromInput(value: string) {
  const trimmed = value.trim()
  if (!trimmed) return ''
  try {
    const parsed = new URL(trimmed)
    if (parsed.protocol === 'http:' || parsed.protocol === 'https:') return parsed.toString()
  } catch {
    // Not a standalone URL, attempt to detect one from pasted text.
  }

  const urlMatch = trimmed.match(/https?:\/\/[^\s)]+/i)
  return urlMatch?.[0] || ''
}

function extractUrlsFromText(value: string) {
  const matches = value.match(/https?:\/\/[^\s)]+/gi) || []
  const normalized = matches
    .map((raw) => {
      try {
        const parsed = new URL(raw.trim())
        return ['http:', 'https:'].includes(parsed.protocol) ? parsed.toString() : null
      } catch {
        return null
      }
    })
    .filter((url): url is string => Boolean(url))

  return Array.from(new Set(normalized))
}

function platformLabel(platform: string | null) {
  if (!platform) return 'Web'
  return platform.charAt(0).toUpperCase() + platform.slice(1)
}

export default function IdeaInspirationInboxPage() {
  const params = useParams()
  const router = useRouter()
  const routeTeamSlug = params.teamSlug as string
  const { currentTeam } = useAppStore()

  const [loadState, setLoadState] = useState<LoadState>('loading')
  const [items, setItems] = useState<InspirationItem[]>([])
  const [loadError, setLoadError] = useState<string | null>(null)

  const [sourceInput, setSourceInput] = useState('')
  const [notes, setNotes] = useState('')
  const [bulkInput, setBulkInput] = useState('')
  const [bulkMode, setBulkMode] = useState(false)
  const [isAdding, setIsAdding] = useState(false)
  const [creatingIdeaById, setCreatingIdeaById] = useState<Record<string, boolean>>({})

  const [searchQuery, setSearchQuery] = useState('')
  const [platformFilter, setPlatformFilter] = useState('all')
  const [showUnconvertedOnly, setShowUnconvertedOnly] = useState(false)
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [isCreateDraftDialogOpen, setIsCreateDraftDialogOpen] = useState(false)
  const [draftTitle, setDraftTitle] = useState('')
  const [includeSourceUrls, setIncludeSourceUrls] = useState(true)
  const [includePreview, setIncludePreview] = useState(true)
  const [isCreatingDraftFromSelected, setIsCreatingDraftFromSelected] = useState(false)
  const sourceInputRef = useRef<HTMLInputElement | null>(null)
  const bulkInputRef = useRef<HTMLTextAreaElement | null>(null)

  const loadItems = useCallback(async () => {
    if (!currentTeam?.id) return
    setLoadState('loading')
    setLoadError(null)

    try {
      const response = await fetch(`/api/inspiration?team_id=${encodeURIComponent(currentTeam.id)}`, {
        cache: 'no-store',
      })
      const body = await response.json().catch(() => null)

      if (!response.ok) {
        throw new Error(body?.error || 'Failed to load inspiration items')
      }

      setItems(Array.isArray(body?.data) ? (body.data as InspirationItem[]) : [])
      setLoadState('ready')
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : 'Failed to load inspiration items')
      setLoadState('error')
    }
  }, [currentTeam?.id])

  useEffect(() => {
    if (currentTeam?.id) {
      loadItems()
    }
  }, [currentTeam?.id, loadItems])

  useEffect(() => {
    const validIds = new Set(items.map((item) => item.id))
    setSelectedIds((prev) => prev.filter((id) => validIds.has(id)))
  }, [items])

  const parsedBulkUrls = useMemo(() => extractUrlsFromText(bulkInput), [bulkInput])
  const bulkLines = useMemo(
    () => bulkInput.split('\n').map((line) => line.trim()).filter(Boolean),
    [bulkInput]
  )
  const bulkInvalidCount = useMemo(() => {
    if (bulkLines.length === 0) return 0
    return bulkLines.filter((line) => extractUrlsFromText(line).length === 0).length
  }, [bulkLines])

  const addItem = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!currentTeam?.id) return

    setIsAdding(true)
    try {
      if (bulkMode) {
        if (parsedBulkUrls.length === 0) {
          toast.error('Paste at least one valid URL')
          return
        }

        const response = await fetch('/api/inspiration/bulk-create', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            team_id: currentTeam.id,
            items: parsedBulkUrls,
            shared_notes: notes.trim() || null,
          }),
        })

        const body = await response.json().catch(() => null)
        if (!response.ok) {
          throw new Error(body?.error || 'Failed to add inspirations')
        }

        const results = Array.isArray(body?.data) ? body.data : []
        const createdItems = results
          .filter((result: { status?: string; data?: unknown }) => result?.status === 'created' && result?.data)
          .map((result: { data: unknown }) => result.data as InspirationItem)

        if (createdItems.length > 0) {
          setItems((prev) => [...createdItems, ...prev])
        }
        setBulkInput('')
        setNotes('')
        const failed = Number(body?.summary?.failed || 0)
        if (failed > 0) {
          toast.error(`${createdItems.length} added, ${failed} failed`)
        } else {
          toast.success(`${createdItems.length} inspirations added`)
        }
      } else {
        const sourceUrl = extractUrlFromInput(sourceInput)
        if (!sourceUrl) {
          toast.error('Paste a valid URL from an inspirational post')
          return
        }

        const response = await fetch('/api/inspiration', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            team_id: currentTeam.id,
            source_url: sourceUrl,
            notes: notes.trim() || null,
          }),
        })

        const body = await response.json().catch(() => null)
        if (!response.ok) {
          throw new Error(body?.error || 'Failed to add inspiration item')
        }

        if (body?.data) {
          setItems((prev) => [body.data as InspirationItem, ...prev])
        }
        setSourceInput('')
        setNotes('')
        toast.success('Inspiration added')
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to add inspiration')
    } finally {
      setIsAdding(false)
    }
  }

  const createIdea = async (item: InspirationItem) => {
    setCreatingIdeaById((prev) => ({ ...prev, [item.id]: true }))
    try {
      const response = await fetch(`/api/inspiration/${item.id}/create-idea`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })
      const body = await response.json().catch(() => null)
      if (!response.ok) {
        throw new Error(body?.error || 'Failed to create idea')
      }

      const updatedItem = body?.data?.inspiration as InspirationItem | undefined
      if (updatedItem) {
        setItems((prev) => prev.map((existing) => (existing.id === item.id ? updatedItem : existing)))
      }

      toast.success('Idea draft created in Collaboration', {
        action: {
          label: 'Open',
          onClick: () => router.push(`/${routeTeamSlug}/collaboration`),
        },
      })
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to create idea')
    } finally {
      setCreatingIdeaById((prev) => ({ ...prev, [item.id]: false }))
    }
  }

  const platforms = useMemo(
    () =>
      Array.from(
        new Set(items.map((item) => (item.source_platform || 'web').toLowerCase()))
      ),
    [items]
  )

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const hasLinkedDraft = (item.linked_ideas?.length || 0) > 0 || !!item.created_idea_id
      if (showUnconvertedOnly && hasLinkedDraft) return false
      if (platformFilter !== 'all' && (item.source_platform || 'web') !== platformFilter) return false

      const haystack = [item.preview_title || '', item.preview_description || '', item.notes || '', item.source_url]
        .join(' ')
        .toLowerCase()

      if (searchQuery.trim() && !haystack.includes(searchQuery.trim().toLowerCase())) return false
      return true
    })
  }, [items, showUnconvertedOnly, platformFilter, searchQuery])

  const selectedCount = selectedIds.length
  const filteredIds = useMemo(() => filteredItems.map((item) => item.id), [filteredItems])
  const allFilteredSelected =
    filteredIds.length > 0 && filteredIds.every((id) => selectedIds.includes(id))

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((existing) => existing !== id) : [...prev, id]
    )
  }

  const toggleSelectAllFiltered = () => {
    if (allFilteredSelected) {
      const filteredIdSet = new Set(filteredIds)
      setSelectedIds((prev) => prev.filter((id) => !filteredIdSet.has(id)))
      return
    }

    setSelectedIds((prev) => Array.from(new Set([...prev, ...filteredIds])))
  }

  const clearSelection = () => {
    setSelectedIds([])
  }

  const removeSelected = async () => {
    if (selectedIds.length === 0) return
    const confirmed = window.confirm(
      `Delete ${selectedIds.length} inspiration ${selectedIds.length === 1 ? 'item' : 'items'}? This cannot be undone.`
    )
    if (!confirmed) return

    const snapshot = items
    const idsToDelete = [...selectedIds]
    const deletingSet = new Set(idsToDelete)

    setItems((prev) => prev.filter((item) => !deletingSet.has(item.id)))
    setSelectedIds([])

    try {
      const response = await fetch('/api/inspiration/bulk-delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: idsToDelete }),
      })
      const body = await response.json().catch(() => null)

      if (!response.ok) {
        throw new Error(body?.error || 'Failed to delete selected inspiration items')
      }

      const deletedIds = new Set<string>(Array.isArray(body?.deleted_ids) ? body.deleted_ids : [])
      const failedIds = Array.isArray(body?.failed_ids) ? (body.failed_ids as string[]) : []

      setItems(snapshot.filter((item) => !deletedIds.has(item.id)))

      if (failedIds.length > 0) {
        toast.error(
          `${failedIds.length} item${failedIds.length === 1 ? '' : 's'} could not be deleted.`
        )
      } else {
        toast.success(
          `${deletedIds.size} inspiration ${deletedIds.size === 1 ? 'item' : 'items'} removed.`
        )
      }
    } catch (error) {
      setItems(snapshot)
      toast.error(error instanceof Error ? error.message : 'Failed to delete inspiration items')
    }
  }

  const createDraftFromSelected = async () => {
    if (selectedIds.length === 0 || !routeTeamSlug) return
    setIsCreatingDraftFromSelected(true)
    try {
      const response = await fetch('/api/inspiration/create-idea-draft', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          inspiration_ids: selectedIds,
          title: draftTitle.trim() || null,
          include_source_urls: includeSourceUrls,
          include_preview: includePreview,
        }),
      })
      const body = await response.json().catch(() => null)
      if (!response.ok) {
        throw new Error(body?.error || 'Failed to create idea draft from selected inspirations')
      }

      setIsCreateDraftDialogOpen(false)
      setDraftTitle('')
      setSelectedIds([])
      await loadItems()

      toast.success('Idea draft created from selected inspirations', {
        action: {
          label: 'Open',
          onClick: () => router.push(`/${routeTeamSlug}/collaboration`),
        },
      })
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to create idea draft')
    } finally {
      setIsCreatingDraftFromSelected(false)
    }
  }

  if (!currentTeam) {
    return (
      <div className="flex min-h-full items-center justify-center text-muted-foreground">
        <p>Please select a team</p>
      </div>
    )
  }

  return (
    <DashboardContainer className="flex h-full flex-1 flex-col py-3 md:py-4">
      <div className="mb-4 rounded-xl border border-border bg-card p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-semibold text-foreground">Inspirations</h1>
              <Badge variant="secondary" className="gap-1 text-[10px]">
                <Sparkles className="h-3 w-3" />
                Collaboration
              </Badge>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Save links and turn them into idea drafts.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-xs text-muted-foreground">
              {items.length} saved - {items.filter((item) => (item.linked_ideas?.length || 0) > 0 || !!item.created_idea_id).length} linked
            </div>
            <Button
              size="sm"
              className="h-8 gap-1.5 rounded-md bg-primary px-3 text-xs text-primary-foreground hover:bg-primary/90"
              onClick={() => {
                const element = document.getElementById('idea-inbox-composer')
                if (element) element.scrollIntoView({ behavior: 'smooth', block: 'start' })
                setTimeout(() => {
                  if (bulkMode) {
                    bulkInputRef.current?.focus()
                  } else {
                    sourceInputRef.current?.focus()
                    sourceInputRef.current?.select()
                  }
                }, 120)
              }}
            >
              <Plus className="h-3.5 w-3.5" />
              New Inspiration
            </Button>
          </div>
        </div>
      </div>

      <form
        id="idea-inbox-composer"
        onSubmit={addItem}
        className="mb-4 rounded-xl border-2 border-primary/30 bg-muted/20 p-3 shadow-sm md:p-4"
      >
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2 border-b border-border pb-2.5">
          <div className="flex items-center gap-2">
            <div className="inline-flex h-6 w-6 items-center justify-center rounded-md bg-primary/15 text-primary">
              <Plus className="h-3.5 w-3.5" />
            </div>
            <p className="text-sm font-semibold text-foreground">Add New Inspiration</p>
          </div>
          <p className="text-[11px] text-muted-foreground">Paste link and add.</p>
        </div>

        <div className="mb-3 flex items-center gap-2">
          <Button
            type="button"
            size="sm"
            variant={bulkMode ? 'default' : 'outline'}
            className="h-7 text-xs"
            onClick={() => setBulkMode((prev) => !prev)}
          >
            {bulkMode ? 'Single Link Mode' : 'Paste Multiple Links'}
          </Button>
          {bulkMode ? (
            <span className="text-[11px] text-muted-foreground">
              {parsedBulkUrls.length} valid {bulkInvalidCount > 0 ? `• ${bulkInvalidCount} invalid lines` : ''}
            </span>
          ) : null}
        </div>

        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-[minmax(0,2fr)_minmax(0,1.4fr)_auto]">
          <div className="space-y-1.5">
            <label className="inline-flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide text-foreground/80">
              <Link2 className="h-3.5 w-3.5" />
              {bulkMode ? 'Links' : 'Link'}
            </label>
            {bulkMode ? (
              <Textarea
                ref={bulkInputRef}
                value={bulkInput}
                onChange={(event) => setBulkInput(event.target.value)}
                placeholder={'Paste one URL per line or any text block containing multiple URLs'}
                className="min-h-[84px] rounded-lg border-border bg-background text-sm placeholder:text-muted-foreground focus-visible:ring-1"
              />
            ) : (
              <Input
                ref={sourceInputRef}
                value={sourceInput}
                onChange={(event) => setSourceInput(event.target.value)}
                placeholder="https://instagram.com/... or paste text with a URL"
                className="h-10 rounded-lg border-border bg-background text-sm placeholder:text-muted-foreground focus-visible:ring-1"
              />
            )}
          </div>

          <div className="space-y-1.5">
            <label className="inline-flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide text-foreground/80">
              <FileText className="h-3.5 w-3.5" />
              Notes
            </label>
            <Textarea
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              placeholder="Hooks, format ideas, visual cues..."
              className="min-h-[40px] rounded-lg border-border bg-background text-sm placeholder:text-muted-foreground focus-visible:ring-1"
            />
          </div>

          <div className="flex items-end">
            <Button
              type="submit"
              disabled={isAdding}
              className="h-10 w-full gap-1.5 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90 xl:w-auto xl:px-5"
            >
              <Plus className="h-3.5 w-3.5" />
              {isAdding ? 'Adding...' : bulkMode ? `Add ${parsedBulkUrls.length || ''}`.trim() : 'Add'}
            </Button>
          </div>
        </div>
      </form>

      <div className="mb-3 flex flex-wrap items-center gap-2 rounded-lg border border-border bg-card p-2">
        <Input
          value={searchQuery}
          onChange={(event) => setSearchQuery(event.target.value)}
          placeholder="Search moodboard..."
          className="h-8 w-[220px] border-border bg-background text-xs placeholder:text-muted-foreground"
        />
        <select
          value={platformFilter}
          onChange={(event) => setPlatformFilter(event.target.value)}
          className="h-8 rounded-md border border-border bg-background px-2 text-xs text-foreground"
        >
          <option value="all">All platforms</option>
          {platforms.map((platform) => (
            <option key={platform} value={platform}>
              {platformLabel(platform)}
            </option>
          ))}
        </select>
        <Button
          size="sm"
          variant={showUnconvertedOnly ? 'default' : 'outline'}
          className="h-8 text-xs"
          onClick={() => setShowUnconvertedOnly((prev) => !prev)}
        >
          Unconverted only
        </Button>
      </div>

      {selectedCount > 0 ? (
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-primary/30 bg-primary/5 p-2">
          <div className="inline-flex items-center gap-2 text-xs text-foreground">
            <CheckSquare className="h-3.5 w-3.5 text-primary" />
            <span className="font-medium">{selectedCount} selected</span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              size="sm"
              className="h-7 gap-1 text-xs"
              onClick={() => {
                setDraftTitle('')
                setIncludeSourceUrls(true)
                setIncludePreview(true)
                setIsCreateDraftDialogOpen(true)
              }}
            >
              <Layers className="h-3.5 w-3.5" />
              Create idea draft
            </Button>
            <Button size="sm" variant="outline" className="h-7 text-xs" onClick={toggleSelectAllFiltered}>
              {allFilteredSelected ? 'Unselect filtered' : 'Select filtered'}
            </Button>
            <Button size="sm" variant="outline" className="h-7 text-xs" onClick={clearSelection}>
              Clear
            </Button>
            <Button size="sm" className="h-7 gap-1 text-xs" onClick={removeSelected}>
              <Trash2 className="h-3.5 w-3.5" />
              Remove selected
            </Button>
          </div>
        </div>
      ) : null}

      {loadState === 'loading' ? (
        <div className="grid place-items-center py-16 text-sm text-muted-foreground">Loading moodboard...</div>
      ) : null}

      {loadState === 'error' ? (
        <div className="rounded-md border border-red-300/50 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-300">
          <p>{loadError || 'Failed to load inspiration items'}</p>
          <Button size="sm" variant="outline" className="mt-2 h-8 text-xs" onClick={loadItems}>
            Retry
          </Button>
        </div>
      ) : null}

      {loadState === 'ready' ? (
        filteredItems.length === 0 ? (
          <div className="grid place-items-center rounded-xl border border-dashed border-border py-16 text-center">
            <Lightbulb className="mb-2 h-7 w-7 text-muted-foreground" />
            <p className="text-sm text-foreground">No inspirations yet</p>
          </div>
        ) : (
          <div className="columns-1 gap-4 sm:columns-2 lg:columns-3 2xl:columns-4">
            {filteredItems.map((item, index) => {
              const isCreatingIdea = creatingIdeaById[item.id] || false
              const linkedIdeas = item.linked_ideas || []
              const created = linkedIdeas.length > 0 || !!item.created_idea_id
              return (
                <article
                  key={item.id}
                  className={cn(
                    'mb-4 break-inside-avoid overflow-hidden rounded-2xl border border-border bg-card shadow-sm',
                    index % 3 === 0 && 'bg-gradient-to-b from-orange-50/80 to-card dark:from-orange-950/20',
                    index % 3 === 1 && 'bg-gradient-to-b from-blue-50/80 to-card dark:from-blue-950/20',
                    index % 3 === 2 && 'bg-gradient-to-b from-emerald-50/80 to-card dark:from-emerald-950/20'
                  )}
                >
                  <div className="relative aspect-[4/5] w-full overflow-hidden bg-muted/60">
                    {item.preview_image_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={item.preview_image_url}
                        alt={item.preview_title || 'Inspiration preview'}
                        className="h-full w-full object-cover"
                        loading="lazy"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center">
                        <span className="text-xs text-muted-foreground">{platformLabel(item.source_platform)}</span>
                      </div>
                    )}
                  </div>
                  <div className="space-y-2 p-3">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5">
                        <label className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                          <input
                            type="checkbox"
                            className="h-3.5 w-3.5 rounded border-border text-primary focus-visible:outline-none"
                            checked={selectedIds.includes(item.id)}
                            onChange={() => toggleSelect(item.id)}
                            aria-label="Select inspiration item"
                          />
                        </label>
                        <Badge variant="outline" className="text-[10px]">
                          {platformLabel(item.source_platform)}
                        </Badge>
                        {created ? (
                          <Badge className="bg-emerald-600 text-[10px] text-white hover:bg-emerald-600">
                            Linked ({linkedIdeas.length || 1})
                          </Badge>
                        ) : null}
                      </div>
                      <a
                        href={item.source_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex h-6 w-6 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground"
                        title="Open source post"
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                      </a>
                    </div>
                    <h3 className="line-clamp-2 text-sm font-medium text-foreground">
                      {item.preview_title || 'Untitled inspiration'}
                    </h3>
                    {(item.notes || item.preview_description) ? (
                      <div className="space-y-1.5 rounded-md bg-muted/50 p-2.5">
                        {item.notes ? (
                          <p className="line-clamp-4 text-xs text-foreground/75">{item.notes}</p>
                        ) : null}
                        {!item.notes && item.preview_description ? (
                          <p className="line-clamp-3 text-xs text-foreground/75">{item.preview_description}</p>
                        ) : null}
                      </div>
                    ) : null}
                    <div className="flex items-center justify-end gap-2 pt-1">
                      <Button
                        size="sm"
                        className="h-7 text-[11px]"
                        disabled={isCreatingIdea}
                        onClick={() => createIdea(item)}
                      >
                        {isCreatingIdea ? 'Creating...' : created ? 'Create another draft' : 'Create draft'}
                      </Button>
                    </div>
                  </div>
                </article>
              )
            })}
          </div>
        )
      ) : null}

      <Dialog open={isCreateDraftDialogOpen} onOpenChange={setIsCreateDraftDialogOpen}>
        <DialogContent className="border-border !bg-white text-foreground shadow-2xl dark:!bg-[#050505] sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold text-foreground">Create idea draft</DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Use {selectedCount} selected {selectedCount === 1 ? 'item' : 'items'}.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold uppercase tracking-wide text-foreground">Draft Title</label>
              <Input
                value={draftTitle}
                onChange={(event) => setDraftTitle(event.target.value)}
                placeholder="Optional"
                className="h-9 border-border bg-white text-sm text-foreground placeholder:text-muted-foreground dark:bg-[#0b0b0b]"
              />
            </div>

            <div className="space-y-2 rounded-md border border-border bg-zinc-50 p-2.5 dark:bg-[#0b0b0b]">
              <label className="inline-flex items-center gap-2 text-xs text-foreground">
                <input
                  type="checkbox"
                  checked={includeSourceUrls}
                  onChange={(event) => setIncludeSourceUrls(event.target.checked)}
                  className="h-3.5 w-3.5 rounded border-border text-primary focus-visible:outline-none"
                />
                Include source URLs and platform labels in draft notes
              </label>
              <label className="inline-flex items-center gap-2 text-xs text-foreground">
                <input
                  type="checkbox"
                  checked={includePreview}
                  onChange={(event) => setIncludePreview(event.target.checked)}
                  className="h-3.5 w-3.5 rounded border-border text-primary focus-visible:outline-none"
                />
                Include extracted preview snippets when available
              </label>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              className="border-border bg-white text-foreground hover:bg-zinc-100 dark:bg-[#111111] dark:hover:bg-[#1a1a1a]"
              onClick={() => setIsCreateDraftDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              className="bg-primary text-white hover:bg-primary/90"
              onClick={createDraftFromSelected}
              disabled={isCreatingDraftFromSelected || selectedCount === 0}
            >
              {isCreatingDraftFromSelected ? 'Creating...' : 'Create Draft'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardContainer>
  )
}
