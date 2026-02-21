import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

function sanitizeReturnTo(returnTo?: string | null, fallback = '/dashboard/integrations'): string {
  if (!returnTo) return fallback
  if (!returnTo.startsWith('/')) return fallback
  if (returnTo.startsWith('//')) return fallback
  return returnTo
}

function withQuery(path: string, key: string, value: string): string {
  const separator = path.includes('?') ? '&' : '?'
  return `${path}${separator}${key}=${encodeURIComponent(value)}`
}

function popupCompletionHtml(
  appOrigin: string,
  payload: { status: 'success' | 'error'; platform: string; error?: string; returnTo: string }
) {
  const safePayload = JSON.stringify(payload)
  const safeOrigin = JSON.stringify(appOrigin)
  return `<!DOCTYPE html>
<html>
  <head><meta charset="utf-8"><title>Connection Complete</title></head>
  <body style="font-family: sans-serif; padding: 24px;">
    <p>${payload.status === 'success' ? 'Connection successful. You can close this window.' : 'Connection failed. You can close this window.'}</p>
    <script>
      (function () {
        var payload = ${safePayload};
        var targetOrigin = ${safeOrigin};
        if (window.opener && !window.opener.closed) {
          window.opener.postMessage({ type: 'platform_oauth_result', payload: payload }, targetOrigin);
        }
        window.close();
      })();
    </script>
  </body>
</html>`
}

export async function GET(request: Request) {
  try {
    const appBase = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3004'
    const appOrigin = new URL(appBase).origin
    const { searchParams } = new URL(request.url)
    const platform = searchParams.get('platform')
    const teamId = searchParams.get('teamId')
    const mode = searchParams.get('mode')
    const returnTo = searchParams.get('returnTo')
    const direct = searchParams.get('direct') === '1'

    const safeReturnTo = sanitizeReturnTo(returnTo, '/dashboard/integrations')
    const isPopup = mode === 'popup'

    if (!platform || !teamId) {
      if (direct) {
        return NextResponse.json({ error: 'missing_params' }, { status: 400 })
      }
      if (isPopup) {
        return new Response(
          popupCompletionHtml(appOrigin, {
            status: 'error',
            platform: platform || 'unknown',
            error: 'missing_params',
            returnTo: safeReturnTo,
          }),
          { headers: { 'Content-Type': 'text/html; charset=utf-8' } }
        )
      }
      return NextResponse.redirect(`${appBase}${withQuery(safeReturnTo, 'error', 'missing_params')}`)
    }

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      if (direct) {
        return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
      }
      if (isPopup) {
        return new Response(
          popupCompletionHtml(appOrigin, {
            status: 'error',
            platform,
            error: 'unauthorized',
            returnTo: safeReturnTo,
          }),
          { headers: { 'Content-Type': 'text/html; charset=utf-8' } }
        )
      }
      return NextResponse.redirect(`${appBase}${withQuery(safeReturnTo, 'error', 'unauthorized')}`)
    }

    const { data: membership } = await supabase
      .from('team_members')
      .select('team_id')
      .eq('team_id', teamId)
      .eq('user_id', user.id)
      .single()

    if (!membership) {
      if (direct) {
        return NextResponse.json({ error: 'forbidden' }, { status: 403 })
      }
      if (isPopup) {
        return new Response(
          popupCompletionHtml(appOrigin, {
            status: 'error',
            platform,
            error: 'forbidden',
            returnTo: safeReturnTo,
          }),
          { headers: { 'Content-Type': 'text/html; charset=utf-8' } }
        )
      }
      return NextResponse.redirect(`${appBase}${withQuery(safeReturnTo, 'error', 'forbidden')}`)
    }

    const { error: insertError } = await supabase.from('platform_accounts').insert({
      team_id: teamId,
      user_id: user.id,
      platform,
      account_id: `dev_${platform}_${user.id.slice(0, 8)}`,
      account_name: `${platform} Local Sandbox`,
      account_handle: user.email ? `@${user.email.split('@')[0]}` : null,
      access_token: `dev-token-${Date.now()}`,
      refresh_token: null,
      token_expires_at: null,
      scope: 'dev_mock',
      connection_mode: 'local_sandbox',
      connection_status: 'connected',
    })

    if (insertError) {
      console.warn('Dev connect non-fatal storage issue:', insertError.code, insertError.message)
    }

    if (direct) {
      return NextResponse.json({
        data: {
          success: true,
          platform,
          mode: 'sandbox',
          persisted: !insertError,
          account: {
            account_name: `${platform} Local Sandbox`,
            account_id: `local_${platform}`,
            account_handle: user.email ? `@${user.email.split('@')[0]}` : null,
            source: 'local_sandbox',
            status: 'connected',
            connected_at: new Date().toISOString(),
          },
        },
      })
    }

    if (isPopup) {
      return new Response(
        popupCompletionHtml(appOrigin, {
          status: 'success',
          platform,
          returnTo: safeReturnTo,
        }),
        { headers: { 'Content-Type': 'text/html; charset=utf-8' } }
      )
    }

    return NextResponse.redirect(`${appBase}${withQuery(safeReturnTo, 'connected', platform)}`)
  } catch (error) {
    console.error('Error in GET /api/platforms/dev-connect:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
