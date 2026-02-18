'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname, useParams } from 'next/navigation'
import { cn } from '@/lib/utils'
import { Home, BarChart3, Calendar, Settings, Users, Zap, Plus, Image, Bookmark, MessageSquare } from 'lucide-react'

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

  const navItems = [
    { icon: Home, href: `/${teamSlug}`, label: "Home" },
    { icon: BarChart3, href: `/${teamSlug}/analytics`, label: "Analytics" },
    { icon: Calendar, href: `/${teamSlug}/calendar`, label: "Calendar" },
    { icon: Settings, href: `/${teamSlug}/settings`, label: "Settings" },
  ]

  const bottomNavItems = [
    { icon: Image, href: `/${teamSlug}/content`, label: "Drafts", tooltip: "Drafts" },
    { icon: Users, href: `/${teamSlug}/team`, label: "Team", tooltip: "Team" },
    { icon: Zap, href: `/${teamSlug}/features`, label: "Features", tooltip: "Features" },
    { icon: Bookmark, href: `/${teamSlug}/saved`, label: "Saved", tooltip: "Saved" },
    { icon: MessageSquare, href: `/${teamSlug}/threads`, label: "Threads", tooltip: "Threads" },
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

  return (
    <aside className={cn("flex flex-col h-full bg-black border-r border-border", className)}>
      {/* New Post button */}
      <div className="px-2 py-2 border-b border-border">
        <Link
          href={`/${teamSlug}/content/new`}
          className="flex items-center justify-center gap-1.5 w-full px-2 py-1.5 bg-white text-black text-xs font-medium hover:bg-white/90 transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>New post</span>
        </Link>
      </div>

      {/* Main Navigation */}
      <nav className="flex-1 overflow-y-auto custom-scrollbar py-2">
        <div className="space-y-0.5 px-1.5">
          {navItems.map((item) => {
            const isActive = pathname === item.href
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-2 px-2 py-1.5 transition-colors text-xs",
                  isActive
                    ? "text-white"
                    : "text-muted-foreground hover:text-white"
                )}
              >
                <item.icon className={cn("w-3.5 h-3.5 flex-shrink-0", isActive && "text-primary")} />
                <span>{item.label}</span>
              </Link>
            )
          })}
        </div>

        {/* Drafts Section */}
        <div className="mt-4 px-1.5">
          <div className="flex items-center justify-between px-2 mb-1">
            <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
              Drafts
            </span>
            <Link
              href={`/${teamSlug}/content`}
              className="text-[10px] text-muted-foreground hover:text-white"
            >
              all
            </Link>
          </div>
          <div className="space-y-0.5">
            {drafts.map((draft) => {
              const isActive = pathname === `/${teamSlug}/content/${draft.id}`
              return (
                <Link
                  key={draft.id}
                  href={`/${teamSlug}/content/${draft.id}`}
                  className={cn(
                    "flex items-center gap-2 px-2 py-1.5 transition-colors",
                    isActive && "border-l border-primary -ml-[1px]"
                  )}
                >
                  <div className="flex-1 min-w-0">
                    <p className={cn("text-xs truncate", isActive ? "text-white" : "text-foreground")}>
                      {draft.title}
                    </p>
                    <p className="text-[10px] text-muted-foreground">{getRelativeTime(draft.updatedAt)}</p>
                  </div>
                </Link>
              )
            })}
          </div>
        </div>
      </nav>

      {/* Bottom Navigation */}
      <div className="border-t border-border py-1.5 px-1">
        <div className="flex items-center justify-between px-1">
          {bottomNavItems.map((item) => {
            const isActive = pathname === item.href
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center justify-center p-1.5 transition-colors",
                  isActive ? "text-primary" : "text-muted-foreground hover:text-white"
                )}
                title={item.tooltip}
              >
                <item.icon className="w-3.5 h-3.5" />
              </Link>
            )
          })}
        </div>
      </div>
    </aside>
  )
}