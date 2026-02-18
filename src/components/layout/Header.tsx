'use client'

import Link from 'next/link'
import { Bell, Search, Sun, Moon } from 'lucide-react'
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

export function Header({ className }: { className?: string }) {
  const { theme, toggleTheme } = useTheme()

  return (
    <header className={cn(
      "flex items-center justify-between px-3 py-1.5 bg-background border-b border-border transition-colors duration-200",
      className
    )}>
      <div className="flex items-center gap-3 flex-1 max-w-xs">
        <div className="relative flex-1">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search..."
            className="pl-7 h-6 text-xs"
          />
        </div>
      </div>

      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6"
          onClick={toggleTheme}
        >
          {theme === 'dark' ? (
            <Sun className="w-3.5 h-3.5 text-foreground hover:text-foreground" />
          ) : (
            <Moon className="w-3.5 h-3.5 text-foreground hover:text-foreground" />
          )}
          <span className="sr-only">Toggle theme</span>
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-6 w-6 text-foreground">
              <Bell className="w-3.5 h-3.5" />
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
            <Button variant="ghost" size="icon" className="h-6 w-6 rounded-none">
              <Avatar className="h-5 w-5 border border-border">
                <AvatarImage src={undefined} />
                <AvatarFallback className="bg-accent text-[10px]">EU</AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="bg-popover border-border">
            <DropdownMenuLabel>
              <div className="flex flex-col gap-0.5">
                <p className="text-xs">Emre Kartal</p>
                <p className="text-[10px] text-muted-foreground">emre@example.com</p>
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
            <DropdownMenuItem className="text-xs text-foreground hover:text-foreground">
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}