'use client'

import { useRouter } from 'next/navigation'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { useAppStore } from '@/stores'
import { Plus } from 'lucide-react'
import { useState } from 'react'
import type { Team, TeamMember } from '@/types'

export function TeamSwitcher() {
  const router = useRouter()
  const { currentTeam, setCurrentTeam, teams } = useAppStore()
  const [showNewTeam, setShowNewTeam] = useState(false)
  const [newTeamName, setNewTeamName] = useState('')

  const handleTeamChange = (member: TeamMember) => {
    if (!member.team) return
    setCurrentTeam(member.team as Team)
    router.push(`/${member.team.slug}`)
  }

  const handleCreateTeam = async () => {
    console.log('Creating team:', newTeamName)
    setShowNewTeam(false)
    setNewTeamName('')
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="w-full justify-start gap-2 px-2">
            <Avatar className="h-6 w-6">
              <AvatarImage src={currentTeam?.logo || undefined} />
              <AvatarFallback className="bg-primary/10 text-primary text-xs">
                {currentTeam?.name?.charAt(0) || 'T'}
              </AvatarFallback>
            </Avatar>
            <span className="truncate">{currentTeam?.name || 'Select Team'}</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-56">
          <DropdownMenuLabel>Your Teams</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {teams.map((member) => (
            member.team && (
              <DropdownMenuItem
                key={member.team.id}
                onClick={() => handleTeamChange(member)}
                className="gap-2"
              >
                <Avatar className="h-6 w-6">
                  <AvatarImage src={member.team.logo || undefined} />
                  <AvatarFallback className="text-xs">
                    {member.team.name.charAt(0)}
                  </AvatarFallback>
                </Avatar>
                <span className="truncate">{member.team.name}</span>
              </DropdownMenuItem>
            )
          ))}
          <DropdownMenuSeparator />
          <Dialog open={showNewTeam} onOpenChange={setShowNewTeam}>
            <DialogTrigger asChild>
              <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="gap-2">
                <Plus className="h-4 w-4" />
                <span>Create New Team</span>
              </DropdownMenuItem>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Team</DialogTitle>
                <DialogDescription>
                  Create a new workspace to manage content with your team.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="team-name">Team Name</Label>
                  <Input
                    id="team-name"
                    placeholder="My Awesome Team"
                    value={newTeamName}
                    onChange={(e) => setNewTeamName(e.target.value)}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowNewTeam(false)}>
                  Cancel
                </Button>
                <Button onClick={handleCreateTeam}>Create Team</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  )
}