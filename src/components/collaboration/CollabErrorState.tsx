import { AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface CollabErrorStateProps {
  message: string
  showRetry?: boolean
  onRetry: () => void
  onGoToTeam: () => void
}

export function CollabErrorState({ message, showRetry = true, onRetry, onGoToTeam }: CollabErrorStateProps) {
  return (
    <div className="flex h-full items-center justify-center px-6">
      <div className="max-w-md w-full rounded-xl border border-border bg-card p-6 text-center">
        <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400">
          <AlertTriangle className="h-5 w-5" />
        </div>
        <h2 className="text-base font-semibold text-foreground">Couldn&apos;t load collaboration data</h2>
        <p className="mt-2 text-sm text-muted-foreground">{message}</p>
        <div className="mt-5 flex items-center justify-center gap-2">
          {showRetry ? (
            <Button size="sm" className="h-8" onClick={onRetry}>
              Retry
            </Button>
          ) : null}
          <Button size="sm" variant="outline" className="h-8" onClick={onGoToTeam}>
            Go to Team
          </Button>
        </div>
      </div>
    </div>
  )
}
