'use client'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

type ConnectedAccountRowProps = {
  account: {
    id: string
    account_name: string
    account_id: string
    account_handle?: string | null
    source?: 'real_oauth' | 'local_sandbox' | 'unknown'
    connected_at?: string | null
  }
  onDisconnect: (accountId: string) => void
}

export function ConnectedAccountRow({ account, onDisconnect }: ConnectedAccountRowProps) {
  return (
    <div className="flex items-center justify-between rounded-md bg-muted px-3 py-2 border border-border">
      <div>
        <p className="text-sm text-foreground">{account.account_name || 'Unnamed account'}</p>
        <div className="mt-0.5 flex items-center gap-2">
          {account.account_handle && (
            <span className="text-[11px] text-muted-foreground">{account.account_handle}</span>
          )}
          <Badge variant="outline" className="h-5 text-[10px] border-border text-muted-foreground">
            {account.source === 'local_sandbox' ? 'Sandbox' : 'Real OAuth'}
          </Badge>
          {account.connected_at && (
            <span className="text-[10px] text-muted-foreground">
              {new Date(account.connected_at).toLocaleDateString()}
            </span>
          )}
        </div>
      </div>
      <Button
        variant="ghost"
        size="sm"
        className="h-7 text-xs text-muted-foreground hover:text-foreground"
        onClick={() => onDisconnect(account.id)}
      >
        Disconnect
      </Button>
    </div>
  )
}
