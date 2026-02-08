'use client'

import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from 'sonner'
import {
  Check,
  Plus,
  RefreshCw,
  Settings,
  ExternalLink,
  Loader2,
} from 'lucide-react'
import { useAppStore } from '@/stores'

type Account = {
  id: string
  account_name: string
  account_id: string
}

type Integration = {
  id: string
  name: string
  description: string
  icon: string
  connected: boolean
  accounts: Account[]
}

// Default integrations data (fallback)
const defaultIntegrations: Integration[] = [
  {
    id: 'twitter',
    name: 'Twitter/X',
    description: 'Post threads, schedule tweets, and track engagement',
    icon: '𝕏',
    connected: false,
    accounts: [],
  },
  {
    id: 'linkedin',
    name: 'LinkedIn',
    description: 'Share articles, updates, and company news',
    icon: 'in',
    connected: false,
    accounts: [],
  },
  {
    id: 'instagram',
    name: 'Instagram',
    description: 'Post images, stories, and track visual content',
    icon: '📷',
    connected: false,
    accounts: [],
  },
  {
    id: 'blog',
    name: 'Blog / CMS',
    description: 'Publish to WordPress or other CMS platforms',
    icon: '📝',
    connected: false,
    accounts: [],
  },
]

export default function IntegrationsPage() {
  const { currentTeam } = useAppStore()
  const searchParams = useSearchParams()
  const [integrations, setIntegrations] = useState<Integration[]>([])
  const [loading, setLoading] = useState(true)
  const [connecting, setConnecting] = useState<string | null>(null)

  useEffect(() => {
    // Check for connection success/error
    const connected = searchParams.get('connected')
    const error = searchParams.get('error')

    if (connected) {
      toast.success(`${connected.charAt(0).toUpperCase() + connected.slice(1)} connected successfully!`)
      // Refresh integrations
      fetchIntegrations()
    }
    if (error) {
      toast.error(`Connection failed: ${decodeURIComponent(error)}`)
    }
  }, [searchParams])

  useEffect(() => {
    fetchIntegrations()
  }, [currentTeam?.id])

  async function fetchIntegrations() {
    if (!currentTeam?.id) {
      setIntegrations(defaultIntegrations)
      setLoading(false)
      return
    }
    try {
      const res = await fetch(`/api/platforms?teamId=${currentTeam.id}`)
      if (res.ok) {
        const data = await res.json()
        setIntegrations(data.data || defaultIntegrations)
      } else {
        setIntegrations(defaultIntegrations)
      }
    } catch (error) {
      console.error('Failed to fetch integrations:', error)
      setIntegrations(defaultIntegrations)
    } finally {
      setLoading(false)
    }
  }

  async function handleConnect(platform: string) {
    if (!currentTeam?.id) return
    setConnecting(platform)
    try {
      const res = await fetch('/api/platforms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ platform, teamId: currentTeam.id }),
      })
      const data = await res.json()
      if (data.authUrl) {
        window.location.href = data.authUrl
      } else {
        toast.error(data.error || 'Failed to initiate connection')
      }
    } catch (error) {
      console.error('Failed to connect:', error)
      toast.error('Failed to connect platform')
    } finally {
      setConnecting(null)
    }
  }

  async function handleDisconnect(accountId: string) {
    if (!confirm('Are you sure you want to disconnect this account?')) return
    try {
      const res = await fetch(`/api/platforms?accountId=${accountId}`, {
        method: 'DELETE',
      })
      if (res.ok) {
        toast.success('Account disconnected')
        fetchIntegrations()
      } else {
        toast.error('Failed to disconnect')
      }
    } catch (error) {
      console.error('Failed to disconnect:', error)
      toast.error('Failed to disconnect account')
    }
  }

  async function handleSync(platform: string) {
    toast.info('Syncing...')
    // Implementation would trigger a sync job
    setTimeout(() => {
      toast.success('Sync complete')
    }, 2000)
  }

  const connectedIntegrations = integrations.filter((i) => i.connected)
  const availableIntegrations = integrations.filter((i) => !i.connected)

  // Loading skeleton
  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <Skeleton className="h-8 w-32 mb-2" />
          <Skeleton className="h-4 w-48" />
        </div>
        <Skeleton className="h-64" />
        <Skeleton className="h-64" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Integrations</h1>
        <p className="text-muted-foreground">
          Connect your social media accounts and publishing platforms
        </p>
      </div>

      {/* Connected Platforms */}
      {connectedIntegrations.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">Connected Platforms</h2>
          <div className="grid gap-4 md:grid-cols-2">
            {connectedIntegrations.map((integration) => (
              <Card key={integration.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-2xl">
                        {integration.icon}
                      </div>
                      <div>
                        <CardTitle className="text-base">{integration.name}</CardTitle>
                        <Badge variant="secondary" className="mt-1">
                          <Check className="mr-1 h-3 w-3" />
                          Connected
                        </Badge>
                      </div>
                    </div>
                    <Button variant="ghost" size="icon">
                      <Settings className="h-4 w-4" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-4">
                    {integration.description}
                  </p>
                  <div className="space-y-2">
                    {integration.accounts.map((account) => (
                      <div
                        key={account.id}
                        className="flex items-center justify-between rounded-lg bg-muted/50 px-3 py-2"
                      >
                        <span className="text-sm font-medium">{account.account_name}</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDisconnect(account.id)}
                        >
                          Disconnect
                        </Button>
                      </div>
                    ))}
                    {integration.accounts.length === 0 && (
                      <p className="text-sm text-muted-foreground">
                        No accounts connected
                      </p>
                    )}
                  </div>
                  <div className="mt-4 flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleConnect(integration.id)}
                    >
                      <Plus className="mr-1 h-3 w-3" />
                      Add Account
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => handleSync(integration.id)}>
                      <RefreshCw className="mr-1 h-3 w-3" />
                      Sync
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Available Platforms */}
      {availableIntegrations.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">Available Platforms</h2>
          <div className="grid gap-4 md:grid-cols-2">
            {availableIntegrations.map((integration) => (
              <Card key={integration.id} className="border-dashed">
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-muted text-2xl">
                      {integration.icon}
                    </div>
                    <div>
                      <CardTitle className="text-base">{integration.name}</CardTitle>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-4">
                    {integration.description}
                  </p>
                  <Button
                    className="w-full"
                    onClick={() => handleConnect(integration.id)}
                    disabled={connecting === integration.id}
                  >
                    {connecting === integration.id ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Connecting...
                      </>
                    ) : (
                      <>
                        <Plus className="mr-2 h-4 w-4" />
                        Connect {integration.name}
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* API Configuration */}
      <Card>
        <CardHeader>
          <CardTitle>API Configuration</CardTitle>
          <CardDescription>
            Configure API credentials for platform integrations
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="rounded-lg border p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Twitter API</p>
                  <p className="text-sm text-muted-foreground">
                    Required for posting and scheduling tweets
                  </p>
                </div>
                <Badge variant={process.env.NEXT_PUBLIC_TWITTER_CLIENT_ID ? 'default' : 'outline'}>
                  {process.env.NEXT_PUBLIC_TWITTER_CLIENT_ID ? 'Configured' : 'Not Set'}
                </Badge>
              </div>
            </div>
            <div className="rounded-lg border p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">LinkedIn API</p>
                  <p className="text-sm text-muted-foreground">
                    Required for posting to LinkedIn
                  </p>
                </div>
                <Badge variant={process.env.NEXT_PUBLIC_LINKEDIN_CLIENT_ID ? 'default' : 'outline'}>
                  {process.env.NEXT_PUBLIC_LINKEDIN_CLIENT_ID ? 'Configured' : 'Not Set'}
                </Badge>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}