'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  TrendingUp,
  TrendingDown,
  Eye,
  Heart,
  MessageCircle,
  Share2,
  Download,
  Calendar,
} from 'lucide-react'
import { useTeamStore } from '@/stores'

// Mock analytics data
const overviewStats = [
  {
    title: 'Total Impressions',
    value: '245.6K',
    change: '+12.3%',
    trend: 'up',
    icon: Eye,
  },
  {
    title: 'Engagements',
    value: '18.4K',
    change: '+8.7%',
    trend: 'up',
    icon: Heart,
  },
  {
    title: 'Comments',
    value: '1,234',
    change: '-2.1%',
    trend: 'down',
    icon: MessageCircle,
  },
  {
    title: 'Shares',
    value: '3,456',
    change: '+15.2%',
    trend: 'up',
    icon: Share2,
  },
]

const platformStats = {
  twitter: {
    followers: '12.4K',
    impressions: '89.2K',
    engagements: '6.7K',
    engagementRate: '7.5%',
  },
  linkedin: {
    followers: '8.2K',
    impressions: '67.5K',
    engagements: '4.2K',
    engagementRate: '6.2%',
  },
  instagram: {
    followers: '15.6K',
    impressions: '88.9K',
    engagements: '7.5K',
    engagementRate: '8.4%',
  },
}

const topPosts = [
  {
    id: '1',
    title: 'Product Launch Announcement',
    platform: 'twitter',
    impressions: 45000,
    engagements: 3200,
    engagementRate: '7.1%',
  },
  {
    id: '2',
    title: 'Behind the Scenes',
    platform: 'instagram',
    impressions: 38000,
    engagements: 4100,
    engagementRate: '10.8%',
  },
  {
    id: '3',
    title: 'Industry Insights',
    platform: 'linkedin',
    impressions: 29000,
    engagements: 1800,
    engagementRate: '6.2%',
  },
]

export default function AnalyticsPage() {
  const currentTeam = useTeamStore((state) => state.currentTeam)
  const [period, setPeriod] = useState('7d')

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold">Analytics</h1>
          <p className="text-muted-foreground">
            Track your content performance across platforms
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-[140px]">
              <Calendar className="mr-2 h-4 w-4" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
              <SelectItem value="90d">Last 90 days</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline">
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
        </div>
      </div>

      {/* Overview Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {overviewStats.map((stat) => (
          <Card key={stat.title}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
              <stat.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
              <div className="flex items-center gap-1 text-xs">
                {stat.trend === 'up' ? (
                  <TrendingUp className="h-3 w-3 text-green-600" />
                ) : (
                  <TrendingDown className="h-3 w-3 text-red-600" />
                )}
                <span className={stat.trend === 'up' ? 'text-green-600' : 'text-red-600'}>
                  {stat.change}
                </span>
                <span className="text-muted-foreground">vs last period</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Platform Breakdown */}
      <div className="grid gap-6 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <span className="text-lg">𝕏</span>
              Twitter/X
            </CardTitle>
            <CardDescription>Performance metrics</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Followers</span>
              <span className="font-medium">{platformStats.twitter.followers}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Impressions</span>
              <span className="font-medium">{platformStats.twitter.impressions}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Engagements</span>
              <span className="font-medium">{platformStats.twitter.engagements}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Engagement Rate</span>
              <span className="font-medium text-primary">{platformStats.twitter.engagementRate}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <span className="text-lg">in</span>
              LinkedIn
            </CardTitle>
            <CardDescription>Performance metrics</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Followers</span>
              <span className="font-medium">{platformStats.linkedin.followers}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Impressions</span>
              <span className="font-medium">{platformStats.linkedin.impressions}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Engagements</span>
              <span className="font-medium">{platformStats.linkedin.engagements}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Engagement Rate</span>
              <span className="font-medium text-primary">{platformStats.linkedin.engagementRate}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <span>📷</span>
              Instagram
            </CardTitle>
            <CardDescription>Performance metrics</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Followers</span>
              <span className="font-medium">{platformStats.instagram.followers}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Impressions</span>
              <span className="font-medium">{platformStats.instagram.impressions}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Engagements</span>
              <span className="font-medium">{platformStats.instagram.engagements}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Engagement Rate</span>
              <span className="font-medium text-primary">{platformStats.instagram.engagementRate}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Top Performing Content */}
      <Card>
        <CardHeader>
          <CardTitle>Top Performing Content</CardTitle>
          <CardDescription>
            Your best performing posts this period
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {topPosts.map((post, index) => (
              <div
                key={post.id}
                className="flex items-center justify-between rounded-lg border p-4"
              >
                <div className="flex items-center gap-4">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-sm font-medium">
                    {index + 1}
                  </div>
                  <div>
                    <p className="font-medium">{post.title}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs text-muted-foreground capitalize">
                        {post.platform === 'twitter' && '𝕏 '}
                        {post.platform === 'linkedin' && 'in '}
                        {post.platform === 'instagram' && '📷 '}
                        {post.platform}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-8 text-sm">
                  <div className="text-right">
                    <p className="text-muted-foreground">Impressions</p>
                    <p className="font-medium">{post.impressions.toLocaleString()}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-muted-foreground">Engagements</p>
                    <p className="font-medium">{post.engagements.toLocaleString()}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-muted-foreground">Eng. Rate</p>
                    <p className="font-medium text-primary">{post.engagementRate}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}