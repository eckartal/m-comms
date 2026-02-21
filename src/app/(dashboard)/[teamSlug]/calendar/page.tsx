'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Calendar as CalendarIcon,
  Clock,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useAppStore } from '@/stores'
import { cn } from '@/lib/utils'
import { ContentStatus } from '@/types'
import { DashboardContainer } from '@/components/layout/DashboardContainer'

type ContentItem = {
  id: string
  title: string
  content?: string
  status: ContentStatus
  scheduled_at: string | null
  published_at: string | null
  platforms: string[]
  assignedTo?: {
    id: string
    name: string | null
    email: string
    avatar_url?: string | null
  } | null
  activity_count?: number
}

type ContentRow = Omit<ContentItem, 'activity_count'> & { id: string }
type ActivityRow = { content_id: string }

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
]

const platformIcons: Record<string, string> = {
  twitter: '𝕏',
  linkedin: 'in',
  instagram: '📷',
  blog: '📝',
  bluesky: '🌀',
}

export default function CalendarPage() {
  const { currentTeam } = useAppStore()
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [scheduledContent, setScheduledContent] = useState<ContentItem[]>([])
  const [loading, setLoading] = useState(true)

  const getItemDate = (item: ContentItem) => item.published_at || item.scheduled_at

  useEffect(() => {
    async function fetchScheduledContent() {
      if (!currentTeam?.id) return

      const supabase = createClient()
      const { data } = await supabase
        .from('content')
        .select('id, title, status, scheduled_at, published_at, platforms, assignedTo:assigned_to(id, name, email, avatar_url)')
        .eq('team_id', currentTeam.id)
        .in('status', ['SCHEDULED', 'PUBLISHED'])
        .or('scheduled_at.not.is.null,published_at.not.is.null')

      const contentRows = (data || []) as ContentRow[]
      const contentIds = contentRows.map((item) => item.id)
      const { data: activities } = await supabase
        .from('content_activity')
        .select('content_id')
        .in('content_id', contentIds)

      const activityCount: Record<string, number> = {}
      ;((activities || []) as ActivityRow[]).forEach((activity) => {
        activityCount[activity.content_id] = (activityCount[activity.content_id] || 0) + 1
      })

      const enriched = contentRows.map((item) => ({
        ...item,
        activity_count: activityCount[item.id] || 0,
      }))

      setScheduledContent(enriched)
      setLoading(false)
    }
    fetchScheduledContent()
  }, [currentTeam?.id])

  const year = currentDate.getFullYear()
  const month = currentDate.getMonth()

  const firstDayOfMonth = new Date(year, month, 1)
  const lastDayOfMonth = new Date(year, month + 1, 0)
  const startingDayOfWeek = firstDayOfMonth.getDay()
  const daysInMonth = lastDayOfMonth.getDate()

  const prevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1))
  }

  const nextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1))
  }

  const goToToday = () => {
    setCurrentDate(new Date())
  }

  const getContentForDate = (day: number) => {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    return scheduledContent.filter((item) => getItemDate(item)?.startsWith(dateStr))
  }

  const getContentByDate = (date: Date) => {
    const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
    return scheduledContent.filter((item) => getItemDate(item)?.startsWith(dateStr))
  }

  const formatTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
    })
  }

  const selectedDateContent = selectedDate ? getContentByDate(selectedDate) : []
  const monthContentCount = scheduledContent.filter((item) => {
    const dateStr = getItemDate(item)
    if (!dateStr) return false
    const date = new Date(dateStr)
    return date.getFullYear() === year && date.getMonth() === month
  }).length

  const upcomingScheduled = scheduledContent
    .filter((item) => item.status === 'SCHEDULED' && item.scheduled_at)
    .slice()
    .sort((a, b) => new Date(a.scheduled_at!).getTime() - new Date(b.scheduled_at!).getTime())

  if (loading) {
    return (
      <DashboardContainer className="py-8 md:py-10">
        <div className="animate-pulse space-y-6">
          <div className="h-8 w-32 bg-border rounded" />
          <div className="h-96 bg-border rounded" />
        </div>
      </DashboardContainer>
    )
  }

  return (
    <DashboardContainer className="py-8 md:py-10">
        {/* Header */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between mb-8">
          <div>
            <h1 className="text-[20px] font-medium text-foreground">Calendar</h1>
            <p className="text-[14px] text-muted-foreground mt-1">
              {monthContentCount} posts scheduled or shared this month
            </p>
          </div>
          <Link
            href={`/${currentTeam?.slug}/content/new`}
            className="flex items-center gap-2 px-4 py-2 bg-foreground text-white text-[14px] font-medium rounded-[6px] hover:bg-hover transition-colors"
          >
            <Plus className="w-4 h-4" />
            Schedule post
          </Link>
        </div>

        <div className="grid lg:grid-cols-4 gap-6">
          {/* Calendar Grid */}
          <div className="lg:col-span-3">
            {/* Calendar Header */}
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-[16px] font-medium text-foreground">
                {MONTHS[month]} {year}
              </h2>
              <div className="flex items-center border border-border rounded-[6px]">
                <button
                  onClick={goToToday}
                  className="px-3 py-1.5 text-[13px] font-medium text-muted-foreground hover:text-foreground hover:bg-muted rounded-[6px] transition-colors"
                >
                  Today
                </button>
                <div className="flex items-center border-l border-border rounded-[6px]">
                  <button
                    onClick={prevMonth}
                    className="p-2 hover:bg-muted rounded-l-[6px] transition-colors"
                  >
                    <ChevronLeft className="w-4 h-4 text-muted-foreground" />
                  </button>
                  <div className="w-px h-5 bg-border" />
                  <button
                    onClick={nextMonth}
                    className="p-2 hover:bg-muted rounded-r-[6px] transition-colors"
                  >
                    <ChevronRight className="w-4 h-4 text-muted-foreground" />
                  </button>
                </div>
              </div>
            </div>

            {/* Day Headers */}
            <div className="grid grid-cols-7 gap-px bg-border rounded-t-[8px] overflow-hidden">
              {DAYS.map((day) => (
                <div
                  key={day}
                  className="bg-muted py-2 text-center text-[12px] font-medium text-muted-foreground"
                >
                  {day}
                </div>
              ))}
            </div>

            {/* Calendar Grid */}
            <div className="grid grid-cols-7 gap-px bg-border border border-border border-t-0 rounded-b-[8px] overflow-hidden">
              {/* Empty cells */}
              {Array.from({ length: startingDayOfWeek }).map((_, i) => (
                <div key={`empty-${i}`} className="bg-card min-h-[100px] min-w-[100px]" />
              ))}

              {/* Days */}
              {Array.from({ length: daysInMonth }).map((_, i) => {
                const day = i + 1
                const date = new Date(year, month, day)
                const isToday = date.toDateString() === new Date().toDateString()
                const isSelected = selectedDate?.toDateString() === date.toDateString()
                const dayContent = getContentForDate(day)

                return (
                  <div
                    key={day}
                    className={cn(
                      'bg-card min-h-[100px] p-2 transition-colors cursor-pointer',
                      isSelected ? 'bg-blue-500/10' : 'hover:bg-accent'
                    )}
                    onClick={() => setSelectedDate(date)}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span
                        className={cn(
                          'flex h-6 w-6 items-center justify-center rounded-full text-[13px]',
                          isToday && 'bg-foreground text-white font-medium',
                          !isToday && 'text-foreground'
                        )}
                      >
                        {day}
                      </span>
                      {dayContent.length > 0 && (
                        <span className="text-[11px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                          {dayContent.length}
                        </span>
                      )}
                    </div>
                    <div className="space-y-1">
                      {dayContent.slice(0, 2).map((item) => (
                        <div
                          key={item.id}
                          className="truncate text-[11px] px-1.5 py-0.5 bg-blue-500/10 text-blue-500 rounded"
                          title={item.title}
                        >
                          {item.title}
                        </div>
                      ))}
                      {dayContent.length > 2 && (
                        <div className="text-[11px] text-muted-foreground px-1.5">
                          +{dayContent.length - 2} more
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Legend */}
            <div className="flex items-center justify-center gap-6 mt-6 text-[13px] text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <span>𝕏</span> Twitter/X
              </span>
              <span className="flex items-center gap-1.5">
                <span>in</span> LinkedIn
              </span>
              <span className="flex items-center gap-1.5">
                <span>📷</span> Instagram
              </span>
              <span className="flex items-center gap-1.5">
                <span>📝</span> Blog
              </span>
            </div>
          </div>

          {/* Selected Date Details */}
          <div>
            <div className="border border-border rounded-[8px] overflow-hidden">
              <div className="bg-muted px-4 py-3 border-b border-border">
                <h3 className="text-[14px] font-medium text-foreground">
                  {selectedDate
                    ? selectedDate.toLocaleDateString('en-US', {
                        weekday: 'short',
                        month: 'short',
                        day: 'numeric',
                      })
                    : 'Select a date'}
                </h3>
              </div>

              <div className="p-4">
                {selectedDate ? (
                  selectedDateContent.length === 0 ? (
                    <div className="text-center py-8">
                      <CalendarIcon className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
                      <p className="text-[13px] text-muted-foreground mb-4">
                        No posts scheduled or shared
                      </p>
                      <Link
                        href={`/${currentTeam?.slug}/content/new?date=${selectedDate.toISOString()}`}
                        className="inline-flex items-center gap-2 px-3 py-1.5 bg-foreground text-white text-[13px] font-medium rounded-[6px] hover:bg-hover transition-colors"
                      >
                        <Plus className="w-3 h-3" />
                        Schedule post
                      </Link>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {selectedDateContent.map((item) => (
                        <div
                          key={item.id}
                          className="p-3 border border-border rounded-[6px] hover:border-foreground transition-colors"
                        >
                          <div className="flex items-center justify-between mb-2">
                            <span className="flex items-center gap-1.5 text-[12px] text-muted-foreground">
                              <Clock className="w-3 h-3" />
                              {formatTime(getItemDate(item)!)}
                              <span className="ml-2 text-[11px] uppercase tracking-wide text-muted-foreground">
                                {item.status === 'PUBLISHED' ? 'Shared' : 'Scheduled'}
                              </span>
                            </span>
                            <div className="flex gap-1">
                              {item.platforms.map((p) => (
                                <span key={p} className="text-[12px] bg-muted px-1 rounded">
                                  {platformIcons[p]}
                                </span>
                              ))}
                            </div>
                          </div>
                          <p className="text-[13px] font-medium text-foreground">
                            {item.title}
                          </p>
                          {(item.activity_count || 0) > 0 && (
                            <p className="text-[11px] text-muted-foreground mt-1">
                              {item.activity_count} updates
                            </p>
                          )}
                          {item.assignedTo && (
                            <p className="text-[11px] text-muted-foreground mt-1">
                              Owner {item.assignedTo?.name || item.assignedTo?.email}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  )
                ) : (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <CalendarIcon className="w-10 h-10 text-muted-foreground mb-3" />
                    <p className="text-[13px] text-muted-foreground">
                      Click on a date to see scheduled or shared posts
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Upcoming This Week */}
            <div className="mt-6">
              <h3 className="text-[14px] font-medium text-foreground mb-4">Upcoming</h3>
              <div className="space-y-2">
                {upcomingScheduled.slice(0, 4).map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center gap-3 p-3 bg-accent rounded-[6px] hover:bg-muted transition-colors"
                  >
                    <div className="w-10 h-10 bg-blue-500/10 rounded-[6px] flex items-center justify-center text-blue-500">
                      <Clock className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-medium text-foreground truncate">
                        {item.title}
                      </p>
                      <p className="text-[12px] text-muted-foreground">
                        {item.scheduled_at && new Date(item.scheduled_at).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          hour: 'numeric',
                          minute: '2-digit',
                        })}
                      </p>
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
