import { withAuth } from 'next-auth/middleware'
import { NextResponse } from 'next/server'

export default withAuth(
  function middleware(req) {
    const { pathname } = req.nextUrl
    const role = req.nextauth.token?.role

    if (role === 'STAFF') {
      const allowed = ['/admin/reservations', '/admin/floor-plan']
      const isAllowed = allowed.some((path) => pathname.startsWith(path))
      if (!isAllowed) {
        return NextResponse.redirect(new URL('/admin/reservations', req.url))
      }
    }

    if (pathname.startsWith('/admin/users') && role !== 'OWNER') {
      return NextResponse.redirect(new URL('/admin/reservations', req.url))
    }
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token,
    },
  }
)

export const config = {
  matcher: [
    '/admin/reservations/:path*',
    '/admin/floor-plan/:path*',
    '/admin/tables/:path*',
    '/admin/menu/:path*',
    '/admin/promotions/:path*',
    '/admin/gallery/:path*',
    '/admin/analytics/:path*',
    '/admin/settings/:path*',
    '/admin/users/:path*',
  ],
}
