'use client'

import {
  ChevronDown,
  Calendar,
  CheckCircle2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface PublishControlsProps {
  onSchedule?: () => void
  onPublish?: () => void
  scheduledDate?: Date | null
  isPublishing?: boolean
  isScheduling?: boolean
  disabled?: boolean
}

export function PublishControls({
  onSchedule,
  onPublish,
  scheduledDate,
  isPublishing = false,
  isScheduling = false,
  disabled = false,
}: PublishControlsProps) {
  return (
    <div className="flex flex-col gap-4 mt-8">
      {/* Primary Actions - Fixed Button Hierarchy */}
      <div className="flex gap-3">
        {/* Schedule - Ghost style (secondary) */}
        <Button
          variant="outline"
          className={cn(
            'flex-1 gap-1.5 font-medium',
            'border-input bg-background text-foreground',
            'hover:bg-accent hover:text-accent-foreground hover:border-ring',
            'py-2.5 px-4',
            'disabled:opacity-50 disabled:cursor-not-allowed'
          )}
          onClick={onSchedule}
          disabled={disabled || isScheduling || isPublishing}
        >
          <Calendar className="h-4 w-4" />
          Schedule
          <ChevronDown className="h-3 w-3 ml-auto text-muted-foreground" />
        </Button>

        {/* Publish - Primary action */}
        <Button
          className={cn(
            'flex-1 gap-1.5 font-medium',
            'border-foreground bg-foreground text-background',
            'hover:bg-foreground/90 hover:border-foreground/90',
            'py-2.5 px-6',
            'disabled:opacity-50 disabled:cursor-not-allowed'
          )}
          onClick={onPublish}
          disabled={disabled || isPublishing || isScheduling}
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

      {/* Keyboard Shortcut Hint */}
      <div className="text-center">
        <span className="text-xs text-muted-foreground">
          Press <kbd className="px-1.5 py-0.5 bg-muted rounded text-foreground font-medium">⌘</kbd>
          <kbd className="px-1.5 py-0.5 bg-muted rounded text-foreground font-medium">↵</kbd> to publish
        </span>
      </div>

      {/* Scheduled Date Display */}
      {scheduledDate && (
        <div className="flex items-center justify-center gap-2 text-sm text-emerald-500">
          <CheckCircle2 className="h-4 w-4" />
          <span>Scheduled for {scheduledDate.toLocaleDateString()}</span>
        </div>
      )}
    </div>
  )
}
