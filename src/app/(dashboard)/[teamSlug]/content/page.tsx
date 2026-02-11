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
import { useAppStore } from '@/stores'
import { ContentStatus } from '@/types'

type ContentItem = {
  id: string
  title: string
  content?: string
  status: ContentStatus
  scheduledAt: string | null
  publishedAt: string | null
  platforms: string[]
  createdAt: string
  updatedAt: string
}

// Mock data
const mockContent: ContentItem[] = [
  {
    id: '1',
    title: 'Product Launch Announcement',
    content: '🚀 Big news coming soon! Stay tuned.',
    status: 'SCHEDULED' as const,
    scheduledAt: '2025-02-20T10:00:00Z',
    publishedAt: null,
    platforms: ['twitter', 'linkedin'],
    createdAt: '2025-02-01T10:00:00Z',
    updatedAt: '2025-02-15T14:00:00Z',
  },
  {
    id: '2',
    title: 'Weekly Newsletter #45 - Q1 Updates',
    content: 'Here are this week\'s updates...',
    status: 'IN_REVIEW' as const,
    scheduledAt: null,
    publishedAt: null,
    platforms: ['blog'],
    createdAt: '2025-02-03T14:00:00Z',
    updatedAt: '2025-02-05T09:00:00Z',
  },
  {
    id: '3',
    title: 'Customer Success Story - Acme Corp',
    content: 'How Acme Corp achieved 200% growth...',
    status: 'DRAFT' as const,
    scheduledAt: null,
    publishedAt: null,
    platforms: ['linkedin', 'blog'],
    createdAt: '2025-02-05T09:00:00Z',
    updatedAt: '2025-02-05T09:00:00Z',
  },
  {
    id: '4',
    title: 'Behind the Scenes - Engineering',
    content: 'A look at our engineering team...',
    status: 'PUBLISHED' as const,
    scheduledAt: '2025-02-08T15:00:00Z',
    publishedAt: '2025-02-08T15:00:00Z',
    platforms: ['instagram'],
    createdAt: '2025-02-02T11:00:00Z',
    updatedAt: '2025-02-08T15:00:00Z',
  },
  {
    id: '5',
    title: 'Industry Insights - AI Trends 2025',
    content: 'The future of AI in business...',
    status: 'APPROVED' as const,
    scheduledAt: null,
    publishedAt: null,
    platforms: ['twitter', 'linkedin'],
    createdAt: '2025-02-04T16:00:00Z',
    updatedAt: '2025-02-10T11:00:00Z',
  },
  {
    id: '6',
    title: 'Old Campaign - Q4回顾',
    content: 'Q4回顾...',
    status: 'ARCHIVED' as const,
    scheduledAt: null,
    publishedAt: '2024-12-31T10:00:00Z',
    platforms: ['twitter', 'linkedin', 'blog'],
    createdAt: '2024-12-15T10:00:00Z',
    updatedAt: '2024-12-31T10:00:00Z',
  },
]

const platformConfig: Record<string, { icon: string; name: string; color: string }> = {
  twitter: { icon: '𝕏', name: 'X (Twitter)', color: '#000000' },
  linkedin: { icon: 'in', name: 'LinkedIn', color: '#0A66C2' },
  instagram: { icon: '📷', name: 'Instagram', color: '#E4405F' },
  blog: { icon: '📝', name: 'Blog', color: '#6B7280' },
}

const STATUS_CONFIG: Record<ContentStatus, { label: string; color: string; bg: string; icon: typeof CheckCircle }> = {
  DRAFT: { label: 'Draft', color: 'text-[#6B7280]', bg: 'bg-[#F3F4F6]', icon: Edit },
  IN_REVIEW: { label: 'In Review', color: 'text-[#F59E0B]', bg: 'bg-[#FEF3C7]', icon: Eye },
  APPROVED: { label: 'Approved', color: 'text-[#10B981]', bg: 'bg-[#D1FAE5]', icon: CheckCircle },
  SCHEDULED: { label: 'Scheduled', color: 'text-[#3B82F6]', bg: 'bg-[#DBEAFE]', icon: Clock },
  PUBLISHED: { label: 'Published', color: 'text-[#8B5CF6]', bg: 'bg-[#EDE9FE]', icon: CheckCircle },
  ARCHIVED: { label: 'Archived', color: 'text-[#9CA3AF]', bg: 'bg-[#F3F4F6]', icon: Archive },
}

