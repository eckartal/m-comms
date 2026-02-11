'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  TrendingUp,
  TrendingDown,
  Eye,
  Heart,
  MessageCircle,
  Share2,
  Calendar,
  ArrowUpRight,
} from 'lucide-react'
import { useAppStore } from '@/stores'
import { cn } from '@/lib/utils'

const platformIcons: Record<string, string> = {
  twitter: '𝕏',
  linkedin: 'in',
  instagram: '📷',
  blog: '📝',
}

const platformColors: Record<string, string> = {
  twitter: 'bg-black',
  linkedin: 'bg-[#0A66C2]',
  instagram: 'bg-[#E4405F]',
  blog: 'bg-[#6B7280]',
}

export default function AnalyticsPage() {
  const { currentTeam } = useAppStore()
  const [period, setPeriod] = useState('7d')
  const [loading, setLoading] = useState(true)

  // Mock analytics data
  const stats = {
    impressions: '245.6K',
    impressionsChange: '+12.3%',
    engagements: '18.4K',
    engagementsChange: '+8.7%',
    comments: '1,234',
    commentsChange: '-2.1%',
    shares: '3,456',
    sharesChange: '+15.2%',
  }

  const platformStats = {
    twitter: { followers: '12.4K', impressions: '89.2K', engagements: '6.7K', rate: '7.5%' },
    linkedin: { followers: '8.2K', impressions: '67.5K', engagements: '4.2K', rate: '6.2%' },
    instagram: { followers: '15.6K', impressions: '88.9K', engagements: '7.5K', rate: '8.4%' },
  }

  const topPosts = [
    { id: '1', title: 'Product Launch Announcement', platform: 'twitter', impressions: 45200, engagements: 3200, rate: '7.1%' },
    { id: '2', title: 'Behind the Scenes - Engineering', platform: 'instagram', impressions: 38100, engagements: 4100, rate: '10.8%' },
    { id: '3', title: 'Industry Insights - AI Trends', platform: 'linkedin', impressions: 29400, engagements: 1800, rate: '6.2%' },
    { id: '4', title: 'Customer Success Story', platform: 'linkedin', impressions: 22100, engagements: 1400, rate: '6.3%' },
  ]

  // Generate mock chart data
  const chartData = Array.from({ length: 7 }, (_, i) => ({
    day: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][i],
    impressions: Math.floor(Math.random() * 30000) + 20000,
    engagements: Math.floor(Math.random() * 3000) + 1500,
  }))

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 500)
    return () => clearTimeout(timer)
  }, [])

  if (loading) {
    return (
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-5xl mx-auto px-12 py-12">
          <div className="animate-pulse space-y-6">
            <div className="h-8 w-32 bg-[#E5E5E7] rounded" />
            <div className="h-28 bg-[#E5E5E7] rounded" />
            <div className="h-64 bg-[#E5E5E7] rounded" />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-5xl mx-auto px-12 py-12">
        {/* Header */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between mb-8">
          <div>
            <h1 className="text-[20px] font-medium text-[#1C1C1E]">Analytics</h1>
            <p className="text-[14px] text-[#6C6C70] mt-1">
              Track your content performance across platforms
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center bg-[#F5F5F7] rounded-[6px] p-1">
              {['7d', '30d', '90d'].map((p) => (
                <button
                  key={p}
                  onClick={() => setPeriod(p)}
                  className={cn(
                    'px-3 py-1.5 text-[13px] font-medium rounded-[4px] transition-all',
                    period === p
                      ? 'bg-white text-[#1C1C1E] shadow-sm'
                      : 'text-[#6C6C70] hover:text-[#1C1C1E]'
                  )}
                >
                  {p === '7d' ? '7 days' : p === '30d' ? '30 days' : '90 days'}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Overview Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <StatCard
            title="Impressions"
            value={stats.impressions}
            change={stats.impressionsChange}
            icon={Eye}
          />
          <StatCard
            title="Engagements"
            value={stats.engagements}
            change={stats.engagementsChange}
            icon={Heart}
          />
          <StatCard
            title="Comments"
            value={stats.comments}
            change={stats.commentsChange}
            icon={MessageCircle}
          />
          <StatCard
            title="Shares"
            value={stats.shares}
            change={stats.sharesChange}
            icon={Share2}
          />
        </div>

        {/* Chart Placeholder */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-[16px] font-medium text-[#1C1C1E]">Performance Overview</h2>
          </div>
          <div className="border border-[#E5E5E7] rounded-[8px] p-6">
            {/* Simple bar chart */}
            <div className="flex items-end justify-between h-48 gap-4">
              {chartData.map((data, i) => (
                <div key={i} className="flex-1 flex flex-col items-center gap-2">
                  <div className="w-full flex flex-col gap-1">
                    <div
                      className="w-full bg-[#1C1C1E] rounded-t-[4px] opacity-80"
                      style={{ height: `${(data.impressions / 50000) * 160}px` }}
                    />
                    <div
                      className="w-full bg-[#007AFF] rounded-b-[4px]"
                      style={{ height: `${(data.engagements / 5000) * 40}px` }}
                    />
                  </div>
                  <span className="text-[11px] text-[#8E8E93]">{data.day}</span>
                </div>
              ))}
            </div>
            <div className="flex items-center justify-center gap-6 mt-4 pt-4 border-t border-[#E5E5E7]">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-[#1C1C1E] rounded-sm" />
                <span className="text-[12px] text-[#6C6C70]">Impressions</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-[#007AFF] rounded-sm" />
                <span className="text-[12px] text-[#6C6C70]">Engagements</span>
              </div>
            </div>
          </div>
        </div>

        {/* Platform Breakdown */}
        <div className="mb-8">
          <h2 className="text-[16px] font-medium text-[#1C1C1E] mb-4">By Platform</h2>
          <div className="grid md:grid-cols-3 gap-4">
            {Object.entries(platformStats).map(([platform, data]) => (
              <div
                key={platform}
                className="border border-[#E5E5E7] rounded-[8px] p-4 hover:border-[#1C1C1E] transition-colors"
              >
                <div className="flex items-center gap-2 mb-4">
                  <span className="text-[20px]">{platformIcons[platform]}</span>
                  <span className="text-[14px] font-medium text-[#1C1C1E] capitalize">{platform}</span>
                </div>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[13px] text-[#8E8E93]">Followers</span>
                    <span className="text-[14px] font-medium text-[#1C1C1E]">{data.followers}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[13px] text-[#8E8E93]">Impressions</span>
                    <span className="text-[14px] font-medium text-[#1C1C1E]">{data.impressions}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[13px] text-[#8E8E93]">Engagements</span>
                    <span className="text-[14px] font-medium text-[#1C1C1E]">{data.engagements}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[13px] text-[#8E8E93]">Eng. Rate</span>
                    <span className="text-[14px] font-medium text-[#10B981]">{data.rate}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Top Performing Content */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-[16px] font-medium text-[#1C1C1E]">Top Performing Content</h2>
            <Link
              href={`/${currentTeam?.slug}/content`}
              className="text-[13px] text-[#007AFF] hover:underline flex items-center gap-0.5"
            >
              View all <ArrowUpRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="border border-[#E5E5E7] rounded-[8px] overflow-hidden">
            {topPosts.map((post, index) => (
              <div
                key={post.id}
                className={cn(
                  'flex items-center justify-between py-3 px-4 transition-colors hover:bg-[#FAFAFA]',
                  index !== topPosts.length - 1 && 'border-b border-[#E5E5E7]'
                )}
              >
                <div className="flex items-center gap-3">
                  <span className="flex items-center justify-center w-6 h-6 text-[12px] font-medium text-[#8E8E93] bg-[#F5F5F7] rounded-full">
                    {index + 1}
                  </span>
                  <div>
                    <p className="text-[14px] font-medium text-[#1C1C1E]">{post.title}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[11px] text-[#8E8E93]">
                        {platformIcons[post.platform]} {post.platform}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-6 text-[13px]">
                  <div className="text-right">
                    <p className="text-[#8E8E93]">Impressions</p>
                    <p className="font-medium text-[#1C1C1E]">{post.impressions.toLocaleString()}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[#8E8E93]">Engagements</p>
                    <p className="font-medium text-[#1C1C1E]">{post.engagements.toLocaleString()}</p>
                  </div>
                  <div className="text-right min-w-[60px]">
                    <p className="text-[#8E8E93]">Rate</p>
                    <p className="font-medium text-[#10B981]">{post.rate}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

function StatCard({
  title,
  value,
  change,
  icon: Icon,
}: {
  title: string
  value: string
  change: string
  icon: typeof Eye
}) {
  const isPositive = change.startsWith('+')

  return (
    <div className="border border-[#E5E5E7] rounded-[8px] p-4 hover:border-[#1C1C1E] transition-colors">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[13px] text-[#8E8E93]">{title}</span>
        <Icon className="w-4 h-4 text-[#8E8E93]" />
      </div>
      <p className="text-[28px] font-medium text-[#1C1C1E]">{value}</p>
      <div className="flex items-center gap-1 mt-1">
        {isPositive ? (
          <TrendingUp className="w-3.5 h-3.5 text-[#10B981]" />
        ) : (
          <TrendingDown className="w-3.5 h-3.5 text-[#ef4444]" />
        )}
        <span className={cn(
          'text-[13px] font-medium',
          isPositive ? 'text-[#10B981]' : 'text-[#ef4444]'
        )}>
          {change}
        </span>
        <span className="text-[12px] text-[#8E8E93]">vs last period</span>
      </div>
    </div>
  )
}