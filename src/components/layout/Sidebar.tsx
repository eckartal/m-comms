'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard,
  FileText,
  Calendar,
  BarChart3,
  Users,
  Link2,
  Settings,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useAppStore } from '@/stores'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'

const navigation = [
  { name: 'Dashboard', href: '', icon: LayoutDashboard },
  { name: 'Content', href: '/content', icon: FileText },
  { name: 'Calendar', href: '/calendar', icon: Calendar },
  { name: 'Analytics', href: '/analytics', icon: BarChart3 },
  { name: 'Team', href: '/team', icon: Users },
  { name: 'Integrations', href: '/integrations', icon: Link2 },
]

export function Sidebar() {
  const pathname = usePathname()
  const { sidebarOpen, toggleSidebar } = useAppStore()
  const currentTeam = useAppStore((state) => state.currentTeam)
  const [isHovered, setIsHovered] = useState(false)

  // Notion-style: expand on hover, collapse when not hovered
  // sidebarOpen from store can override (for manual toggle)
  const isExpanded = sidebarOpen || isHovered

  return (
    <aside
      className={cn(
        'fixed left-0 top-0 z-40 h-screen border-r bg-sidebar transition-all duration-200 ease-out',
        isExpanded ? 'w-64' : 'w-14'
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="flex h-full flex-col">
        {/* Logo */}
        <div className="flex h-16 items-center border-b px-3">
          <Link href="/" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
              <span className="text-lg font-bold text-white">C</span>
            </div>
            {isExpanded && (
              <span className="font-semibold transition-opacity duration-200">
                ContentHub
              </span>
            )}
          </Link>
        </div>

        {/* Team Info */}
        {isExpanded && currentTeam && (
          <div className="border-b p-3 transition-opacity duration-200">
            <div className="flex items-center gap-2">
              <Avatar className="h-8 w-8">
                <AvatarImage src={currentTeam.logo || undefined} />
                <AvatarFallback className="bg-primary/10 text-primary">
                  {currentTeam.name.charAt(0)}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 truncate">
                <p className="truncate text-sm font-medium">{currentTeam.name}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {currentTeam.slug}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Navigation */}
        <nav className="flex-1 space-y-1 p-2">
          {navigation.map((item) => {
            const isActive = pathname.includes(item.href)
            return (
              <Link
                key={item.name}
                href={`/${currentTeam?.slug}${item.href}`}
                className={cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-primary/10 text-primary'
                    : 'text-muted-foreground hover:bg-accent hover:text-foreground',
                  !isExpanded && 'justify-center'
                )}
              >
                <item.icon className="h-5 w-5 shrink-0" />
                {isExpanded && <span>{item.name}</span>}
              </Link>
            )
          })}
        </nav>

        {/* Settings */}
        <div className="border-t p-2">
          <Link
            href={`/${currentTeam?.slug}/settings`}
            className={cn(
              'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground',
              !isExpanded && 'justify-center'
            )}
          >
            <Settings className="h-5 w-5" />
            {isExpanded && <span>Settings</span>}
          </Link>
        </div>

        {/* Collapse toggle */}
        <div className="border-t p-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleSidebar}
            className={cn(
              'w-full',
              isExpanded ? 'justify-start' : 'justify-center'
            )}
          >
            <span className="flex h-5 w-5 items-center justify-center">
              {isExpanded ? (
                <ChevronLeft className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
            </span>
            {isExpanded && <span className="ml-2">Collapse</span>}
          </Button>
        </div>
      </div>
    </aside>
  )
}