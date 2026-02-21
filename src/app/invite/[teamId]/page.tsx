'use client'

import { useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'

export default function InvitePage() {
  const params = useParams()
  const teamId = String(params.teamId || '')
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleJoin = async () => {
    if (!teamId) {
      setError('Invalid invite link')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/invite/${teamId}/accept`, { method: 'POST' })
      const body = await response.json().catch(() => ({}))

      if (response.status === 401) {
        router.push(`/login?next=/invite/${teamId}`)
        return
      }

      if (!response.ok) {
        throw new Error(body.error || 'Failed to join team')
      }

      const slug = body?.data?.slug
      router.push(slug ? `/${slug}` : '/onboarding/team')
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to join team')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-md rounded-lg border border-border bg-card p-6">
        <h1 className="text-lg font-semibold text-card-foreground">Team invitation</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Join this team to collaborate in ContentHub.
        </p>
        {error && <p className="mt-4 text-sm text-red-500">{error}</p>}
        <div className="mt-4 flex items-center gap-4">
          <button
            onClick={handleJoin}
            disabled={loading}
            className="rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground"
          >
            {loading ? 'Joining...' : 'Join team'}
          </button>
          <Link href="/login" className="text-sm text-primary hover:underline">
            Sign in with another account
          </Link>
        </div>
      </div>
    </div>
  )
}
