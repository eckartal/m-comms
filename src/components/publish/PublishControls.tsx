'use client'

import { useMemo, useState } from 'react'
import {
  ChevronDown,
  Calendar,
  CheckCircle2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { cn } from '@/lib/utils'

interface PublishControlsProps {
  onSchedule?: (scheduledAt: Date) => void | Promise<void>
  onPublish?: () => void
  scheduledDate?: Date | null
  isPublishing?: boolean
  isScheduling?: boolean
  scheduleDisabled?: boolean
  publishDisabled?: boolean
  publishHint?: string | null
}

function toDateTimeLocalValue(date: Date) {
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000)
  return local.toISOString().slice(0, 16)
}

function nextHour() {
  return new Date(Date.now() + 60 * 60 * 1000)
}

export function PublishControls({
  onSchedule,
  onPublish,
  scheduledDate,
  isPublishing = false,
  isScheduling = false,
  scheduleDisabled = false,
  publishDisabled = false,
  publishHint = null,
}: PublishControlsProps) {
  const [schedulePickerOpen, setSchedulePickerOpen] = useState(false)
  const [scheduleInput, setScheduleInput] = useState(() => toDateTimeLocalValue(nextHour()))

  const parsedScheduleDate = useMemo(() => {
    if (!scheduleInput) return null
    const date = new Date(scheduleInput)
    return Number.isNaN(date.getTime()) ? null : date
  }, [scheduleInput])

  const handleScheduleConfirm = async () => {
    if (!onSchedule || !parsedScheduleDate) return
    await onSchedule(parsedScheduleDate)
    setSchedulePickerOpen(false)
  }

  return (
    <div className="mt-2 flex flex-col gap-2">
      <div className="flex gap-2">
        <Popover
          open={schedulePickerOpen}
          onOpenChange={(open) => {
            setSchedulePickerOpen(open)
            if (open) setScheduleInput(toDateTimeLocalValue(scheduledDate || nextHour()))
          }}
        >
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                'flex-1 gap-1.5 font-medium',
                'border-[var(--sidebar-divider)] bg-[var(--sidebar-elevated)] text-foreground',
                'hover:bg-accent hover:text-foreground',
                'h-10 px-3',
                'disabled:opacity-50 disabled:cursor-not-allowed'
              )}
              disabled={scheduleDisabled || isScheduling || isPublishing}
            >
              <Calendar className="h-4 w-4" />
              Schedule
              <ChevronDown className="h-3 w-3 ml-auto text-muted-foreground" />
            </Button>
          </PopoverTrigger>
          <PopoverContent
            align="start"
            side="top"
            sideOffset={10}
            className="z-[120] isolate w-[320px] border border-border bg-background text-foreground shadow-2xl"
          >
            <div className="space-y-3">
              <div>
                <p className="text-sm font-medium text-foreground">Schedule</p>
                <p className="text-xs text-muted-foreground">Choose date and time</p>
              </div>
              <Input
                type="datetime-local"
                value={scheduleInput}
                onChange={(event) => setScheduleInput(event.target.value)}
              />
              <div className="flex items-center justify-end gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setSchedulePickerOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  size="sm"
                  onClick={() => void handleScheduleConfirm()}
                  disabled={!parsedScheduleDate || isScheduling || isPublishing}
                >
                  {isScheduling ? 'Scheduling...' : 'Confirm'}
                </Button>
              </div>
            </div>
          </PopoverContent>
        </Popover>

        <Button
          className={cn(
            'flex-1 gap-1.5 font-medium',
            'border border-[var(--sidebar-divider)] bg-foreground text-background',
            'hover:bg-foreground/90',
            'h-10 px-4',
            'disabled:opacity-50 disabled:cursor-not-allowed'
          )}
          onClick={onPublish}
          disabled={publishDisabled || isPublishing || isScheduling}
        >
          {isPublishing ? (
            <>
              <span className="animate-spin">◌</span>
              Publishing...
            </>
          ) : (
            'Publish'
          )}
        </Button>
      </div>

      {publishHint ? (
        <div className="text-center leading-none">
          <span className="text-xs text-muted-foreground">{publishHint}</span>
        </div>
      ) : null}

      <div className="text-center leading-none">
        <span className="text-xs text-muted-foreground">
          Press <kbd className="rounded border border-[var(--sidebar-divider)] bg-[var(--sidebar-elevated)] px-1.5 py-0.5 text-foreground font-medium">⌘</kbd>
          <kbd className="rounded border border-[var(--sidebar-divider)] bg-[var(--sidebar-elevated)] px-1.5 py-0.5 text-foreground font-medium">↵</kbd> to publish
        </span>
      </div>

      {scheduledDate && (
        <div className="flex items-center justify-center gap-2 text-sm text-emerald-500">
          <CheckCircle2 className="h-4 w-4" />
          <span>Scheduled for {scheduledDate.toLocaleString()}</span>
        </div>
      )}
    </div>
  )
}
