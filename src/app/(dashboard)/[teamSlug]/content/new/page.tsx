'use client'

import { useState, useEffect, KeyboardEvent } from 'react'
import { useRouter, useParams } from 'next/navigation'
import {
  ArrowLeft,
  List,
  Sparkles,
  ChevronDown,
  Check,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { EditorToolbar } from '@/components/editor/EditorToolbar'
import { PublishControls } from '@/components/publish/PublishControls'

export default function NewContentPage() {
  const router = useRouter()
  const params = useParams()
  const teamSlug = params.teamSlug as string

  const [content, setContent] = useState('')
  const [isBookmarked, setIsBookmarked] = useState(false)
  const [isPublishing, setIsPublishing] = useState(false)
  const [isSaved, setIsSaved] = useState(true)

  const characterCount = content.length
  const maxCharacters = 280

  // Auto-save indicator
  useEffect(() => {
    if (content) {
      setIsSaved(false)
      const timer = setTimeout(() => setIsSaved(true), 1000)
      return () => clearTimeout(timer)
    }
  }, [content])

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
        e.preventDefault()
        handlePublish()
      }
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault()
        // Already auto-saving
      }
    }

    document.addEventListener('keydown', handleKeyDown as any)
    return () => document.removeEventListener('keydown', handleKeyDown as any)
  }, [content])

  const handlePublish = async () => {
    if (characterCount === 0) return
    setIsPublishing(true)
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1500))
    setIsPublishing(false)
    router.push(`/${teamSlug}/content`)
  }

  const handleSchedule = () => {
    console.log('Scheduling:', content)
  }

  // Mock current user data
  const currentUser = {
    name: 'Asimov',
    handle: '@asimovinc',
    avatar_url: null,
  }

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Top Bar - Back Button & Account Switcher */}
      <header className="flex items-center justify-between px-4 py-2 border-b">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.back()}
          className="text-gray-500"
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back
        </Button>

        {/* Auto-save Indicator */}
        <div className="flex items-center gap-2 text-sm text-gray-500">
          {isSaved ? (
            <>
              <Check className="h-4 w-4 text-green-500" />
              Saved
            </>
          ) : (
            'Saving...'
          )}
        </div>

        {/* Account Switcher with Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-gray-100 transition-colors">
              <Avatar className="h-7 w-7">
                <AvatarImage src={currentUser.avatar_url || undefined} />
                <AvatarFallback className="bg-gradient-to-br from-orange-400 to-pink-500 text-white text-xs">
                  A
                </AvatarFallback>
              </Avatar>
              <div className="flex items-center gap-1">
                <span className="font-medium text-sm text-gray-900">{currentUser.name}</span>
                <span className="text-gray-400">✓</span>
              </div>
              <ChevronDown className="h-3 w-3 text-gray-400" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem>Switch Account</DropdownMenuItem>
            <DropdownMenuItem>Manage Accounts</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </header>

      {/* Composition Area */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-2xl mx-auto py-6 px-6">
          <textarea
            placeholder="What would you like to share?"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="w-full min-h-[200px] resize-none border-none outline-none text-base text-gray-900 placeholder:text-gray-400 leading-relaxed"
            style={{ lineHeight: '1.6' }}
          />
        </div>
      </div>

      {/* Editor Toolbar */}
      <EditorToolbar
        characterCount={characterCount}
        maxCharacters={maxCharacters}
        isBookmarked={isBookmarked}
        onBookmark={() => setIsBookmarked(!isBookmarked)}
      />

      {/* Publishing Controls */}
      <div className="border-t px-6 py-4 bg-white">
        <PublishControls
          onSchedule={handleSchedule}
          onPublish={handlePublish}
          isPublishing={isPublishing}
        />
      </div>
    </div>
  )
}