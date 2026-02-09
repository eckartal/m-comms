'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import {
  Search,
  RefreshCcw,
  Columns,
  X,
  MoreHorizontal,
  Plus,
  Calendar,
  BarChart3,
  User,
  HelpCircle,
  Settings,
  ChevronRight,
  Trash2,
  Archive,
  TrendingUp,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'

interface Draft {
  id: string
  title: string
  updatedAt: Date
  status: 'draft' | 'scheduled' | 'posted'
}

const navigation = [
  { name: 'Calendar', href: '/calendar', icon: Calendar },
  { name: 'Analytics', href: '/analytics', icon: BarChart3 },
  { name: 'Public Profile', href: '/profile', icon: User },
  { name: 'Help', href: '/help', icon: HelpCircle },
  { name: 'Settings', href: '/settings', icon: Settings },
]

export function Sidebar() {
  const pathname = usePathname()
  const [activeTab, setActiveTab] = useState<'drafts' | 'scheduled' | 'posted'>('drafts')
  const [drafts, setDrafts] = useState<Draft[]>([
    {
      id: '1',
      title: 'We added torque and joint limits to Asimov\'s simulation...',
      updatedAt: new Date(),
      status: 'draft',
    },
    {
      id: '2',
      title: 'We\'re open-sourcing firmware for Asimov, a humanoid robot...',
      updatedAt: new Date(Date.now() - 86400000),
      status: 'scheduled',
    },
    {
      id: '3',
      title: 'We\'re going to have a pair of humanoid robot legs running...',
      updatedAt: new Date(Date.now() - 172800000),
      status: 'draft',
    },
  ])

  const handleDeleteDraft = (id: string) => {
    setDrafts(drafts.filter(d => d.id !== id))
  }

  const currentTeam = { name: 'Asimov', slug: 'asimovinc' }

  return (
    <aside className="w-72 border-r bg-[#F8F9FA] flex flex-col shrink-0">
      {/* Brand Header */}
      <div className="flex h-14 items-center justify-between border-b px-3">
        <Link href="/" className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-orange-400 to-pink-500">
            <span className="text-sm font-bold text-white">A</span>
          </div>
          <span className="font-semibold text-gray-900">Asimov</span>
          <span className="text-lg">®</span>
        </Link>
        <div className="flex items-center gap-0.5">
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <Search className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <RefreshCcw className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <Columns className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <X className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex border-b bg-white px-3">
        {(['drafts', 'scheduled', 'posted'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={cn(
              'flex-1 px-4 py-3 text-sm font-medium transition-colors relative',
              activeTab === tab
                ? 'text-gray-900'
                : 'text-muted-foreground hover:text-gray-700'
            )}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
            {activeTab === tab && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gray-900" />
            )}
          </button>
        ))}
      </div>

      {/* New Draft Button */}
      <div className="p-3">
        <Button className="w-full gap-1.5 bg-gray-200 hover:bg-gray-300 text-gray-900 font-medium">
          <Plus className="h-4 w-4" />
          New draft
        </Button>
      </div>

      {/* Draft List */}
      <div className="flex-1 overflow-y-auto">
        {drafts.map((draft) => (
          <div
            key={draft.id}
            className="group relative border-b border-gray-100 p-3 hover:bg-gray-100 cursor-pointer"
          >
            <div className="flex items-start justify-between gap-2">
              <p className="flex-1 text-sm text-gray-700 line-clamp-2">
                {draft.title}
              </p>
              <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={(e) => {
                    e.stopPropagation()
                    handleDeleteDraft(draft.id)
                  }}
                >
                  <X className="h-3 w-3" />
                </Button>
                <Button variant="ghost" size="icon" className="h-6 w-6">
                  <Archive className="h-3 w-3" />
                </Button>
              </div>
            </div>
            <p className="mt-1 text-xs text-gray-400">
              {draft.status === 'scheduled' ? 'Scheduled' : 'Saved'}
            </p>
          </div>
        ))}
      </div>

      {/* Latest Update Activity */}
      <div className="border-t">
        <div className="flex items-center justify-between p-3 cursor-pointer hover:bg-gray-100">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-blue-500" />
            <span className="text-sm font-medium text-gray-700">Latest update</span>
          </div>
          <ChevronRight className="h-4 w-4 text-gray-400" />
        </div>
      </div>

      {/* Bottom Navigation */}
      <div className="border-t bg-white px-2 py-1">
        <nav className="flex items-center justify-between">
          {navigation.map((item) => {
            const isActive = pathname.includes(item.href)
            return (
              <Link
                key={item.name}
                href={`/${currentTeam.slug}${item.href}`}
                className={cn(
                  'relative group flex flex-col items-center gap-0.5 px-2 py-2 text-xs transition-colors',
                  isActive
                    ? 'text-blue-500'
                    : 'text-muted-foreground hover:text-gray-900'
                )}
              >
                <item.icon className="h-5 w-5" />
                <span className="text-[10px]">{item.name}</span>
                {isActive && (
                  <div className="absolute left-0 right-0 -bottom-1 h-0.5 bg-blue-500" />
                )}
                {/* Tooltip on hover */}
                <span className="absolute left-1/2 -translate-x-1/2 -top-8 bg-gray-900 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">
                  {item.name}
                </span>
              </Link>
            )
          })}
        </nav>
      </div>
    </aside>
  )
}