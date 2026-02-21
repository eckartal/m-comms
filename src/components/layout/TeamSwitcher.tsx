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
import { Plus, Check } from 'lucide-react'
import { useState } from 'react'
import { useAppStore, syncTeamsWithStore } from '@/stores'

export function TeamSwitcher() {
  const router = useRouter()
  const { teams, currentTeam, setCurrentTeam } = useAppStore()
  const [showNewTeam, setShowNewTeam] = useState(false)
  const [newTeamName, setNewTeamName] = useState('')

  const handleTeamChange = (team: typeof teams[0]) => {
    setCurrentTeam(team)
    router.push(`/${team.slug}`)
  }

  const handleCreateTeam = async () => {
    const trimmedName = newTeamName.trim()
    if (!trimmedName) return

    const slug = trimmedName
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .trim()
      .replace(/\s+/g, '-')

    const response = await fetch('/api/teams', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: trimmedName, slug }),
    })

    if (!response.ok) {
      return
    }

    await syncTeamsWithStore()
    const createdTeam = useAppStore.getState().teams.find((team) => team.slug === slug)
    if (createdTeam) {
      setCurrentTeam(createdTeam)
      router.push(`/${createdTeam.slug}`)
    }

    setShowNewTeam(false)
    setNewTeamName('')
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="w-full justify-start gap-2 px-2 hover:bg-sidebar-accent rounded-none">
            <Avatar className="h-6 w-6 border border-sidebar-border">
              <AvatarImage src={currentTeam?.logo || undefined} />
              <AvatarFallback className="bg-sidebar-accent text-sidebar-foreground text-xs">
                {currentTeam?.name?.charAt(0) || 'T'}
              </AvatarFallback>
            </Avatar>
            <span className="truncate text-xs tracking-wide">{currentTeam?.name || 'Select Team'}</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-56 bg-sidebar border-sidebar-border">
          <DropdownMenuLabel className="text-xs uppercase tracking-widest text-sidebar-foreground/70">Your Teams</DropdownMenuLabel>
          <DropdownMenuSeparator className="bg-sidebar-border" />
          {teams.map((team) => (
            <DropdownMenuItem
              key={team.id}
              onClick={() => handleTeamChange(team)}
              className="gap-2 hover:bg-sidebar-accent focus:bg-sidebar-accent"
            >
              <Avatar className="h-6 w-6 border border-sidebar-border">
                <AvatarImage src={team.logo || undefined} />
                <AvatarFallback className="bg-sidebar-accent text-sidebar-foreground text-xs">
                  {team.name.charAt(0)}
                </AvatarFallback>
              </Avatar>
              <span className="text-xs tracking-wide">{team.name}</span>
                {team.id === currentTeam?.id && (
                  <Check className="h-4 w-4 ml-auto text-sidebar-primary" />
                )}
              </DropdownMenuItem>
            ))}
          <DropdownMenuSeparator className="bg-sidebar-border" />
          <Dialog open={showNewTeam} onOpenChange={setShowNewTeam}>
            <DialogTrigger asChild>
              <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="gap-2 hover:bg-sidebar-accent focus:bg-sidebar-accent">
                <Plus className="h-4 w-4" />
                <span className="text-xs tracking-wide">Create New Team</span>
              </DropdownMenuItem>
            </DialogTrigger>
            <DialogContent className="bg-background border-border">
              <DialogHeader>
                <DialogTitle className="text-sm tracking-wide uppercase text-foreground">Create New Team</DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground">
                  Create a new workspace to manage content with your team.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="team-name" className="text-xs uppercase tracking-widest">Team Name</Label>
                  <Input
                    id="team-name"
                    placeholder="My Awesome Team"
                    value={newTeamName}
                    onChange={(e) => setNewTeamName(e.target.value)}
                    className="border-border bg-transparent"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowNewTeam(false)} className="border-border hover:bg-accent">
                  <span className="text-xs uppercase tracking-widest">Cancel</span>
                </Button>
                <Button onClick={handleCreateTeam} className="bg-primary text-primary-foreground hover:bg-primary/90">
                  <span className="text-xs uppercase tracking-widest">Create</span>
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  )
}
