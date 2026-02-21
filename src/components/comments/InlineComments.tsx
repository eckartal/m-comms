'use client'

import { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { MessageSquare, X, Check, MoreHorizontal } from 'lucide-react'
import { cn, formatDistanceToNow } from '@/lib/utils'
import type { Comment } from '@/types'

interface InlineComment {
  id: string
  annotationId?: string
  text: string
  startPos: number
  endPos: number
  user_id: string
  created_at: string
  user?: {
    name: string | null
    avatar_url: string | null
    email: string
  }
  replies?: InlineComment[]
  resolved?: boolean
}

interface TextSelection {
  text: string
  startPos: number
  endPos: number
}

interface InlineCommentsProps {
  content: string
  comments: InlineComment[]
  currentUserId: string
  onChangeContent?: (value: string) => void
  onAddComment: (text: string, startPos: number, endPos: number) => void
  onResolveComment: (commentId: string) => void
  onReplyComment: (commentId: string, text: string) => void
  onEditComment: (commentId: string, text: string) => void
  onDeleteComment: (commentId: string) => void
}

// Highlight text with selected comments
function HighlightedText({
  text,
  comments,
  onSelect,
  currentUserId,
}: {
  text: string
  comments: InlineComment[]
  onSelect: (comment: InlineComment) => void
  currentUserId: string
}) {
  // Sort comments by start position
  const sortedComments = [...comments].sort((a, b) => a.startPos - b.startPos)

  if (sortedComments.length === 0) {
    return <p className="text-sm text-gray-700 whitespace-pre-wrap">{text}</p>
  }

  // Build pieces of text with comments
  const pieces: (string | InlineComment)[] = []
  let lastIndex = 0

  sortedComments.forEach((comment) => {
    if (comment.startPos > lastIndex) {
      pieces.push(text.slice(lastIndex, comment.startPos))
    }
    pieces.push(comment)
    lastIndex = comment.endPos
  })

  if (lastIndex < text.length) {
    pieces.push(text.slice(lastIndex))
  }

  return (
    <p className="text-sm text-gray-700 whitespace-pre-wrap relative">
      {pieces.map((piece, i) => {
        if (typeof piece === 'string') {
          return <span key={i}>{piece}</span>
        }

        const isResolved = piece.resolved || false
        const isSelected = false // Could add selection state here

        return (
          <span
            key={i}
            className={cn(
              "inline px-0.5 rounded-sm cursor-pointer hover:bg-amber-100 dark:hover:bg-amber-900/30",
              isResolved ? "bg-gray-100/50 dark:bg-gray-800/50 text-gray-500" : "bg-amber-100/50 dark:bg-amber-900/20",
              isSelected && "ring-2 ring-amber-500 rounded-sm"
            )}
            onClick={() => onSelect(piece)}
          >
            {text.slice(piece.startPos, piece.endPos)}
          </span>
        )
      })}
    </p>
  )
}

export function InlineComments({
  content,
  comments,
  currentUserId,
  onChangeContent,
  onAddComment,
  onResolveComment,
  onReplyComment,
  onEditComment,
  onDeleteComment,
}: InlineCommentsProps) {
  const textAreaRef = useRef<HTMLTextAreaElement>(null)
  const [selection, setSelection] = useState<TextSelection | null>(null)
  const [showCommentBox, setShowCommentBox] = useState(false)
  const [commentText, setCommentText] = useState('')
  const [hoveredComment, setHoveredComment] = useState<string | null>(null)
  const [commentBoxPos, setCommentBoxPos] = useState({ top: 0, left: 0 })
  const openCount = comments.filter((c) => !c.resolved).length
  const resolvedCount = comments.filter((c) => c.resolved).length

  // Handle text selection
  const handleSelect = () => {
    if (!textAreaRef.current) return

    const { selectionStart, selectionEnd } = textAreaRef.current
    const text = textAreaRef.current.value

    if (selectionStart !== null && selectionEnd !== null && selectionStart !== selectionEnd) {
      const selectedText = text.slice(selectionStart, selectionEnd)
      setSelection({
        text: selectedText,
        startPos: selectionStart,
        endPos: selectionEnd,
      })

      // Position comment box near selection
      const rect = textAreaRef.current.getBoundingClientRect()
      setCommentBoxPos({
        top: rect.top + (selectionEnd - selectionStart) * 20, // Approximate
        left: rect.left + 100,
      })
      setShowCommentBox(true)
    } else {
      setSelection(null)
      setShowCommentBox(false)
    }
  }

  const handleAddComment = () => {
    if (selection && commentText.trim()) {
      onAddComment(commentText.trim(), selection.startPos, selection.endPos)
      setCommentText('')
      setShowCommentBox(false)
      setSelection(null)
    }
  }

  // Group comments by position for display
  const commentsByPos = comments.reduce((acc, comment) => {
    const key = `${comment.startPos}-${comment.endPos}`
    if (!acc[key]) acc[key] = []
    acc[key].push(comment)
    return acc
  }, {} as Record<string, InlineComment[]>)

  return (
    <div className="relative">
      {/* Text Editor Area */}
      <div className="relative">
        <div className="text-[11px] text-muted-foreground mb-2">
          Select text to add an inline comment
        </div>
        <textarea
          ref={textAreaRef}
          value={content}
          onChange={(e) => onChangeContent?.(e.target.value)}
          onMouseUp={handleSelect}
          onSelect={handleSelect}
          className="w-full h-64 p-4 bg-[#0a0a0a] text-foreground rounded-md border border-gray-900 resize-none focus:ring-1 focus:ring-gray-900 focus:outline-none font-mono text-sm leading-relaxed"
          spellCheck={false}
        />

        {/* Comment Popups - Simplified for text area */}
        {Object.entries(commentsByPos).map(([key, positionComments]) => {
          const startPos = parseInt(key.split('-')[0])
          return (
            <div
              key={key}
              className="absolute cursor-pointer hover:z-50"
              style={{
                top: '4px', // Approximate position
                left: '4px',
              }}
            >
              <div
                className="bg-amber-100/80 dark:bg-amber-900/40 border border-amber-300/50 dark:border-amber-700/50 rounded-sm px-1 text-amber-800 dark:text-amber-200 text-[10px]"
                onMouseEnter={() => setHoveredComment(key)}
                onMouseLeave={() => setHoveredComment(null)}
              >
                {positionComments.length} comment{positionComments.length !== 1 ? 's' : ''}
              </div>
            </div>
          )
        })}
      </div>

      {/* Comment Box Popup */}
      {showCommentBox && (
        <div
          className="absolute z-50 w-64 bg-white dark:bg-[#0a0a0a] border border-gray-200 dark:border-gray-800 rounded-lg shadow-xl p-3"
          style={{
            top: commentBoxPos.top + 20,
            left: Math.min(commentBoxPos.left, window.innerWidth - 280),
          }}
        >
          <div className="flex items-center gap-2 mb-2">
            <Avatar className="h-6 w-6">
              <AvatarFallback>ME</AvatarFallback>
            </Avatar>
            <span className="text-xs font-medium">Add a comment</span>
          </div>
          <textarea
            value={commentText}
            onChange={(e) => setCommentText(e.target.value)}
            placeholder="Type your comment..."
            className="w-full h-20 p-2 bg-gray-50 dark:bg-[#0f0f0f] border border-gray-200 dark:border-gray-700 rounded text-sm focus:ring-1 focus:ring-amber-500 focus:outline-none resize-none"
            autoFocus
          />
          <div className="flex items-center justify-between mt-2">
            <button
              onClick={() => {
                setShowCommentBox(false)
                setSelection(null)
              }}
              className="text-xs text-gray-500 hover:text-gray-700"
            >
              Cancel
            </button>
            <button
              onClick={handleAddComment}
              disabled={!commentText.trim()}
              className="px-3 py-1 bg-amber-500 text-white text-xs rounded hover:bg-amber-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Comment
            </button>
          </div>
        </div>
      )}

      {/* Comments List */}
      <div className="mt-4 space-y-4">
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          Comments ({comments.length} · {openCount} open · {resolvedCount} resolved)
        </h3>
        {comments.map((comment) => (
          <InlineCommentItem
            key={comment.id}
            comment={comment}
            currentUserId={currentUserId}
            onResolve={() => onResolveComment(comment.annotationId || comment.id)}
            onReply={(text) => onReplyComment(comment.annotationId || comment.id, text)}
            onEdit={(text) => onEditComment(comment.id, text)}
            onDelete={() => onDeleteComment(comment.id)}
          />
        ))}
      </div>
    </div>
  )
}

function InlineCommentItem({
  comment,
  currentUserId,
  onResolve,
  onReply,
  onEdit,
  onDelete,
}: {
  comment: InlineComment
  currentUserId: string
  onResolve: () => void
  onReply: (text: string) => void
  onEdit: (text: string) => void
  onDelete: () => void
}) {
  const [showReplies, setShowReplies] = useState(false)
  const [isReplying, setIsReplying] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [replyText, setReplyText] = useState('')
  const [editText, setEditText] = useState(comment.text)

  const isOwner = comment.user_id === currentUserId
  const isResolved = comment.resolved || false

  return (
    <div className={cn("p-3 rounded-lg border", isResolved ? "border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/30" : "border-gray-200 dark:border-gray-800 bg-white dark:bg-[#0f0f0f]")}>
      <div className="flex gap-3">
        <Avatar className="h-8 w-8 flex-shrink-0">
          <AvatarImage src={comment.user?.avatar_url || undefined} />
          <AvatarFallback>{comment.user?.name?.charAt(0) || 'U'}</AvatarFallback>
        </Avatar>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">{comment.user?.name || 'Unknown'}</span>
            <span className="text-xs text-gray-500">{formatDistanceToNow(comment.created_at)}</span>
            {isResolved && (
              <span className="text-xs text-green-600 flex items-center gap-1">
                <Check className="h-3 w-3" /> Resolved
              </span>
            )}
          </div>
          <p className="text-sm mt-1 text-gray-700 dark:text-gray-300">{comment.text}</p>
          <div className="flex items-center gap-4 mt-2">
            <Button variant="ghost" size="sm" className="h-auto p-0 text-xs" onClick={() => setIsReplying(!isReplying)}>
              <MessageSquare className="h-3 w-3 mr-1" /> Reply
            </Button>
            {isOwner && !isResolved && (
              <>
                <Button variant="ghost" size="sm" className="h-auto p-0 text-xs" onClick={() => setIsEditing(true)}>
                  Edit
                </Button>
                <Button variant="ghost" size="sm" className="h-auto p-0 text-xs text-red-600" onClick={onDelete}>
                  Delete
                </Button>
              </>
            )}
            {isOwner && (
              <Button variant="ghost" size="sm" className="h-auto p-0 text-xs" onClick={onResolve}>
                <Check className="h-3 w-3 mr-1" /> {isResolved ? 'Reopen' : 'Resolve'}
              </Button>
            )}
          </div>
          {isReplying && (
            <div className="mt-3 flex gap-2">
              <input
                type="text"
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                placeholder="Write a reply..."
                className="flex-1 px-3 py-1.5 bg-gray-50 dark:bg-[#0f0f0f] border border-gray-200 dark:border-gray-700 rounded text-sm"
              />
              <Button size="sm" onClick={() => {
                if (replyText.trim()) {
                  onReply(replyText.trim())
                  setReplyText('')
                  setIsReplying(false)
                }
              }}>
                Reply
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setIsReplying(false)}>
                Cancel
              </Button>
            </div>
          )}
          {isEditing && (
            <div className="mt-3 space-y-2">
              <textarea
                value={editText}
                onChange={(e) => setEditText(e.target.value)}
                className="w-full p-2 border rounded-md text-sm"
                rows={2}
              />
              <div className="flex gap-2">
                <Button size="sm" onClick={() => {
                  if (editText.trim()) {
                    onEdit(editText.trim())
                    setIsEditing(false)
                  }
                }}>Save</Button>
                <Button size="sm" variant="ghost" onClick={() => setIsEditing(false)}>Cancel</Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
