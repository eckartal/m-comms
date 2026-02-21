'use client'

import { useMemo, useState, useEffect } from 'react'
import Link from 'next/link'
import { Plus, FileText, Calendar, Clock, Edit, Eye, CheckCircle, BarChart3, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { persistOnboardingComplete, syncOnboardingWithStore, useAppStore, useContentStore } from '@/stores'
import { Badge } from '@/components/ui/badge'
import { DashboardContainer } from '@/components/layout/DashboardContainer'
import { ContentStatus } from '@/types'

type DashboardContent = {
  id: string
  team_id: string
  title: string
  status: ContentStatus
  scheduled_at: string | null
  updated_at: string
  platforms: Array<{ platform?: string } | string>
}

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
  PUBLISHED: { label: 'Shared', color: 'text-primary', icon: CheckCircle },
  ARCHIVED: { label: 'Archived', color: 'text-gray-500', icon: FileText },
}

function formatShortDate(value: string | null) {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return date.toLocaleString([], {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

export default function DashboardPage() {
  const { currentTeam, onboarded } = useAppStore()
  const contents = useContentStore((state) => state.contents)
  const contentLoading = useContentStore((state) => state.contentLoading)
  const contentError = useContentStore((state) => state.contentError)
  const loadedTeamId = useContentStore((state) => state.loadedTeamId)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [showWelcome, setShowWelcome] = useState(false)

  useEffect(() => {
    void syncOnboardingWithStore()
  }, [])

  useEffect(() => {
    if (currentTeam && !onboarded) {
      setShowWelcome(true)
    }
  }, [currentTeam, onboarded])

  const completeOnboarding = async () => {
    await persistOnboardingComplete()
    setShowWelcome(false)
  }

  const contentItems = useMemo(
    () =>
      currentTeam?.id
        ? (contents.filter((item) => item.team_id === currentTeam.id) as DashboardContent[])
        : [],
    [contents, currentTeam?.id]
  )
  const loading = contentLoading || (!!currentTeam?.id && loadedTeamId !== currentTeam.id)

  const stats = useMemo(() => {
    const total = contentItems.length
    const published = contentItems.filter((item) => item.status === 'PUBLISHED').length
    const scheduled = contentItems.filter((item) => item.status === 'SCHEDULED').length
    return [
      { label: 'total', value: String(total) },
      { label: 'published', value: String(published) },
      { label: 'scheduled', value: String(scheduled) },
      { label: 'engagement', value: '-' },
    ]
  }, [contentItems])

  const recentContent = useMemo(
    () =>
      [...contentItems]
        .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
        .slice(0, 3),
    [contentItems]
  )

  const upcoming = useMemo(
    () =>
      contentItems
        .filter((item) => item.status === 'SCHEDULED' && item.scheduled_at)
        .sort((a, b) => new Date(a.scheduled_at || 0).getTime() - new Date(b.scheduled_at || 0).getTime())
        .slice(0, 2),
    [contentItems]
  )

  if (!currentTeam) {
    return (
      <DashboardContainer>
        <h1 className="text-sm font-medium text-foreground">No team selected</h1>
        <p className="mt-2 text-xs text-muted-foreground">
          Create or join a team to start using the dashboard.
        </p>
      </DashboardContainer>
    )
  }

  return (
    <DashboardContainer className="py-4 md:py-6">
        <div className="mb-4">
          <h1 className="text-sm font-medium text-foreground">{currentTeam.name}</h1>
          <p className="text-[11px] text-muted-foreground">What&apos;s happening with your content.</p>
        </div>

        {showWelcome && (
          <div className="mb-4 rounded-lg border border-border bg-card p-4">
            <div className="flex items-start gap-3">
              <div className="mt-1 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-[#f97316]/10 text-[#f97316]">
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="flex-1">
                <h3 className="text-sm font-medium text-foreground">Welcome to ContentHub</h3>
                <p className="mt-1 text-xs text-muted-foreground">
                  Your first post is a draft called &quot;This is your draft&quot;. Edit it or create your own.
                </p>
                <button
                  onClick={completeOnboarding}
                  className="mt-3 text-xs font-medium text-[#f97316] hover:text-foreground transition-colors"
                >
                  Got it, start creating
                </button>
              </div>
              <button
                onClick={completeOnboarding}
                className="mt-1 text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        <div className="mb-4 grid grid-cols-4 gap-px bg-border">
          {stats.map((stat) => (
            <div key={stat.label} className="bg-card p-3">
              <p className="text-[10px] text-muted-foreground uppercase">{stat.label}</p>
              <p className="text-lg text-foreground mt-0.5">{stat.value}</p>
            </div>
          ))}
        </div>

        {contentError && <p className="mb-4 text-xs text-red-400">{contentError}</p>}

        <div className="grid grid-cols-3 gap-4">
          <div className="col-span-2">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-xs font-medium text-foreground uppercase">Recent</h2>
              <Link href={`/${currentTeam.slug}/content`} className="text-[10px] text-muted-foreground hover:text-foreground">
                all
              </Link>
            </div>
            <div className="border border-border">
              {loading && <p className="px-3 py-3 text-xs text-muted-foreground">Loading content...</p>}
              {!loading && recentContent.length === 0 && (
                <p className="px-3 py-3 text-xs text-muted-foreground">No content yet.</p>
              )}
              {recentContent.map((content) => {
                const isSelected = selectedId === content.id
                const statusConfig = STATUS_CONFIG[content.status]
                const normalizedPlatforms = (content.platforms || []).map((entry) =>
                  typeof entry === 'string' ? entry : entry?.platform || ''
                )

                return (
                  <Link
                    key={content.id}
                    href={`/${currentTeam.slug}/content/${content.id}`}
                    onClick={() => setSelectedId(content.id)}
                    className={cn(
                      'flex items-center gap-2 py-2 px-3 border-b border-border last:border-0 transition-colors',
                      isSelected ? 'bg-[#00A0E3]/16' : 'hover:bg-[#00A0E3]/12'
                    )}
                  >
                    <div className={cn('w-6 h-6 flex items-center justify-center text-xs', statusConfig.color)}>
                      <statusConfig.icon className="w-3.5 h-3.5" />
                    </div>
                    <span className="text-xs text-foreground truncate flex-1">{content.title}</span>
                    <div className="flex items-center gap-2">
                      <div className="flex gap-0.5">
                        {normalizedPlatforms.filter(Boolean).map((platform) => (
                          <span key={`${content.id}-${platform}`} className="text-[9px] bg-muted px-1 py-0.5 text-muted-foreground">
                            {platformIcons[platform] || platform}
                          </span>
                        ))}
                      </div>
                      <Badge variant={content.status === 'PUBLISHED' ? 'default' : 'secondary'}>
                        <span className={cn('text-[9px]', statusConfig.color)}>{statusConfig.label}</span>
                      </Badge>
                    </div>
                  </Link>
                )
              })}
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <h2 className="text-xs font-medium text-foreground uppercase mb-1">Quick</h2>
              <div className="border border-border">
                {[
                  { href: `/${currentTeam.slug}/content/new`, icon: Plus, label: 'New' },
                  { href: `/${currentTeam.slug}/calendar`, icon: Calendar, label: 'Calendar' },
                  { href: `/${currentTeam.slug}/content`, icon: FileText, label: 'All content' },
                  { href: `/${currentTeam.slug}/analytics`, icon: BarChart3, label: 'Analytics' },
                ].map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="group flex items-center gap-2 py-1.5 px-3 border-b border-border last:border-0 hover:bg-[#00A0E3]/12 transition-colors"
                  >
                    <item.icon className="w-3.5 h-3.5 text-muted-foreground group-hover:text-foreground" />
                    <span className="text-xs text-muted-foreground group-hover:text-foreground">{item.label}</span>
                  </Link>
                ))}
              </div>
            </div>

            <div>
              <h2 className="text-xs font-medium text-foreground uppercase mb-1">Upcoming</h2>
              <div className="space-y-1.5">
                {upcoming.length === 0 && <p className="text-[10px] text-muted-foreground">No scheduled content.</p>}
                {upcoming.map((item) => (
                  <div key={item.id} className="flex items-center gap-2 py-1">
                    <div className="w-1.5 h-1.5 bg-amber-500" />
                    <div>
                      <p className="text-xs text-foreground">{item.title}</p>
                      <p className="text-[10px] text-muted-foreground">{formatShortDate(item.scheduled_at)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
    </DashboardContainer>
  )
}
