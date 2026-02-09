'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  Plus,
  Search,
  ChevronDown,
  FileText,
  MoreHorizontal,
  Edit,
  Trash2,
  Copy,
  Calendar,
} from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useAppStore } from '@/stores'

type ContentItem = {
  id: string
  title: string
  status: 'DRAFT' | 'IN_REVIEW' | 'APPROVED' | 'SCHEDULED' | 'PUBLISHED' | 'ARCHIVED'
  scheduledAt: string | null
  platforms: string[]
  createdAt: string
}

// Mock data
const mockContent: ContentItem[] = [
  {
    id: '1',
    title: 'Product Launch Announcement',
    status: 'SCHEDULED' as const,
    scheduledAt: '2025-02-15T10:00:00Z',
    platforms: ['twitter', 'linkedin'],
    createdAt: '2025-02-01T10:00:00Z',
  },
  {
    id: '2',
    title: 'Weekly Newsletter #45 - Q1 Updates',
    status: 'IN_REVIEW' as const,
    scheduledAt: null,
    platforms: ['blog'],
    createdAt: '2025-02-03T14:00:00Z',
  },
  {
    id: '3',
    title: 'Customer Success Story - Acme Corp',
    status: 'DRAFT' as const,
    scheduledAt: null,
    platforms: ['linkedin', 'blog'],
    createdAt: '2025-02-05T09:00:00Z',
  },
  {
    id: '4',
    title: 'Behind the Scenes - Engineering',
    status: 'PUBLISHED' as const,
    scheduledAt: '2025-02-08T15:00:00Z',
    platforms: ['instagram'],
    createdAt: '2025-02-02T11:00:00Z',
  },
  {
    id: '5',
    title: 'Industry Insights - AI Trends 2025',
    status: 'APPROVED' as const,
    scheduledAt: null,
    platforms: ['twitter', 'linkedin'],
    createdAt: '2025-02-04T16:00:00Z',
  },
]

const platformIcons: Record<string, string> = {
  twitter: '𝕏',
  linkedin: 'in',
  instagram: '📷',
  blog: '📝',
}

const statusLabels: Record<string, string> = {
  DRAFT: 'Draft',
  IN_REVIEW: 'In Review',
  APPROVED: 'Approved',
  SCHEDULED: 'Scheduled',
  PUBLISHED: 'Published',
  ARCHIVED: 'Archived',
}

const platforms = [
  { id: 'twitter', name: 'Twitter/X', icon: '𝕏' },
  { id: 'linkedin', name: 'LinkedIn', icon: 'in' },
  { id: 'instagram', name: 'Instagram', icon: '📷' },
  { id: 'blog', name: 'Blog', icon: '📝' },
]

