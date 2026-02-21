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
    <div className={cn('flex h-full min-w-[300px] max-w-[300px] flex-col overflow-hidden rounded-xl shadow-sm', className)}>
      {/* Column Header */}
      <div className={cn('flex items-center justify-between border-b border-border/70 px-4 py-3', color || 'bg-muted')}>
        <div className="flex items-center gap-2">
          <h3 className="font-semibold text-sm text-foreground">{title}</h3>
          {count !== undefined && (
            <span className="flex h-5 min-w-[18px] items-center justify-center rounded-full bg-background px-1.5 text-[10px] font-medium text-muted-foreground">
              {count}
            </span>
          )}
        </div>
      </div>

      {/* Column Body */}
      <div className="flex-1 space-y-3 overflow-y-auto bg-card/60 p-3 custom-scrollbar">
        {children}
      </div>
    </div>
  )
}
