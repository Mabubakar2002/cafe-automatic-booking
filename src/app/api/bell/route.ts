import { db } from '@/lib/supabase/server'
import { openSession } from '@/lib/session'
import { bad, ok } from '@/lib/api'

export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  const b = await req.json().catch(() => ({}))
  if (b.note != null && typeof b.note !== 'string') return bad('The waiter note must be text')
  const note = typeof b.note === 'string' ? b.note.trim().slice(0, 500) : ''
  const sb = db()
  const s = await openSession(sb, b.sessionId ?? null, Number(b.table))
  if (!s) return bad('Unknown table')

  const { data: open, error: openError } = await sb.from('bell_calls').select('id').eq('session_id', s.id).eq('status', 'open').limit(1)
  if (openError) return bad('Could not check the waiter call')
  if (!open?.length) {
    const { error } = await sb.from('bell_calls').insert({ session_id: s.id, note: note || null })
    if (error) return bad(error.message)
  }
  return ok({ sessionId: s.id })
}
