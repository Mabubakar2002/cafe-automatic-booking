import { db } from '@/lib/supabase/server'
import { openSession } from '@/lib/session'
import { bad, ok } from '@/lib/api'

export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  const b = await req.json().catch(() => ({}))
  const sb = db()
  const s = await openSession(sb, b.sessionId ?? null, Number(b.table))
  if (!s) return bad('Unknown table')

  const { data: open } = await sb.from('bell_calls').select('id').eq('session_id', s.id).eq('status', 'open').limit(1)
  if (!open?.length) {
    const { error } = await sb.from('bell_calls').insert({ session_id: s.id })
    if (error) return bad(error.message)
  }
  return ok({ sessionId: s.id })
}
