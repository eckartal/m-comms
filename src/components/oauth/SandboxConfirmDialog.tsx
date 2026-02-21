'use client'

import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'

type SandboxConfirmDialogProps = {
  open: boolean
  platformName: string
  onConfirm: () => void
  onCancel: () => void
}

export function SandboxConfirmDialog({ open, platformName, onConfirm, onCancel }: SandboxConfirmDialogProps) {
  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onCancel()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Connect Sandbox Account</DialogTitle>
          <DialogDescription>
            You are in local sandbox mode. This will create a mock {platformName} connection for testing and will not
            connect your real social account.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button onClick={onConfirm}>Connect Sandbox</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
