'use client'

import { useState } from 'react'
import {
  Users,
  MessageCircle,
  BarChart3,
  Info,
  Sparkles,
  ChevronDown,
  Calendar,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface PublishControlsProps {
  onSchedule?: () => void
  onPublish?: () => void
  scheduledDate?: Date | null
}

export function PublishControls({
  onSchedule,
  onPublish,
  scheduledDate,
}: PublishControlsProps) {
  const [isScheduling, setIsScheduling] = useState(false)

  return (
    <div className="flex flex-col gap-4">
      {/* Primary Actions */}
      <div className="flex gap-2">
        <Button
          variant="outline"
          className={cn(
            'flex-1 gap-1.5 font-medium',
            'bg-[#FFB088] border-[#FFB088] text-gray-900',
            'hover:bg-[#FF9A70] hover:border-[#FF9A70]'
          )}
          onClick={onSchedule}
        >
          <Calendar className="h-4 w-4" />
          Schedule
          <ChevronDown className="h-3 w-3 ml-auto" />
        </Button>
        <Button
          className={cn(
            'flex-1 gap-1.5 font-medium',
            'bg-[#4A9EFF] border-[#4A9EFF] text-white',
            'hover:bg-[#3B8EF0] hover:border-[#3B8EF0]'
          )}
          onClick={onPublish}
        >
          Publish
        </Button>
      </div>

      {/* Utility Icons */}
      <div className="flex items-center justify-center gap-0.5">
        <Button variant="ghost" size="icon" className="h-7 w-7">
          <Users className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon" className="h-7 w-7">
          <MessageCircle className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon" className="h-7 w-7">
          <BarChart3 className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon" className="h-7 w-7">
          <Info className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon" className="h-7 w-7">
          <Sparkles className="h-4 w-4 text-purple-500" />
        </Button>
      </div>

      {/* Scheduled Date Display */}
      {scheduledDate && (
        <div className="text-center">
          <p className="text-xs text-muted-foreground">
            Scheduled for {scheduledDate.toLocaleDateString()}
          </p>
        </div>
      )}
    </div>
  )
}