'use client'

import { useEffect, useState } from 'react'
import { Comment } from '@/types'
import { CommentItem } from './CommentItem'
import { CommentInput } from './CommentInput'
import { useSupabase } from '@/lib/supabase/client'
import type { User } from '@/types'

interface CommentListProps {
  contentId: string
}

export function CommentList({ contentId }: CommentListProps) {
  const supabase = useSupabase()
  const [comments, setComments] = useState<Comment[]>([])
  const [currentUser, setCurrentUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchComments()
    fetchCurrentUser()
  }, [contentId])

  const fetchCurrentUser = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      const { data } = await supabase
        .from('users')
        .select('*')
        .eq('id', user.id)
        .single()
      setCurrentUser(data)
    }
  }

  const fetchComments = async () => {
    try {
      const response = await fetch(`/api/comments?contentId=${contentId}`)
      if (!response.ok) throw new Error('Failed to fetch comments')
      const { data } = await response.json()
      setComments(data || [])
    } catch (err) {
      setError('Failed to load comments')
      console.error(err)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSubmitComment = async (text: string) => {
    await fetch('/api/comments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contentId, text }),
    })
    fetchComments()
  }

  const handleRefresh = () => {
    fetchComments()
  }

  if (isLoading) {
    return (
      <div className="p-4 text-center text-gray-500 text-sm">
        Loading comments...
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-4 text-center text-red-500 text-sm">
        {error}
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col">
      <div className="p-4 border-b">
        <h3 className="font-semibold">Comments</h3>
        <p className="text-sm text-gray-500">
          {comments.length} {comments.length === 1 ? 'comment' : 'comments'}
        </p>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {comments.length === 0 ? (
          <div className="text-center text-gray-500 text-sm py-8">
            No comments yet. Be the first to comment!
          </div>
        ) : (
          comments.map((comment) => (
            <CommentItem
              key={comment.id}
              comment={comment}
              currentUserId={currentUser?.id || ''}
              onUpdate={handleRefresh}
            />
          ))
        )}
      </div>

      <div className="p-4 border-t bg-gray-50">
        <CommentInput
          placeholder="Add a comment..."
          onSubmit={handleSubmitComment}
        />
        <p className="text-xs text-gray-500 mt-2">
          Use @ to mention team members
        </p>
      </div>
    </div>
  )
}