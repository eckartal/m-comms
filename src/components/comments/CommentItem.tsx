'use client'

import { useState } from 'react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { MessageSquare, Check, MoreHorizontal, Reply } from 'lucide-react'
import { formatDistanceToNow } from '@/lib/utils'
import type { Comment } from '@/types'
import { CommentInput } from './CommentInput'

interface CommentItemProps {
  comment: Comment
  currentUserId: string
  onUpdate: () => void
  depth?: number
}

export function CommentItem({ comment, currentUserId, onUpdate, depth = 0 }: CommentItemProps) {
  const [isReplying, setIsReplying] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [showReplies, setShowReplies] = useState(true)
  const [editText, setEditText] = useState(comment.text)

  const isOwner = comment.user_id === currentUserId
  const hasReplies = comment.replies && comment.replies.length > 0
  const isResolved = !!comment.resolved_at

  const handleResolve = async () => {
    try {
      await fetch('/api/comments', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ commentId: comment.id, resolved: !isResolved }),
      })
      onUpdate()
    } catch (error) {
      console.error('Error resolving comment:', error)
    }
  }

  const handleEdit = async () => {
    try {
      await fetch('/api/comments', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ commentId: comment.id, text: editText }),
      })
      setIsEditing(false)
      onUpdate()
    } catch (error) {
      console.error('Error editing comment:', error)
    }
  }

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this comment?')) return

    try {
      await fetch(`/api/comments?commentId=${comment.id}`, { method: 'DELETE' })
      onUpdate()
    } catch (error) {
      console.error('Error deleting comment:', error)
    }
  }

  const handleReply = async (text: string) => {
    try {
      await fetch('/api/comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contentId: comment.content_id,
          text,
          parentId: comment.id,
        }),
      })
      setIsReplying(false)
      onUpdate()
    } catch (error) {
      console.error('Error replying to comment:', error)
    }
  }

  return (
    <div className={`${depth > 0 ? 'ml-8 border-l-2 border-gray-100 pl-4' : ''}`}>
      <div className={`flex gap-3 py-3 ${isResolved ? 'opacity-50' : ''}`}>
        <Avatar className="h-8 w-8">
          <AvatarImage src={comment.user?.avatar_url || undefined} />
          <AvatarFallback>
            {comment.user?.name?.charAt(0) || comment.user?.email?.charAt(0) || '?'}
          </AvatarFallback>
        </Avatar>

        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="font-medium text-sm">{comment.user?.name || 'Unknown'}</span>
            <span className="text-xs text-gray-500">
              {formatDistanceToNow(comment.created_at)}
            </span>
            {isResolved && (
              <span className="text-xs text-green-600 flex items-center gap-1">
                <Check className="h-3 w-3" /> Resolved
              </span>
            )}
          </div>

          {isEditing ? (
            <div className="mt-2 space-y-2">
              <textarea
                value={editText}
                onChange={(e) => setEditText(e.target.value)}
                className="w-full p-2 border rounded-md text-sm"
                rows={2}
              />
              <div className="flex gap-2">
                <Button size="sm" onClick={handleEdit}>Save</Button>
                <Button size="sm" variant="ghost" onClick={() => setIsEditing(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <p className="text-sm mt-1 text-gray-700 whitespace-pre-wrap">{comment.text}</p>
          )}

          <div className="flex items-center gap-4 mt-2">
            <Button
              variant="ghost"
              size="sm"
              className="h-auto p-0 text-xs text-gray-500 hover:text-gray-700"
              onClick={() => setIsReplying(!isReplying)}
            >
              <Reply className="h-3 w-3 mr-1" />
              Reply
            </Button>

            {isOwner && !isEditing && (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-auto p-0 text-xs text-gray-500 hover:text-gray-700"
                  onClick={() => setIsEditing(true)}
                >
                  Edit
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-auto p-0 text-xs text-gray-500 hover:text-red-600"
                  onClick={handleDelete}
                >
                  Delete
                </Button>
              </>
            )}

            <Button
              variant="ghost"
              size="sm"
              className="h-auto p-0 text-xs text-gray-500 hover:text-gray-700"
              onClick={handleResolve}
            >
              <Check className="h-3 w-3 mr-1" />
              {isResolved ? 'Reopen' : 'Resolve'}
            </Button>

            {hasReplies && (
              <button
                onClick={() => setShowReplies(!showReplies)}
                className="text-xs text-gray-500 hover:text-gray-700 flex items-center gap-1"
              >
                <MessageSquare className="h-3 w-3" />
                {showReplies ? 'Hide' : 'Show'} {comment.replies?.length} replies
              </button>
            )}
          </div>

          {isReplying && (
            <div className="mt-3">
              <CommentInput
                placeholder="Write a reply..."
                onSubmit={handleReply}
                onCancel={() => setIsReplying(false)}
                autoFocus
              />
            </div>
          )}

          {hasReplies && showReplies && (
            <div className="mt-3 space-y-2">
              {comment.replies?.map((reply) => (
                <CommentItem
                  key={reply.id}
                  comment={reply}
                  currentUserId={currentUserId}
                  onUpdate={onUpdate}
                  depth={depth + 1}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}