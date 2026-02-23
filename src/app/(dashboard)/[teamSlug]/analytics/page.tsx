'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  Eye,
  Plus,
} from 'lucide-react'
import { useAppStore } from '@/stores'
import { cn } from '@/lib/utils'
import { DashboardContainer } from '@/components/layout/DashboardContainer'

export default function AnalyticsPage() {
  const { currentTeam } = useAppStore()
  const [period, setPeriod] = useState('7d')
  const [loading, setLoading] = useState(true)
  const stats = null

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
      <DashboardContainer className="py-8 md:py-10">
        <div className="animate-pulse space-y-6">
          <div className="h-8 w-32 rounded-lg bg-[var(--sidebar-elevated)]" />
          <div className="h-24 rounded-xl border border-[var(--sidebar-divider)] bg-[var(--sidebar-elevated)]" />
          <div className="h-64 rounded-xl border border-[var(--sidebar-divider)] bg-[var(--sidebar-elevated)]" />
        </div>
      </DashboardContainer>
    )
  }

  return (
    <DashboardContainer className="py-8 md:py-10">
        <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-lg font-semibold text-foreground">Analytics</h1>
            <p className="mt-1 text-sm text-muted-foreground">Performance</p>
          </div>
          <div className="flex items-center rounded-lg border border-[var(--sidebar-divider)] bg-[var(--sidebar-elevated)] p-1">
              {['7d', '30d', '90d'].map((p) => (
                <button
                  key={p}
                  onClick={() => setPeriod(p)}
                  className={cn(
                    'rounded-md px-3 py-1.5 text-xs font-medium transition-colors',
                    period === p
                      ? 'bg-foreground text-primary-foreground'
                      : 'text-muted-foreground hover:bg-accent/60 hover:text-foreground'
                  )}
                >
                  {p === '7d' ? '7 days' : p === '30d' ? '30 days' : '90 days'}
                </button>
              ))}
          </div>
        </div>

        {stats === null && (
          <div className="rounded-2xl border border-[var(--sidebar-divider)] bg-card px-6 py-16 text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full border border-[var(--sidebar-divider)] bg-[var(--sidebar-elevated)]">
              <Eye className="h-6 w-6 text-muted-foreground" />
            </div>
            <h3 className="mb-2 text-base font-medium text-foreground">No analytics yet</h3>
            <Link
              href={`/${currentTeam?.slug}/content/new`}
              className="inline-flex items-center gap-2 rounded-md border border-[var(--sidebar-divider)] bg-foreground px-3 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-foreground/90"
            >
              <Plus className="h-4 w-4" />
              Create post
            </Link>
          </div>
        )}
    </DashboardContainer>
  )
}
