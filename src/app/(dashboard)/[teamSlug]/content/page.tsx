'use client'

import { useEffect, useState, useMemo } from 'react'
import Link from 'next/link'
import {
  Plus,
  Search,
  Filter,
  ArrowUpDown,
  FileText,
  MoreHorizontal,
  Edit,
  Trash2,
  Copy,
  Calendar,
  CheckCircle,
  Clock,
  Eye,
  Archive,
} from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'
import { useAppStore, useContentStore } from '@/stores'
import { ContentStatus } from '@/types'

type ContentItem = {
  id: string
  title: string
  blocks: any[]
  status: ContentStatus
  scheduled_at: string | null
  published_at: string | null
  platforms: string[]
  created_at: string
  updated_at: string
  createdBy?: {
    id: string
    name: string
    email: string
    avatar_url?: string
  }
}

const platformConfig: Record<string, { icon: string; name: string; color: string }> = {
  twitter: { icon: '𝕏', name: 'X (Twitter)', color: '#000000' },
  linkedin: { icon: 'in', name: 'LinkedIn', color: '#0A66C2' },
  instagram: { icon: '📷', name: 'Instagram', color: '#E4405F' },
  blog: { icon: '📝', name: 'Blog', color: '#6B7280' },
}

const STATUS_CONFIG: Record<ContentStatus, { label: string; color: string; bg: string; icon: typeof CheckCircle }> = {
  DRAFT: { label: 'Draft', color: 'text-gray-500', bg: 'bg-gray-100/5', icon: Edit },
  IN_REVIEW: { label: 'In Review', color: 'text-amber-500', bg: 'bg-amber-500/10', icon: Eye },
  APPROVED: { label: 'Approved', color: 'text-emerald-500', bg: 'bg-emerald-500/10', icon: CheckCircle },
  SCHEDULED: { label: 'Scheduled', color: 'text-blue-500', bg: 'bg-blue-500/10', icon: Clock },
  PUBLISHED: { label: 'Published', color: 'text-purple-500', bg: 'bg-purple-500/10', icon: CheckCircle },
  ARCHIVED: { label: 'Archived', color: 'text-gray-400', bg: 'bg-gray-100/5', icon: Archive },
}

type SortOption = 'newest' | 'oldest' | 'updated' | 'scheduled'

