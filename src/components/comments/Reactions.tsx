'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Heart, MessageCircle, Share2, ThumbsUp, Smile, X } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Reaction {
  id: string
  type: 'like' | 'love' | 'laugh' | 'wow' | 'sad' | 'angry'
  user_id: string
  created_at: string
  user?: {
    id: string
    name: string | null
    avatar_url: string | null
  }
}

interface ReactionsProps {
  contentId: string
  currentUserId: string
  initialReactions?: Record<string, Reaction[]>
}

const REACTION_TYPES = [
  { type: 'like', label: 'Like', icon: ThumbsUp, color: 'text-gray-500 hover:text-blue-500' },
  { type: 'love', label: 'Love', icon: Heart, color: 'text-gray-500 hover:text-red-500' },
  { type: 'laugh', label: 'Laugh', icon: Smile, color: 'text-gray-500 hover:text-yellow-500' },
] as const

export function Reactions({ contentId, currentUserId, initialReactions = {} }: ReactionsProps) {
  const [reactions, setReactions] = useState<Record<string, Reaction[]>>(initialReactions)
  const [showReactions, setShowReactions] = useState(false)
  const [reactionCounts, setReactionCounts] = useState<Record<string, number>>({})

  // Calculate counts from reactions
  useEffect(() => {
    const counts: Record<string, number> = {}
    Object.entries(reactions).forEach(([type, items]) => {
      counts[type] = items.length
    })
    setReactionCounts(counts)
  }, [reactions])

  const handleReaction = async (type: string) => {
    try {
      const response = await fetch('/api/reactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contentId, type }),
      })

      if (!response.ok) throw new Error('Failed to toggle reaction')

      const { data } = await response.json()

      // Update local state
      setReactions((prev) => {
        const currentReactions = prev[type] || []
        if (data.removed) {
          return {
            ...prev,
            [type]: currentReactions.filter((r) => r.id !== data.id),
          }
        }
        return {
          ...prev,
          [type]: [...currentReactions, data],
        }
      })
    } catch (error) {
      console.error('Error toggling reaction:', error)
    }
  }

  const totalReactions = Object.values(reactionCounts).reduce((sum, count) => sum + count, 0)

  return (
    <div className="flex items-center gap-2">
      {/* Reaction Counts */}
      {totalReactions > 0 && (
        <span className="text-xs text-muted-foreground">{totalReactions} {totalReactions === 1 ? 'reaction' : 'reactions'}</span>
      )}

      {/* Reaction Buttons */}
      <div className="relative">
        <Button
          variant="ghost"
          size="sm"
          className="h-8 px-2 text-xs text-muted-foreground hover:text-foreground"
          onClick={() => setShowReactions(!showReactions)}
        >
          <Smile className="h-4 w-4 mr-1" />
          React
        </Button>

        {/* Reaction Picker */}
        {showReactions && (
          <div className="absolute top-full left-0 mt-2 p-2 bg-white dark:bg-[#0a0a0a] border border-gray-200 dark:border-gray-800 rounded-lg shadow-xl flex gap-1 z-50">
            {REACTION_TYPES.map(({ type, icon: Icon, color }) => (
              <button
                key={type}
                onClick={() => {
                  handleReaction(type)
                  setShowReactions(false)
                }}
                className={cn(
                  "p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors",
                  color
                )}
                title={type}
              >
                <Icon className="h-5 w-5" />
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
