'use client'

import { useRouter } from 'next/navigation'
import { Bell, Search, Sun, Moon, PanelLeft, PanelLeftClose, Menu } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { cn } from '@/lib/utils'
import { useTheme } from '@/components/theme/ThemeProvider'
import { createClient } from '@/lib/supabase/client'
import { useAppStore, useContentStore } from '@/stores'

type HeaderProps = {
  className?: string
  sidebarCollapsed?: boolean
  onSidebarToggle?: () => void
  onMobileMenuClick?: () => void
}

export function Header({
  className,
  sidebarCollapsed = false,
  onSidebarToggle,
  onMobileMenuClick,
}: HeaderProps) {
  const router = useRouter()
  const { theme, toggleTheme } = useTheme()
  const currentUser = useAppStore((state) => state.currentUser)
  const setCurrentUser = useAppStore((state) => state.setCurrentUser)
  const setCurrentTeam = useAppStore((state) => state.setCurrentTeam)
  const setTeams = useAppStore((state) => state.setTeams)
  const setOnboarded = useAppStore((state) => state.setOnboarded)
  const setContents = useContentStore((state) => state.setContents)

  const handleSignOut = async () => {
    try {
      const supabase = createClient()
      await supabase.auth.signOut()
    } finally {
      setCurrentUser(null)
      setCurrentTeam(null)
      setTeams([])
      setOnboarded(false)
      setContents([])
      useContentStore.getState().setLoadedTeamId(null)
      useContentStore.getState().setContentError(null)
      useContentStore.getState().setContentLoading(false)
      router.push('/login')
      router.refresh()
    }
  }

  return (
    <header className={cn(
      "flex h-[var(--header-height)] items-center justify-between gap-3 border-b border-border bg-background px-3 transition-colors duration-200 md:px-4",
      className
    )}>
      <div className="flex min-w-0 flex-1 items-center gap-2 md:max-w-sm">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 md:hidden"
          onClick={onMobileMenuClick}
        >
          <Menu className="h-4 w-4" />
          <span className="sr-only">Open navigation</span>
        </Button>

        <Button
          variant="ghost"
          size="icon"
          className="hidden h-8 w-8 md:inline-flex"
          onClick={onSidebarToggle}
        >
          {sidebarCollapsed ? <PanelLeft className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
          <span className="sr-only">Toggle sidebar</span>
        </Button>

        <div className="relative min-w-0 flex-1">
          <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search..."
            className="h-8 border-input bg-muted/40 pl-8 text-xs"
          />
        </div>
      </div>

      <div className="flex items-center gap-1.5">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={toggleTheme}
        >
          {theme === 'dark' ? (
            <Sun className="h-4 w-4 text-foreground hover:text-foreground" />
          ) : (
            <Moon className="h-4 w-4 text-foreground hover:text-foreground" />
          )}
          <span className="sr-only">Toggle theme</span>
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8 text-foreground">
              <Bell className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-64 bg-popover border-border">
            <DropdownMenuLabel className="text-xs text-muted-foreground">Notifications</DropdownMenuLabel>
            <DropdownMenuSeparator className="bg-border" />
            <DropdownMenuItem className="flex flex-col items-start gap-0.5 p-2">
              <p className="text-xs">New comment on your draft</p>
              <p className="text-[10px] text-muted-foreground">2m ago</p>
            </DropdownMenuItem>
            <DropdownMenuItem className="flex flex-col items-start gap-0.5 p-2">
              <p className="text-xs">Content approved</p>
              <p className="text-[10px] text-muted-foreground">1h ago</p>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-none">
              <Avatar className="h-6 w-6 border border-border">
                <AvatarImage src={currentUser?.avatar_url || undefined} />
                <AvatarFallback className="bg-accent text-[10px]">
                  {(currentUser?.name || 'U').slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="bg-popover border-border">
            <DropdownMenuLabel>
              <div className="flex flex-col gap-0.5">
                <p className="text-xs">{currentUser?.name || 'Unknown User'}</p>
                <p className="text-[10px] text-muted-foreground">{currentUser?.email || '-'}</p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator className="bg-border" />
            <DropdownMenuItem className="text-xs hover:bg-accent">
              Profile
            </DropdownMenuItem>
            <DropdownMenuItem className="text-xs hover:bg-accent">
              Settings
            </DropdownMenuItem>
            <DropdownMenuSeparator className="bg-border" />
            <DropdownMenuItem
              className="text-xs text-foreground hover:text-foreground"
              onClick={handleSignOut}
            >
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
