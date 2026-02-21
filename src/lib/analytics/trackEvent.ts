'use client'

type TrackEventOptions = {
  teamId?: string
  payload?: Record<string, unknown>
}

export async function trackEvent(event: string, options: TrackEventOptions = {}) {
  try {
    await fetch('/api/analytics/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        event,
        teamId: options.teamId || null,
        payload: options.payload || {},
      }),
      keepalive: true,
    })
  } catch (error) {
    console.error('Failed to track event', event, error)
  }
}
