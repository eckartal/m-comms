import type { Content } from '@/types'

export type QuickFilter = 'all' | 'mine' | 'unassigned' | 'needs_review' | 'overdue' | 'approved'

const QUICK_FILTERS: QuickFilter[] = ['all', 'mine', 'unassigned', 'needs_review', 'overdue', 'approved']

export function getOwnerId(item: Pick<Content, 'assigned_to' | 'assignedTo'>): string | null {
  return item.assigned_to || item.assignedTo?.id || null
}

export function isUnassigned(item: Pick<Content, 'assigned_to' | 'assignedTo'>): boolean {
  return !getOwnerId(item)
}

export function getRecentPosts(items: Content[], limit = 3): Content[] {
  return items
    .filter((item) => item.status !== 'ARCHIVED' && (item.item_type || 'POST') === 'POST')
    .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
    .slice(0, limit)
}

export function parseQuickFilter(value: string | null): QuickFilter {
  if (!value) return 'all'
  return QUICK_FILTERS.includes(value as QuickFilter) ? (value as QuickFilter) : 'all'
}
