import type { Content } from '@/types'

interface PipelineSummaryProps {
  content: Content[]
}

function isOverdue(item: Content) {
  if (!item.scheduled_at) return false
  if (item.status === 'PUBLISHED' || item.status === 'ARCHIVED') return false
  return new Date(item.scheduled_at).getTime() < Date.now()
}

export function PipelineSummary({ content }: PipelineSummaryProps) {
  const metrics = [
    {
      label: 'Needs Review',
      value: content.filter((item) => item.status === 'IN_REVIEW').length,
    },
    {
      label: 'Unassigned',
      value: content.filter((item) => !item.assigned_to && !item.assignedTo?.id).length,
    },
    {
      label: 'Overdue',
      value: content.filter(isOverdue).length,
    },
    {
      label: 'Awaiting Approval',
      value: content.filter((item) => item.status === 'APPROVED').length,
    },
  ]

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-2 px-6 py-3 border-b border-gray-900 bg-[#050505]">
      {metrics.map((metric) => (
        <div key={metric.label} className="rounded-lg border border-[#262626] bg-[#0a0a0a] px-3 py-2">
          <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{metric.label}</p>
          <p className="mt-1 text-base font-semibold text-foreground">{metric.value}</p>
        </div>
      ))}
    </div>
  )
}
