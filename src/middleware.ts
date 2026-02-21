import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

function isPublicPath(pathname: string) {
  if (pathname === '/') return true
  if (pathname === '/login') return true
  if (pathname === '/register') return true
  if (pathname === '/check-email') return true
  if (pathname === '/forgot-password') return true
  if (pathname === '/auth/auth-code-error') return true
  if (pathname.startsWith('/auth/callback')) return true
  if (pathname.startsWith('/invite/')) return true
  return false
}

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const pathname = request.nextUrl.pathname
  const isSharePage = pathname.startsWith('/share/')
  const hasToken = request.nextUrl.searchParams.has('token')
  const isDevMode =
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    process.env.NEXT_PUBLIC_SUPABASE_URL.includes('placeholder')

  // Skip Supabase client creation in dev mode
  let user = null

  if (!isDevMode) {
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll()
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
            supabaseResponse = NextResponse.next({ request })
            cookiesToSet.forEach(({ name, value, options }) =>
              supabaseResponse.cookies.set(name, value, options)
            )
          },
        },
      }
    )

    // Refresh session if expired
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser()
    user = authUser
  }

  // Allow access to share pages with token in dev mode or with auth
  if (isSharePage && hasToken) {
    return supabaseResponse
  }

  const publicPath = isPublicPath(pathname)

  // Allow access in dev mode without auth
  if (isDevMode) {
    return supabaseResponse
  }

  if (!user && !publicPath) {
    // No user, redirect to login
    const url = new URL('/login', request.url)
    url.searchParams.set('next', pathname)
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}

export async function middleware(request: NextRequest) {
  return updateSession(request)
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$|/api/cron).*)',
  ],
}
