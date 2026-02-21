'use client'

import { ReactNode } from 'react'
import { cn } from '@/lib/utils'

type DashboardContainerProps = {
  children: ReactNode
  className?: string
}

export function DashboardContainer({ children, className }: DashboardContainerProps) {
  return (
    <div
      className={cn(
        'mx-auto w-full max-w-[var(--content-max-width)] px-[var(--content-gutter-sm)] py-6 md:px-[var(--content-gutter-md)] md:py-8 lg:px-[var(--content-gutter-lg)]',
        className
      )}
    >
      {children}
    </div>
  )
}
