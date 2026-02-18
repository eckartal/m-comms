'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname, useParams } from 'next/navigation'
import { useAppStore } from '@/stores'
import { cn } from '@/lib/utils'
import { Home, BarChart3, Calendar, Settings, Hash, Plus, Users } from 'lucide-react'

interface Draft {
  id: string
  title: string
  updatedAt: Date
  status: 'draft' | 'scheduled' | 'posted'
}

export function Sidebar({ className }: { className?: string }) {
  const pathname = usePathname()
  const params = useParams()
  const teamSlug = params.teamSlug as string
  const { currentUser } = useAppStore()

  const primaryNavItems = [
    { icon: Home, href: `/${teamSlug}`, label: "Home" },
    { icon: Hash, href: `/${teamSlug}/collaboration`, label: "Collaboration" },
    { icon: Calendar, href: `/${teamSlug}/calendar`, label: "Calendar" },
    { icon: BarChart3, href: `/${teamSlug}/analytics`, label: "Analytics" },
  ]

  const [drafts] = useState<Draft[]>([
    { id: '1', title: 'Product launch announcement', updatedAt: new Date(), status: 'draft' },
    { id: '2', title: 'Weekly newsletter update', updatedAt: new Date(Date.now() - 86400000), status: 'scheduled' },
    { id: '3', title: 'Thank you post for new customers', updatedAt: new Date(Date.now() - 172800000), status: 'draft' },
  ])

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
    <aside className={cn("flex flex-col h-full bg-sidebar border-r border-sidebar-border w-[275px]", className)}>
      {/* Profile Avatar (Top) */}
      <div className="px-4 py-3 hover:bg-sidebar-accent transition-colors cursor-pointer">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="h-10 w-10 rounded-full bg-sidebar-primary flex items-center justify-center text-sidebar-primary-foreground font-bold text-sm">
              {currentUser?.name?.charAt(0).toUpperCase() || 'U'}
            </div>
            <div className="absolute bottom-0 right-0 h-3 w-3 bg-emerald-500 rounded-full border-2 border-sidebar-border"></div>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-foreground truncate">
              {currentUser?.name || 'User'}
            </p>
            <p className="text-xs text-muted-foreground truncate">
              @{currentUser?.email?.split('@')[0] || 'user'}
            </p>
          </div>
        </div>
      </div>

      {/* New Post button */}
      <div className="px-4 py-3 border-b border-sidebar-border">
        <Link
          href={`/${teamSlug}/content/new`}
          className="flex items-center gap-2 w-full px-4 py-2.5 bg-white text-black text-sm font-semibold rounded-full hover:bg-gray-100 transition-colors dark:bg-white dark:text-black dark:hover:bg-gray-100"
        >
          <Plus className="w-5 h-5" />
          <span className="flex-1 text-center">Post</span>
        </Link>
      </div>

      {/* Primary Navigation */}
      <nav className="flex-1 overflow-y-auto custom-scrollbar py-2">
        <div className="px-2">
          {/* Primary Nav Items */}
          <div className="space-y-0.5">
            {primaryNavItems.map((item) => {
              const isActive = pathname === item.href
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-4 px-4 py-3 transition-colors rounded-full hover:bg-accent",
                    isActive ? "font-semibold text-foreground" : "text-foreground hover:text-foreground"
                  )}
                >
                  <item.icon className={cn("w-7 h-7 flex-shrink-0", isActive && "text-primary")} />
                  <span className="text-[15px]">{item.label}</span>
                  {isActive && (
                    <div className="ml-auto text-primary">
                      <div className="w-1.5 h-1.5 rounded-full bg-current"></div>
                    </div>
                  )}
                </Link>
              )
            })}
          </div>

          {/* Drafts Section - Subtle Divider */}
          <div className="my-3 px-4">
            <div className="h-px bg-sidebar-border"></div>
          </div>
          <div className="px-4 py-2">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Drafts
              </span>
              <Link
                href={`/${teamSlug}/content`}
                className="text-xs text-primary hover:text-primary/80"
              >
                Show all
              </Link>
            </div>
            <div className="space-y-1 max-h-[200px] overflow-y-auto custom-scrollbar">
              {drafts.map((draft) => {
                const isActive = pathname === `/${teamSlug}/content/${draft.id}`
                return (
                  <Link
                    key={draft.id}
                    href={`/${teamSlug}/content/${draft.id}`}
                    className={cn(
                      "flex items-center gap-3 px-3 py-2.5 rounded-full hover:bg-accent transition-colors",
                      isActive && "bg-accent"
                    )}
                  >
                    <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <span className="text-[9px] font-semibold text-primary">P</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={cn("text-sm truncate", isActive ? "text-foreground font-medium" : "text-foreground")}>
                        {draft.title}
                      </p>
                      <p className="text-[10px] text-muted-foreground">{getRelativeTime(draft.updatedAt)}</p>
                    </div>
                  </Link>
                )
              })}
            </div>
          </div>
        </div>
      </nav>

      {/* Sticky Settings Footer */}
      <div className="border-t border-sidebar-border p-2">
        <Link
          href={`/${teamSlug}/settings`}
          className={cn(
            "flex items-center gap-4 px-4 py-3 w-full rounded-full hover:bg-accent transition-colors",
            pathname === `/${teamSlug}/settings` ? "text-foreground" : "text-muted-foreground"
          )}
        >
          <Settings className="w-7 h-7 flex-shrink-0" />
          <span className="text-[15px]">Settings</span>
        </Link>
      </div>
    </aside>
  )
}
