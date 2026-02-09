'use client'

import { useState } from 'react'
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
}

export function PublishControls({
  onSchedule,
  onPublish,
  scheduledDate,
  isPublishing = false,
  isScheduling = false,
}: PublishControlsProps) {
  return (
    <div className="flex flex-col gap-4">
      {/* Primary Actions - Fixed Button Hierarchy */}
      <div className="flex gap-3">
        {/* Schedule - Ghost style (secondary) */}
        <Button
          variant="outline"
          className={cn(
            'flex-1 gap-1.5 font-medium',
            'border-gray-300 bg-white text-gray-700',
            'hover:bg-gray-50 hover:border-gray-400',
            'py-2.5 px-4'
          )}
          onClick={onSchedule}
          disabled={isScheduling || isPublishing}
        >
          <Calendar className="h-4 w-4" />
          Schedule
          <ChevronDown className="h-3 w-3 ml-auto text-gray-400" />
        </Button>

        {/* Publish - Solid blue (primary) */}
        <Button
          className={cn(
            'flex-1 gap-1.5 font-medium',
            'bg-blue-500 border-blue-500 text-white',
            'hover:bg-blue-600 hover:border-blue-600',
            'py-2.5 px-6'
          )}
          onClick={onPublish}
          disabled={isPublishing || isScheduling}
        >
          {isPublishing ? (
            <>
              <span className="animate-spin">⏳</span>
              Publishing...
            </>
          ) : (
            'Publish'
          )}
        </Button>
      </div>

      {/* Keyboard Shortcut Hint */}
      <div className="text-center">
        <span className="text-xs text-gray-400">
          Press <kbd className="px-1.5 py-0.5 bg-gray-100 rounded text-gray-600">⌘</kbd>
          <kbd className="px-1.5 py-0.5 bg-gray-100 rounded text-gray-600">↵</kbd> to publish
        </span>
      </div>

      {/* Scheduled Date Display */}
      {scheduledDate && (
        <div className="flex items-center justify-center gap-2 text-sm text-gray-500">
          <CheckCircle2 className="h-4 w-4 text-green-500" />
          <span>Scheduled for {scheduledDate.toLocaleDateString()}</span>
        </div>
      )}
    </div>
  )
}