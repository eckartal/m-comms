import { Skeleton } from '@/components/ui/skeleton'

interface CollabSkeletonProps {
  view: 'kanban' | 'list' | 'calendar'
}

export function CollabSkeleton({ view }: CollabSkeletonProps) {
  if (view === 'list') {
    return (
      <div className="p-4 space-y-3">
        <Skeleton className="h-10 w-full" />
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="h-14 w-full" />
        ))}
      </div>
    )
  }

  if (view === 'calendar') {
    return (
      <div className="p-4 grid grid-cols-7 gap-3">
        {Array.from({ length: 35 }).map((_, i) => (
          <Skeleton key={i} className="h-20 w-full" />
        ))}
      </div>
    )
  }

  return (
    <div className="flex gap-4 p-4 h-full overflow-x-auto">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="min-w-[320px] w-[320px] flex-1 border border-[#262626] rounded-xl bg-[#050505] p-3 space-y-3">
          <Skeleton className="h-6 w-40" />
          {Array.from({ length: 3 }).map((__, cardIndex) => (
            <Skeleton key={cardIndex} className="h-28 w-full" />
          ))}
        </div>
      ))}
    </div>
  )
}
