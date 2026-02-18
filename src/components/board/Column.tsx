'use client'

import { ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface ColumnProps {
  title: string
  count?: number
  color?: string
  children: ReactNode
  className?: string
}

export function Column({ title, count, color, children, className }: ColumnProps) {
  return (
    <div className={cn('flex flex-col h-full min-w-[280px] max-w-[280px] rounded-xl', className)}>
      {/* Column Header */}
      <div className={cn('flex items-center justify-between px-4 py-3 rounded-t-xl', color || 'bg-gray-900')}>
        <div className="flex items-center gap-2">
          <h3 className="font-semibold text-sm text-foreground">{title}</h3>
          {count !== undefined && (
            <span className="flex items-center justify-center min-w-[18px] h-5 px-1.5 rounded-full bg-gray-800 text-[10px] font-medium text-muted-foreground">
              {count}
            </span>
          )}
        </div>
      </div>

      {/* Column Body */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3 custom-scrollbar">
        {children}
      </div>
    </div>
  )
}
