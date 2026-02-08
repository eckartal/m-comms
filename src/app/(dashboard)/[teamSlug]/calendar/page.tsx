'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { ChevronLeft, ChevronRight, Plus, Calendar as CalendarIcon } from 'lucide-react'
import { useAppStore } from '@/stores'
import { cn } from '@/lib/utils'

type ContentItem = {
  id: string
  title: string
  scheduledAt: string | null
  platforms: string[]
}

// Mock scheduled content (using API format)
const mockScheduled: ContentItem[] = [
  {
    id: '1',
    title: 'Product Launch',
    scheduledAt: '2025-02-10T10:00:00Z',
    platforms: ['twitter', 'linkedin'],
  },
  {
    id: '2',
    title: 'Weekly Newsletter',
    scheduledAt: '2025-02-11T09:00:00Z',
    platforms: ['blog'],
  },
  {
    id: '3',
    title: 'Behind the Scenes',
    scheduledAt: '2025-02-12T14:00:00Z',
    platforms: ['instagram'],
  },
  {
    id: '4',
    title: 'Customer Story',
    scheduledAt: '2025-02-12T11:00:00Z',
    platforms: ['linkedin'],
  },
  {
    id: '5',
    title: 'Industry Insights',
    scheduledAt: '2025-02-15T08:00:00Z',
    platforms: ['twitter'],
  },
]

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
]

export default function CalendarPage() {
  const { currentTeam } = useAppStore()
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [scheduledContent, setScheduledContent] = useState<ContentItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchScheduledContent() {
      if (!currentTeam?.id) return
      try {
        const res = await fetch(`/api/content?teamId=${currentTeam.id}&status=SCHEDULED`)
        if (res.ok) {
          const data = await res.json()
          setScheduledContent(data.data || [])
        } else {
          setScheduledContent(mockScheduled)
        }
      } catch (error) {
        console.error('Failed to fetch scheduled content:', error)
        setScheduledContent(mockScheduled)
      } finally {
        setLoading(false)
      }
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

  const getContentForDate = (day: number) => {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    return scheduledContent.filter((item) => item.scheduledAt?.startsWith(dateStr))
  }

  const selectedDateContent = selectedDate
    ? getContentByDate(selectedDate)
    : []

  function getContentByDate(date: Date) {
    const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
    return scheduledContent.filter((item) => item.scheduledAt?.startsWith(dateStr))
  }

  const renderCalendarDays = () => {
    const days = []

    // Empty cells for days before the first day of month
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(<div key={`empty-${i}`} className="h-24 border bg-muted/20" />)
    }

    // Days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day)
      const isToday = date.toDateString() === new Date().toDateString()
      const isSelected = selectedDate?.toDateString() === date.toDateString()
      const dayContent = getContentForDate(day)

      days.push(
        <div
          key={day}
          className={cn(
            'min-h-24 border p-2 transition-colors cursor-pointer',
            isSelected ? 'bg-primary/5' : 'hover:bg-muted/50'
          )}
          onClick={() => setSelectedDate(date)}
        >
          <div className="flex items-center justify-between">
            <span
              className={cn(
                'flex h-7 w-7 items-center justify-center rounded-full text-sm',
                isToday && 'bg-primary text-primary-foreground font-medium'
              )}
            >
              {day}
            </span>
            {dayContent.length > 0 && (
              <Badge variant="secondary" className="text-xs">
                {dayContent.length}
              </Badge>
            )}
          </div>
          <div className="mt-1 space-y-1">
            {dayContent.slice(0, 2).map((item) => (
              <div
                key={item.id}
                className="truncate rounded bg-primary/10 px-1.5 py-0.5 text-xs text-primary"
              >
                {item.title}
              </div>
            ))}
            {dayContent.length > 2 && (
              <div className="text-xs text-muted-foreground">
                +{dayContent.length - 2} more
              </div>
            )}
          </div>
        </div>
      )
    }

    return days
  }

  // Loading skeleton
  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <Skeleton className="h-8 w-32 mb-2" />
            <Skeleton className="h-4 w-48" />
          </div>
          <Skeleton className="h-10 w-40" />
        </div>
        <div className="grid gap-6 lg:grid-cols-4">
          <Skeleton className="lg:col-span-3 h-96" />
          <Skeleton className="h-64" />
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold">Calendar</h1>
          <p className="text-muted-foreground">
            Schedule and manage your content timeline
          </p>
        </div>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Schedule Content
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-4">
        {/* Calendar */}
        <Card className="lg:col-span-3">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>
              {MONTHS[month]} {year}
            </CardTitle>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="icon" onClick={prevMonth}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="sm" onClick={() => setCurrentDate(new Date(2025, 1, 1))}>
                Today
              </Button>
              <Button variant="outline" size="icon" onClick={nextMonth}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {/* Day headers */}
            <div className="grid grid-cols-7 gap-px border bg-border">
              {DAYS.map((day) => (
                <div
                  key={day}
                  className="bg-muted/50 py-2 text-center text-sm font-medium text-muted-foreground"
                >
                  {day}
                </div>
              ))}
            </div>
            {/* Calendar grid */}
            <div className="grid grid-cols-7 gap-px border-x border-b bg-border">
              {renderCalendarDays()}
            </div>
          </CardContent>
        </Card>

        {/* Selected Date Details */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              {selectedDate
                ? selectedDate.toLocaleDateString('en-US', {
                    weekday: 'long',
                    month: 'long',
                    day: 'numeric',
                  })
                : 'Select a date'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {selectedDate ? (
              <div className="space-y-4">
                {selectedDateContent.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No content scheduled for this date
                  </p>
                ) : (
                  selectedDateContent.map((item) => (
                    <div
                      key={item.id}
                      className="rounded-lg border p-3"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">
                          {item.scheduledAt ? new Date(item.scheduledAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : ''}
                        </span>
                        <div className="flex gap-1">
                          {(item.platforms || []).map((p: string) => (
                            <span key={p} className="text-xs">
                              {p === 'twitter' && '𝕏'}
                              {p === 'linkedin' && 'in'}
                              {p === 'instagram' && '📷'}
                              {p === 'blog' && '📝'}
                            </span>
                          ))}
                        </div>
                      </div>
                      <p className="mt-1 font-medium">{item.title}</p>
                    </div>
                  ))
                )}
                <Button variant="outline" className="w-full" size="sm">
                  <Plus className="mr-2 h-4 w-4" />
                  Add to this date
                </Button>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <CalendarIcon className="h-10 w-10 text-muted-foreground" />
                <p className="mt-2 text-sm text-muted-foreground">
                  Click on a date to see scheduled content
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Legend */}
      <div className="flex items-center justify-center gap-6 text-sm">
        <div className="flex items-center gap-2">
          <span className="text-lg">𝕏</span>
          <span>Twitter/X</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-lg">in</span>
          <span>LinkedIn</span>
        </div>
        <div className="flex items-center gap-2">
          <span>📷</span>
          <span>Instagram</span>
        </div>
        <div className="flex items-center gap-2">
          <span>📝</span>
          <span>Blog</span>
        </div>
      </div>
    </div>
  )
}