export default function ContentPage() {
  const { currentTeam } = useAppStore()
  const { contents, setContents, fetchContents } = useContentStore()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<ContentStatus | 'all'>('all')
  const [platformFilter, setPlatformFilter] = useState<string>('all')
  const [sortBy, setSortBy] = useState<SortOption>('newest')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadContent() {
      if (!currentTeam) {
        setLoading(false)
        return
      }

      setLoading(true)
      try {
        await fetchContents(currentTeam.id)
      } catch (error) {
        console.error('Error fetching content:', error)
      } finally {
        setLoading(false)
      }
    }
    loadContent()
  }, [currentTeam, fetchContents])

  const filteredContent = useMemo(() => {
    let result = [...contents]

    // Search filter - extract text from blocks
    if (search) {
      result = result.filter(item => {
        const textContent = item.blocks
          ?.filter((b: any) => b.type === 'text')
          ?.map((b: any) => b.content?.text || '')
          ?.join(' ') || ''
        return (
          item.title.toLowerCase().includes(search.toLowerCase()) ||
          textContent.toLowerCase().includes(search.toLowerCase())
        )
      })
    }

    // Status filter
    if (statusFilter !== 'all') {
      result = result.filter(item => item.status === statusFilter)
    }

    // Platform filter
    if (platformFilter !== 'all') {
      result = result.filter(item =>
        item.platforms?.some((p: any) => p.type === platformFilter)
      )
    }

    // Sort
    result.sort((a: any, b: any) => {
      switch (sortBy) {
        case 'newest':
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        case 'oldest':
          return new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        case 'updated':
          return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
        case 'scheduled':
          if (!a.scheduled_at && !b.scheduled_at) return 0
          if (!a.scheduled_at) return 1
          if (!b.scheduled_at) return -1
          return new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime()
        default:
          return 0
      }
    })

    return result
  }, [contents, search, statusFilter, platformFilter, sortBy])

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = { all: contents.length }
    contents.forEach((item: any) => {
      counts[item.status] = (counts[item.status] || 0) + 1
    })
    return counts
  }, [contents])

  const formatDate = (date: string | null) => {
    if (!date) return null
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    })
  }

  // Extract text from blocks for display
  const getContentPreview = (blocks: any[]) => {
    if (!blocks || !Array.isArray(blocks)) return null
    const textBlock = blocks.find((b: any) => b.type === 'text')
    if (textBlock?.content?.text) {
      return textBlock.content.text
    }
    return null
  }

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto px-12">
        <div className="animate-pulse space-y-6 py-12">
          <div className="h-8 w-32 bg-border rounded" />
          <div className="h-12 w-full bg-border rounded" />
          <div className="h-64 w-full bg-border rounded" />
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-5xl mx-auto px-12 py-12">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-[20px] font-medium text-foreground">Content</h1>
            <p className="text-[14px] text-muted-foreground mt-1">
              {filteredContent.length} pieces of content
            </p>
          </div>

          <Link
            href={`/${currentTeam?.slug}/content/new`}
            className="flex items-center gap-2 px-4 py-2 bg-foreground text-white text-[14px] font-medium rounded-[6px] hover:bg-hover transition-colors"
          >
            <Plus className="w-4 h-4" />
            New post
          </Link>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3 mb-6">
          {/* Search */}
          <div className="relative flex-1 min-w-[200px] max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search content..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-muted rounded-[6px] text-[14px] text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-1 p-1 bg-muted rounded-[6px]">
            {Object.entries(STATUS_CONFIG).map(([status, config]) => (
              <button
                key={status}
                onClick={() => setStatusFilter(status as ContentStatus | 'all')}
                className={cn(
                  'px-3 py-1.5 rounded-[4px] text-[13px] font-medium transition-all',
                  statusFilter === status
                    ? 'bg-card text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                {status === 'all' ? 'All' : config.label}
                <span className="ml-1.5 text-[11px] opacity-60">({statusCounts[status] || 0})</span>
              </button>
            ))}
          </div>

          {/* Platform Filter */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-2 px-3 py-2 bg-muted rounded-[6px] text-[13px] font-medium text-muted-foreground hover:bg-border transition-colors">
                <Filter className="w-4 h-4" />
                Platform
                {platformFilter !== 'all' && (
                  <span className="w-2 h-2 bg-primary rounded-full" />
                )}
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={() => setPlatformFilter('all')}>
                <span className="flex items-center gap-2">
                  <span>All platforms</span>
                  {platformFilter === 'all' && <CheckCircle className="w-4 h-4 ml-auto" />}
                </span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              {Object.entries(platformConfig).map(([key, config]) => (
                <DropdownMenuItem key={key} onClick={() => setPlatformFilter(key)}>
                  <span className="flex items-center gap-2">
                    <span>{config.icon}</span>
                    <span>{config.name}</span>
                    {platformFilter === key && <CheckCircle className="w-4 h-4 ml-auto" />}
                  </span>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Sort */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-2 px-3 py-2 bg-muted rounded-[6px] text-[13px] font-medium text-muted-foreground hover:bg-border transition-colors">
                <ArrowUpDown className="w-4 h-4" />
                Sort
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {[
                { id: 'newest', label: 'Newest first' },
                { id: 'oldest', label: 'Oldest first' },
                { id: 'updated', label: 'Recently updated' },
                { id: 'scheduled', label: 'Scheduled date' },
              ].map((option) => (
                <DropdownMenuItem key={option.id} onClick={() => setSortBy(option.id as SortOption)}>
                  <span className="flex items-center gap-2">
                    {option.label}
                    {sortBy === option.id && <CheckCircle className="w-4 h-4 ml-auto" />}
                  </span>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Content List */}
        {filteredContent.length === 0 ? (
          <div className="text-center py-16">
            <FileText className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">
              {search || statusFilter !== 'all' || platformFilter !== 'all'
                ? 'No content matches your filters'
                : 'No content yet'}
            </p>
            <Link
              href={`/${currentTeam?.slug}/content/new`}
              className="inline-flex items-center gap-2 mt-4 text-primary hover:underline text-[14px]"
            >
              Create your first post
            </Link>
          </div>
        ) : (
          <div className="border border-border rounded-[8px] overflow-hidden">
            {filteredContent.map((item, index) => {
              const statusConfig = STATUS_CONFIG[item.status as ContentStatus]
              const StatusIcon = statusConfig.icon
              const contentPreview = getContentPreview(item.blocks)
              const isOverLimit = item.platforms?.some((p: any) => {
                const limit = p?.type === 'twitter' ? 280 : p?.type === 'linkedin' ? 3000 : 2200
                return (contentPreview?.length || 0) > limit
              })

              return (
                <Link
                  key={item.id}
                  href={`/${currentTeam?.slug}/content/${item.id}`}
                  className={cn(
                    'flex items-start justify-between py-4 px-4 transition-colors hover:bg-accent',
                    index !== filteredContent.length - 1 && 'border-b border-border'
                  )}
                >
                  <div className="flex items-start gap-4 flex-1 min-w-0">
                    {/* Status Icon */}
                    <div className={cn(
                      'w-8 h-8 rounded-[6px] flex items-center justify-center flex-shrink-0 mt-0.5',
                      statusConfig.bg
                    )}>
                      <StatusIcon className={cn('w-4 h-4', statusConfig.color)} />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-[14px] font-medium text-foreground truncate">
                          {item.title}
                        </h3>
                        {isOverLimit && (
                          <span className="text-[11px] text-red-500 px-1.5 py-0.5 bg-red-500/10 rounded">
                            Over limit
                          </span>
                        )}
                      </div>

                      {contentPreview && (
                        <p className="text-[13px] text-muted-foreground line-clamp-1 mb-2">
                          {contentPreview}
                        </p>
                      )}

                      <div className="flex items-center gap-3 text-[12px] text-muted-foreground">
                        {/* Created date */}
                        <span>Created {formatDate(item.created_at)}</span>

                        {/* Scheduled date */}
                        {item.scheduled_at && (
                          <>
                            <span>·</span>
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              Scheduled for {formatDate(item.scheduled_at)}
                            </span>
                          </>
                        )}

                        {/* Published date */}
                        {item.published_at && (
                          <>
                            <span>·</span>
                            <span className="flex items-center gap-1 text-purple-500">
                              <CheckCircle className="w-3 h-3" />
                              Published {formatDate(item.published_at)}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 flex-shrink-0 ml-4">
                    {/* Platforms */}
                    <div className="flex gap-1">
                      {(item.platforms || []).map((p: any) => (
                        <span
                          key={p?.type || 'unknown'}
                          className="text-[13px] w-6 h-6 flex items-center justify-center bg-muted rounded"
                          title={platformConfig[p?.type]?.name || 'Unknown'}
                        >
                          {platformConfig[p?.type]?.icon || '?'}
                        </span>
                      ))}
                    </div>

                    {/* Actions */}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild onClick={(e) => e.preventDefault()}>
                        <button className="p-1.5 rounded hover:bg-muted transition-colors">
                          <MoreHorizontal className="w-4 h-4 text-muted-foreground" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-44">
                        <DropdownMenuItem asChild>
                          <Link href={`/${currentTeam?.slug}/content/${item.id}`}>
                            <Edit className="w-4 h-4 mr-2" />
                            Edit
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          <Copy className="w-4 h-4 mr-2" />
                          Duplicate
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="text-red-500">
                          <Trash2 className="w-4 h-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </Link>
              )
            })}
          </div>
        )}

        {/* Footer Stats */}
        {filteredContent.length > 0 && (
          <div className="mt-6 flex items-center gap-6 text-[12px] text-muted-foreground">
            <span>{statusCounts.DRAFT || 0} drafts</span>
            <span>{statusCounts.IN_REVIEW || 0} in review</span>
            <span>{statusCounts.SCHEDULED || 0} scheduled</span>
            <span>{statusCounts.PUBLISHED || 0} published</span>
          </div>
        )}
      </div>
    </div>
  )
}
