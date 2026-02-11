'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  Plus,
  FileText,
  Calendar,
  ChevronRight,
  FileStack,
  CheckCircle,
  Clock,
  Edit,
  Eye,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAppStore } from '@/stores'
import { ContentStatus } from '@/types'

// Mock data
const stats = {
  totalContent: 24,
  published: 18,
  scheduled: 4,
  engagement: '4.2%',
}

const recentContent = [
  { id: '1', title: 'Product Launch Announcement', status: 'SCHEDULED' as ContentStatus, scheduledAt: '2025-02-15T10:00:00Z', platforms: ['twitter', 'linkedin'] },
  { id: '2', title: 'Weekly Newsletter #45', status: 'IN_REVIEW' as ContentStatus, scheduledAt: null, platforms: ['blog'] },
  { id: '3', title: 'Customer Success Story', status: 'DRAFT' as ContentStatus, scheduledAt: null, platforms: ['linkedin'] },
]

const platformIcons: Record<string, string> = {
  twitter: '𝕏',
  linkedin: 'in',
  instagram: '📷',
  blog: '📝',
}

const STATUS_CONFIG: Record<ContentStatus, { label: string; color: string; bg: string; icon: typeof Edit }> = {
  DRAFT: { label: 'Draft', color: 'text-[#6B7280]', bg: 'bg-[#F3F4F6]', icon: Edit },
  IN_REVIEW: { label: 'In Review', color: 'text-[#F59E0B]', bg: 'bg-[#FEF3C7]', icon: Eye },
  APPROVED: { label: 'Approved', color: 'text-[#10B981]', bg: 'bg-[#D1FAE5]', icon: CheckCircle },
  SCHEDULED: { label: 'Scheduled', color: 'text-[#3B82F6]', bg: 'bg-[#DBEAFE]', icon: Clock },
  PUBLISHED: { label: 'Published', color: 'text-[#8B5CF6]', bg: 'bg-[#EDE9FE]', icon: CheckCircle },
  ARCHIVED: { label: 'Archived', color: 'text-[#9CA3AF]', bg: 'bg-[#F3F4F6]', icon: FileText },
}

