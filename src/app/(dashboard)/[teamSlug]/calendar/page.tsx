'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Calendar as CalendarIcon,
  Clock,
  FileText,
} from 'lucide-react'
import { useAppStore } from '@/stores'
import { cn } from '@/lib/utils'
import { ContentStatus } from '@/types'

type ContentItem = {
  id: string
  title: string
  content?: string
  status: ContentStatus
  scheduledAt: string | null
  publishedAt: string | null
  platforms: string[]
}

const mockScheduled: ContentItem[] = [
  { id: '1', title: 'Product Launch Announcement', status: 'SCHEDULED' as ContentStatus, scheduledAt: '2025-02-15T10:00:00Z', publishedAt: null, platforms: ['twitter', 'linkedin'] },
  { id: '2', title: 'Weekly Newsletter #45', status: 'SCHEDULED' as ContentStatus, scheduledAt: '2025-02-18T09:00:00Z', publishedAt: null, platforms: ['blog'] },
  { id: '3', title: 'Behind the Scenes - Engineering', status: 'SCHEDULED' as ContentStatus, scheduledAt: '2025-02-20T14:00:00Z', publishedAt: null, platforms: ['instagram'] },
  { id: '4', title: 'Industry Insights - AI Trends', status: 'SCHEDULED' as ContentStatus, scheduledAt: '2025-02-22T11:00:00Z', publishedAt: null, platforms: ['twitter', 'linkedin'] },
  { id: '5', title: 'Customer Success Story', status: 'SCHEDULED' as ContentStatus, scheduledAt: '2025-02-25T08:00:00Z', publishedAt: null, platforms: ['linkedin', 'blog'] },
  { id: '6', title: 'Product Hints Teaser', status: 'SCHEDULED' as ContentStatus, scheduledAt: '2025-02-28T15:00:00Z', publishedAt: null, platforms: ['twitter'] },
]

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
}

