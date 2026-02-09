'use client'

import { useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import {
  ArrowLeft,
  List,
  Sparkles,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { EditorToolbar } from '@/components/editor/EditorToolbar'
import { PublishControls } from '@/components/publish/PublishControls'

export default function NewContentPage() {
  const router = useRouter()
  const params = useParams()
  const teamSlug = params.teamSlug as string

  const [content, setContent] = useState('')
  const [isBookmarked, setIsBookmarked] = useState(false)

  const characterCount = content.length
  const maxCharacters = 280

  const handlePublish = () => {
    console.log('Publishing:', content)
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
    <div className="flex flex-col h-full">
      {/* Account Header */}
      <header className="flex items-center justify-between px-6 py-3 border-b">
        <div className="flex items-center gap-3">
          <Avatar className="h-9 w-9">
            <AvatarImage src={currentUser.avatar_url || undefined} />
            <AvatarFallback className="bg-gradient-to-br from-orange-400 to-pink-500 text-white">
              A
            </AvatarFallback>
          </Avatar>
          <div>
            <div className="flex items-center gap-1">
              <span className="font-semibold text-gray-900">{currentUser.name}</span>
              <span className="text-sm">®</span>
            </div>
            <span className="text-sm text-muted-foreground">{currentUser.handle}</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <List className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <Sparkles className="h-4 w-4" />
          </Button>
        </div>
      </header>

      {/* Composition Area */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-2xl mx-auto py-8 px-6">
          <textarea
            placeholder="What would you like to share?"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="w-full min-h-[300px] resize-none border-none outline-none text-lg text-gray-900 placeholder:text-gray-400"
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
        <PublishControls onSchedule={handleSchedule} onPublish={handlePublish} />
      </div>
    </div>
  )
}