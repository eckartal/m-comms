import { FilePlus2, FilterX, ShieldAlert } from 'lucide-react'
import { Button } from '@/components/ui/button'

type EmptyVariant = 'first_use' | 'filtered' | 'permission'

interface CollabEmptyStateProps {
  variant: EmptyVariant
  onCreatePost: () => void
  onClearFilters: () => void
  onGoToTeam: () => void
}

export function CollabEmptyState({
  variant,
  onCreatePost,
  onClearFilters,
  onGoToTeam,
}: CollabEmptyStateProps) {
  if (variant === 'permission') {
    return (
      <div className="flex h-full items-center justify-center px-6">
        <div className="max-w-md w-full rounded-xl border border-border bg-card p-6 text-center">
          <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400">
            <ShieldAlert className="h-5 w-5" />
          </div>
          <h2 className="text-base font-semibold text-foreground">Access is restricted</h2>
          <div className="mt-5">
            <Button size="sm" className="h-8" onClick={onGoToTeam}>
              Open team
            </Button>
          </div>
        </div>
      </div>
    )
  }

  if (variant === 'filtered') {
    return (
      <div className="flex h-full items-center justify-center px-6">
        <div className="max-w-md w-full rounded-xl border border-border bg-card p-6 text-center">
          <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-muted text-muted-foreground">
            <FilterX className="h-5 w-5" />
          </div>
          <h2 className="text-base font-semibold text-foreground">No matching content</h2>
          <div className="mt-5">
            <Button size="sm" className="h-8" onClick={onClearFilters}>
              Clear filters
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-full items-center justify-center px-6">
      <div className="max-w-md w-full rounded-xl border border-border bg-card p-6 text-center">
        <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-muted text-muted-foreground">
          <FilePlus2 className="h-5 w-5" />
        </div>
        <h2 className="text-base font-semibold text-foreground">No posts yet</h2>
        <div className="mt-5 flex items-center justify-center gap-2">
          <Button size="sm" className="h-8" onClick={onCreatePost}>
            Create post
          </Button>
          <Button size="sm" variant="outline" className="h-8" onClick={onGoToTeam}>
            Team settings
          </Button>
        </div>
      </div>
    </div>
  )
}
