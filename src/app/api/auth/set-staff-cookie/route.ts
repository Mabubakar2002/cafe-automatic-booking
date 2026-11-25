import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'

export const dynamic = 'force-dynamic'

// Sets the cafe_local_staff cookie after local-mode login so server-side
// staffRole() checks work for admin/kitchen API routes.
// Body: { user_id, email, role }
export async function POST(req: Request) {
  const { user_id, email, role } = await req.json().catch(() => ({}))
  if (!user_id || !email || !role) {
    return NextResponse.json({ error: 'Missing user data' }, { status: 400 })
  }

  const jar = cookies()
  jar.set('cafe_local_staff', JSON.stringify({ user_id, email, role }), {
    httpOnly: true,
    path: '/',
    maxAge: 60 * 60 * 8, // 8 hours
  })

  return NextResponse.json({ ok: true })
}