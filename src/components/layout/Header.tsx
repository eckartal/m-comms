'use client'

import Link from 'next/link'
import { Bell, Search } from 'lucide-react'
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

export function Header({ className }: { className?: string }) {
  return (
    <header className={cn(
      "flex items-center justify-between px-3 py-1.5 bg-black border-b border-[#262626]",
      className
    )}>
      <div className="flex items-center gap-3 flex-1 max-w-xs">
        <div className="relative flex-1">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-[#525252]" />
          <Input
            type="text"
            placeholder="Search..."
            className="pl-7 h-6 text-xs"
          />
        </div>
      </div>

      <div className="flex items-center gap-1">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-6 w-6 text-[#737373] hover:text-white">
              <Bell className="w-3.5 h-3.5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-64 bg-black border-[#262626]">
            <DropdownMenuLabel className="text-xs text-[#737373]">Notifications</DropdownMenuLabel>
            <DropdownMenuSeparator className="bg-[#262626]" />
            <DropdownMenuItem className="flex flex-col items-start gap-0.5 p-2">
              <p className="text-xs">New comment on your draft</p>
              <p className="text-[10px] text-[#525252]">2m ago</p>
            </DropdownMenuItem>
            <DropdownMenuItem className="flex flex-col items-start gap-0.5 p-2">
              <p className="text-xs">Content approved</p>
              <p className="text-[10px] text-[#525252]">1h ago</p>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-6 w-6 rounded-none">
              <Avatar className="h-5 w-5 border border-[#262626]">
                <AvatarImage src={undefined} />
                <AvatarFallback className="bg-[#171717] text-[10px]">EU</AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="bg-black border-[#262626]">
            <DropdownMenuLabel>
              <div className="flex flex-col gap-0.5">
                <p className="text-xs">Emre Kartal</p>
                <p className="text-[10px] text-[#525252]">emre@example.com</p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator className="bg-[#262626]" />
            <DropdownMenuItem className="text-xs hover:bg-[#171717]">
              Profile
            </DropdownMenuItem>
            <DropdownMenuItem className="text-xs hover:bg-[#171717]">
              Settings
            </DropdownMenuItem>
            <DropdownMenuSeparator className="bg-[#262626]" />
            <DropdownMenuItem className="text-xs text-[#737373] hover:text-white">
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}