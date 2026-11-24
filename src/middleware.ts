import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { isLocalMode } from '@/lib/supabase/mode'

// Only signed-in staff reach /kitchen; only admins reach /admin.
export async function middleware(req: NextRequest) {
  const toLogin = () => NextResponse.redirect(new URL('/login', req.url))

  // In Local Mode
  if (isLocalMode()) {
    const localStaffCookie = req.cookies.get('cafe_local_staff')?.value
    if (!localStaffCookie) return toLogin()
    try {
      const staff = JSON.parse(localStaffCookie)
      if (!staff || !staff.role) return toLogin()
      if (req.nextUrl.pathname.startsWith('/admin') && staff.role !== 'admin') {
        return NextResponse.redirect(new URL('/kitchen', req.url))
      }
      return NextResponse.next()
    } catch {
      return toLogin()
    }
  }

  // Supabase Cloud Mode
  let res = NextResponse.next({ request: req })
  const sb = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    cookies: {
      getAll: () => req.cookies.getAll(),
      setAll: (list: { name: string; value: string; options: CookieOptions }[]) => {
        list.forEach(({ name, value }) => req.cookies.set(name, value))
        res = NextResponse.next({ request: req })
        list.forEach(({ name, value, options }) => res.cookies.set(name, value, options))
      },
    },
  })

  const { data: { user } } = await sb.auth.getUser()
  if (!user) return toLogin()

  const { data: staff } = await sb.from('staff').select('role').eq('user_id', user.id).maybeSingle()
  if (!staff) return toLogin()
  if (req.nextUrl.pathname.startsWith('/admin') && staff.role !== 'admin') {
    return NextResponse.redirect(new URL('/kitchen', req.url))
  }
  return res
}

export const config = { matcher: ['/admin/:path*', '/kitchen/:path*'] }