export default function ContentPage() {
  const { currentTeam } = useAppStore()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [content, setContent] = useState<ContentItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchContent() {
      if (!currentTeam?.id) return
      try {
        const res = await fetch(`/api/content?teamId=${currentTeam.id}`)
        if (res.ok) {
          const data = await res.json()
          setContent(data.data || [])
        } else {
          setContent(mockContent)
        }
      } catch (error) {
        console.error('Failed to fetch content:', error)
        setContent(mockContent)
      } finally {
        setLoading(false)
      }
    }
    fetchContent()
  }, [currentTeam?.id])

  const filteredContent = content.filter((item) => {
    const matchesSearch = item.title?.toLowerCase().includes(search.toLowerCase())
    const matchesStatus = statusFilter === 'all' || item.status === statusFilter
    return matchesSearch && matchesStatus
  })

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto">
        <div className="animate-pulse space-y-6">
          <div className="h-8 w-32 bg-[#e5e5e5] rounded" />
          <div className="h-12 w-full bg-[#e5e5e5] rounded" />
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-semibold text-[#37352f]">Content</h1>
          <p className="text-[#9ca3af] mt-1">
            {filteredContent.length} pieces of content
          </p>
        </div>

        {/* Platform Quick Select + New Content */}
        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-2 px-4 py-2 bg-[#f7f7f5] hover:bg-[#efece8] rounded-lg transition-colors text-[#37352f] text-sm font-medium">
                <Plus className="w-4 h-4" />
                New Content
                <ChevronDown className="w-4 h-4 text-[#9ca3af]" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuItem asChild>
                <Link href={`/${currentTeam?.slug}/content/new`}>
                  <span className="flex items-center gap-2">
                    <span className="text-lg">📝</span>
                    <div>
                      <p className="font-medium">Blank Content</p>
                      <p className="text-xs text-[#9ca3af]">Start from scratch</p>
                    </div>
                  </span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <div className="px-2 py-1.5">
                <p className="text-xs font-medium text-[#9ca3af] uppercase tracking-wide mb-2">
                  Quick Create For
                </p>
                {platforms.map((platform) => (
                  <DropdownMenuItem key={platform.id} asChild>
                    <Link href={`/${currentTeam?.slug}/content/new?platform=${platform.id}`}>
                      <span className="flex items-center gap-2">
                        <span>{platform.icon}</span>
                        <span>{platform.name}</span>
                      </span>
                    </Link>
                  </DropdownMenuItem>
                ))}
              </div>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4 mb-6">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9ca3af]" />
          <input
            type="text"
            placeholder="Search content..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-[#f7f7f5] rounded-lg border-none focus:outline-none focus:ring-2 focus:ring-[#2383e2] text-[#37352f] placeholder:text-[#c4c4c4]"
          />
        </div>

        <div className="flex items-center gap-1">
          {['all', 'DRAFT', 'IN_REVIEW', 'SCHEDULED', 'PUBLISHED'].map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
                statusFilter === status
                  ? 'bg-[#37352f] text-white'
                  : 'text-[#6b7280] hover:bg-[#f7f7f5]'
              }`}
            >
              {status === 'all' ? 'All' : statusLabels[status]}
            </button>
          ))}
        </div>
      </div>

      {/* Content List */}
      {filteredContent.length === 0 ? (
        <div className="text-center py-16">
          <FileText className="w-12 h-12 mx-auto text-[#e5e5e5] mb-4" />
          <p className="text-[#9ca3af]">
            {search ? 'No content matches your search' : 'No content yet'}
          </p>
          <Link
            href={`/${currentTeam?.slug}/content/new`}
            className="inline-flex items-center gap-2 mt-4 text-[#2383e2] hover:underline"
          >
            Create your first piece
          </Link>
        </div>
      ) : (
        <div className="space-y-1">
          {filteredContent.map((item) => (
            <Link
              key={item.id}
              href={`/${currentTeam?.slug}/content/${item.id}`}
              className="flex items-center justify-between py-3 px-2 -mx-2 rounded hover:bg-[#f7f7f5] group"
            >
              <div className="flex items-center gap-3">
                <FileText className="w-5 h-5 text-[#9ca3af]" />
                <div>
                  <p className="text-[#37352f] group-hover:text-[#2383e2]">
                    {item.title}
                  </p>
                  <div className="flex items-center gap-2 text-xs text-[#9ca3af]">
                    <span className="flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#6b7280]" />
                      {statusLabels[item.status]}
                    </span>
                    <span>·</span>
                    <span>
                      Created {new Date(item.createdAt).toLocaleDateString()}
                    </span>
                    {item.scheduledAt && (
                      <>
                        <span>·</span>
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {new Date(item.scheduledAt).toLocaleDateString()}
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="flex gap-1">
                  {item.platforms.map((p) => (
                    <span key={p} className="text-xs">{platformIcons[p]}</span>
                  ))}
                </div>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild onClick={(e) => e.preventDefault()}>
                    <button className="p-1 rounded hover:bg-[#e5e5e5] opacity-0 group-hover:opacity-100 transition-opacity">
                      <MoreHorizontal className="w-4 h-4 text-[#6b7280]" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
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
                    <DropdownMenuItem className="text-red-600">
                      <Trash2 className="w-4 h-4 mr-2" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}