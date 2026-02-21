import type { Content } from '@/types'
import { cn } from '@/lib/utils'

type PipelineFilter = 'needs_review' | 'unassigned' | 'overdue' | 'approved'

interface PipelineSummaryProps {
  content: Content[]
  activeFilter?: PipelineFilter | null
  onSelectFilter?: (filter: PipelineFilter) => void
}

function isOverdue(item: Content) {
  if (!item.scheduled_at) return false
  if (item.status === 'PUBLISHED' || item.status === 'ARCHIVED') return false
  return new Date(item.scheduled_at).getTime() < Date.now()
}

export function PipelineSummary({ content, activeFilter = null, onSelectFilter }: PipelineSummaryProps) {
  const metrics = [
    {
      label: 'Needs Review',
      filter: 'needs_review' as const,
      value: content.filter((item) => item.status === 'IN_REVIEW').length,
    },
    {
      label: 'Unassigned',
      filter: 'unassigned' as const,
      value: content.filter((item) => !item.assigned_to && !item.assignedTo?.id).length,
    },
    {
      label: 'Overdue',
      filter: 'overdue' as const,
      value: content.filter(isOverdue).length,
    },
    {
      label: 'Awaiting Approval',
      filter: 'approved' as const,
      value: content.filter((item) => item.status === 'APPROVED').length,
    },
  ]

  return (
    <div className="grid grid-cols-2 gap-2 border-b border-border bg-card/40 px-6 py-3 md:grid-cols-4">
      {metrics.map((metric) => (
        <button
          key={metric.label}
          type="button"
          onClick={() => onSelectFilter?.(metric.filter)}
          className={cn(
            'rounded-lg border bg-card px-3 py-2 text-left transition-colors',
            activeFilter === metric.filter
              ? 'border-ring bg-accent'
              : 'border-border hover:border-ring/40'
          )}
        >
          <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{metric.label}</p>
          <p className="mt-1 text-base font-semibold text-foreground">{metric.value}</p>
        </button>
      ))}
    </div>
  )
}
