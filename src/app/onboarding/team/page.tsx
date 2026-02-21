'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { createClient } from '@/lib/supabase/client'
import { persistOnboardingComplete, syncTeamsWithStore, useAppStore } from '@/stores'

export default function OnboardingTeamPage() {
  const router = useRouter()
  const [teamName, setTeamName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    async function bootstrap() {
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user || cancelled) return

      await syncTeamsWithStore()
      if (cancelled) return

      const team = useAppStore.getState().currentTeam
      if (team?.slug) {
        router.replace(`/${team.slug}`)
      }
    }

    bootstrap()

    return () => {
      cancelled = true
    }
  }, [router])

  const handleCreateTeam = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const slug = teamName
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .trim()
        .replace(/\s+/g, '-')

      if (!slug) {
        throw new Error('Team name must include letters or numbers')
      }

      const response = await fetch('/api/teams', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: teamName.trim(), slug, createWelcomeContent: true }),
      })

      const body = await response.json().catch(() => ({}))
      if (!response.ok) {
        throw new Error(body.error || 'Failed to create team')
      }

      await syncTeamsWithStore()
      await persistOnboardingComplete()
      const routeSlug = body?.data?.slug || slug
      router.push(`/${routeSlug}`)
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create team')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-md rounded-lg border border-border bg-card p-6">
        <h1 className="text-lg font-semibold text-card-foreground">Create your team</h1>
        <p className="mt-2 text-sm text-muted-foreground">You need a team workspace before using ContentHub.</p>

        {error && <p className="mt-4 text-sm text-red-500">{error}</p>}

        <form onSubmit={handleCreateTeam} className="mt-4 space-y-3">
          <div className="space-y-1">
            <Label htmlFor="teamName">Team name</Label>
            <Input
              id="teamName"
              type="text"
              value={teamName}
              onChange={(e) => setTeamName(e.target.value)}
              placeholder="My Team"
              required
            />
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? 'Creating team...' : 'Create team'}
          </Button>
        </form>
      </div>
    </div>
  )
}
