import { AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface CollabErrorStateProps {
  message: string
  onRetry: () => void
  onGoToTeam: () => void
}

export function CollabErrorState({ message, onRetry, onGoToTeam }: CollabErrorStateProps) {
  return (
    <div className="flex h-full items-center justify-center px-6">
      <div className="max-w-md w-full border border-[#262626] rounded-xl bg-[#050505] p-6 text-center">
        <div className="mx-auto mb-3 h-10 w-10 rounded-full bg-red-950/40 flex items-center justify-center text-red-400">
          <AlertTriangle className="h-5 w-5" />
        </div>
        <h2 className="text-base font-semibold text-foreground">Couldn&apos;t load collaboration data</h2>
        <p className="mt-2 text-sm text-muted-foreground">{message}</p>
        <div className="mt-5 flex items-center justify-center gap-2">
          <Button size="sm" className="h-8" onClick={onRetry}>
            Retry
          </Button>
          <Button size="sm" variant="outline" className="h-8" onClick={onGoToTeam}>
            Go to Team
          </Button>
        </div>
      </div>
    </div>
  )
}
