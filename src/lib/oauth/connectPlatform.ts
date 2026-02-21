'use client'

import { trackEvent } from '@/lib/analytics/trackEvent'
import { rememberLocalConnection } from '@/lib/oauth/localConnections'

type ConnectMode = 'popup' | 'redirect'

type ConnectPlatformOptions = {
  platform: string
  teamId?: string
  teamSlug?: string
  returnTo?: string
  mode?: ConnectMode
  source?: 'integrations' | 'settings' | 'publish' | 'composer'
  skipSandboxConfirmation?: boolean
  onSuccess?: (platform: string) => void
  onError?: (error: string) => void
}

type OAuthMessagePayload = {
  status: 'success' | 'error'
  platform: string
  error?: string
  returnTo: string
}

const ERROR_COPY: Record<string, string> = {
  unauthorized: 'Please sign in again and retry.',
  invalid_state: 'Security check failed. Please try connecting again.',
  state_expired: 'Connection timed out. Please retry.',
  missing_params: 'The provider response was incomplete. Please retry.',
  token_exchange_failed: 'We could not complete authorization with this provider.',
  storage_failed: 'Authorization worked, but we could not save the account.',
  internal_error: 'Unexpected error while connecting. Please retry.',
  popup_blocked: 'Popup was blocked. We are redirecting you to complete connection.',
  popup_closed: 'Connection window was closed before completion.',
}

export function getConnectErrorMessage(rawError: string): string {
  const key = normalizeErrorKey(rawError)
  if (ERROR_COPY[key]) return ERROR_COPY[key]

  if (key.includes('redirect_uri')) {
    return 'Redirect URL is misconfigured in provider settings.'
  }
  if (key.includes('invalid_scope') || key.includes('scope')) {
    return 'Requested permissions are invalid. Please review app scopes.'
  }
  if (key.includes('access_denied') || key.includes('denied')) {
    return 'Authorization was denied. Please approve requested permissions.'
  }
  if (key.includes('not_configured') || key.includes('oauth_not_configured')) {
    return 'Provider app credentials are missing for this workspace.'
  }
  if (key.includes('invalid_client') || key.includes('client')) {
    return 'Provider client credentials are invalid.'
  }

  return rawError || 'Failed to connect account.'
}

export async function connectPlatform({
  platform,
  teamId,
  teamSlug,
  returnTo,
  mode = 'popup',
  source = 'integrations',
  skipSandboxConfirmation = false,
  onSuccess,
  onError,
}: ConnectPlatformOptions) {
  if (!teamId && !teamSlug) {
    const message = 'No team context is available.'
    onError?.(message)
    throw new Error(message)
  }

  await trackEvent('connect_clicked', {
    teamId: teamId || undefined,
    payload: { platform, mode, source },
  })

  const response = await fetch('/api/platforms', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      platform,
      teamId: teamId || null,
      teamSlug,
      returnTo,
      connectMode: mode,
    }),
  })

  const data = await response.json()
  const authUrl = data?.data?.authUrl as string | undefined

  if (!response.ok || !authUrl) {
    const message = getConnectErrorMessage(data?.error || 'Failed to initiate connection')
    await trackEvent('oauth_error', {
      teamId: teamId || undefined,
      payload: { platform, mode, source, message },
    })
    onError?.(message)
    throw new Error(message)
  }

  await trackEvent('oauth_started', {
    teamId: teamId || undefined,
    payload: { platform, mode, source },
  })

  if (authUrl.includes('/api/platforms/dev-connect')) {
    if (!skipSandboxConfirmation) {
      const confirmed = window.confirm(
        'This will connect a local sandbox account (mock, not a real social account). Continue?'
      )
      if (!confirmed) {
        const message = getConnectErrorMessage('popup_closed')
        onError?.(message)
        throw new Error(message)
      }
    }

    const directUrl = `${authUrl}${authUrl.includes('?') ? '&' : '?'}direct=1`
    const sandboxRes = await fetch(directUrl)
    const sandboxData = await sandboxRes.json()

    if (!sandboxRes.ok) {
      const message = getConnectErrorMessage(sandboxData?.error || 'internal_error')
      onError?.(message)
      throw new Error(message)
    }

    rememberLocalConnection(platform, teamSlug, teamId, sandboxData?.data?.account)
    onSuccess?.(platform)
    await trackEvent('oauth_success', {
      teamId: teamId || undefined,
      payload: { platform, source, sandbox: true },
    })
    return
  }

  if (mode === 'redirect') {
    window.location.href = authUrl
    return
  }

  return openOAuthPopup(authUrl, teamId, teamSlug, platform, source, onSuccess, onError)
}

function openOAuthPopup(
  authUrl: string,
  teamId: string | undefined,
  teamSlug: string | undefined,
  platform: string,
  source: 'integrations' | 'settings' | 'publish' | 'composer',
  onSuccess?: (platform: string) => void,
  onError?: (error: string) => void
) {
  return new Promise<void>((resolve, reject) => {
    const width = 560
    const height = 720
    const left = window.screenX + (window.outerWidth - width) / 2
    const top = window.screenY + (window.outerHeight - height) / 2
    const popup = window.open(
      authUrl,
      'connect-platform',
      `width=${width},height=${height},left=${Math.max(0, left)},top=${Math.max(0, top)}`
    )

    if (!popup) {
      onError?.(getConnectErrorMessage('popup_blocked'))
      trackEvent('oauth_popup_blocked', {
        teamId: teamId || undefined,
        payload: { platform, source },
      })
      window.location.href = authUrl
      resolve()
      return
    }

    let settled = false
    const cleanup = () => {
      window.removeEventListener('message', handleMessage)
      window.clearInterval(closePoll)
    }

    const finishSuccess = (platform: string) => {
      if (settled) return
      settled = true
      cleanup()
      onSuccess?.(platform)
      rememberLocalConnection(platform, teamSlug, teamId)
      trackEvent('oauth_success', {
        teamId: teamId || undefined,
        payload: { platform, source },
      })
      resolve()
    }

    const finishError = (message: string) => {
      if (settled) return
      settled = true
      cleanup()
      onError?.(message)
      trackEvent('oauth_error', {
        teamId: teamId || undefined,
        payload: { platform, source, message },
      })
      reject(new Error(message))
    }

    const handleMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return
      const message = event.data
      if (!message || message.type !== 'platform_oauth_result') return

      const payload = message.payload as OAuthMessagePayload
      if (!payload || typeof payload.platform !== 'string' || typeof payload.status !== 'string') return

      if (payload.status === 'success') {
        finishSuccess(payload.platform)
        return
      }

      finishError(getConnectErrorMessage(payload.error || 'Connection failed'))
    }

    const closePoll = window.setInterval(() => {
      if (!popup.closed || settled) return
      finishError(getConnectErrorMessage('popup_closed'))
    }, 300)

    window.addEventListener('message', handleMessage)
  })
}

function normalizeErrorKey(rawError?: string): string {
  if (!rawError) return ''
  return rawError.trim().toLowerCase().replace(/\s+/g, '_')
}
