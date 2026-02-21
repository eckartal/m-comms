'use client'

import { useCallback, useEffect, useState } from 'react'
import { useParams, usePathname, useRouter, useSearchParams } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { toast } from 'sonner'
import { Plus, Settings, Loader2 } from 'lucide-react'
import { useAppStore } from '@/stores'
import { PlatformIcon } from '@/components/oauth/PlatformIcon'
import { connectPlatform, getConnectErrorMessage } from '@/lib/oauth/connectPlatform'
import { DashboardContainer } from '@/components/layout/DashboardContainer'
import { clearLocalConnections, forgetLocalConnection, getLocalConnectionAccounts } from '@/lib/oauth/localConnections'
import { SandboxConfirmDialog } from '@/components/oauth/SandboxConfirmDialog'
import { useConnectionMode } from '@/hooks/useConnectionMode'

type Account = {
  id: string
  account_name: string
  account_id: string
  account_handle?: string | null
  source?: 'real_oauth' | 'local_sandbox' | 'unknown'
  status?: 'connected' | 'degraded'
  connected_at?: string | null
}

type Integration = {
  id: string
  name: string
  description: string
  icon: string
  connected: boolean
  accounts: Account[]
  connection_status?: 'connected' | 'degraded' | 'disconnected'
  oauth_configured?: boolean
  connectable?: boolean
  publishable?: boolean
  support_status?: 'publish_ready' | 'connect_only' | 'internal'
}

function mergeWithLocalConnections(
  integrations: Integration[],
  localConnections: Record<string, {
    account_name: string
    account_id: string
    account_handle: string | null
    source: 'local_sandbox'
    status: 'connected'
    connected_at: string
  }>
): Integration[] {
  return integrations.map((integration) => {
    const localAccount = localConnections[integration.id]
    const isLocallyConnected = Boolean(localAccount)
    const shouldInjectLocalAccount = isLocallyConnected && integration.accounts.length === 0

    return {
      ...integration,
      connected: integration.connected || isLocallyConnected,
      accounts: shouldInjectLocalAccount
        ? [
            {
              id: `local:${integration.id}`,
              account_name: localAccount.account_name,
              account_id: localAccount.account_id,
              account_handle: localAccount.account_handle,
              source: localAccount.source,
              status: localAccount.status,
              connected_at: localAccount.connected_at,
            },
          ]
        : integration.accounts,
    }
  })
}

const FALLBACK_INTEGRATIONS: Integration[] = [
  { id: 'twitter', name: 'X (Twitter)', description: 'Post threads, schedule tweets, and track engagement', icon: '𝕏', connected: false, accounts: [] },
  { id: 'linkedin', name: 'LinkedIn', description: 'Share articles, updates, and company news', icon: 'in', connected: false, accounts: [] },
  { id: 'instagram', name: 'Instagram', description: 'Post images, stories, and track visual content', icon: '📷', connected: false, accounts: [] },
  { id: 'tiktok', name: 'TikTok', description: 'Create viral video content and reach wider audiences', icon: '🎵', connected: false, accounts: [] },
  { id: 'youtube', name: 'YouTube', description: 'Publish videos and grow your channel', icon: '▶️', connected: false, accounts: [] },
  { id: 'threads', name: 'Threads', description: 'Share short text posts and join conversations', icon: '💬', connected: false, accounts: [] },
  { id: 'bluesky', name: 'Bluesky', description: 'Decentralized social network with community moderation', icon: '🔵', connected: false, accounts: [] },
  { id: 'mastodon', name: 'Mastodon', description: 'Federated social network with server diversity', icon: '🐘', connected: false, accounts: [] },
  { id: 'facebook', name: 'Facebook', description: 'Post to your business page and reach customers', icon: 'f', connected: false, accounts: [] },
  { id: 'blog', name: 'Blog / CMS', description: 'Publish to WordPress or other CMS platforms', icon: '📝', connected: false, accounts: [] },
]