type SortOption = 'newest' | 'oldest' | 'updated' | 'scheduled'

export default function ContentPage() {
  const { currentTeam } = useAppStore()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<ContentStatus | 'all'>('all')
  const [platformFilter, setPlatformFilter] = useState<string>('all')
  const [sortBy, setSortBy] = useState<SortOption>('newest')
  const [content, setContent] = useState<ContentItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchContent() {
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 500))
      setContent(mockContent)
      setLoading(false)
    }
    fetchContent()
  }, [])

  const filteredContent = useMemo(() => {
    let result = [...content]

    // Search filter
    if (search) {
      result = result.filter(item =>
        item.title.toLowerCase().includes(search.toLowerCase()) ||
        item.content?.toLowerCase().includes(search.toLowerCase())
      )
    }

    // Status filter
    if (statusFilter !== 'all') {
      result = result.filter(item => item.status === statusFilter)
    }

    // Platform filter
    if (platformFilter !== 'all') {
      result = result.filter(item => item.platforms.includes(platformFilter))
    }

    // Sort
    result.sort((a, b) => {
      switch (sortBy) {
        case 'newest':
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        case 'oldest':
          return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        case 'updated':
          return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
        case 'scheduled':
          if (!a.scheduledAt && !b.scheduledAt) return 0
          if (!a.scheduledAt) return 1
          if (!b.scheduledAt) return -1
          return new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime()
        default:
          return 0
      }
    })

    return result
  }, [content, search, statusFilter, platformFilter, sortBy])

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = { all: content.length }
    content.forEach(item => {
      counts[item.status] = (counts[item.status] || 0) + 1
    })
    return counts
  }, [content])

  const formatDate = (date: string | null) => {
    if (!date) return null
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    })
  }

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto px-12">
        <div className="animate-pulse space-y-6 py-12">
          <div className="h-8 w-32 bg-[#E5E5E7] rounded" />
          <div className="h-12 w-full bg-[#E5E5E7] rounded" />
          <div className="h-64 w-full bg-[#E5E5E7] rounded" />
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
            <h1 className="text-[20px] font-medium text-[#1C1C1E]">Content</h1>
            <p className="text-[14px] text-[#6C6C70] mt-1">
              {filteredContent.length} pieces of content
            </p>
          </div>

          <Link
            href={`/${currentTeam?.slug}/content/new`}
            className="flex items-center gap-2 px-4 py-2 bg-[#1C1C1E] text-white text-[14px] font-medium rounded-[6px] hover:bg-[#2C2C2E] transition-colors"
          >
            <Plus className="w-4 h-4" />
            New post
          </Link>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3 mb-6">
          {/* Search */}
          <div className="relative flex-1 min-w-[200px] max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8E8E93]" />
            <input
              type="text"
              placeholder="Search content..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-[#F5F5F7] rounded-[6px] text-[14px] text-[#1C1C1E] placeholder:text-[#8E8E93] focus:outline-none focus:ring-2 focus:ring-[#007AFF]"
            />
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-1 p-1 bg-[#F5F5F7] rounded-[6px]">
            {Object.entries(STATUS_CONFIG).map(([status, config]) => (
              <button
                key={status}
                onClick={() => setStatusFilter(status as ContentStatus | 'all')}
                className={cn(
                  'px-3 py-1.5 rounded-[4px] text-[13px] font-medium transition-all',
                  statusFilter === status
                    ? 'bg-white text-[#1C1C1E] shadow-sm'
                    : 'text-[#6C6C70] hover:text-[#1C1C1E]'
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
              <button className="flex items-center gap-2 px-3 py-2 bg-[#F5F5F7] rounded-[6px] text-[13px] font-medium text-[#6C6C70] hover:bg-[#E5E5E7] transition-colors">
                <Filter className="w-4 h-4" />
                Platform
                {platformFilter !== 'all' && (
                  <span className="w-2 h-2 bg-[#007AFF] rounded-full" />
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
              <button className="flex items-center gap-2 px-3 py-2 bg-[#F5F5F7] rounded-[6px] text-[13px] font-medium text-[#6C6C70] hover:bg-[#E5E5E7] transition-colors">
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
            <FileText className="w-12 h-12 mx-auto text-[#E5E5E7] mb-4" />
            <p className="text-[#6C6C70]">
              {search || statusFilter !== 'all' || platformFilter !== 'all'
                ? 'No content matches your filters'
                : 'No content yet'}
            </p>
            <Link
              href={`/${currentTeam?.slug}/content/new`}
              className="inline-flex items-center gap-2 mt-4 text-[#007AFF] hover:underline text-[14px]"
            >
              Create your first post
            </Link>
          </div>
        ) : (
          <div className="border border-[#E5E5E7] rounded-[8px] overflow-hidden">
            {filteredContent.map((item, index) => {
              const statusConfig = STATUS_CONFIG[item.status]
              const StatusIcon = statusConfig.icon
              const isOverLimit = item.platforms.some(p => {
                const limit = p === 'twitter' ? 280 : p === 'linkedin' ? 3000 : 2200
                return (item.content?.length || 0) > limit
              })

              return (
                <Link
                  key={item.id}
                  href={`/${currentTeam?.slug}/content/${item.id}`}
                  className={cn(
                    'flex items-start justify-between py-4 px-4 transition-colors hover:bg-[#FAFAFA]',
                    index !== filteredContent.length - 1 && 'border-b border-[#E5E5E7]'
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
                        <h3 className="text-[14px] font-medium text-[#1C1C1E] truncate">
                          {item.title}
                        </h3>
                        {isOverLimit && (
                          <span className="text-[11px] text-[#ef4444] px-1.5 py-0.5 bg-[#FEF2F2] rounded">
                            Over limit
                          </span>
                        )}
                      </div>

                      {item.content && (
                        <p className="text-[13px] text-[#6C6C70] line-clamp-1 mb-2">
                          {item.content}
                        </p>
                      )}

                      <div className="flex items-center gap-3 text-[12px] text-[#8E8E93]">
                        {/* Created date */}
                        <span>Created {formatDate(item.createdAt)}</span>

                        {/* Scheduled date */}
                        {item.scheduledAt && (
                          <>
                            <span>·</span>
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              Scheduled for {formatDate(item.scheduledAt)}
                            </span>
                          </>
                        )}

                        {/* Published date */}
                        {item.publishedAt && (
                          <>
                            <span>·</span>
                            <span className="flex items-center gap-1 text-[#8B5CF6]">
                              <CheckCircle className="w-3 h-3" />
                              Published {formatDate(item.publishedAt)}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 flex-shrink-0 ml-4">
                    {/* Platforms */}
                    <div className="flex gap-1">
                      {item.platforms.map((p) => (
                        <span
                          key={p}
                          className="text-[13px] w-6 h-6 flex items-center justify-center bg-[#F5F5F7] rounded"
                          title={platformConfig[p].name}
                        >
                          {platformConfig[p].icon}
                        </span>
                      ))}
                    </div>

                    {/* Actions */}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild onClick={(e) => e.preventDefault()}>
                        <button className="p-1.5 rounded hover:bg-[#F5F5F7] transition-colors">
                          <MoreHorizontal className="w-4 h-4 text-[#8E8E93]" />
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
                        <DropdownMenuItem className="text-[#ef4444]">
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
          <div className="mt-6 flex items-center gap-6 text-[12px] text-[#8E8E93]">
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