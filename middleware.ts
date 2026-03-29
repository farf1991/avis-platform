import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(req: NextRequest) {
  const res = NextResponse.next()
  const supabase = createMiddlewareClient({ req, res })
  const { data: { session } } = await supabase.auth.getSession()

  const { pathname } = req.nextUrl

  // Routes publiques
  if (pathname.startsWith('/login') || pathname === '/') {
    if (session) {
      // Rediriger selon le rôle
      const { data: admin } = await supabase
        .from('admins')
        .select('id')
        .eq('user_id', session.user.id)
        .single()

      if (admin) return NextResponse.redirect(new URL('/admin', req.url))
      return NextResponse.redirect(new URL('/membre', req.url))
    }
    return res
  }

  // Routes protégées — pas de session = login
  if (!session) {
    return NextResponse.redirect(new URL('/login', req.url))
  }

  // Routes admin — vérifier le rôle
  if (pathname.startsWith('/admin') || pathname.startsWith('/api/admin')) {
    const { data: admin } = await supabase
      .from('admins')
      .select('id')
      .eq('user_id', session.user.id)
      .single()

    if (!admin) {
      return NextResponse.redirect(new URL('/membre', req.url))
    }
  }

  return res
}

export const config = {
  matcher: ['/', '/login', '/admin/:path*', '/membre/:path*', '/api/admin/:path*', '/api/membre/:path*']
}
