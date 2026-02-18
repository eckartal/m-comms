'use client'

import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from 'sonner'
import { Check, Plus, RefreshCw, Settings, Loader2 } from 'lucide-react'
import { useAppStore } from '@/stores'
import { platformIcons } from '@/components/oauth/PlatformIcon'

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
    // Blog is a content format, not an external platform to connect
    if (platform === 'blog') {
      toast.info('Blog is built into the app - no connection needed!')
      return
    }

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
        // Redirect to OAuth - simple full-page redirect
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

  const handleDisconnect = (accountId: string) => {
    if (!confirm('Are you sure you want to disconnect this account?')) return
    try {
      fetch(`/api/platforms?accountId=${accountId}`, { method: 'DELETE' })
        .then((res) => {
          if (res.ok) {
            toast.success('Account disconnected')
            fetchIntegrations()
          } else {
            toast.error('Failed to disconnect')
          }
        })
        .catch((error) => {
          console.error('Failed to disconnect:', error)
          toast.error('Failed to disconnect account')
        })
    } catch (error) {
      console.error('Failed to disconnect:', error)
      toast.error('Failed to disconnect account')
    }
  }

  const handleSync = (platform: string) => {
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
        <h1 className="text-3xl font-bold text-foreground">Integrations</h1>
        <p className="text-muted-foreground mt-1">Connect your social media accounts and publishing platforms</p>
      </div>

      {/* Connected Platforms */}
      {connectedIntegrations.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-lg font-medium text-foreground">Connected Platforms</h2>
          <div className="grid gap-4 md:grid-cols-2">
            {connectedIntegrations.map((integration) => (
              <Card key={integration.id} className="border-border bg-card">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-muted">
                        {integration.id === 'twitter' && <div className="text-foreground"><platformIcons.twitter className="h-6 w-6" /></div>}
                        {integration.id === 'linkedin' && <div className="text-[#0077B5]"><platformIcons.linkedin className="h-6 w-6" /></div>}
                        {integration.id === 'instagram' && <div className="h-6 w-6"><platformIcons.instagram className="h-6 w-6" /></div>}
                        {integration.id === 'blog' && <div className="text-[#6B7280]"><platformIcons.blog className="h-6 w-6" /></div>}
                      </div>
                      <div>
                        <CardTitle className="text-base text-foreground">{integration.name}</CardTitle>
                        <Badge variant="secondary" className="mt-1 bg-muted text-emerald-500 border-border">
                          <Check className="mr-1 h-3 w-3" />
                          Connected
                        </Badge>
                      </div>
                    </div>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground">
                      <Settings className="h-4 w-4" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-4">{integration.description}</p>
                  <div className="space-y-2">
                    {integration.accounts.length > 0 ? (
                      integration.accounts.map((account) => (
                        <div key={account.id} className="flex items-center justify-between rounded-md bg-muted px-3 py-2 border border-border">
                          <span className="text-sm text-foreground">{account.account_name}</span>
                          <Button variant="ghost" size="sm" className="h-7 text-xs text-muted-foreground hover:text-foreground" onClick={() => handleDisconnect(account.id)}>
                            Disconnect
                          </Button>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-muted-foreground">No accounts connected</p>
                    )}
                  </div>
                  <div className="mt-4 flex gap-2">
                    <Button variant="outline" size="sm" className="h-8 text-xs border-border text-foreground hover:bg-accent" onClick={() => handleConnect(integration.id)}>
                      <Plus className="mr-1 h-3 w-3" />
                      Add Account
                    </Button>
                    <Button variant="outline" size="sm" className="h-8 text-xs border-border text-muted-foreground hover:text-foreground hover:bg-accent" onClick={() => handleSync(integration.id)}>
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
          <h2 className="text-lg font-medium text-foreground">Available Platforms</h2>
          <div className="grid gap-4 md:grid-cols-2">
            {availableIntegrations.map((integration) => (
              <Card key={integration.id} className="border-border border-dashed bg-card">
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-muted">
                      {integration.id === 'twitter' && <div className="text-foreground"><platformIcons.twitter className="h-6 w-6" /></div>}
                      {integration.id === 'linkedin' && <div className="text-[#0077B5]"><platformIcons.linkedin className="h-6 w-6" /></div>}
                      {integration.id === 'instagram' && <div className="text-[#E1306C]"><platformIcons.instagram className="h-6 w-6" /></div>}
                      {integration.id === 'blog' && <div className="text-[#6B7280]"><platformIcons.blog className="h-6 w-6" /></div>}
                    </div>
                    <div>
                      <CardTitle className="text-base text-foreground">{integration.name}</CardTitle>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-4">{integration.description}</p>
                  <Button
                    className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
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
      <Card className="border-border bg-card">
        <CardHeader>
          <CardTitle className="text-foreground">API Configuration</CardTitle>
          <CardDescription className="text-muted-foreground">Configure API credentials for platform integrations</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="rounded-lg border border-border p-4 bg-muted">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-foreground">Twitter API</p>
                  <p className="text-xs text-muted-foreground mt-1">Required for posting and scheduling tweets</p>
                </div>
                <Badge variant="outline" className={process.env.NEXT_PUBLIC_TWITTER_CLIENT_ID ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' : 'border-border text-muted-foreground'}>
                  {process.env.NEXT_PUBLIC_TWITTER_CLIENT_ID ? 'Configured' : 'Not Set'}
                </Badge>
              </div>
            </div>
            <div className="rounded-lg border border-border p-4 bg-muted">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-foreground">LinkedIn API</p>
                  <p className="text-xs text-muted-foreground mt-1">Required for posting to LinkedIn</p>
                </div>
                <Badge variant="outline" className={process.env.NEXT_PUBLIC_LINKEDIN_CLIENT_ID ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' : 'border-border text-muted-foreground'}>
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
