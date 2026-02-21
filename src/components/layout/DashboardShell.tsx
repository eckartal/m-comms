'use client'

import { ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { Sheet, SheetContent } from '@/components/ui/sheet'

type DashboardShellProps = {
  sidebar: ReactNode
  mobileSidebar?: ReactNode
  header: ReactNode
  children: ReactNode
  sidebarCollapsed: boolean
  mobileSidebarOpen: boolean
  onMobileSidebarOpenChange: (open: boolean) => void
}

export function DashboardShell({
  sidebar,
  mobileSidebar,
  header,
  children,
  sidebarCollapsed,
  mobileSidebarOpen,
  onMobileSidebarOpenChange,
}: DashboardShellProps) {
  return (
    <div className="flex h-[100dvh] bg-background text-foreground transition-colors duration-200">
      <aside
        className={cn(
          'hidden border-r border-sidebar-border bg-sidebar md:flex md:flex-shrink-0',
          sidebarCollapsed ? 'md:w-[var(--sidebar-width-collapsed)]' : 'md:w-[var(--sidebar-width-expanded)]'
        )}
      >
        {sidebar}
      </aside>

      <Sheet open={mobileSidebarOpen} onOpenChange={onMobileSidebarOpenChange}>
        <SheetContent
          side="left"
          showCloseButton={false}
          className="w-[var(--sidebar-width-expanded)] border-sidebar-border bg-sidebar p-0 sm:max-w-none"
        >
          {mobileSidebar ?? sidebar}
        </SheetContent>
      </Sheet>

      <main className="flex min-w-0 flex-1 flex-col overflow-hidden">
        {header}
        <div className="flex-1 overflow-y-auto custom-scrollbar">{children}</div>
      </main>
    </div>
  )
}
