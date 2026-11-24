import { db } from '@/lib/supabase/server'
import { openSession } from '@/lib/session'
import { normalizePhone } from '@/lib/util'
import { bad, ok } from '@/lib/api'

export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  const b = await req.json().catch(() => ({}))
  const items = Array.isArray(b.items) ? b.items : []
  if (!items.length) return bad('Your cart is empty')

  const sb = db()
  const s = await openSession(sb, b.sessionId ?? null, Number(b.table))
  if (!s) return bad('Unknown table')

  if (!s.phone) {
    const phone = normalizePhone(String(b.phone ?? ''))
    const name = String(b.name ?? '').trim().slice(0, 60)
    if (!name || !phone) return bad('Enter your name and a valid mobile number')
    await sb.from('table_sessions').update({ customer_name: name, phone }).eq('id', s.id)
  }

  const { error } = await sb.rpc('place_order', { p_session: s.id, p_note: b.note || null, p_items: items })
  if (error) return bad(error.message)
  return ok({ sessionId: s.id })
}
