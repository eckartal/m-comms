'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Copy, Check, Link2 } from 'lucide-react'
import type { SharePermission } from '@/lib/share'

interface ShareModalProps {
  contentId: string
  initialIsPublic?: boolean
  initialShareUrl?: string | null
  open?: boolean
  onOpenChange?: (open: boolean) => void
  hideTrigger?: boolean
}

export function ShareModal({
  contentId,
  initialIsPublic = false,
  initialShareUrl = null,
  open,
  onOpenChange,
  hideTrigger = false,
}: ShareModalProps) {
  const [internalOpen, setInternalOpen] = useState(false)
  const [isPublic, setIsPublic] = useState(initialIsPublic)
  const [shareUrl, setShareUrl] = useState(initialShareUrl)
  const [permission, setPermission] = useState<SharePermission>('comment')
  const [copied, setCopied] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const isOpen = open ?? internalOpen

  const fetchShareStatus = async () => {
    const response = await fetch(`/api/content/${contentId}/share`)
    if (response.ok) {
      const { data } = await response.json()
      setIsPublic(data.isPublic)
      setShareUrl(data.shareUrl)
      setPermission((data.permission || 'comment') as SharePermission)
    }
  }

  const handleOpenChange = async (open: boolean) => {
    if (onOpenChange) {
      onOpenChange(open)
    } else {
      setInternalOpen(open)
    }
    if (open) {
      await fetchShareStatus()
    }
  }

  const updateSettings = async (nextPermission: SharePermission) => {
    setIsLoading(true)
    try {
      const response = await fetch(`/api/content/${contentId}/share`, {
        method: isPublic ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          enableShare: true,
          permission: nextPermission,
          allowComments: true,
          allowEditing: nextPermission === 'edit',
        }),
      })

      if (response.ok) {
        const { data } = await response.json()
        setIsPublic(data.isPublic)
        setShareUrl(data.shareUrl)
        setPermission((data.permission || nextPermission) as SharePermission)
      }
    } catch (error) {
      console.error('Error updating share settings:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleToggleShare = async () => {
    setIsLoading(true)
    try {
      const response = await fetch(`/api/content/${contentId}/share`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          enableShare: !isPublic,
          permission,
          allowComments: true,
          allowEditing: permission === 'edit',
        }),
      })

      if (response.ok) {
        const { data } = await response.json()
        setIsPublic(data.isPublic)
        setShareUrl(data.shareUrl)
      }
    } catch (error) {
      console.error('Error toggling share:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleRevoke = async () => {
    setIsLoading(true)
    try {
      const response = await fetch(`/api/content/${contentId}/share`, {
        method: 'DELETE',
      })
      if (response.ok) {
        setIsPublic(false)
        setShareUrl(null)
      }
    } catch (error) {
      console.error('Error revoking share link:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleCopyLink = async () => {
    if (!shareUrl) return

    try {
      await navigator.clipboard.writeText(shareUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (error) {
      console.error('Error copying link:', error)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      {!hideTrigger ? (
        <DialogTrigger asChild>
          <Button variant="outline" size="sm">
            <Link2 className="h-4 w-4 mr-2" />
            Share for feedback
          </Button>
        </DialogTrigger>
      ) : null}
      <DialogContent className="sm:max-w-[420px] rounded-2xl">
        <DialogHeader>
          <DialogTitle>Share for feedback</DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <div className="flex items-center justify-between rounded-xl border border-border p-3">
            <span className="text-sm text-foreground">{isPublic ? 'Link enabled' : 'Link disabled'}</span>
            <Button size="sm" onClick={handleToggleShare} disabled={isLoading}>
              {isPublic ? 'Disable' : 'Enable'}
            </Button>
          </div>

          {isPublic && shareUrl && (
            <>
              <div className="flex gap-2">
                <Input value={shareUrl} readOnly className="h-9 rounded-xl" />
                <Button size="icon" onClick={handleCopyLink} variant="outline" className="h-9 w-9 rounded-xl">
                  {copied ? (
                    <Check className="h-4 w-4 text-green-600" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant={permission === 'comment' ? 'default' : 'outline'}
                  className="rounded-xl"
                  onClick={() => {
                    setPermission('comment')
                    void updateSettings('comment')
                  }}
                  disabled={isLoading}
                >
                  Comment only
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={permission === 'edit' ? 'default' : 'outline'}
                  className="rounded-xl"
                  onClick={() => {
                    setPermission('edit')
                    void updateSettings('edit')
                  }}
                  disabled={isLoading}
                >
                  Can edit
                </Button>
              </div>

              <div className="flex justify-end">
                <Button variant="destructive" size="sm" onClick={handleRevoke} disabled={isLoading}>
                  Revoke link
                </Button>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
