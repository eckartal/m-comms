'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Plus, FileText, Calendar, ChevronRight, FileStack } from 'lucide-react'
import { useAppStore } from '@/stores'

// Mock data
const stats = {
  totalContent: 24,
  published: 18,
  scheduled: 4,
  engagement: '4.2%',
}

const recentContent = [
  { id: '1', title: 'Product Launch Announcement', status: 'SCHEDULED' as const, scheduledAt: '2025-02-15T10:00:00Z', platforms: ['twitter', 'linkedin'] },
  { id: '2', title: 'Weekly Newsletter #45', status: 'IN_REVIEW' as const, scheduledAt: null, platforms: ['blog'] },
  { id: '3', title: 'Customer Success Story', status: 'DRAFT' as const, scheduledAt: null, platforms: ['linkedin'] },
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

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-4xl mx-auto px-12 py-12">
        {/* Header */}
        <div className="mb-12">
          <h1 className="text-[20px] font-medium text-[#1C1C1E] mb-1">
            {currentTeam?.name || 'Dashboard'}
          </h1>
          <p className="text-[14px] text-[#6C6C70]">
            Here&apos;s what&apos;s happening with your content.
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-4 gap-4 mb-12">
          <div className="border border-[#E5E5E7] rounded-[8px] p-4">
            <p className="text-[13px] text-[#8E8E93]">Total Content</p>
            <p className="text-[28px] font-medium text-[#1C1C1E] mt-1">{stats.totalContent}</p>
          </div>
          <div className="border border-[#E5E5E7] rounded-[8px] p-4">
            <p className="text-[13px] text-[#8E8E93]">Published</p>
            <p className="text-[28px] font-medium text-[#1C1C1E] mt-1">{stats.published}</p>
          </div>
          <div className="border border-[#E5E5E7] rounded-[8px] p-4">
            <p className="text-[13px] text-[#8E8E93]">Scheduled</p>
            <p className="text-[28px] font-medium text-[#1C1C1E] mt-1">{stats.scheduled}</p>
          </div>
          <div className="border border-[#E5E5E7] rounded-[8px] p-4">
            <p className="text-[13px] text-[#8E8E93]">Engagement</p>
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
                className="text-[14px] text-[#6C6C70] hover:text-[#1C1C1E] flex items-center gap-1"
              >
                View all
                <ChevronRight className="w-4 h-4" />
              </Link>
            </div>

            <div className="border border-[#E5E5E7] rounded-[8px] overflow-hidden">
              {recentContent.map((content, index) => {
                const isSelected = selectedId === content.id
                return (
                  <Link
                    key={content.id}
                    href={`/${currentTeam?.slug}/content/${content.id}`}
                    onClick={() => setSelectedId(content.id)}
                    className={`flex items-center justify-between py-3 px-4 transition-colors ${
                      index !== recentContent.length - 1 ? 'border-b border-[#E5E5E7]' : ''
                    } ${isSelected ? 'border-l-2 border-[#007AFF] pl-[14px]' : ''}`}
                  >
                    <div className="flex items-center gap-3">
                      <FileStack className="w-5 h-5 text-[#8E8E93]" />
                      <span className="text-[14px] text-[#1C1C1E]">{content.title}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="flex gap-1">
                        {content.platforms.map((p) => (
                          <span key={p} className="text-xs bg-[#FAFAFA] px-1.5 py-0.5 rounded text-[#6C6C70]">
                            {platformIcons[p]}
                          </span>
                        ))}
                      </div>
                      <span className="text-[13px] text-[#8E8E93]">{statusLabels[content.status]}</span>
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
                className="flex items-center gap-2 px-3 py-2.5 border border-[#E5E5E7] rounded-[6px] hover:bg-[#FAFAFA] transition-colors text-[14px] text-[#1C1C1E]"
              >
                <Plus className="w-4 h-4 text-[#6C6C70]" />
                New post
              </Link>
              <Link
                href={`/${currentTeam?.slug}/calendar`}
                className="flex items-center gap-2 px-3 py-2.5 border border-[#E5E5E7] rounded-[6px] hover:bg-[#FAFAFA] transition-colors text-[14px] text-[#1C1C1E]"
              >
                <Calendar className="w-4 h-4 text-[#6C6C70]" />
                Calendar
              </Link>
              <Link
                href={`/${currentTeam?.slug}/content`}
                className="flex items-center gap-2 px-3 py-2.5 border border-[#E5E5E7] rounded-[6px] hover:bg-[#FAFAFA] transition-colors text-[14px] text-[#1C1C1E]"
              >
                <FileText className="w-4 h-4 text-[#6C6C70]" />
                All content
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}