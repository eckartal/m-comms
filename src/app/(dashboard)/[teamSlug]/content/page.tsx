'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Plus,
  Search,
  Filter,
  MoreHorizontal,
  FileText,
  Edit,
  Trash2,
  Copy,
  Calendar,
} from 'lucide-react'
import { useTeamStore } from '@/stores'

// Mock data
const mockContent = [
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

const statusColors: Record<string, string> = {
  DRAFT: 'bg-gray-100 text-gray-700 border-gray-200',
  IN_REVIEW: 'bg-yellow-50 text-yellow-700 border-yellow-200',
  APPROVED: 'bg-blue-50 text-blue-700 border-blue-200',
  SCHEDULED: 'bg-orange-50 text-orange-700 border-orange-200',
  PUBLISHED: 'bg-green-50 text-green-700 border-green-200',
  ARCHIVED: 'bg-gray-100 text-gray-500 border-gray-200',
}

const platformIcons: Record<string, { icon: string; color: string }> = {
  twitter: { icon: '𝕏', color: 'text-black' },
  linkedin: { icon: 'in', color: 'text-blue-700' },
  instagram: { icon: '📷', color: '' },
  blog: { icon: '📝', color: '' },
}

export default function ContentPage() {
  const currentTeam = useTeamStore((state) => state.currentTeam)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')

  const filteredContent = mockContent.filter((item) => {
    const matchesSearch = item.title.toLowerCase().includes(search.toLowerCase())
    const matchesStatus = statusFilter === 'all' || item.status === statusFilter
    return matchesSearch && matchesStatus
  })

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold">Content</h1>
          <p className="text-muted-foreground">
            Manage and organize your content library
          </p>
        </div>
        <Button asChild>
          <Link href={`/${currentTeam?.slug}/content/new`}>
            <Plus className="mr-2 h-4 w-4" />
            New Content
          </Link>
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search content..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px]">
            <Filter className="mr-2 h-4 w-4" />
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="DRAFT">Draft</SelectItem>
            <SelectItem value="IN_REVIEW">In Review</SelectItem>
            <SelectItem value="APPROVED">Approved</SelectItem>
            <SelectItem value="SCHEDULED">Scheduled</SelectItem>
            <SelectItem value="PUBLISHED">Published</SelectItem>
            <SelectItem value="ARCHIVED">Archived</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Content List */}
      <div className="grid gap-4">
        {filteredContent.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <FileText className="h-12 w-12 text-muted-foreground" />
              <h3 className="mt-4 text-lg font-semibold">No content found</h3>
              <p className="text-muted-foreground">
                {search ? 'Try adjusting your search' : 'Create your first piece of content'}
              </p>
              <Button className="mt-4" asChild>
                <Link href={`/${currentTeam?.slug}/content/new`}>
                  <Plus className="mr-2 h-4 w-4" />
                  Create Content
                </Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          filteredContent.map((content) => (
            <Card key={content.id} className="transition-shadow hover:shadow-md">
              <CardContent className="flex items-center justify-between p-4">
                <div className="flex items-center gap-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                    <FileText className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-medium">{content.title}</h3>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge
                        variant="outline"
                        className={statusColors[content.status]}
                      >
                        {content.status.replace(/_/g, ' ')}
                      </Badge>
                      <div className="flex items-center gap-1">
                        {content.platforms.map((p) => (
                          <span
                            key={p}
                            className={`text-xs ${platformIcons[p].color}`}
                          >
                            {platformIcons[p].icon}
                          </span>
                        ))}
                      </div>
                      <span className="text-xs text-muted-foreground">
                        Created {new Date(content.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {content.scheduledAt && (
                    <div className="flex items-center gap-1 text-sm text-muted-foreground mr-2">
                      <Calendar className="h-4 w-4" />
                      {new Date(content.scheduledAt).toLocaleDateString()}
                    </div>
                  )}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem asChild>
                        <Link href={`/${currentTeam?.slug}/content/${content.id}`}>
                          <Edit className="mr-2 h-4 w-4" />
                          Edit
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem>
                        <Copy className="mr-2 h-4 w-4" />
                        Duplicate
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem className="text-destructive">
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  )
}