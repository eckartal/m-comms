'use client'

import { Image, Smile, MessageCircle, Bookmark, Link as LinkIcon, Hash } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

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
  const actions = [
    { key: 'image', label: 'Image', icon: Image, onClick: onImageUpload },
    { key: 'emoji', label: 'Emoji', icon: Smile, onClick: onEmoji },
    { key: 'thread', label: 'Thread', icon: MessageCircle, onClick: onAddThread },
    { key: 'link', label: 'Link', icon: LinkIcon, onClick: onAddLink },
    { key: 'hashtag', label: 'Hashtag', icon: Hash, onClick: onAddHashtag },
  ].filter((action) => typeof action.onClick === 'function')

  return (
    <div className="mt-4 border-t border-border pb-2 pt-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          {actions.map((action) => {
            const Icon = action.icon
            return (
              <Button
                key={action.key}
                type="button"
                variant="ghost"
                size="sm"
                className="h-8 gap-1.5 px-2.5 text-xs text-muted-foreground hover:bg-accent hover:text-foreground"
                onClick={action.onClick}
                title={`Add ${action.label.toLowerCase()}`}
              >
                <Icon className="h-3.5 w-3.5" />
                <span>{action.label}</span>
              </Button>
            )
          })}

          {onBookmark ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className={cn(
                'h-8 gap-1.5 px-2.5 text-xs hover:bg-accent',
                isBookmarked ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
              )}
              onClick={onBookmark}
              title={isBookmarked ? 'Remove bookmark' : 'Bookmark'}
            >
              <Bookmark className={cn('h-3.5 w-3.5', isBookmarked && 'fill-current')} />
              <span>{isBookmarked ? 'Bookmarked' : 'Bookmark'}</span>
            </Button>
          ) : null}
        </div>

        {/* Right - Character Counter */}
        <div className="flex items-center gap-3">
          <span
            className={`text-[13px] tabular-nums ${
              isOverLimit
                ? 'text-red-500 font-medium'
                : isNearLimit
                ? 'text-amber-500'
                : 'text-muted-foreground'
            }`}
          >
            {characterCount.toLocaleString()} / {maxCharacters.toLocaleString()}
          </span>
        </div>
      </div>
    </div>
  )
}
