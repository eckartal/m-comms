'use client'

import { Image, Smile, MessageCircle, Bookmark, Link as LinkIcon, Hash } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface EditorToolbarProps {
  characterCount: number
  maxCharacters?: number
  onImageUpload?: () => void
  onEmoji?: () => void
  onAddThread?: () => void
  onAddLink?: () => void
  onAddHashtag?: () => void
  onBookmark?: () => void
  isBookmarked?: boolean
}

export function EditorToolbar({
  characterCount,
  maxCharacters = 280,
  onImageUpload,
  onEmoji,
  onAddThread,
  onAddLink,
  onAddHashtag,
  onBookmark,
  isBookmarked = false,
}: EditorToolbarProps) {
  const isOverLimit = characterCount > maxCharacters
  const isNearLimit = characterCount > maxCharacters * 0.8

  return (
    <div className="flex items-center justify-between border-t border-[#E5E5E7] pt-4 pb-2 mt-4">
      {/* Left - Toolbar Icons */}
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-[#6C6C70] hover:text-[#1C1C1E] hover:bg-[#F5F5F7]"
          onClick={onImageUpload}
          title="Add image"
        >
          <Image className="w-5 h-5" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-[#6C6C70] hover:text-[#1C1C1E] hover:bg-[#F5F5F7]"
          onClick={onEmoji}
          title="Add emoji"
        >
          <Smile className="w-5 h-5" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-[#6C6C70] hover:text-[#1C1C1E] hover:bg-[#F5F5F7]"
          onClick={onAddThread}
          title="Add thread"
        >
          <MessageCircle className="w-5 h-5" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-[#6C6C70] hover:text-[#1C1C1E] hover:bg-[#F5F5F7]"
          onClick={onAddLink}
          title="Add link"
        >
          <LinkIcon className="w-5 h-5" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-[#6C6C70] hover:text-[#1C1C1E] hover:bg-[#F5F5F7]"
          onClick={onAddHashtag}
          title="Add hashtag"
        >
          <Hash className="w-5 h-5" />
        </Button>
        <div className="w-px h-6 bg-[#E5E5E7] mx-1" />
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-[#6C6C70] hover:text-[#1C1C1E] hover:bg-[#F5F5F7]"
          onClick={onBookmark}
          title={isBookmarked ? 'Remove bookmark' : 'Bookmark'}
        >
          <Bookmark className={`w-5 h-5 ${isBookmarked ? 'fill-current text-[#007AFF]' : ''}`} />
        </Button>
      </div>

      {/* Right - Character Counter */}
      <div className="flex items-center gap-3">
        <span
          className={`text-[13px] tabular-nums ${
            isOverLimit
              ? 'text-[#ef4444] font-medium'
              : isNearLimit
              ? 'text-[#F59E0B]'
              : 'text-[#8E8E93]'
          }`}
        >
          {characterCount.toLocaleString()} / {maxCharacters.toLocaleString()}
        </span>
      </div>
    </div>
  )
}