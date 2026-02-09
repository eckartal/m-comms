'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  Plus,
  FileText,
  Calendar,
  TrendingUp,
  ChevronRight,
} from 'lucide-react'
import { useAppStore } from '@/stores'

// Mock data
const stats = {
  totalContent: 24,
  published: 18,
  scheduled: 4,
  engagement: '4.2%',
}

const recentContent = [
  {
    id: '1',
    title: 'Product Launch Announcement',
    status: 'SCHEDULED' as const,
    scheduledAt: '2025-02-15T10:00:00Z',
    platforms: ['twitter', 'linkedin'],
  },
  {
    id: '2',
    title: 'Weekly Newsletter #45',
    status: 'IN_REVIEW' as const,
    scheduledAt: null,
    platforms: ['blog'],
  },
  {
    id: '3',
    title: 'Customer Success Story',
    status: 'DRAFT' as const,
    scheduledAt: null,
    platforms: ['linkedin'],
  },
]

const upcomingSchedule = [
  { date: '2025-02-10', count: 3 },
  { date: '2025-02-11', count: 2 },
  { date: '2025-02-12', count: 5 },
  { date: '2025-02-13', count: 1 },
  { date: '2025-02-14', count: 4 },
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
  const [selectedPeriod, setSelectedPeriod] = useState<'week' | 'month'>('week')

  // Initialize mock data for dev mode
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
    <div className="max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-semibold text-[#37352f]">
            {currentTeam?.name || 'Dashboard'}
          </h1>
          <p className="text-[#9ca3af] mt-1">
            Here&apos;s what&apos;s happening with your content.
          </p>
        </div>
        <Link
          href={`/${currentTeam?.slug}/content/new`}
          className="inline-flex items-center gap-2 px-4 py-2 bg-[#2383e2] text-white rounded-lg hover:bg-[#1a6fb8] transition-colors"
        >
          <Plus className="w-4 h-4" />
          New Content
        </Link>
      </div>

      {/* Stats - Typography based, no cards */}
      <div className="flex gap-12 mb-12">
        <div>
          <p className="text-sm text-[#9ca3af]">Total Content</p>
          <p className="text-2xl font-semibold text-[#37352f]">{stats.totalContent}</p>
        </div>
        <div>
          <p className="text-sm text-[#9ca3af]">Published</p>
          <p className="text-2xl font-semibold text-[#37352f]">{stats.published}</p>
        </div>
        <div>
          <p className="text-sm text-[#9ca3af]">Scheduled</p>
          <p className="text-2xl font-semibold text-[#37352f]">{stats.scheduled}</p>
        </div>
        <div>
          <p className="text-sm text-[#9ca3af]">Engagement</p>
          <p className="text-2xl font-semibold text-[#37352f]">{stats.engagement}</p>
        </div>
      </div>

      {/* Two column layout - no borders, just sections */}
      <div className="grid grid-cols-3 gap-12">
        {/* Recent Content - 2 cols */}
        <div className="col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-[#37352f]">Recent Content</h2>
            <Link
              href={`/${currentTeam?.slug}/content`}
              className="text-sm text-[#2383e2] hover:underline flex items-center gap-1"
            >
              View all
              <ChevronRight className="w-4 h-4" />
            </Link>
          </div>

          <div className="space-y-1">
            {recentContent.map((content) => (
              <Link
                key={content.id}
                href={`/${currentTeam?.slug}/content/${content.id}`}
                className="flex items-center justify-between py-3 px-2 -mx-2 rounded hover:bg-[#f7f7f5] group"
              >
                <div className="flex items-center gap-3">
                  <FileText className="w-5 h-5 text-[#9ca3af]" />
                  <span className="text-[#37352f] group-hover:text-[#2383e2]">
                    {content.title}
                  </span>
                </div>
                <div className="flex items-center gap-3 text-sm text-[#9ca3af]">
                  <span className="flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#6b7280]" />
                    {statusLabels[content.status]}
                  </span>
                  <div className="flex gap-1">
                    {content.platforms.map((p) => (
                      <span key={p} className="text-xs">{platformIcons[p]}</span>
                    ))}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* This Week - 1 col */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-[#37352f]">This Week</h2>
            <Link
              href={`/${currentTeam?.slug}/calendar`}
              className="text-sm text-[#2383e2] hover:underline flex items-center gap-1"
            >
              Calendar
              <ChevronRight className="w-4 h-4" />
            </Link>
          </div>

          <div className="flex gap-2 mb-4">
            {upcomingSchedule.map((day, i) => (
              <div key={day.date} className="flex-1 text-center">
                <div
                  className={`h-10 w-10 mx-auto flex items-center justify-center rounded-lg text-sm mb-1 ${
                    day.count > 4
                      ? 'bg-[#2383e2] text-white'
                      : 'bg-[#f7f7f5] text-[#37352f]'
                  }`}
                >
                  {day.count}
                </div>
                <span className="text-xs text-[#9ca3af]">
                  {new Date(day.date).toLocaleDateString('en-US', { weekday: 'short' })}
                </span>
              </div>
            ))}
          </div>

          <p className="text-sm text-[#9ca3af]">
            {upcomingSchedule.reduce((acc, d) => acc + d.count, 0)} posts scheduled
          </p>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="mt-12 pt-8 border-t border-[#e5e5e5]">
        <h2 className="text-lg font-semibold text-[#37352f] mb-4">Quick Actions</h2>
        <div className="flex gap-4">
          <Link
            href={`/${currentTeam?.slug}/content/new`}
            className="flex items-center gap-2 px-4 py-2 bg-[#f7f7f5] rounded-lg hover:bg-[#efece8] transition-colors text-[#37352f]"
          >
            <FileText className="w-4 h-4" />
            Create Content
          </Link>
          <Link
            href={`/${currentTeam?.slug}/calendar`}
            className="flex items-center gap-2 px-4 py-2 bg-[#f7f7f5] rounded-lg hover:bg-[#efece8] transition-colors text-[#37352f]"
          >
            <Calendar className="w-4 h-4" />
            View Schedule
          </Link>
        </div>
      </div>
    </div>
  )
}