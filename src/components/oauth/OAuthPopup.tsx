'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Loader2, X } from 'lucide-react'
import { platformIcons } from './PlatformIcon'

interface OAuthPopupProps {
  platform: string
  isOpen: boolean
  onClose: () => void
  onConnect: (platform: string) => void
  teamId: string
}

export function OAuthPopup({ platform, isOpen, onClose, onConnect, teamId }: OAuthPopupProps) {
  const [isConnecting, setIsConnecting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Reset state when dialog opens/closes
  useEffect(() => {
    if (!isOpen) {
      setIsConnecting(false)
      setError(null)
    }
  }, [isOpen])

  const platformName = platform === 'twitter' ? 'Twitter/X' : platform.charAt(0).toUpperCase() + platform.slice(1)

  const handleConnect = async () => {
    setIsConnecting(true)
    setError(null)

    try {
      onConnect(platform)
      // Close the popup after triggering connection
      setTimeout(() => {
        onClose()
      }, 1000)
    } catch (err) {
      setError('Failed to initiate connection. Please try again.')
      setIsConnecting(false)
    }
  }

  const handleCancel = () => {
    onClose()
    setIsConnecting(false)
    setError(null)
  }

  // Platform-specific instruction text
  const getInstructionText = () => {
    switch (platform) {
      case 'twitter':
        return 'Click Connect to sign in with your Twitter/X account.'
      case 'linkedin':
        return 'Click Connect to sign in with your LinkedIn account.'
      case 'instagram':
        return 'Click Connect to sign in with your Instagram account.'
      case 'blog':
        return 'Click Connect to add your blog credentials.'
      default:
        return 'Click Connect to get started.'
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-black border-[#262626] max-w-sm">
        <div className="flex items-center justify-between mb-6">
          <DialogHeader>
            <DialogTitle>Connect {platformName}</DialogTitle>
            <DialogDescription className="text-[#737373]">
              {getInstructionText()}
            </DialogDescription>
          </DialogHeader>
          <Button variant="ghost" size="icon" onClick={handleCancel} className="h-8 w-8 -mr-2">
            <X className="h-4 w-4 text-[#737373]" />
            <span className="sr-only">Close</span>
          </Button>
        </div>

        {/* Platform Icon */}
        <div className="flex justify-center mb-6">
          <div className="w-20 h-20 rounded-xl bg-[#171717] flex items-center justify-center">
            {platform === 'twitter' && <div className="text-white"><platformIcons.twitter className="h-10 w-10" /></div>}
            {platform === 'linkedin' && <div className="text-[#0A66C2]"><platformIcons.linkedin className="h-10 w-10" /></div>}
            {platform === 'instagram' && <div className="h-10 w-10"><platformIcons.instagram className="h-10 w-10" /></div>}
            {platform === 'blog' && <div className="text-[#6B7280]"><platformIcons.blog className="h-10 w-10" /></div>}
          </div>
        </div>

        {error && (
          <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20">
            <p className="text-sm text-red-500">{error}</p>
          </div>
        )}

        <Button
          className="w-full bg-white text-black hover:bg-white/90"
          onClick={handleConnect}
          disabled={isConnecting}
        >
          {isConnecting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Connecting...
            </>
          ) : (
            `Connect ${platformName}`
          )}
        </Button>

        <p className="text-[10px] text-[#737373] text-center mt-3">
          By connecting, you agree to our Terms of Service and Privacy Policy.
        </p>
      </DialogContent>
    </Dialog>
  )
}
