'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Plus,
  Mail,
  MoreHorizontal,
  Shield,
  Crown,
  User,
  Copy,
  Check,
  Loader2,
} from 'lucide-react'
import { useAppStore } from '@/stores'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

// Role configuration
const roles = {
  OWNER: { label: 'Owner', icon: Crown, color: 'text-yellow-600 bg-yellow-50' },
  ADMIN: { label: 'Admin', icon: Shield, color: 'text-purple-600 bg-purple-50' },
  EDITOR: { label: 'Editor', icon: User, color: 'text-blue-600 bg-blue-50' },
  VIEWER: { label: 'Viewer', icon: User, color: 'text-gray-600 bg-gray-50' },
}

type Member = {
  id: string
  role: keyof typeof roles
  joined_at: string
  user: {
    id: string
    email: string
    full_name: string | null
    avatar_url: string | null
  }
}

export default function TeamPage() {
  const { currentTeam, currentUser } = useAppStore()
  const [members, setMembers] = useState<Member[]>([])
  const [loading, setLoading] = useState(true)
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState<'EDITOR' | 'ADMIN'>('EDITOR')
  const [inviting, setInviting] = useState(false)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    fetchMembers()
  }, [currentTeam?.id])

  async function fetchMembers() {
    if (!currentTeam?.id) return
    try {
      const res = await fetch(`/api/teams/${currentTeam.id}/members`)
      if (res.ok) {
        const data = await res.json()
        setMembers(data.data || [])
      }
    } catch (error) {
      console.error('Failed to fetch team members:', error)
    } finally {
      setLoading(false)
    }
  }

  async function handleInvite() {
    if (!inviteEmail.trim() || !currentTeam?.id) return
    setInviting(true)
    try {
      const res = await fetch(`/api/teams/${currentTeam.id}/members`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: inviteEmail, role: inviteRole }),
      })
      if (res.ok) {
        setInviteEmail('')
        setInviteRole('EDITOR')
        setInviteDialogOpen(false)
        fetchMembers()
      }
    } catch (error) {
      console.error('Failed to invite member:', error)
    } finally {
      setInviting(false)
    }
  }

  async function handleUpdateRole(memberId: string, newRole: string) {
    if (!currentTeam?.id) return
    try {
      const res = await fetch(`/api/teams/${currentTeam.id}/members`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ memberId, role: newRole }),
      })
      if (res.ok) {
        fetchMembers()
      }
    } catch (error) {
      console.error('Failed to update role:', error)
    }
  }

  async function handleRemoveMember(memberId: string) {
    if (!currentTeam?.id || !confirm('Are you sure you want to remove this member?')) return
    try {
      const res = await fetch(`/api/teams/${currentTeam.id}/members?memberId=${memberId}`, {
        method: 'DELETE',
      })
      if (res.ok) {
        fetchMembers()
      }
    } catch (error) {
      console.error('Failed to remove member:', error)
    }
  }

  function copyInviteLink() {
    const link = `${window.location.origin}/invite/${currentTeam?.id}`
    navigator.clipboard.writeText(link)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  function getInitials(name: string | null): string {
    if (!name) return '?'
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
  }

  // Check if current user is admin or owner
  const currentUserMember = members.find(m => m.user.id === currentUser?.id)
  const isAdmin = currentUserMember?.role === 'OWNER' || currentUserMember?.role === 'ADMIN'

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <Skeleton className="h-8 w-32 mb-2" />
            <Skeleton className="h-4 w-48" />
          </div>
        </div>
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-20 w-full" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold">Team</h1>
          <p className="text-muted-foreground">
            Manage your team members and their roles
          </p>
        </div>
        {isAdmin && (
          <Dialog open={inviteDialogOpen} onOpenChange={setInviteDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Invite Member
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Invite Team Member</DialogTitle>
                <DialogDescription>
                  Send an invitation to join your team
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Input
                    placeholder="Email address"
                    type="email"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Select value={inviteRole} onValueChange={(v) => setInviteRole(v as 'EDITOR' | 'ADMIN')}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select role" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ADMIN">Admin - Can manage team and content</SelectItem>
                      <SelectItem value="EDITOR">Editor - Can create and edit content</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setInviteDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleInvite} disabled={inviting || !inviteEmail.trim()}>
                  {inviting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Send Invite
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Invite Link Card */}
      {isAdmin && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Invite Link</CardTitle>
            <CardDescription>
              Share this link to let people join your team
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Input
                readOnly
                value={`${typeof window !== 'undefined' ? window.location.origin : ''}/invite/${currentTeam?.id}`}
                className="font-mono text-sm"
              />
              <Button variant="outline" size="icon" onClick={copyInviteLink}>
                {copied ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Members List */}
      <Card>
        <CardHeader>
          <CardTitle>Team Members ({members.length})</CardTitle>
          <CardDescription>
            People who have access to this team
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {members.map((member) => {
              const roleConfig = roles[member.role as keyof typeof roles]
              const RoleIcon = roleConfig?.icon || User
              const isCurrentUser = member.user.id === currentUser?.id
              const canManage = isAdmin && !isCurrentUser && member.role !== 'OWNER'

              return (
                <div
                  key={member.id}
                  className="flex items-center justify-between rounded-lg border p-4"
                >
                  <div className="flex items-center gap-4">
                    <Avatar>
                      <AvatarImage src={member.user.avatar_url || undefined} />
                      <AvatarFallback>
                        {getInitials(member.user.full_name)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">
                          {member.user.full_name || 'Unnamed User'}
                        </span>
                        {isCurrentUser && (
                          <Badge variant="secondary" className="text-xs">
                            You
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Mail className="h-3 w-3" />
                        {member.user.email}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    {canManage ? (
                      <Select
                        value={member.role}
                        onValueChange={(newRole) => handleUpdateRole(member.id, newRole)}
                      >
                        <SelectTrigger className="w-[130px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="ADMIN">Admin</SelectItem>
                          <SelectItem value="EDITOR">Editor</SelectItem>
                          <SelectItem value="VIEWER">Viewer</SelectItem>
                        </SelectContent>
                      </Select>
                    ) : (
                      <Badge className={roleConfig?.color}>
                        <RoleIcon className="mr-1 h-3 w-3" />
                        {roleConfig?.label}
                      </Badge>
                    )}
                    {canManage && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            className="text-destructive"
                            onClick={() => handleRemoveMember(member.id)}
                          >
                            Remove from team
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </div>
                </div>
              )
            })}
            {members.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                No team members found
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Role Descriptions */}
      <Card>
        <CardHeader>
          <CardTitle>Role Permissions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-2">
              <Badge className={roles.OWNER.color}>
                <Crown className="mr-1 h-3 w-3" />
                Owner
              </Badge>
              <p className="text-sm text-muted-foreground">
                Full access to all team settings, members, and content
              </p>
            </div>
            <div className="space-y-2">
              <Badge className={roles.ADMIN.color}>
                <Shield className="mr-1 h-3 w-3" />
                Admin
              </Badge>
              <p className="text-sm text-muted-foreground">
                Can manage team members, settings, and all content
              </p>
            </div>
            <div className="space-y-2">
              <Badge className={roles.EDITOR.color}>
                <User className="mr-1 h-3 w-3" />
                Editor
              </Badge>
              <p className="text-sm text-muted-foreground">
                Can create, edit, and publish content
              </p>
            </div>
            <div className="space-y-2">
              <Badge className={roles.VIEWER.color}>
                <User className="mr-1 h-3 w-3" />
                Viewer
              </Badge>
              <p className="text-sm text-muted-foreground">
                Can view content and analytics only
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}