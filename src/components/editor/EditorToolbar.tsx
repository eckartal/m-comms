'use client'

import { useState } from 'react'
import {
  Image,
  Smile,
  MessageCircle,
  Bookmark,
  Eye,
  Maximize2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'

interface EditorToolbarProps {
  characterCount: number
  maxCharacters?: number
  onImageUpload?: () => void
  onEmoji?: () => void
  onAddThread?: () => void
  onBookmark?: () => void
  isBookmarked?: boolean
}

export function EditorToolbar({
  characterCount,
  maxCharacters = 280,
  onImageUpload,
  onEmoji,
  onAddThread,
  onBookmark,
  isBookmarked = false,
}: EditorToolbarProps) {
  const isOverLimit = characterCount > maxCharacters
  const isNearLimit = characterCount > maxCharacters * 0.8

  return (
    <div className="flex items-center justify-between border-t px-4 py-3">
      {/* Left - Toolbar Icons with Tooltips */}
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9"
          onClick={onImageUpload}
          title="Add image"
        >
          <Image className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9"
          onClick={onEmoji}
          title="Add emoji"
        >
          <Smile className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9"
          onClick={onAddThread}
          title="Add to thread"
        >
          <MessageCircle className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9"
          onClick={onBookmark}
          title={isBookmarked ? 'Remove bookmark' : 'Bookmark'}
        >
          <Bookmark
            className={`h-4 w-4 ${isBookmarked ? 'fill-current text-blue-500' : ''}`}
          />
        </Button>
      </div>

      {/* Right - Character Counter */}
      <div className="flex items-center gap-3">
        <span
          className={`text-sm font-medium tabular-nums ${
            isOverLimit
              ? 'text-red-500'
              : isNearLimit
              ? 'text-amber-500'
              : 'text-gray-500'
          }`}
        >
          {characterCount} / {maxCharacters}
        </span>
      </div>
    </div>
  )
}