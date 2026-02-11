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
            'border-[#E5E5E7] bg-white text-[#6C6C70]',
            'hover:bg-[#FAFAFA] hover:text-[#1C1C1E] hover:border-[#1C1C1E]',
            'py-2.5 px-4',
            'disabled:opacity-50 disabled:cursor-not-allowed'
          )}
          onClick={onSchedule}
          disabled={disabled || isScheduling || isPublishing}
        >
          <Calendar className="h-4 w-4" />
          Schedule
          <ChevronDown className="h-3 w-3 ml-auto text-[#8E8E93]" />
        </Button>

        {/* Publish - Solid black (primary) */}
        <Button
          className={cn(
            'flex-1 gap-1.5 font-medium',
            'bg-[#1C1C1E] border-[#1C1C1E] text-white',
            'hover:bg-[#2C2C2E] hover:border-[#2C2C2E]',
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
        <span className="text-xs text-[#8E8E93]">
          Press <kbd className="px-1.5 py-0.5 bg-[#F5F5F7] rounded text-[#6C6C70] font-medium">⌘</kbd>
          <kbd className="px-1.5 py-0.5 bg-[#F5F5F7] rounded text-[#6C6C70] font-medium">↵</kbd> to publish
        </span>
      </div>

      {/* Scheduled Date Display */}
      {scheduledDate && (
        <div className="flex items-center justify-center gap-2 text-sm text-[#34C759]">
          <CheckCircle2 className="h-4 w-4" />
          <span>Scheduled for {scheduledDate.toLocaleDateString()}</span>
        </div>
      )}
    </div>
  )
}