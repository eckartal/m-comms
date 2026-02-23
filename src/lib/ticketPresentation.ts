import { getBlockPreview, getContentTitle } from '@/lib/contentText'
import type { Content } from '@/types'

const UNTITLED_RE = /^untitled(\s+idea|\s+post)?$/i

type SequencedContent = Pick<Content, 'id' | 'created_at'>

export function getTicketKey(contentId: string, items: SequencedContent[]): string {
  if (!items?.length) return 'C?'

  const ordered = [...items].sort((a, b) => {
    const tsDiff = new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    if (tsDiff !== 0) return tsDiff
    return a.id.localeCompare(b.id)
  })

  const index = ordered.findIndex((item) => item.id === contentId)
  if (index < 0) return 'C?'
  return `C${index + 1}`
}

function isUntitled(value: string): boolean {
  return UNTITLED_RE.test(value.trim())
}

export function inferTitleFromContent(content: Pick<Content, 'title' | 'blocks' | 'item_type'>): string {
  const rawTitle = getContentTitle(content.title, '').trim()
  const isIdea = (content.item_type || 'POST') === 'IDEA'
  if (rawTitle && !isUntitled(rawTitle)) return rawTitle

  const preview = getBlockPreview(content.blocks).replace(/\s+/g, ' ').trim()
  if (preview) {
    return preview.slice(0, 96)
  }

  return isIdea ? 'Untitled idea' : 'New post'
}

export function inferTitleFromNotes(
  notes: string,
  fallbackType: 'IDEA' | 'POST',
  fallbackTitle?: string
): string {
  const clean = notes.replace(/\s+/g, ' ').trim()
  if (clean.length > 0) return clean.slice(0, 96)
  if (fallbackTitle && fallbackTitle.trim() && !isUntitled(fallbackTitle)) return fallbackTitle.trim()
  return fallbackType === 'IDEA' ? 'Untitled idea' : 'New post'
}