export default function IntegrationsPage() {
  const router = useRouter()
  const pathname = usePathname()
  const { currentTeam } = useAppStore()
  const params = useParams()
  const teamSlug = params.teamSlug as string
  const searchParams = useSearchParams()
  const [integrations, setIntegrations] = useState<Integration[]>([])
  const [loading, setLoading] = useState(true)
  const [connecting, setConnecting] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [settingsPlatformId, setSettingsPlatformId] = useState<string | null>(null)
  const [sandboxConnectPlatform, setSandboxConnectPlatform] = useState<string | null>(null)
  const { mode: defaultConnectionMode, refresh: refreshConnectionMode } = useConnectionMode(teamSlug)

  const fetchIntegrations = useCallback(async () => {
    try {
      setErrorMessage(null)
      const res = await fetch(`/api/platforms?teamSlug=${encodeURIComponent(teamSlug)}`)
      const data = await res.json()
      const localConnections = getLocalConnectionAccounts(teamSlug, currentTeam?.id)
      const baseIntegrations = res.ok ? (data.data || []) as Integration[] : FALLBACK_INTEGRATIONS
      const mergedIntegrations = mergeWithLocalConnections(baseIntegrations, localConnections)
      refreshConnectionMode()

      if (res.ok) {
        setIntegrations(mergedIntegrations)
      } else {
        setErrorMessage(data.error || 'Failed to fetch integrations')
        setIntegrations(mergedIntegrations)
      }
    } catch (error) {
      console.error('Failed to fetch integrations:', error)
      setErrorMessage('Failed to fetch integrations')
      const localConnections = getLocalConnectionAccounts(teamSlug, currentTeam?.id)
      setIntegrations(mergeWithLocalConnections(FALLBACK_INTEGRATIONS, localConnections))
    } finally {
      setLoading(false)
    }
  }, [teamSlug, currentTeam?.id, refreshConnectionMode])

  useEffect(() => {
    const connected = searchParams.get('connected')
    const error = searchParams.get('error')

    if (connected) {
      toast.success(`${connected.charAt(0).toUpperCase() + connected.slice(1)} connected successfully!`)
      fetchIntegrations()
    }
    if (error) {
      toast.error(`Connection failed: ${getConnectErrorMessage(decodeURIComponent(error))}`)
    }

    if (connected || error) {
      router.replace(pathname)
    }
  }, [fetchIntegrations, searchParams, router, pathname])

  useEffect(() => {
    fetchIntegrations()
  }, [fetchIntegrations])

  async function runConnect(platform: string, skipSandboxConfirmation = false) {
    setConnecting(platform)

    try {
      await connectPlatform({
        platform,
        teamId: currentTeam?.id,
        teamSlug,
        returnTo: `/${teamSlug}/integrations`,
        mode: 'popup',
        source: 'integrations',
        skipSandboxConfirmation,
        onSuccess: (connectedPlatform) => {
          toast.success(`${connectedPlatform.charAt(0).toUpperCase() + connectedPlatform.slice(1)} connected successfully!`)
          fetchIntegrations()
        },
        onError: (message) => {
          toast.error(`Connection failed: ${message}`)
        },
      })
    } catch (error) {
      console.error('Failed to connect:', error)
    } finally {
      setConnecting(null)
    }
  }

  async function handleConnect(platform: string) {
    if (platform === 'blog') {
      toast.info('Blog is built into the app - no connection needed!')
      return
    }

    const integration = integrations.find((item) => item.id === platform)
    const requiresConfiguration = defaultConnectionMode === 'real_oauth' && integration?.oauth_configured === false
    if (requiresConfiguration) {
      toast.error(`${integration?.name || platform} is not configured. Add client credentials on the server first.`)
      return
    }

    if (defaultConnectionMode === 'local_sandbox') {
      setSandboxConnectPlatform(platform)
      return
    }

    await runConnect(platform)
  }

  const handleDisconnect = (accountId: string) => {
    if (!confirm('Are you sure you want to disconnect this account?')) return

    if (accountId.startsWith('local:')) {
      const platform = accountId.replace('local:', '')
      forgetLocalConnection(platform, teamSlug, currentTeam?.id)
      toast.success('Local sandbox account disconnected')
      fetchIntegrations()
      return
    }

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

  const socialIntegrations = integrations.filter((integration) => integration.id !== 'blog')
  const selectedPlatform = integrations.find((integration) => integration.id === settingsPlatformId) || null
  const missingOauthPlatforms = socialIntegrations.filter(
    (integration) => integration.connectable !== false && integration.oauth_configured === false
  )

  if (loading) {
    return (
      <DashboardContainer className="space-y-6 py-8 md:py-10">
        <div>
          <Skeleton className="mb-2 h-8 w-32" />
          <Skeleton className="h-4 w-48" />
        </div>
        <Skeleton className="h-96" />
        <Skeleton className="h-64" />
      </DashboardContainer>
    )
  }

  return (
    <DashboardContainer className="space-y-6 py-8 md:py-10">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Integrations</h1>
        <p className="mt-1 text-muted-foreground">Connect your social media accounts and publishing platforms</p>
      </div>

      {errorMessage && (
        <div className="rounded-md border border-border bg-muted px-4 py-3 text-sm text-muted-foreground">
          {errorMessage}
        </div>
      )}

      {defaultConnectionMode === 'real_oauth' && missingOauthPlatforms.length > 0 && (
        <div className="rounded-md border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
          OAuth credentials are missing for: {missingOauthPlatforms.map((item) => item.name).join(', ')}.
          Add provider client ID/secret to enable real connections.
        </div>
      )}

      <div className="rounded-lg border border-border bg-card">
        {socialIntegrations.map((integration, index) => {
          const isConnecting = connecting === integration.id
          const isConnected = integration.connected
          const isDegraded = isConnected && integration.accounts.length === 0
          const requiresConfiguration = defaultConnectionMode === 'real_oauth' && integration.oauth_configured === false
          const connectLabel = isConnecting
            ? 'Connecting...'
            : requiresConfiguration
            ? 'Config Required'
            : isDegraded
            ? 'Repair'
            : isConnected
            ? 'Connected'
            : 'Connect'

          return (
            <div
              key={integration.id}
              className={`flex items-center justify-between px-4 py-3 ${index !== socialIntegrations.length - 1 ? 'border-b border-border' : ''}`}
            >
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-md bg-muted">
                  <PlatformIcon platform={integration.id} className="h-5 w-5 text-foreground" />
                </div>
                <p className="text-sm font-medium text-foreground">{integration.name}</p>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant={isConnected && !isDegraded ? 'secondary' : 'default'}
                  size="sm"
                  className="h-8 min-w-[92px]"
                  onClick={() => handleConnect(integration.id)}
                  disabled={isConnecting || (isConnected && !isDegraded) || requiresConfiguration}
                >
                  {isConnecting ? <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" /> : null}
                  {!isConnecting && !isConnected ? <Plus className="mr-1 h-3.5 w-3.5" /> : null}
                  {connectLabel}
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setSettingsPlatformId(integration.id)}
                >
                  <Settings className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )
        })}
      </div>

      <Card className="border-border bg-card">
        <CardHeader>
          <CardTitle className="text-foreground">Connection Mode</CardTitle>
          <CardDescription className="text-muted-foreground">
            This workspace is currently using {defaultConnectionMode === 'real_oauth' ? 'real OAuth' : 'local sandbox'} connection mode.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border border-border bg-muted p-4">
            <div className="flex items-center justify-between gap-4">
              <p className="text-sm text-muted-foreground">
                {defaultConnectionMode === 'real_oauth'
                  ? 'Connect opens real provider OAuth and links actual social accounts.'
                  : 'Connect uses local sandbox accounts for safe local testing.'}
              </p>
              <div className="flex items-center gap-2">
                {defaultConnectionMode === 'real_oauth' && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 border-border text-xs"
                    onClick={() => {
                      clearLocalConnections(teamSlug, currentTeam?.id)
                      fetchIntegrations()
                      toast.success('Cleared local sandbox connections')
                    }}
                  >
                    Clear Sandbox Data
                  </Button>
                )}
                <Badge
                  variant="secondary"
                  className={defaultConnectionMode === 'real_oauth'
                    ? 'border-blue-500/20 bg-blue-500/10 text-blue-400'
                    : 'border-emerald-500/20 bg-emerald-500/10 text-emerald-500'}
                >
                  {defaultConnectionMode === 'real_oauth' ? 'Real OAuth' : 'Sandbox'}
                </Badge>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Dialog open={Boolean(settingsPlatformId)} onOpenChange={(open) => !open && setSettingsPlatformId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{selectedPlatform?.name || 'Platform'} Settings</DialogTitle>
            <DialogDescription>
              Review connected accounts and manage access for this platform.
            </DialogDescription>
          </DialogHeader>

          {selectedPlatform ? (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="border-border bg-muted text-foreground">
                  {selectedPlatform.connected ? 'Connected' : 'Not connected'}
                </Badge>
                <span className="text-xs text-muted-foreground">
                  {selectedPlatform.accounts.length} account{selectedPlatform.accounts.length !== 1 ? 's' : ''}
                </span>
              </div>

              {selectedPlatform.accounts.length > 0 ? (
                selectedPlatform.accounts.map((account) => (
                  <div key={account.id} className="rounded-md border border-border bg-muted p-3">
                    <p className="text-sm font-medium text-foreground">{account.account_name || 'Unnamed account'}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {account.account_handle ? `${account.account_handle} • ` : ''}ID: {account.account_id || account.id}
                    </p>
                    <div className="mt-2 flex items-center gap-2">
                      <Badge variant="outline" className="border-border text-[10px] text-muted-foreground">
                        {account.source === 'local_sandbox' ? 'Local Sandbox' : 'Real OAuth'}
                      </Badge>
                      {account.connected_at && (
                        <span className="text-[10px] text-muted-foreground">
                          Connected {new Date(account.connected_at).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-3 h-8 border-border text-xs"
                      onClick={() => {
                        handleDisconnect(account.id)
                        setSettingsPlatformId(null)
                      }}
                    >
                      Disconnect
                    </Button>
                  </div>
                ))
              ) : (
                <div className="rounded-md border border-border bg-muted p-3">
                  <p className="text-sm text-muted-foreground">No accounts connected for this platform.</p>
                  <Button
                    className="mt-3 h-8 text-xs"
                    disabled={defaultConnectionMode === 'real_oauth' && selectedPlatform.oauth_configured === false}
                    onClick={() => {
                      handleConnect(selectedPlatform.id)
                      setSettingsPlatformId(null)
                    }}
                  >
                    <Plus className="mr-1 h-3 w-3" />
                    Connect Account
                  </Button>
                </div>
              )}
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

      <SandboxConfirmDialog
        open={Boolean(sandboxConnectPlatform)}
        platformName={sandboxConnectPlatform ? (integrations.find((item) => item.id === sandboxConnectPlatform)?.name || sandboxConnectPlatform) : 'platform'}
        onCancel={() => setSandboxConnectPlatform(null)}
        onConfirm={async () => {
          const platform = sandboxConnectPlatform
          setSandboxConnectPlatform(null)
          if (platform) await runConnect(platform, true)
        }}
      />
    </DashboardContainer>
  )
}
