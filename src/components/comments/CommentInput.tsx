'use client'

import { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Send } from 'lucide-react'

interface CommentInputProps {
  placeholder?: string
  onSubmit: (text: string) => Promise<void>
  onCancel?: () => void
  autoFocus?: boolean
  initialValue?: string
}

export function CommentInput({
  placeholder = 'Write a comment... (use @ to mention)',
  onSubmit,
  onCancel,
  autoFocus = false,
  initialValue = '',
}: CommentInputProps) {
  const [text, setText] = useState(initialValue)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (autoFocus && textareaRef.current) {
      textareaRef.current.focus()
    }
  }, [autoFocus])

  const handleSubmit = async () => {
    if (!text.trim() || isSubmitting) return

    setIsSubmitting(true)
    try {
      await onSubmit(text.trim())
      setText('')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }

  return (
    <div className="flex gap-2">
      <textarea
        ref={textareaRef}
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className="flex-1 p-2 border rounded-md text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
        rows={2}
        disabled={isSubmitting}
      />
      <div className="flex flex-col gap-2">
        <Button
          size="sm"
          onClick={handleSubmit}
          disabled={!text.trim() || isSubmitting}
          className="shrink-0"
        >
          <Send className="h-4 w-4" />
        </Button>
        {onCancel && (
          <Button
            size="sm"
            variant="ghost"
            onClick={onCancel}
            className="shrink-0"
          >
            Cancel
          </Button>
        )}
      </div>
    </div>
  )
}
