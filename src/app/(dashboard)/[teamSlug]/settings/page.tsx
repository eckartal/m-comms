'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { useParams, usePathname, useRouter, useSearchParams } from 'next/navigation'
import {
  Globe,
  Bell,
  Link as LinkIcon,
  Loader2,
} from 'lucide-react'
import { useAppStore } from '@/stores'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import { platformIcons } from '@/components/oauth/PlatformIcon'
import { connectPlatform, getConnectErrorMessage } from '@/lib/oauth/connectPlatform'
import { DashboardContainer } from '@/components/layout/DashboardContainer'
import { getLocalConnectionAccounts } from '@/lib/oauth/localConnections'
import { useConnectionMode } from '@/hooks/useConnectionMode'
import { SandboxConfirmDialog } from '@/components/oauth/SandboxConfirmDialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

const timezones = [
  { id: 'America/New_York', label: 'Eastern Time (ET)', offset: 'UTC-5' },
  { id: 'America/Chicago', label: 'Central Time (CT)', offset: 'UTC-6' },
  { id: 'America/Denver', label: 'Mountain Time (MT)', offset: 'UTC-7' },
  { id: 'America/Los_Angeles', label: 'Pacific Time (PT)', offset: 'UTC-8' },
  { id: 'Europe/London', label: 'London (GMT)', offset: 'UTC+0' },
  { id: 'Europe/Paris', label: 'Paris (CET)', offset: 'UTC+1' },
  { id: 'Asia/Tokyo', label: 'Tokyo (JST)', offset: 'UTC+9' },
]

type IntegrationAccount = {
  id: string
  account_name: string
  source?: 'real_oauth' | 'local_sandbox' | 'unknown'
}

type Integration = {
  id: string
  name: string
  connected: boolean
  accounts: IntegrationAccount[]
}

