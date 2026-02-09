'use client'

import {
  Image,
  Smile,
  MessageCircle,
  List,
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
  onPreview?: () => void
  onExpand?: () => void
  isBookmarked?: boolean
}

export function EditorToolbar({
  characterCount,
  maxCharacters = 280,
  onImageUpload,
  onEmoji,
  onAddThread,
  onBookmark,
  onPreview,
  onExpand,
  isBookmarked = false,
}: EditorToolbarProps) {
  return (
    <div className="flex items-center justify-between border-t px-4 py-2">
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={onImageUpload}
        >
          <Image className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={onEmoji}
        >
          <Smile className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={onAddThread}
        >
          <MessageCircle className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon" className="h-8 w-8">
          <List className="h-4 w-4" />
        </Button>
        <div className="w-px h-6 bg-gray-200 mx-1" />
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={onBookmark}
        >
          <Bookmark
            className={`h-4 w-4 ${isBookmarked ? 'fill-current' : ''}`}
          />
        </Button>
      </div>

      <div className="flex items-center gap-1">
        <span
          className={`text-xs font-medium ${
            characterCount > maxCharacters
              ? 'text-red-500'
              : characterCount > maxCharacters * 0.8
              ? 'text-yellow-500'
              : 'text-gray-500'
          }`}
        >
          {characterCount}
        </span>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={onPreview}
        >
          <Eye className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={onExpand}
        >
          <Maximize2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}