import { useMemo, useState } from 'react'
import type { Content } from '@/types'
import { Button } from '@/components/ui/button'

type RailTab = 'activity' | 'attention'

type ActivityUser = {
  name?: string | null
  email?: string | null
}

type LatestActivity = {
  created_at?: string | null
  user?: ActivityUser | null
}

type ContentWithMeta = Content & {
  latest_activity?: LatestActivity | null
  activity_count?: number
}

interface CollabRightRailProps {
  content: Content[]
  onOpenContent: (item: Content) => void
}

function isOverdue(item: Content) {
  if (!item.scheduled_at) return false
  if (item.status === 'PUBLISHED' || item.status === 'ARCHIVED') return false
  return new Date(item.scheduled_at).getTime() < Date.now()
}

function formatRelativeTime(iso?: string | null) {
  if (!iso) return 'recently'
  const deltaMs = Date.now() - new Date(iso).getTime()
  const minutes = Math.floor(deltaMs / 60000)
  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

function trackRailEvent(tab: RailTab) {
  if (typeof window === 'undefined') return
  window.dispatchEvent(
    new CustomEvent('collaboration:analytics', {
      detail: {
        name: 'collab_rail_tab_changed',
        payload: { tab },
        ts: Date.now(),
      },
    })
  )
}

export function CollabRightRail({ content, onOpenContent }: CollabRightRailProps) {
  const [tab, setTab] = useState<RailTab>('activity')

  const recentActivity = useMemo(() => {
    const withMeta = content as ContentWithMeta[]

    return [...withMeta]
      .filter((item) => item.latest_activity || item.activity_count)
      .sort((a, b) => {
        const aTime = new Date(a.latest_activity?.created_at || a.updated_at).getTime()
        const bTime = new Date(b.latest_activity?.created_at || b.updated_at).getTime()
        return bTime - aTime
      })
      .slice(0, 8)
  }, [content])

  const attentionItems = useMemo(() => {
    return [...content]
      .filter((item) => item.status === 'IN_REVIEW' || !item.assigned_to || isOverdue(item))
      .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
      .slice(0, 8)
  }, [content])

  return (
    <aside className="hidden xl:flex xl:w-80 xl:flex-col xl:border-l xl:border-gray-900 xl:bg-[#040404]">
      <div className="border-b border-gray-900 p-3">
        <h2 className="text-sm font-medium text-foreground">Collaboration Feed</h2>
        <p className="mt-1 text-xs text-muted-foreground">Team updates and items needing attention</p>
      </div>

      <div className="flex gap-1 p-3 border-b border-gray-900">
        <Button
          size="sm"
          variant={tab === 'activity' ? 'default' : 'outline'}
          className="h-7 text-xs"
          onClick={() => {
            setTab('activity')
            trackRailEvent('activity')
          }}
        >
          Activity
        </Button>
        <Button
          size="sm"
          variant={tab === 'attention' ? 'default' : 'outline'}
          className="h-7 text-xs"
          onClick={() => {
            setTab('attention')
            trackRailEvent('attention')
          }}
        >
          Needs Attention
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-2 custom-scrollbar">
        {tab === 'activity'
          ? recentActivity.map((item) => {
              const meta = item as ContentWithMeta
              const actor =
                meta.latest_activity?.user?.name ||
                meta.latest_activity?.user?.email ||
                item.assignedTo?.name ||
                item.createdBy?.name ||
                'Someone'

              return (
                <button
                  key={item.id}
                  className="w-full rounded-lg border border-[#222] bg-[#0a0a0a] p-3 text-left hover:border-[#333]"
                  onClick={() => onOpenContent(item)}
                >
                  <p className="truncate text-xs text-foreground">{item.title}</p>
                  <p className="mt-1 text-[11px] text-muted-foreground truncate">
                    {actor} updated this {formatRelativeTime(meta.latest_activity?.created_at || item.updated_at)}
                  </p>
                  <p className="mt-2 text-[10px] text-muted-foreground">
                    {meta.activity_count || 0} updates · {item.status.replace('_', ' ')}
                  </p>
                </button>
              )
            })
          : attentionItems.map((item) => {
              const overdue = isOverdue(item)
              const unassigned = !item.assigned_to
              const review = item.status === 'IN_REVIEW'

              return (
                <button
                  key={item.id}
                  className="w-full rounded-lg border border-[#222] bg-[#0a0a0a] p-3 text-left hover:border-[#333]"
                  onClick={() => onOpenContent(item)}
                >
                  <p className="truncate text-xs text-foreground">{item.title}</p>
                  <div className="mt-2 flex flex-wrap gap-1">
                    {review ? (
                      <span className="rounded bg-amber-950/40 px-2 py-0.5 text-[10px] text-amber-300">In Review</span>
                    ) : null}
                    {unassigned ? (
                      <span className="rounded bg-zinc-800 px-2 py-0.5 text-[10px] text-zinc-300">Unassigned</span>
                    ) : null}
                    {overdue ? (
                      <span className="rounded bg-red-950/40 px-2 py-0.5 text-[10px] text-red-300">Overdue</span>
                    ) : null}
                  </div>
                  <p className="mt-2 text-[10px] text-muted-foreground">Updated {formatRelativeTime(item.updated_at)}</p>
                </button>
              )
            })}

        {tab === 'activity' && recentActivity.length === 0 ? (
          <div className="rounded-lg border border-dashed border-[#222] p-3 text-xs text-muted-foreground">
            No recent activity yet.
          </div>
        ) : null}

        {tab === 'attention' && attentionItems.length === 0 ? (
          <div className="rounded-lg border border-dashed border-[#222] p-3 text-xs text-muted-foreground">
            Nothing needs attention right now.
          </div>
        ) : null}
      </div>
    </aside>
  )
}
