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
  const [stats, setStats] = useState<{
    impressions: string
    impressionsChange: string
    engagements: string
    engagementsChange: string
    comments: string
    commentsChange: string
    shares: string
    sharesChange: string
  } | null>(null)

  useEffect(() => {
    async function fetchAnalytics() {
      // TODO: Replace with actual analytics API call
      // For now, show empty state
      setLoading(false)
    }
    fetchAnalytics()
  }, [currentTeam, period])

  if (loading) {
    return (
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-5xl mx-auto px-12 py-12">
          <div className="animate-pulse space-y-6">
            <div className="h-8 w-32 bg-[#333333] rounded" />
            <div className="h-28 bg-[#333333] rounded" />
            <div className="h-64 bg-[#333333] rounded" />
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
            <h1 className="text-[20px] font-medium text-white">Analytics</h1>
            <p className="text-[14px] text-gray-400 mt-1">
              Track your content performance across platforms
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center bg-gray-900 rounded-[6px] p-1">
              {['7d', '30d', '90d'].map((p) => (
                <button
                  key={p}
                  onClick={() => setPeriod(p)}
                  className={cn(
                    'px-3 py-1.5 text-[13px] font-medium rounded-[4px] transition-all',
                    period === p
                      ? 'bg-gray-800 text-white shadow-sm'
                      : 'text-gray-400 hover:text-white'
                  )}
                >
                  {p === '7d' ? '7 days' : p === '30d' ? '30 days' : '90 days'}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Empty State */}
        {stats === null && (
          <div className="flex flex-col items-center justify-center py-24">
            <div className="w-16 h-16 bg-gray-800 rounded-full flex items-center justify-center mb-4">
              <Eye className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-[16px] font-medium text-white mb-2">No analytics yet</h3>
            <p className="text-[14px] text-gray-400 max-w-md text-center">
              Analytics will appear once your content is published and starts getting engagement.
            </p>
          </div>
        )}
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
    <div className="border border-gray-800 rounded-[8px] p-4 hover:border-white transition-colors">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[13px] text-gray-400">{title}</span>
        <Icon className="w-4 h-4 text-gray-400" />
      </div>
      <p className="text-[28px] font-medium text-white">{value}</p>
      <div className="flex items-center gap-1 mt-1">
        {isPositive ? (
          <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />
        ) : (
          <TrendingDown className="w-3.5 h-3.5 text-red-500" />
        )}
        <span className={cn(
          'text-[13px] font-medium',
          isPositive ? 'text-emerald-500' : 'text-red-500'
        )}>
          {change}
        </span>
        <span className="text-[12px] text-gray-500">vs last period</span>
      </div>
    </div>
  )
}