export default function DashboardPage() {
  const { currentTeam, setCurrentTeam, setCurrentUser } = useAppStore()
  const [selectedId, setSelectedId] = useState<string | null>(null)

  useEffect(() => {
    if (!currentTeam) {
      setCurrentTeam({
        id: '1',
        name: 'Demo Team',
        slug: 'demo',
        logo: null,
        settings: {},
        created_at: new Date().toISOString(),
      })
      setCurrentUser({
        id: '1',
        email: 'demo@example.com',
        name: 'Demo User',
        avatar_url: null,
        created_at: new Date().toISOString(),
      })
    }
  }, [currentTeam, setCurrentTeam, setCurrentUser])

  const formatDate = (date: string | null) => {
    if (!date) return null
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    })
  }

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-4xl mx-auto px-12 py-12">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-[20px] font-medium text-[#1C1C1E] mb-1">
            {currentTeam?.name || 'Dashboard'}
          </h1>
          <p className="text-[14px] text-[#6C6C70]">
            Here&apos;s what&apos;s happening with your content.
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-4 gap-4 mb-8">
          <div className="border border-[#E5E5E7] rounded-[8px] p-4 hover:border-[#1C1C1E] transition-colors cursor-pointer group">
            <p className="text-[13px] text-[#8E8E93] group-hover:text-[#6C6C70] transition-colors">Total Content</p>
            <p className="text-[28px] font-medium text-[#1C1C1E] mt-1">{stats.totalContent}</p>
          </div>
          <div className="border border-[#E5E5E7] rounded-[8px] p-4 hover:border-[#8B5CF6] transition-colors cursor-pointer group">
            <p className="text-[13px] text-[#8E8E93] group-hover:text-[#8B5CF6] transition-colors">Published</p>
            <p className="text-[28px] font-medium text-[#1C1C1E] mt-1">{stats.published}</p>
          </div>
          <div className="border border-[#E5E5E7] rounded-[8px] p-4 hover:border-[#3B82F6] transition-colors cursor-pointer group">
            <p className="text-[13px] text-[#8E8E93] group-hover:text-[#3B82F6] transition-colors">Scheduled</p>
            <p className="text-[28px] font-medium text-[#1C1C1E] mt-1">{stats.scheduled}</p>
          </div>
          <div className="border border-[#E5E5E7] rounded-[8px] p-4 hover:border-[#10B981] transition-colors cursor-pointer group">
            <p className="text-[13px] text-[#8E8E93] group-hover:text-[#10B981] transition-colors">Engagement</p>
            <p className="text-[28px] font-medium text-[#1C1C1E] mt-1">{stats.engagement}</p>
          </div>
        </div>

        {/* Two column layout */}
        <div className="grid grid-cols-3 gap-8">
          {/* Recent Content - 2 cols */}
          <div className="col-span-2">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-[16px] font-medium text-[#1C1C1E]">Recent Content</h2>
              <Link
                href={`/${currentTeam?.slug}/content`}
                className="text-[14px] text-[#6C6C70] hover:text-[#1C1C1E] flex items-center gap-1 transition-colors"
              >
                View all
                <ChevronRight className="w-4 h-4" />
              </Link>
            </div>

            <div className="border border-[#E5E5E7] rounded-[8px] overflow-hidden">
              {recentContent.map((content, index) => {
                const isSelected = selectedId === content.id
                const statusConfig = STATUS_CONFIG[content.status]
                const StatusIcon = statusConfig.icon

                return (
                  <Link
                    key={content.id}
                    href={`/${currentTeam?.slug}/content/${content.id}`}
                    onClick={() => setSelectedId(content.id)}
                    className={cn(
                      'flex items-center justify-between py-3 px-4 transition-colors',
                      index !== recentContent.length - 1 && 'border-b border-[#E5E5E7]',
                      isSelected ? 'bg-[#FAFAFA] border-l-2 border-[#007AFF] pl-[14px]' : 'hover:bg-[#FAFAFA]'
                    )}
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      {/* Status Icon */}
                      <div className={cn(
                        'w-8 h-8 rounded-[6px] flex items-center justify-center flex-shrink-0',
                        statusConfig.bg
                      )}>
                        <StatusIcon className={cn('w-4 h-4', statusConfig.color)} />
                      </div>

                      <span className="text-[14px] text-[#1C1C1E] truncate">{content.title}</span>
                    </div>

                    <div className="flex items-center gap-3 flex-shrink-0 ml-4">
                      {/* Platforms */}
                      <div className="flex gap-1">
                        {content.platforms.map((p) => (
                          <span key={p} className="text-xs bg-[#F5F5F7] px-1.5 py-0.5 rounded text-[#6C6C70]">
                            {platformIcons[p]}
                          </span>
                        ))}
                      </div>

                      {/* Status */}
                      <span className={cn('text-[12px] font-medium', statusConfig.color)}>
                        {statusConfig.label}
                      </span>
                    </div>
                  </Link>
                )
              })}
            </div>
          </div>

          {/* Quick Actions - 1 col */}
          <div>
            <h2 className="text-[16px] font-medium text-[#1C1C1E] mb-4">Quick Actions</h2>
            <div className="space-y-2">
              <Link
                href={`/${currentTeam?.slug}/content/new`}
                className="flex items-center gap-2 px-3 py-2.5 border border-[#E5E5E7] rounded-[6px] hover:bg-[#FAFAFA] hover:border-[#1C1C1E] transition-colors text-[14px] text-[#1C1C1E]"
              >
                <Plus className="w-4 h-4 text-[#6C6C70]" />
                New post
              </Link>
              <Link
                href={`/${currentTeam?.slug}/calendar`}
                className="flex items-center gap-2 px-3 py-2.5 border border-[#E5E5E7] rounded-[6px] hover:bg-[#FAFAFA] hover:border-[#1C1C1E] transition-colors text-[14px] text-[#1C1C1E]"
              >
                <Calendar className="w-4 h-4 text-[#6C6C70]" />
                Calendar
              </Link>
              <Link
                href={`/${currentTeam?.slug}/content`}
                className="flex items-center gap-2 px-3 py-2.5 border border-[#E5E5E7] rounded-[6px] hover:bg-[#FAFAFA] hover:border-[#1C1C1E] transition-colors text-[14px] text-[#1C1C1E]"
              >
                <FileText className="w-4 h-4 text-[#6C6C70]" />
                All content
              </Link>
            </div>

            {/* Upcoming */}
            <div className="mt-8">
              <h3 className="text-[14px] font-medium text-[#1C1C1E] mb-4">Upcoming</h3>
              <div className="space-y-3">
                <div className="flex items-center gap-3 p-3 bg-[#F5F5F7] rounded-[6px]">
                  <Clock className="w-4 h-4 text-[#3B82F6]" />
                  <div>
                    <p className="text-[13px] text-[#1C1C1E]">Product Launch</p>
                    <p className="text-[12px] text-[#8E8E93]">Feb 20, 10:00 AM</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 bg-[#F5F5F7] rounded-[6px]">
                  <CheckCircle className="w-4 h-4 text-[#8B5CF6]" />
                  <div>
                    <p className="text-[13px] text-[#1C1C1E]">Newsletter #46</p>
                    <p className="text-[12px] text-[#8E8E93]">Feb 22, 9:00 AM</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}