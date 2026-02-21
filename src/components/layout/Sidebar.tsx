'use client'

import { useMemo } from 'react'
import Link from 'next/link'
import { usePathname, useParams } from 'next/navigation'
import { useAppStore, useContentStore } from '@/stores'
import { cn } from '@/lib/utils'
import { Home, BarChart3, Calendar, Settings, Hash, Plus } from 'lucide-react'

type SidebarProps = {
  className?: string
  collapsed?: boolean
  onNavigate?: () => void
}

export function Sidebar({ className, collapsed = false, onNavigate }: SidebarProps) {
  const pathname = usePathname()
  const params = useParams()
  const teamSlug = params.teamSlug as string
  const { currentUser } = useAppStore()
  const contents = useContentStore((state) => state.contents)
  const contentLoading = useContentStore((state) => state.contentLoading)

  const primaryNavItems = [
    { icon: Home, href: `/${teamSlug}`, label: "Home" },
    { icon: Hash, href: `/${teamSlug}/collaboration`, label: "Collaboration" },
    { icon: Calendar, href: `/${teamSlug}/calendar`, label: "Calendar" },
    { icon: BarChart3, href: `/${teamSlug}/analytics`, label: "Analytics" },
  ]

  const drafts = useMemo(
    () =>
      contents
        .filter((content) => content.status === 'DRAFT')
        .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
        .slice(0, 3)
        .map((content) => ({
          id: content.id,
          title: content.title,
          updatedAt: new Date(content.updated_at),
        })),
    [contents]
  )

  const getRelativeTime = (date: Date) => {
    const seconds = Math.floor((Date.now() - date.getTime()) / 1000)
    if (seconds < 60) return 'just now'
    const minutes = Math.floor(seconds / 60)
    if (minutes < 60) return `${minutes}m ago`
    const hours = Math.floor(minutes / 60)
    if (hours < 24) return `${hours}h ago`
    const days = Math.floor(hours / 24)
    return `${days}d ago`
  }

  // activePrimaryItem not used currently, kept for future use

  return (
    <aside className={cn('flex h-full w-full flex-col bg-sidebar', className)}>
      <div className={cn('border-b border-sidebar-border p-3', collapsed && 'px-2.5')}>
        <div className={cn('flex items-center gap-3', collapsed && 'justify-center')}>
          <div className="relative">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-sidebar-primary text-sm font-bold text-sidebar-primary-foreground">
              {currentUser?.name?.charAt(0).toUpperCase() || 'U'}
            </div>
            <div className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-sidebar-border bg-emerald-500" />
          </div>
          {!collapsed && (
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-foreground">{currentUser?.name || 'User'}</p>
              <p className="truncate text-xs text-muted-foreground">
                Logged in as @{currentUser?.email?.split('@')[0] || 'user'}
              </p>
            </div>
          )}
        </div>
      </div>

      <div className={cn('border-b border-sidebar-border p-3', collapsed && 'px-2.5')}>
        <Link
          href={`/${teamSlug}/content/new`}
          onClick={onNavigate}
          title={collapsed ? 'Post' : undefined}
          className={cn(
            'flex w-full items-center gap-2 rounded-full bg-white px-4 py-2.5 text-sm font-semibold text-black transition-colors hover:bg-gray-100',
            collapsed && 'justify-center px-2.5'
          )}
        >
          <Plus className="h-5 w-5" />
          {!collapsed && <span className="flex-1 text-center">Post</span>}
        </Link>
      </div>

      <nav className="flex-1 overflow-y-auto py-2 custom-scrollbar">
        <div className={cn('px-2', collapsed && 'px-1.5')}>
          <div className="space-y-1">
            {primaryNavItems.map((item) => {
              const isActive = pathname === item.href
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onNavigate}
                  title={collapsed ? item.label : undefined}
                  className={cn(
                    'flex items-center gap-3 rounded-full px-3 py-2.5 transition-colors hover:bg-accent',
                    collapsed && 'justify-center px-2',
                    isActive ? 'font-semibold text-foreground' : 'text-foreground hover:text-foreground'
                  )}
                >
                  <item.icon className={cn('h-5 w-5 flex-shrink-0', isActive && 'text-primary')} />
                  {!collapsed && <span className="text-sm">{item.label}</span>}
                  {!collapsed && isActive && (
                    <div className="ml-auto text-primary">
                      <div className="h-1.5 w-1.5 rounded-full bg-current" />
                    </div>
                  )}
                </Link>
              )
            })}
          </div>

          {!collapsed && (
            <div className="px-3 pb-2 pt-3">
              <div className="h-px bg-sidebar-border" />
            </div>
          )}

          {!collapsed && (
            <div className="px-3 py-1">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Drafts ({drafts.length})
                </span>
                <Link href={`/${teamSlug}/content`} onClick={onNavigate} className="text-xs text-primary hover:text-primary/80">
                  Show all
                </Link>
              </div>
              <div className="max-h-[200px] space-y-1 overflow-y-auto custom-scrollbar">
                {contentLoading && <p className="px-3 py-2 text-xs text-muted-foreground">Loading drafts...</p>}
                {!contentLoading && drafts.length === 0 && <p className="px-3 py-2 text-xs text-muted-foreground">No drafts yet</p>}
                {drafts.map((draft) => {
                  const isActive = pathname === `/${teamSlug}/content/${draft.id}`
                  return (
                    <Link
                      key={draft.id}
                      href={`/${teamSlug}/content/${draft.id}`}
                      onClick={onNavigate}
                      className={cn(
                        'flex items-center gap-3 rounded-full px-3 py-2.5 transition-colors hover:bg-accent',
                        isActive && 'bg-accent'
                      )}
                    >
                      <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-primary/10">
                        <span className="text-[9px] font-semibold text-primary">P</span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className={cn('truncate text-sm', isActive ? 'font-medium text-foreground' : 'text-foreground')}>
                          {draft.title}
                        </p>
                        <p className="text-[10px] text-muted-foreground">{getRelativeTime(draft.updatedAt)}</p>
                      </div>
                    </Link>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      </nav>

      <div className={cn('border-t border-sidebar-border p-2', collapsed && 'px-1.5')}>
        <Link
          href={`/${teamSlug}/settings`}
          onClick={onNavigate}
          title={collapsed ? 'Settings' : undefined}
          className={cn(
            'flex w-full items-center gap-3 rounded-full px-3 py-2.5 transition-colors hover:bg-accent',
            collapsed && 'justify-center px-2',
            pathname === `/${teamSlug}/settings` ? 'text-foreground' : 'text-muted-foreground'
          )}
        >
          <Settings className="h-5 w-5 flex-shrink-0" />
          {!collapsed && <span className="text-sm">Settings</span>}
        </Link>
      </div>
    </aside>
  )
}
