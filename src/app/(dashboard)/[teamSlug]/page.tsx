'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  Plus,
  FileText,
  Calendar,
  ChevronRight,
  Clock,
  Edit,
  Eye,
  CheckCircle,
  BarChart3,
  X,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAppStore } from '@/stores'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { ContentStatus } from '@/types'

const stats = [
  { label: 'total', value: '24' },
  { label: 'published', value: '18' },
  { label: 'scheduled', value: '4' },
  { label: 'engagement', value: '4.2%' },
]

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

const STATUS_CONFIG: Record<ContentStatus, { label: string; color: string; icon: typeof Edit }> = {
  DRAFT: { label: 'Draft', color: 'text-gray-500', icon: Edit },
  IN_REVIEW: { label: 'In Review', color: 'text-amber-500', icon: Eye },
  APPROVED: { label: 'Approved', color: 'text-emerald-500', icon: CheckCircle },
  SCHEDULED: { label: 'Scheduled', color: 'text-amber-500', icon: Clock },
  PUBLISHED: { label: 'Shared', color: 'text-white', icon: CheckCircle },
  ARCHIVED: { label: 'Archived', color: 'text-gray-500', icon: FileText },
}

export default function DashboardPage() {
  const { currentTeam, setCurrentTeam, setCurrentUser, onboarded, markOnboardingComplete } = useAppStore()
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [showWelcome, setShowWelcome] = useState(false)

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

  // Check if welcome banner should be shown
  useEffect(() => {
    if (currentTeam && !onboarded) {
      setShowWelcome(true)
    }
  }, [currentTeam, onboarded])

  const upcoming = [
    { title: 'Product Launch', time: 'Feb 20, 10:00 AM', color: 'bg-amber-500' },
    { title: 'Newsletter #46', time: 'Feb 22, 9:00 AM', color: 'bg-white' },
  ]

  return (
    <div className="flex-1 overflow-y-auto custom-scrollbar">
      <div className="max-w-4xl mx-auto px-4 py-4">
        {/* Header */}
        <div className="mb-4">
          <h1 className="text-sm font-medium text-foreground">
            {currentTeam?.name || 'Dashboard'}
          </h1>
          <p className="text-[11px] text-muted-foreground">
            What&apos;s happening with your content.
          </p>
        </div>

        {/* Welcome Banner - Show for first-time users */}
        {showWelcome && (
          <div className="mb-4 rounded-lg border border-[#262626] bg-[#0a0a0a] p-4">
            <div className="flex items-start gap-3">
              <div className="mt-1 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-[#f97316]/10 text-[#f97316]">
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="flex-1">
                <h3 className="text-sm font-medium text-white">Welcome to ContentHub</h3>
                <p className="mt-1 text-xs text-[#737373]">
                  Your first post is a draft called &quot;This is your draft&quot;. Edit it or create your own!
                </p>
                <button
                  onClick={() => {
                    markOnboardingComplete()
                    setShowWelcome(false)
                  }}
                  className="mt-3 text-xs font-medium text-[#f97316] hover:text-white transition-colors"
                >
                  Got it, start creating
                </button>
              </div>
              <button
                onClick={() => {
                  markOnboardingComplete()
                  setShowWelcome(false)
                }}
                className="mt-1 text-[#737373] hover:text-white transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-4 gap-px bg-gray-900 mb-4">
          {stats.map((stat) => (
            <div key={stat.label} className="bg-black p-3">
              <p className="text-[10px] text-muted-foreground uppercase">{stat.label}</p>
              <p className="text-lg text-foreground mt-0.5">{stat.value}</p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-3 gap-4">
          {/* Recent Content */}
          <div className="col-span-2">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-xs font-medium text-foreground uppercase">Recent</h2>
              <Link href={`/${currentTeam?.slug}/content`} className="text-[10px] text-muted-foreground hover:text-foreground">
                all
              </Link>
            </div>
            <div className="border border-gray-900">
              {recentContent.map((content, index) => {
                const isSelected = selectedId === content.id
                const statusConfig = STATUS_CONFIG[content.status]

                return (
                  <Link
                    key={content.id}
                    href={`/${currentTeam?.slug}/content/${content.id}`}
                    onClick={() => setSelectedId(content.id)}
                    className={cn(
                      'flex items-center gap-2 py-2 px-3 border-b border-gray-900 last:border-0 transition-colors',
                      isSelected ? 'bg-gray-900' : 'hover:bg-black'
                    )}
                  >
                    <div className={cn('w-6 h-6 flex items-center justify-center text-xs', statusConfig.color)}>
                      <statusConfig.icon className="w-3.5 h-3.5" />
                    </div>
                    <span className="text-xs text-foreground truncate flex-1">{content.title}</span>
                    <div className="flex items-center gap-2">
                      <div className="flex gap-0.5">
                        {content.platforms.map((p) => (
                          <span key={p} className="text-[9px] bg-gray-900 px-1 py-0.5 text-muted-foreground">
                            {platformIcons[p]}
                          </span>
                        ))}
                      </div>
                      <Badge variant={content.status === 'PUBLISHED' ? 'default' : 'secondary'}>
                        <span className={cn('text-[9px]', statusConfig.color)}>
                          {statusConfig.label}
                        </span>
                      </Badge>
                    </div>
                  </Link>
                )
              })}
            </div>
          </div>

          {/* Quick Actions & Upcoming */}
          <div className="space-y-4">
            <div>
              <h2 className="text-xs font-medium text-foreground uppercase mb-1">Quick</h2>
              <div className="border border-gray-900">
                {[
                  { href: `/${currentTeam?.slug}/content/new`, icon: Plus, label: 'New' },
                  { href: `/${currentTeam?.slug}/calendar`, icon: Calendar, label: 'Calendar' },
                  { href: `/${currentTeam?.slug}/content`, icon: FileText, label: 'All content' },
                  { href: `/${currentTeam?.slug}/analytics`, icon: BarChart3, label: 'Analytics' },
                ].map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="flex items-center gap-2 py-1.5 px-3 border-b border-gray-900 last:border-0 hover:bg-gray-900 transition-colors"
                  >
                    <item.icon className="w-3.5 h-3.5 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">{item.label}</span>
                  </Link>
                ))}
              </div>
            </div>

            <div>
              <h2 className="text-xs font-medium text-foreground uppercase mb-1">Upcoming</h2>
              <div className="space-y-1.5">
                {upcoming.map((item, i) => (
                  <div key={i} className="flex items-center gap-2 py-1">
                    <div className={cn('w-1.5 h-1.5', item.color)} />
                    <div>
                      <p className="text-xs text-foreground">{item.title}</p>
                      <p className="text-[10px] text-muted-foreground">{item.time}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
