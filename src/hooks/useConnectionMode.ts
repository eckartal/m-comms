'use client'

import { useCallback, useEffect, useState } from 'react'

type ConnectionMode = 'local_sandbox' | 'real_oauth'

export function useConnectionMode(teamSlug?: string) {
  const [mode, setMode] = useState<ConnectionMode>('local_sandbox')
  const [loading, setLoading] = useState(false)

  const refresh = useCallback(async () => {
    if (!teamSlug) return
    try {
      setLoading(true)
      const res = await fetch(`/api/platforms?teamSlug=${encodeURIComponent(teamSlug)}`)
      const data = await res.json()
      setMode(data?.meta?.default_connection_mode === 'real_oauth' ? 'real_oauth' : 'local_sandbox')
    } catch {
      setMode('local_sandbox')
    } finally {
      setLoading(false)
    }
  }, [teamSlug])

  useEffect(() => {
    refresh()
  }, [refresh])

  return { mode, loading, refresh }
}
