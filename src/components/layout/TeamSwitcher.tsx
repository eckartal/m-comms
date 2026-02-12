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

export function TeamSwitcher() {
  const router = useRouter()
  const [showNewTeam, setShowNewTeam] = useState(false)
  const [newTeamName, setNewTeamName] = useState('')

  const teams = [
    { id: '1', name: 'Acme Corp', slug: 'acme-corp', logo: undefined },
    { id: '2', name: 'Personal', slug: 'personal', logo: undefined },
  ]

  const currentTeam = teams[0]

  const handleTeamChange = (team: typeof teams[0]) => {
    router.push(`/${team.slug}`)
  }

  const handleCreateTeam = () => {
    console.log('Creating team:', newTeamName)
    setShowNewTeam(false)
    setNewTeamName('')
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="w-full justify-start gap-2 px-2 hover:bg-white/5 rounded-none">
            <Avatar className="h-6 w-6 border border-white/10">
              <AvatarImage src={currentTeam?.logo || undefined} />
              <AvatarFallback className="bg-white/10 text-white text-xs">
                {currentTeam?.name?.charAt(0) || 'T'}
              </AvatarFallback>
            </Avatar>
            <span className="truncate text-xs tracking-wide">{currentTeam?.name || 'Select Team'}</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-56 bg-black border-white/10">
          <DropdownMenuLabel className="text-xs uppercase tracking-widest text-zinc-400">Your Teams</DropdownMenuLabel>
          <DropdownMenuSeparator className="bg-white/10" />
          {teams.map((team) => (
            <DropdownMenuItem
              key={team.id}
              onClick={() => handleTeamChange(team)}
              className="gap-2 hover:bg-white/5 focus:bg-white/5"
            >
              <Avatar className="h-6 w-6 border border-white/10">
                <AvatarImage src={team.logo || undefined} />
                <AvatarFallback className="bg-white/10 text-white text-xs">
                  {team.name.charAt(0)}
                </AvatarFallback>
              </Avatar>
              <span className="text-xs tracking-wide">{team.name}</span>
              {team.id === currentTeam.id && (
                <Check className="h-4 w-4 ml-auto text-white" />
              )}
            </DropdownMenuItem>
          ))}
          <DropdownMenuSeparator className="bg-white/10" />
          <Dialog open={showNewTeam} onOpenChange={setShowNewTeam}>
            <DialogTrigger asChild>
              <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="gap-2 hover:bg-white/5 focus:bg-white/5">
                <Plus className="h-4 w-4" />
                <span className="text-xs tracking-wide">Create New Team</span>
              </DropdownMenuItem>
            </DialogTrigger>
            <DialogContent className="bg-black border-white/10">
              <DialogHeader>
                <DialogTitle className="text-sm tracking-wide uppercase">Create New Team</DialogTitle>
                <DialogDescription className="text-xs text-zinc-500">
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
                    className="border-white/10 bg-transparent"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowNewTeam(false)} className="border-white/10 hover:bg-white/5">
                  <span className="text-xs uppercase tracking-widest">Cancel</span>
                </Button>
                <Button onClick={handleCreateTeam} className="bg-white text-black hover:bg-white/90">
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