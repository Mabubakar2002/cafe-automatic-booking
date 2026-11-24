import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { localDb } from '@/lib/local-db/store'

export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { action, table, options, payload, patch, filters, fn, args, credentials } = body
    let actor: { id: string; email: string; role: string } | undefined
    const staffCookie = cookies().get('cafe_local_staff')?.value
    if (staffCookie) {
      try { actor = JSON.parse(staffCookie) } catch {}
    }

    if (action === 'query') {
      const result = localDb.query(table, options || {})
      return NextResponse.json(result)
    }

    if (action === 'insert') {
      const result = localDb.insert(table, payload, actor)
      return NextResponse.json(result)
    }

    if (action === 'update') {
      const result = localDb.update(table, patch, filters || [], actor)
      return NextResponse.json(result)
    }

    if (action === 'delete') {
      const result = localDb.delete(table, filters || [], actor)
      return NextResponse.json(result)
    }

    if (action === 'rpc') {
      const result = localDb.rpc(fn, args || {})
      return NextResponse.json(result)
    }

    if (action === 'auth_signin') {
      const result = localDb.signInWithPassword(credentials)
      const res = NextResponse.json(result)
      if (result.data.user) {
        res.cookies.set('cafe_local_staff', JSON.stringify(result.data.user), {
          path: '/',
          httpOnly: false,
          maxAge: 86400 * 7,
        })
      }
      return res
    }

    if (action === 'auth_signout') {
      const res = NextResponse.json({ error: null })
      res.cookies.delete('cafe_local_staff')
      return res
    }

    return NextResponse.json({ error: { message: `Unknown action: ${action}` } }, { status: 400 })
  } catch (err: any) {
    console.error('Error in /api/local-db:', err)
    return NextResponse.json({ error: { message: err?.message || 'Server error' } }, { status: 500 })
  }
}

