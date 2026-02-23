'use client'

import { Image, Smile, Link as LinkIcon, Hash } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface EditorToolbarProps {
  characterCount: number
  maxCharacters?: number
  showCharacterCount?: boolean
  onImageUpload?: () => void
  onEmoji?: () => void
  onAddLink?: () => void
  onAddHashtag?: () => void
}

export function EditorToolbar({
  characterCount,
  maxCharacters = 280,
  showCharacterCount = true,
  onImageUpload,
  onEmoji,
  onAddLink,
  onAddHashtag,
}: EditorToolbarProps) {
  const isOverLimit = characterCount > maxCharacters
  const isNearLimit = characterCount > maxCharacters * 0.8
  const actions = [
    { key: 'image', label: 'Image / Video', icon: Image, onClick: onImageUpload },
    { key: 'emoji', label: 'Emoji', icon: Smile, onClick: onEmoji },
    { key: 'link', label: 'Link', icon: LinkIcon, onClick: onAddLink },
    { key: 'hashtag', label: 'Hashtag', icon: Hash, onClick: onAddHashtag },
  ].filter((action) => typeof action.onClick === 'function')

  return (
    <div className="mt-4 border-t border-[var(--sidebar-divider)] pb-2 pt-3">
      <div className="flex items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-1.5">
          {actions.map((action) => {
            const Icon = action.icon
            return (
              <Button
                key={action.key}
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 w-7 rounded-md p-0 text-muted-foreground hover:bg-accent hover:text-foreground"
                onClick={action.onClick}
                title={`Add ${action.label.toLowerCase()}`}
                aria-label={action.label}
              >
                <Icon className="h-3.5 w-3.5" />
              </Button>
            )
          })}

        </div>

        {/* Right - Character Counter */}
        {showCharacterCount ? (
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
        ) : null}
      </div>
    </div>
  )
}
