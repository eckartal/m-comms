'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Copy, Check, Users, Globe, Lock } from 'lucide-react'

interface ShareModalProps {
  contentId: string
  initialIsPublic?: boolean
  initialShareUrl?: string | null
}

export function ShareModal({ contentId, initialIsPublic = false, initialShareUrl = null }: ShareModalProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [isPublic, setIsPublic] = useState(initialIsPublic)
  const [shareUrl, setShareUrl] = useState(initialShareUrl)
  const [copied, setCopied] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  const fetchShareStatus = async () => {
    const response = await fetch(`/api/content/${contentId}/share`)
    if (response.ok) {
      const { data } = await response.json()
      setIsPublic(data.isPublic)
      setShareUrl(data.shareUrl)
    }
  }

  const handleOpenChange = async (open: boolean) => {
    setIsOpen(open)
    if (open) {
      await fetchShareStatus()
    }
  }

  const handleToggleShare = async () => {
    setIsLoading(true)
    try {
      const response = await fetch(`/api/content/${contentId}/share`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enableShare: !isPublic }),
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
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Users className="h-4 w-4 mr-2" />
          Share
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Share Content</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div className="flex items-center gap-3">
              {isPublic ? (
                <Globe className="h-5 w-5 text-green-600" />
              ) : (
                <Lock className="h-5 w-5 text-gray-500" />
              )}
              <div>
                <p className="font-medium">
                  {isPublic ? 'Public Link' : 'Private'}
                </p>
                <p className="text-sm text-gray-500">
                  {isPublic
                    ? 'Anyone with the link can view'
                    : 'Only team members can access'}
                </p>
              </div>
            </div>
            <Button
              variant={isPublic ? 'destructive' : 'default'}
              size="sm"
              onClick={handleToggleShare}
              disabled={isLoading}
            >
              {isPublic ? 'Disable' : 'Enable'}
            </Button>
          </div>

          {isPublic && shareUrl && (
            <div className="space-y-2">
              <Label>Share Link</Label>
              <div className="flex gap-2">
                <Input
                  value={shareUrl}
                  readOnly
                  className="flex-1"
                />
                <Button
                  size="icon"
                  onClick={handleCopyLink}
                  variant="outline"
                >
                  {copied ? (
                    <Check className="h-4 w-4 text-green-600" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
              <p className="text-xs text-gray-500">
                Share this link to get feedback on your content
              </p>
            </div>
          )}

          <div className="pt-4 border-t">
            <h4 className="font-medium mb-2">Permissions</h4>
            <div className="space-y-2 text-sm">
              <label className="flex items-center gap-2">
                <input type="checkbox" defaultChecked disabled className="rounded" />
                View access for anyone with the link
              </label>
              <label className="flex items-center gap-2">
                <input type="checkbox" defaultChecked className="rounded" />
                Allow comments on shared content
              </label>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}