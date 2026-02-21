'use client'

const STORAGE_PREFIX = 'local_connected_platforms'

type LocalConnection = {
  platform: string
  account_name: string
  account_id: string
  account_handle: string | null
  source: 'local_sandbox'
  status: 'connected'
  connected_at: string
}

function getStorageKey(teamSlug?: string, teamId?: string) {
  return `${STORAGE_PREFIX}:${teamSlug || teamId || 'default'}`
}

export function getLocalConnectedPlatforms(teamSlug?: string, teamId?: string): string[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = window.localStorage.getItem(getStorageKey(teamSlug, teamId))
    if (!raw) return []
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []

    // Backward compatibility: older storage kept plain platform IDs.
    if (parsed.every((value) => typeof value === 'string')) {
      return parsed as string[]
    }

    return parsed
      .filter((value) => value && typeof value.platform === 'string')
      .map((value) => value.platform)
  } catch {
    return []
  }
}

export function getLocalConnectionAccounts(teamSlug?: string, teamId?: string): Record<string, LocalConnection> {
  if (typeof window === 'undefined') return {}
  try {
    const raw = window.localStorage.getItem(getStorageKey(teamSlug, teamId))
    if (!raw) return {}
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return {}

    // Upgrade legacy values on read.
    if (parsed.every((value) => typeof value === 'string')) {
      const upgraded = (parsed as string[]).map<LocalConnection>((platform) => ({
        platform,
        account_name: `${platform} Local Sandbox`,
        account_id: `local_${platform}`,
        account_handle: null,
        source: 'local_sandbox',
        status: 'connected',
        connected_at: new Date().toISOString(),
      }))
      window.localStorage.setItem(getStorageKey(teamSlug, teamId), JSON.stringify(upgraded))
      return Object.fromEntries(upgraded.map((connection) => [connection.platform, connection]))
    }

    const normalized = (parsed as LocalConnection[]).filter((value) => value && typeof value.platform === 'string')
    return Object.fromEntries(normalized.map((connection) => [connection.platform, connection]))
  } catch {
    return {}
  }
}

export function rememberLocalConnection(
  platform: string,
  teamSlug?: string,
  teamId?: string,
  account?: Partial<LocalConnection>
) {
  if (typeof window === 'undefined') return
  const key = getStorageKey(teamSlug, teamId)
  const current = getLocalConnectionAccounts(teamSlug, teamId)
  current[platform] = {
    platform,
    account_name: account?.account_name || `${platform} Local Sandbox`,
    account_id: account?.account_id || `local_${platform}`,
    account_handle: account?.account_handle || null,
    source: 'local_sandbox',
    status: 'connected',
    connected_at: account?.connected_at || new Date().toISOString(),
  }
  window.localStorage.setItem(key, JSON.stringify(Object.values(current)))
}

export function forgetLocalConnection(platform: string, teamSlug?: string, teamId?: string) {
  if (typeof window === 'undefined') return
  const key = getStorageKey(teamSlug, teamId)
  const current = getLocalConnectionAccounts(teamSlug, teamId)
  delete current[platform]
  window.localStorage.setItem(key, JSON.stringify(Object.values(current)))
}

export function clearLocalConnections(teamSlug?: string, teamId?: string) {
  if (typeof window === 'undefined') return
  window.localStorage.removeItem(getStorageKey(teamSlug, teamId))
}
