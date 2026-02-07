'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Calendar,
  FileText,
  BarChart3,
  TrendingUp,
  Clock,
  CheckCircle2,
  AlertCircle,
  Plus,
  ArrowRight,
  MoreHorizontal,
} from 'lucide-react'
import Link from 'next/link'
import { useAppStore } from '@/stores'

// Mock data for demo - initializes if store is empty (dev mode)
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
  { date: '2025-02-15', count: 6 },
  { date: '2025-02-16', count: 2 },
]

const statusColors = {
  DRAFT: 'bg-gray-100 text-gray-700',
  IN_REVIEW: 'bg-yellow-100 text-yellow-700',
  APPROVED: 'bg-blue-100 text-blue-700',
  SCHEDULED: 'bg-primary/10 text-primary',
  PUBLISHED: 'bg-green-100 text-green-700',
  ARCHIVED: 'bg-gray-100 text-gray-500',
}

const platformIcons: Record<string, string> = {
  twitter: '𝕏',
  linkedin: 'in',
  instagram: '📷',
  blog: '📝',
}

export default function DashboardPage() {
  const { currentTeam, setCurrentTeam, setCurrentUser } = useAppStore()

  // Initialize mock data for dev mode
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

  const [selectedPeriod, setSelectedPeriod] = useState<'week' | 'month'>('week')

  const stats = {
    totalContent: 24,
    published: 18,
    scheduled: 4,
    inReview: 2,
    engagementRate: '4.2%',
    growth: '+12%',
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground">
            Welcome back! Here&apos;s what&apos;s happening with your content.
          </p>
        </div>
        <Button asChild>
          <Link href={`/${currentTeam?.slug}/content/new`}>
            <Plus className="mr-2 h-4 w-4" />
            New Content
          </Link>
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Content</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalContent}</div>
            <p className="text-xs text-muted-foreground">
              +{stats.growth} from last period
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Published</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.published}</div>
            <p className="text-xs text-muted-foreground">Across all platforms</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Scheduled</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.scheduled}</div>
            <p className="text-xs text-muted-foreground">Ready to publish</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Avg. Engagement</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.engagementRate}</div>
            <p className="text-xs text-muted-foreground">
              +{stats.growth} from last period
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Recent Content */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Recent Content</CardTitle>
            <CardDescription>
              Your latest content pieces and their status
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentContent.map((content) => (
                <div
                  key={content.id}
                  className="flex items-center justify-between rounded-lg border p-4 transition-colors hover:bg-muted/50"
                >
                  <div className="flex items-center gap-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                      <FileText className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium">{content.title}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="secondary" className={statusColors[content.status]}>
                          {content.status.replace('_', ' ')}
                        </Badge>
                        <div className="flex gap-1">
                          {content.platforms.map((p) => (
                            <span key={p} className="text-xs text-muted-foreground">
                              {platformIcons[p]}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {content.scheduledAt && (
                      <span className="text-sm text-muted-foreground">
                        {new Date(content.scheduledAt).toLocaleDateString()}
                      </span>
                    )}
                    <Button variant="ghost" size="icon">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
              <Button variant="ghost" className="w-full" asChild>
                <Link href={`/${currentTeam?.slug}/content`}>
                  View all content
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Upcoming Schedule */}
        <Card>
          <CardHeader>
            <CardTitle>This Week</CardTitle>
            <CardDescription>
              Upcoming scheduled posts
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Scheduled</span>
                <span className="font-medium">23 posts</span>
              </div>
              <Progress value={77} className="h-2" />
              <div className="grid grid-cols-7 gap-2 mt-4">
                {upcomingSchedule.map((day, i) => (
                  <div key={day.date} className="text-center">
                    <div
                      className={`mx-auto flex h-8 w-8 items-center justify-center rounded-lg text-xs ${
                        day.count > 4
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted text-muted-foreground'
                      }`}
                    >
                      {day.count}
                    </div>
                    <span className="mt-1 block text-xs text-muted-foreground">
                      {new Date(day.date).toLocaleDateString('en-US', { weekday: 'short' })}
                    </span>
                  </div>
                ))}
              </div>
              <Button variant="outline" className="w-full mt-4" asChild>
                <Link href={`/${currentTeam?.slug}/calendar`}>
                  <Calendar className="mr-2 h-4 w-4" />
                  View Calendar
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="cursor-pointer transition-shadow hover:shadow-md">
          <CardContent className="flex items-center gap-4 p-6">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
              <FileText className="h-6 w-6 text-primary" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold">Create Content</h3>
              <p className="text-sm text-muted-foreground">
                Start a new piece of content
              </p>
            </div>
            <ArrowRight className="h-4 w-4 text-muted-foreground" />
          </CardContent>
        </Card>
        <Card className="cursor-pointer transition-shadow hover:shadow-md">
          <CardContent className="flex items-center gap-4 p-6">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
              <BarChart3 className="h-6 w-6 text-primary" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold">View Analytics</h3>
              <p className="text-sm text-muted-foreground">
                Track your performance
              </p>
            </div>
            <ArrowRight className="h-4 w-4 text-muted-foreground" />
          </CardContent>
        </Card>
        <Card className="cursor-pointer transition-shadow hover:shadow-md">
          <CardContent className="flex items-center gap-4 p-6">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
              <Calendar className="h-6 w-6 text-primary" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold">Schedule Post</h3>
              <p className="text-sm text-muted-foreground">
                Plan your content calendar
              </p>
            </div>
            <ArrowRight className="h-4 w-4 text-muted-foreground" />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}