export default function SettingsPage() {
  const router = useRouter()
  const pathname = usePathname()
  const params = useParams()
  const searchParams = useSearchParams()
  const teamSlug = params.teamSlug as string
  const { currentTeam, setCurrentTeam } = useAppStore()
  const [timezone, setTimezone] = useState('America/New_York')
  const [timezoneSaving, setTimezoneSaving] = useState(false)
  const [notifications, setNotifications] = useState({
    email: true,
    push: false,
    scheduled: true,
    published: true,
    mentions: true,
    commentReplies: true,
    statusChanges: true,
  })
  const [saved, setSaved] = useState(false)
  const [integrations, setIntegrations] = useState<Integration[]>([])
  const [integrationsLoading, setIntegrationsLoading] = useState(true)
  const [connectingPlatform, setConnectingPlatform] = useState<string | null>(null)
  const [sandboxConnectPlatform, setSandboxConnectPlatform] = useState<string | null>(null)
  const { mode: connectionMode } = useConnectionMode(teamSlug)

  useEffect(() => {
    // Load settings from team settings or use defaults
    if (currentTeam?.settings) {
      setTimezone((currentTeam.settings.timezone as string) || 'America/New_York')
    }
  }, [currentTeam?.settings])

  useEffect(() => {
    const fetchIntegrations = async () => {
      try {
        setIntegrationsLoading(true)
        const res = await fetch(`/api/platforms?teamSlug=${encodeURIComponent(teamSlug)}`)
        const data = await res.json()
        const localConnections = getLocalConnectionAccounts(teamSlug, currentTeam?.id)
        const integrationsData = ((data.data || []) as Integration[]).map((integration) => ({
          ...integration,
          connected: integration.connected || Boolean(localConnections[integration.id]),
          accounts:
            integration.accounts.length === 0 && localConnections[integration.id]
              ? [{
                  id: `local:${integration.id}`,
                  account_name: localConnections[integration.id].account_name,
                  source: 'local_sandbox' as const,
                }]
              : integration.accounts,
        }))
        if (res.ok) {
          setIntegrations(integrationsData)
        } else {
          setIntegrations(integrationsData)
        }
      } catch (error) {
        console.error('Failed to load integrations in settings:', error)
        setIntegrations([])
      } finally {
        setIntegrationsLoading(false)
      }
    }

    fetchIntegrations()
  }, [teamSlug, currentTeam?.id])

  const refreshIntegrations = useCallback(async () => {
    const res = await fetch(`/api/platforms?teamSlug=${encodeURIComponent(teamSlug)}`)
    const data = await res.json()
    if (res.ok) {
      const localConnections = getLocalConnectionAccounts(teamSlug, currentTeam?.id)
      setIntegrations(((data.data || []) as Integration[]).map((integration) => ({
        ...integration,
        connected: integration.connected || Boolean(localConnections[integration.id]),
        accounts:
          integration.accounts.length === 0 && localConnections[integration.id]
            ? [{
                id: `local:${integration.id}`,
                account_name: localConnections[integration.id].account_name,
                source: 'local_sandbox' as const,
              }]
            : integration.accounts,
      })))
    }
  }, [teamSlug, currentTeam?.id])

  useEffect(() => {
    const connected = searchParams.get('connected')
    const error = searchParams.get('error')

    if (connected) {
      toast.success(`${connected.charAt(0).toUpperCase() + connected.slice(1)} connected.`)
      refreshIntegrations()
    }

    if (error) {
      toast.error(`Connection failed: ${getConnectErrorMessage(decodeURIComponent(error))}`)
    }

    if (connected || error) {
      router.replace(pathname)
    }
  }, [searchParams, router, pathname, refreshIntegrations])

  const runQuickConnect = async (platform: string, skipSandboxConfirmation = false) => {
    setConnectingPlatform(platform)

    try {
      await connectPlatform({
        platform,
        teamId: currentTeam?.id,
        teamSlug,
        returnTo: `/${teamSlug}/settings`,
        mode: 'popup',
        source: 'settings',
        skipSandboxConfirmation,
        onSuccess: async (connectedPlatform) => {
          toast.success(`${connectedPlatform.charAt(0).toUpperCase() + connectedPlatform.slice(1)} connected.`)
          await refreshIntegrations()
        },
        onError: (message) => {
          toast.error(`Connection failed: ${message}`)
        },
      })
    } catch (error) {
      console.error('Quick connect failed:', error)
    } finally {
      setConnectingPlatform(null)
    }
  }

  const handleQuickConnect = async (platform: string) => {
    if (connectionMode === 'local_sandbox') {
      setSandboxConnectPlatform(platform)
      return
    }
    await runQuickConnect(platform)
  }

  const handleSave = () => {
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const handleTimezoneChange = async (nextTimezone: string) => {
    if (!currentTeam?.id) {
      setTimezone(nextTimezone)
      return
    }

    const previousTimezone = timezone
    const nextSettings = {
      ...(currentTeam.settings || {}),
      timezone: nextTimezone,
    }

    setTimezone(nextTimezone)
    setTimezoneSaving(true)

    try {
      const res = await fetch(`/api/teams/${currentTeam.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ settings: nextSettings }),
      })

      if (!res.ok) {
        throw new Error('Failed to update timezone')
      }

      setCurrentTeam({ ...currentTeam, settings: nextSettings })
      toast.success('Timezone updated')
    } catch (error) {
      console.error('Failed to save timezone:', error)
      setTimezone(previousTimezone)
      toast.error('Could not save timezone')
    } finally {
      setTimezoneSaving(false)
    }
  }

  return (
    <DashboardContainer className="max-w-3xl py-8 md:py-10">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-[20px] font-medium text-foreground">Settings</h1>
          <p className="text-[14px] text-muted-foreground mt-1">
            Manage your team preferences and integrations
          </p>
        </div>

        <SandboxConfirmDialog
          open={Boolean(sandboxConnectPlatform)}
          platformName={sandboxConnectPlatform || 'platform'}
          onCancel={() => setSandboxConnectPlatform(null)}
          onConfirm={async () => {
            const platform = sandboxConnectPlatform
            setSandboxConnectPlatform(null)
            if (platform) await runQuickConnect(platform, true)
          }}
        />

        {/* Timezone Section */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <Globe className="w-5 h-5 text-muted-foreground" />
            <h2 className="text-[16px] font-medium text-foreground">Timezone</h2>
          </div>
          <div className="border border-border rounded-[8px] p-4">
            <p className="text-[14px] text-muted-foreground mb-4">
              Set your timezone for accurate content scheduling
            </p>
            <Select value={timezone} onValueChange={handleTimezoneChange} disabled={timezoneSaving}>
              <SelectTrigger className="w-full h-10 rounded-[6px] text-[14px] tracking-normal">
                <SelectValue placeholder="Select timezone" />
              </SelectTrigger>
              <SelectContent position="popper" align="start" className="w-[--radix-select-trigger-width]">
                {timezones.map((tz) => (
                  <SelectItem key={tz.id} value={tz.id} className="text-[13px] tracking-normal">
                    {tz.label} ({tz.offset})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Notifications Section */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <Bell className="w-5 h-5 text-muted-foreground" />
            <h2 className="text-[16px] font-medium text-foreground">Notifications</h2>
          </div>
          <div className="border border-border rounded-[8px] p-4">
            <div className="space-y-4">
              <ToggleOption
                label="Email notifications"
                description="Receive email updates about your content"
                checked={notifications.email}
                onChange={(v) => setNotifications({ ...notifications, email: v })}
              />
              <ToggleOption
                label="Push notifications"
                description="Receive browser push notifications"
                checked={notifications.push}
                onChange={(v) => setNotifications({ ...notifications, push: v })}
              />
              <ToggleOption
                label="Scheduled post reminders"
                description="Get reminded before scheduled posts go live"
                checked={notifications.scheduled}
                onChange={(v) => setNotifications({ ...notifications, scheduled: v })}
              />
              <ToggleOption
                label="Shared notifications"
                description="Get notified when posts are published"
                checked={notifications.published}
                onChange={(v) => setNotifications({ ...notifications, published: v })}
              />
              <ToggleOption
                label="Mentions"
                description="Get notified when someone @mentions you"
                checked={notifications.mentions}
                onChange={(v) => setNotifications({ ...notifications, mentions: v })}
              />
              <ToggleOption
                label="Comment replies"
                description="Get notified when someone replies to your comments"
                checked={notifications.commentReplies}
                onChange={(v) => setNotifications({ ...notifications, commentReplies: v })}
              />
              <ToggleOption
                label="Status changes"
                description="Get notified when content status changes"
                checked={notifications.statusChanges}
                onChange={(v) => setNotifications({ ...notifications, statusChanges: v })}
              />
            </div>
          </div>
        </div>

        {/* Integrations Section */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <LinkIcon className="w-5 h-5 text-muted-foreground" />
            <h2 className="text-[16px] font-medium text-foreground">Integrations</h2>
          </div>
          <div className="border border-border rounded-[8px] p-4">
            <p className="text-[14px] text-muted-foreground mb-4">
              Connect socials right here without leaving Settings. Use Integrations only for advanced account management.
            </p>

            {integrationsLoading ? (
              <p className="text-[13px] text-muted-foreground">Loading platforms...</p>
            ) : (
              <div className="space-y-2">
                {integrations
                  .filter((integration) => integration.id !== 'blog')
                  .slice(0, 5)
                  .map((integration) => {
                    const Icon = platformIcons[integration.id]
                    return (
                      <div key={integration.id} className="flex items-center justify-between rounded-[8px] border border-border px-3 py-2">
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 rounded-[6px] bg-accent flex items-center justify-center">
                            {Icon ? <Icon className="h-4 w-4" /> : null}
                          </div>
                          <div>
                            <p className="text-[13px] font-medium text-foreground">{integration.name}</p>
                            <p className="text-[12px] text-muted-foreground">
                              {integration.connected
                                ? `${integration.accounts.length} account${integration.accounts.length !== 1 ? 's' : ''} connected${integration.accounts[0]?.source === 'local_sandbox' ? ' (Sandbox)' : ''}`
                                : 'Not connected'}
                            </p>
                          </div>
                        </div>
                        {integration.connected ? (
                          <span className="text-[12px] text-emerald-500 font-medium">Connected</span>
                        ) : (
                          <button
                            onClick={() => handleQuickConnect(integration.id)}
                            disabled={connectingPlatform === integration.id}
                            className="inline-flex items-center rounded-[6px] bg-foreground px-3 py-1.5 text-[12px] font-medium text-background hover:bg-hover disabled:opacity-70"
                          >
                            {connectingPlatform === integration.id ? (
                              <>
                                <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                                Connecting
                              </>
                            ) : (
                              'Connect'
                            )}
                          </button>
                        )}
                      </div>
                    )
                  })}
              </div>
            )}

            <Link
              href={`/${teamSlug}/integrations`}
              className="mt-3 inline-flex items-center rounded-[6px] border border-border px-3 py-1.5 text-[13px] font-medium text-foreground hover:bg-accent"
            >
              Manage All Integrations
            </Link>
          </div>
        </div>

        {/* Save Button */}
        <div className="flex items-center justify-between pt-4">
          <p className="text-[13px] text-muted-foreground">
            Changes are saved automatically
          </p>
          <button
            onClick={handleSave}
            className={cn(
              'px-6 py-2 rounded-[6px] text-[14px] font-medium transition-all',
              saved
                ? 'bg-emerald-500 text-emerald-500'
                : 'bg-foreground text-foreground hover:bg-hover'
            )}
          >
            {saved ? 'Saved!' : 'Save Changes'}
          </button>
        </div>
    </DashboardContainer>
  )
}

function ToggleOption({
  label,
  description,
  checked,
  onChange,
}: {
  label: string
  description: string
  checked: boolean
  onChange: (v: boolean) => void
}) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <p className="text-[14px] font-medium text-foreground">{label}</p>
        <p className="text-[13px] text-muted-foreground">{description}</p>
      </div>
      <button
        onClick={() => onChange(!checked)}
        className={cn(
          'w-11 h-6 rounded-full transition-colors relative',
          checked ? 'bg-foreground' : 'bg-border'
        )}
      >
        <span
          className={cn(
            'absolute top-1 w-4 h-4 rounded-full bg-white transition-transform',
            checked ? 'left-6' : 'left-1'
          )}
        />
      </button>
    </div>
  )
}