export default function CalendarPage() {
  const { currentTeam } = useAppStore()
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [scheduledContent, setScheduledContent] = useState<ContentItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchScheduledContent() {
      // Simulate API
      await new Promise(resolve => setTimeout(resolve, 300))
      setScheduledContent(mockScheduled)
      setLoading(false)
    }
    fetchScheduledContent()
  }, [])

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
    return scheduledContent.filter((item) => item.scheduledAt?.startsWith(dateStr))
  }

  const getContentByDate = (date: Date) => {
    const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
    return scheduledContent.filter((item) => item.scheduledAt?.startsWith(dateStr))
  }

  const formatTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
    })
  }

  const selectedDateContent = selectedDate ? getContentByDate(selectedDate) : []

  if (loading) {
    return (
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-6xl mx-auto px-12 py-12">
          <div className="animate-pulse space-y-6">
            <div className="h-8 w-32 bg-[#E5E5E7] rounded" />
            <div className="h-96 bg-[#E5E5E7] rounded" />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-6xl mx-auto px-12 py-12">
        {/* Header */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between mb-8">
          <div>
            <h1 className="text-[20px] font-medium text-[#1C1C1E]">Calendar</h1>
            <p className="text-[14px] text-[#6C6C70] mt-1">
              {scheduledContent.length} posts scheduled this month
            </p>
          </div>
          <Link
            href={`/${currentTeam?.slug}/content/new`}
            className="flex items-center gap-2 px-4 py-2 bg-[#1C1C1E] text-white text-[14px] font-medium rounded-[6px] hover:bg-[#2C2C2E] transition-colors"
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
              <h2 className="text-[16px] font-medium text-[#1C1C1E]">
                {MONTHS[month]} {year}
              </h2>
              <div className="flex items-center gap-2">
                <button
                  onClick={goToToday}
                  className="px-3 py-1.5 text-[13px] font-medium text-[#6C6C70] hover:text-[#1C1C1E] hover:bg-[#F5F5F7] rounded-[6px] transition-colors"
                >
                  Today
                </button>
                <div className="flex items-center border border-[#E5E5E7] rounded-[6px]">
                  <button
                    onClick={prevMonth}
                    className="p-2 hover:bg-[#F5F5F7] rounded-l-[6px] transition-colors"
                  >
                    <ChevronLeft className="w-4 h-4 text-[#6C6C70]" />
                  </button>
                  <div className="w-px h-5 bg-[#E5E5E7]" />
                  <button
                    onClick={nextMonth}
                    className="p-2 hover:bg-[#F5F5F7] rounded-r-[6px] transition-colors"
                  >
                    <ChevronRight className="w-4 h-4 text-[#6C6C70]" />
                  </button>
                </div>
              </div>
            </div>

            {/* Day Headers */}
            <div className="grid grid-cols-7 gap-px bg-[#E5E5E7] rounded-t-[8px] overflow-hidden">
              {DAYS.map((day) => (
                <div
                  key={day}
                  className="bg-[#F5F5F7] py-2 text-center text-[12px] font-medium text-[#6C6C70]"
                >
                  {day}
                </div>
              ))}
            </div>

            {/* Calendar Grid */}
            <div className="grid grid-cols-7 gap-px bg-[#E5E5E7] border border-[#E5E5E7] border-t-0 rounded-b-[8px] overflow-hidden">
              {/* Empty cells */}
              {Array.from({ length: startingDayOfWeek }).map((_, i) => (
                <div key={`empty-${i}`} className="bg-white min-h-[100px] min-w-[100px]" />
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
                      'bg-white min-h-[100px] p-2 transition-colors cursor-pointer',
                      isSelected ? 'bg-[#F0F7FF]' : 'hover:bg-[#FAFAFA]'
                    )}
                    onClick={() => setSelectedDate(date)}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span
                        className={cn(
                          'flex h-6 w-6 items-center justify-center rounded-full text-[13px]',
                          isToday && 'bg-[#1C1C1E] text-white font-medium',
                          !isToday && 'text-[#1C1C1E]'
                        )}
                      >
                        {day}
                      </span>
                      {dayContent.length > 0 && (
                        <span className="text-[11px] text-[#8E8E93] bg-[#F5F5F7] px-1.5 py-0.5 rounded">
                          {dayContent.length}
                        </span>
                      )}
                    </div>
                    <div className="space-y-1">
                      {dayContent.slice(0, 2).map((item) => (
                        <div
                          key={item.id}
                          className="truncate text-[11px] px-1.5 py-0.5 bg-[#F0F7FF] text-[#3B82F6] rounded"
                          title={item.title}
                        >
                          {item.title}
                        </div>
                      ))}
                      {dayContent.length > 2 && (
                        <div className="text-[11px] text-[#8E8E93] px-1.5">
                          +{dayContent.length - 2} more
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Legend */}
            <div className="flex items-center justify-center gap-6 mt-6 text-[13px] text-[#6C6C70]">
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
            <div className="border border-[#E5E5E7] rounded-[8px] overflow-hidden">
              <div className="bg-[#F5F5F7] px-4 py-3 border-b border-[#E5E5E7]">
                <h3 className="text-[14px] font-medium text-[#1C1C1E]">
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
                      <CalendarIcon className="w-10 h-10 mx-auto text-[#E5E5E7] mb-3" />
                      <p className="text-[13px] text-[#6C6C70] mb-4">
                        No posts scheduled
                      </p>
                      <Link
                        href={`/${currentTeam?.slug}/content/new?date=${selectedDate.toISOString()}`}
                        className="inline-flex items-center gap-2 px-3 py-1.5 bg-[#1C1C1E] text-white text-[13px] font-medium rounded-[6px] hover:bg-[#2C2C2E] transition-colors"
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
                          className="p-3 border border-[#E5E5E7] rounded-[6px] hover:border-[#1C1C1E] transition-colors"
                        >
                          <div className="flex items-center justify-between mb-2">
                            <span className="flex items-center gap-1.5 text-[12px] text-[#6C6C70]">
                              <Clock className="w-3 h-3" />
                              {formatTime(item.scheduledAt!)}
                            </span>
                            <div className="flex gap-1">
                              {item.platforms.map((p) => (
                                <span key={p} className="text-[12px] bg-[#F5F5F7] px-1 rounded">
                                  {platformIcons[p]}
                                </span>
                              ))}
                            </div>
                          </div>
                          <p className="text-[13px] font-medium text-[#1C1C1E]">
                            {item.title}
                          </p>
                        </div>
                      ))}
                    </div>
                  )
                ) : (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <CalendarIcon className="w-10 h-10 text-[#E5E5E7] mb-3" />
                    <p className="text-[13px] text-[#6C6C70]">
                      Click on a date to see scheduled posts
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Upcoming This Week */}
            <div className="mt-6">
              <h3 className="text-[14px] font-medium text-[#1C1C1E] mb-4">Upcoming</h3>
              <div className="space-y-2">
                {scheduledContent.slice(0, 4).map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center gap-3 p-3 bg-[#FAFAFA] rounded-[6px] hover:bg-[#F5F5F7] transition-colors"
                  >
                    <div className="w-10 h-10 bg-[#F0F7FF] rounded-[6px] flex items-center justify-center text-[#3B82F6]">
                      <Clock className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-medium text-[#1C1C1E] truncate">
                        {item.title}
                      </p>
                      <p className="text-[12px] text-[#8E8E93]">
                        {item.scheduledAt && new Date(item.scheduledAt).toLocaleDateString('en-US', {
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
      </div>
    </div>
  )
}