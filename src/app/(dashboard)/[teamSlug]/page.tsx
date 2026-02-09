'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  Plus,
  FileText,
  Calendar,
  TrendingUp,
  ChevronRight,
  CheckCircle2,
  Clock,
  PenLine,
  Eye,
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

const statusConfig: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  DRAFT: { label: 'Draft', color: 'bg-gray-400', icon: <PenLine className="w-3 h-3" /> },
  IN_REVIEW: { label: 'In Review', color: 'bg-amber-500', icon: <Eye className="w-3 h-3" /> },
  APPROVED: { label: 'Approved', color: 'bg-blue-500', icon: <CheckCircle2 className="w-3 h-3" /> },
  SCHEDULED: { label: 'Scheduled', color: 'bg-blue-500', icon: <Clock className="w-3 h-3" /> },
  PUBLISHED: { label: 'Published', color: 'bg-green-500', icon: <CheckCircle2 className="w-3 h-3" /> },
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
    <div className="max-w-6xl mx-auto">
      {/* Header - 24px max */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">
            {currentTeam?.name || 'Dashboard'}
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Here&apos;s what&apos;s happening with your content.
          </p>
        </div>
        <Link
          href={`/${currentTeam?.slug}/content/new`}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors font-medium text-sm"
        >
          <Plus className="w-4 h-4" />
          New Content
        </Link>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-4 gap-4 mb-10">
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <p className="text-sm text-gray-500 font-normal">Total Content</p>
          <p className="text-3xl font-semibold text-gray-900 mt-1">{stats.totalContent}</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <p className="text-sm text-gray-500 font-normal">Published</p>
          <p className="text-3xl font-semibold text-gray-900 mt-1">{stats.published}</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <p className="text-sm text-gray-500 font-normal">Scheduled</p>
          <p className="text-3xl font-semibold text-gray-900 mt-1">{stats.scheduled}</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <p className="text-sm text-gray-500 font-normal">Engagement</p>
          <p className="text-3xl font-semibold text-gray-900 mt-1">{stats.engagement}</p>
        </div>
      </div>

      {/* Two column layout */}
      <div className="grid grid-cols-3 gap-8">
        {/* Recent Content - 2 cols */}
        <div className="col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-medium text-gray-900">Recent Content</h2>
            <Link
              href={`/${currentTeam?.slug}/content`}
              className="text-sm text-blue-500 hover:text-blue-600 flex items-center gap-1 font-medium"
            >
              View all
              <ChevronRight className="w-4 h-4" />
            </Link>
          </div>

          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            {recentContent.map((content, index) => (
              <Link
                key={content.id}
                href={`/${currentTeam?.slug}/content/${content.id}`}
                className={`flex items-center justify-between py-4 px-4 hover:bg-gray-50 transition-colors ${
                  index !== recentContent.length - 1 ? 'border-b border-gray-100' : ''
                }`}
              >
                <div className="flex items-center gap-3">
                  <FileText className="w-5 h-5 text-gray-400" />
                  <span className="text-sm font-medium text-gray-900">
                    {content.title}
                  </span>
                </div>
                <div className="flex items-center gap-4">
                  <div className="flex gap-1">
                    {content.platforms.map((p) => (
                      <span key={p} className="text-xs bg-gray-100 px-1.5 py-0.5 rounded text-gray-600">
                        {platformIcons[p]}
                      </span>
                    ))}
                  </div>
                  <span className="flex items-center gap-1.5 text-sm text-gray-500">
                    <span className={`w-1.5 h-1.5 rounded-full ${statusConfig[content.status].color}`} />
                    {statusConfig[content.status].label}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* This Week - 1 col */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-medium text-gray-900">This Week</h2>
            <Link
              href={`/${currentTeam?.slug}/calendar`}
              className="text-sm text-blue-500 hover:text-blue-600 flex items-center gap-1 font-medium"
            >
              Calendar
              <ChevronRight className="w-4 h-4" />
            </Link>
          </div>

          <div className="bg-white border border-gray-200 rounded-xl p-4">
            <div className="flex gap-2 mb-4">
              {upcomingSchedule.map((day, i) => {
                const isToday = day.date === '2025-02-12'
                return (
                  <div key={day.date} className="flex-1 text-center">
                    <div
                      className={`h-9 w-9 mx-auto flex items-center justify-center rounded-lg text-sm mb-1.5 transition-colors ${
                        isToday
                          ? 'bg-blue-500 text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {day.count}
                    </div>
                    <span className="text-xs text-gray-500">
                      {new Date(day.date).toLocaleDateString('en-US', { weekday: 'short' })}
                    </span>
                  </div>
                )
              })}
            </div>

            <p className="text-sm text-gray-500 pt-2 border-t border-gray-100">
              {upcomingSchedule.reduce((acc, d) => acc + d.count, 0)} posts scheduled
            </p>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="mt-10 pt-8 border-t border-gray-200">
        <h2 className="text-lg font-medium text-gray-900 mb-4">Quick Actions</h2>
        <div className="flex gap-3">
          <Link
            href={`/${currentTeam?.slug}/content/new`}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors text-sm font-medium text-gray-700"
          >
            <FileText className="w-4 h-4" />
            Create Content
          </Link>
          <Link
            href={`/${currentTeam?.slug}/calendar`}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors text-sm font-medium text-gray-700"
          >
            <Calendar className="w-4 h-4" />
            View Schedule
          </Link>
        </div>
      </div>
    </div>
  )
}