'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname, useParams } from 'next/navigation'
import { cn } from '@/lib/utils'
import { Home, BarChart3, Calendar, Settings, Users, Zap, Plus, Image, Bookmark, MessageSquare, Thread } from 'lucide-react'

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
    <aside className={cn("flex flex-col h-full bg-background border-r border-[#E5E5E7]", className)}>
      {/* New Post button */}
      <div className="px-4 py-4 border-b border-[#E5E5E7]">
        <Link
          href={`/${teamSlug}/content/new`}
          className="flex items-center justify-center gap-2 w-full px-4 py-2.5 bg-[#1C1C1E] text-white text-[14px] font-medium rounded-[6px] hover:bg-[#2C2C2E] transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>New post</span>
        </Link>
      </div>

      {/* Main Navigation */}
      <nav className="flex-1 overflow-y-auto custom-scrollbar py-4">
        <div className="space-y-1 px-3">
          {navItems.map((item) => {
            const isActive = pathname === item.href
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors text-[14px]",
                  isActive
                    ? "text-[#1C1C1E] font-medium"
                    : "text-[#6C6C70] hover:text-[#1C1C1E]"
                )}
              >
                <item.icon className={cn("w-5 h-5 flex-shrink-0", isActive && "text-[#007AFF]")} />
                <span>{item.label}</span>
              </Link>
            )
          })}
        </div>

        {/* Drafts Section */}
        <div className="mt-6 px-3">
          <div className="flex items-center justify-between px-3 mb-2">
            <span className="text-[13px] font-medium text-[#8E8E93] uppercase tracking-wide">
              Drafts
            </span>
            <Link
              href={`/${teamSlug}/content`}
              className="text-[13px] text-[#6C6C70] hover:text-[#1C1C1E]"
            >
              View all
            </Link>
          </div>
          <div className="space-y-1">
            {drafts.map((draft) => {
              const isActive = pathname === `/${teamSlug}/content/${draft.id}`
              return (
                <Link
                  key={draft.id}
                  href={`/${teamSlug}/content/${draft.id}`}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2 rounded-lg transition-colors",
                    isActive && "border-l-2 border-[#007AFF] pl-[10px]"
                  )}
                >
                  <div className="flex-1 min-w-0">
                    <p className={cn("text-[14px] truncate", isActive ? "text-[#1C1C1E] font-medium" : "text-[#1C1C1E]")}>
                      {draft.title}
                    </p>
                    <p className="text-[13px] text-[#8E8E93]">{getRelativeTime(draft.updatedAt)}</p>
                  </div>
                </Link>
              )
            })}
          </div>
        </div>
      </nav>

      {/* Bottom Navigation */}
      <div className="border-t border-[#E5E5E7] py-3 px-2">
        <div className="flex items-center justify-between">
          {bottomNavItems.map((item) => {
            const isActive = pathname === item.href
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center justify-center p-2 rounded-lg transition-colors relative group",
                  isActive ? "text-[#007AFF]" : "text-[#6C6C70] hover:text-[#1C1C1E]"
                )}
                title={item.tooltip}
              >
                <item.icon className="w-5 h-5" />
              </Link>
            )
          })}
        </div>
      </div>
    </aside>
  )
}