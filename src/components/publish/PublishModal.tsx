'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { Loader2, Send, CheckCircle, AlertCircle } from 'lucide-react'
import { toast } from 'sonner'
import { useAppStore } from '@/stores'
import { connectPlatform } from '@/lib/oauth/connectPlatform'
import { trackEvent } from '@/lib/analytics/trackEvent'
import { useConnectionMode } from '@/hooks/useConnectionMode'
import { SandboxConfirmDialog } from '@/components/oauth/SandboxConfirmDialog'

interface PublishModalProps {
  contentId: string
}

interface PlatformAccount {
  platform: string
  account_name: string
  connected: boolean
}

interface PlatformInfo {
  id: string
  name: string
  accounts: Array<{ account_name?: string }>
  connected: boolean
}

interface PublishResult {
  results: Array<{
    platform: string
    success: boolean
    error?: string
  }>
  summary: {
    total: number
    successful: number
    failed: number
  }
}

export function PublishModal({ contentId }: PublishModalProps) {
  const params = useParams()
  const teamSlug = params.teamSlug as string
  const { currentTeam } = useAppStore()
  const [isOpen, setIsOpen] = useState(false)
  const [platforms, setPlatforms] = useState<PlatformAccount[]>([])
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [publishResult, setPublishResult] = useState<PublishResult | { error: string } | null>(null)
  const [status, setStatus] = useState<'idle' | 'publishing' | 'success' | 'error'>('idle')
  const [connectingPlatform, setConnectingPlatform] = useState<string | null>(null)
  const [sandboxConnectPlatform, setSandboxConnectPlatform] = useState<string | null>(null)
  const { mode: connectionMode } = useConnectionMode(teamSlug)

  const fetchConnectedPlatforms = useCallback(async () => {
    const contentRes = await fetch(`/api/content/${contentId}`)
    if (contentRes.ok) {
      const { data } = await contentRes.json()
      const teamId = data?.team_id

      if (teamId) {
        const platformsRes = await fetch(`/api/platforms?teamId=${teamId}`)
        if (platformsRes.ok) {
          const { data: platformData } = await platformsRes.json()
          const connectedPlatforms = (platformData as PlatformInfo[])
            .filter((p) => p.connected)
            .map((p) => ({
              platform: p.id,
              account_name: p.accounts[0]?.account_name || p.name,
              connected: true,
            }))
          setPlatforms(connectedPlatforms)
        }
      }
    }
  }, [contentId])

  useEffect(() => {
    if (isOpen && platforms.length === 0) {
      fetchConnectedPlatforms()
    }
    if (!isOpen) {
      setPublishResult(null)
      setStatus('idle')
      setSelectedPlatforms([])
    }
  }, [isOpen, platforms.length, fetchConnectedPlatforms])

  useEffect(() => {
    if (!isOpen || platforms.length > 0 || !currentTeam?.id) return
    trackEvent('publish_blocked_no_account', {
      teamId: currentTeam.id,
      payload: { source: 'publish_modal' },
    })
  }, [isOpen, platforms.length, currentTeam?.id])

  const handlePublish = async () => {
    if (selectedPlatforms.length === 0) return

    setIsLoading(true)
    setStatus('publishing')

    try {
      const response = await fetch(`/api/content/${contentId}/publish`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ platforms: selectedPlatforms }),
      })

      const data = await response.json()

      if (response.ok) {
        setPublishResult(data.data)
        setStatus('success')
      } else {
        setPublishResult({ error: data.error })
        setStatus('error')
      }
    } catch {
      setPublishResult({ error: 'Failed to publish' })
      setStatus('error')
    } finally {
      setIsLoading(false)
    }
  }

  const handleTogglePlatform = (platform: string) => {
    setSelectedPlatforms(prev =>
      prev.includes(platform)
        ? prev.filter(p => p !== platform)
        : [...prev, platform]
    )
  }

  const runQuickConnect = async (platform: string, skipSandboxConfirmation = false) => {
    setConnectingPlatform(platform)

    try {
      await connectPlatform({
        platform,
        teamId: currentTeam?.id,
        teamSlug,
        returnTo: `/${teamSlug}/content/${contentId}`,
        mode: 'popup',
        source: 'publish',
        skipSandboxConfirmation,
        onSuccess: async (connectedPlatform) => {
          toast.success(`${connectedPlatform} connected. You can publish now.`)
          await fetchConnectedPlatforms()
          setSelectedPlatforms((prev) =>
            prev.includes(connectedPlatform) ? prev : [...prev, connectedPlatform]
          )
        },
        onError: (message) => {
          toast.error(`Connection failed: ${message}`)
        },
      })
    } catch (error) {
      console.error('Quick connect from publish failed:', error)
    } finally {
      setConnectingPlatform(null)
    }
  }

  const quickConnect = async (platform: string) => {
    if (connectionMode === 'local_sandbox') {
      setSandboxConnectPlatform(platform)
      return
    }
    await runQuickConnect(platform)
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button>
          <Send className="h-4 w-4 mr-2" />
          Publish
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Publish Content</DialogTitle>
        </DialogHeader>

        {status === 'idle' && (
          <div className="space-y-4">
            {platforms.length === 0 ? (
              <div className="text-center py-6 text-gray-500">
                <p>No platforms connected.</p>
                <p className="text-sm mb-3">Connect one now and continue publishing.</p>
                <div className="flex flex-wrap justify-center gap-2">
                  {['twitter', 'linkedin', 'instagram'].map((platform) => (
                    <Button
                      key={platform}
                      variant="outline"
                      size="sm"
                      onClick={() => quickConnect(platform)}
                      disabled={connectingPlatform === platform}
                    >
                      {connectingPlatform === platform && <Loader2 className="h-3 w-3 mr-1 animate-spin" />}
                      Connect {platform}
                    </Button>
                  ))}
                </div>
              </div>
            ) : (
              <>
                <div className="space-y-3">
                  <Label>Select platforms to publish to:</Label>
                  {platforms.map((platform) => (
                    <div key={platform.platform} className="flex items-center gap-3">
                      <Checkbox
                        id={platform.platform}
                        checked={selectedPlatforms.includes(platform.platform)}
                        onCheckedChange={() => handleTogglePlatform(platform.platform)}
                      />
                      <Label htmlFor={platform.platform} className="capitalize cursor-pointer">
                        {platform.platform}
                        <span className="text-gray-500 text-sm ml-1">
                          ({platform.account_name})
                        </span>
                      </Label>
                    </div>
                  ))}
                </div>

                <div className="flex gap-2 pt-4">
                  <Button
                    className="flex-1"
                    onClick={handlePublish}
                    disabled={selectedPlatforms.length === 0 || isLoading}
                  >
                    {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    Publish to {selectedPlatforms.length} platform{selectedPlatforms.length !== 1 ? 's' : ''}
                  </Button>
                  <Button variant="outline" onClick={() => setIsOpen(false)}>
                    Cancel
                  </Button>
                </div>
              </>
            )}
          </div>
        )}

        {status === 'publishing' && (
          <div className="text-center py-8">
            <Loader2 className="h-8 w-8 mx-auto animate-spin text-blue-600" />
            <p className="mt-4">Publishing to {selectedPlatforms.length} platform{selectedPlatforms.length !== 1 ? 's' : ''}...</p>
          </div>
        )}

        {status === 'success' && publishResult && 'summary' in publishResult && (
          <div className="space-y-4">
            <div className="text-center">
              <CheckCircle className="h-8 w-8 mx-auto text-green-600" />
              <p className="mt-2 font-medium">Shared successfully!</p>
              <p className="text-sm text-gray-500">
                {publishResult.summary?.successful} of {publishResult.summary?.total} platforms
              </p>
            </div>

            {(publishResult.results || []).map((result) => (
              <div
                key={result.platform}
                className={`flex items-center gap-3 p-3 rounded-lg ${
                  result.success ? 'bg-green-50' : 'bg-red-50'
                }`}
              >
                {result.success ? (
                  <CheckCircle className="h-5 w-5 text-green-600" />
                ) : (
                  <AlertCircle className="h-5 w-5 text-red-600" />
                )}
                <div className="flex-1 capitalize">
                  <p className="font-medium">{result.platform}</p>
                  {result.error && (
                    <p className="text-sm text-red-600">{result.error}</p>
                  )}
                </div>
              </div>
            ))}

            <Button className="w-full" onClick={() => setIsOpen(false)}>
              Done
            </Button>
          </div>
        )}

        {status === 'error' && publishResult && 'error' in publishResult && (
          <div className="space-y-4">
            <div className="text-center">
              <AlertCircle className="h-8 w-8 mx-auto text-red-600" />
              <p className="mt-2 font-medium">Publishing failed</p>
              <p className="text-sm text-red-600">{publishResult.error}</p>
            </div>
            <Button className="w-full" onClick={() => setStatus('idle')}>
              Try Again
            </Button>
          </div>
        )}
      </DialogContent>

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
    </Dialog>
  )
}
