import { db } from '@/lib/supabase/server'
import { openSession } from '@/lib/session'
import { normalizePhone } from '@/lib/util'
import { customerKey } from '@/lib/loyalty'
import { bad, ok } from '@/lib/api'

export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  const b = await req.json().catch(() => ({}))
  const items = Array.isArray(b.items) ? b.items : []
  if (!items.length) return bad('Your cart is empty')

  const sb = db()
  const s = await openSession(sb, b.sessionId ?? null, Number(b.table))
  if (!s) return bad('Unknown table')

  const cleanupNewSession = async () => {
    if (s.isNew) {
      await sb.from('table_sessions').delete().eq('id', s.id)
    }
  }

  if (!s.phone) {
    const phone = normalizePhone(String(b.phone ?? ''))
    const name = String(b.name ?? '').trim().slice(0, 60)
    const key = name && phone ? customerKey(phone, name) : null
    if (!name || !phone || !key) {
      await cleanupNewSession()
      return bad('Enter your name and a valid mobile number')
    }
    let { error: customerError } = await sb
      .from('table_sessions')
      .update({ customer_name: name, phone, customer_key: key })
      .eq('id', s.id)
    if (
      customerError &&
      (customerError.code === '42703' ||
        customerError.code === 'PGRST204' ||
        customerError.message?.includes('customer_key'))
    ) {
      console.warn('table_sessions.customer_key missing; falling back without customer_key')
      const fallback = await sb
        .from('table_sessions')
        .update({ customer_name: name, phone })
        .eq('id', s.id)
      customerError = fallback.error
    }
    if (customerError) {
      console.error('Could not save customer details', customerError)
      await cleanupNewSession()
      return bad('Could not save customer details')
    }
  }

  const { error } = await sb.rpc('place_order', { p_session: s.id, p_note: b.note || null, p_items: items })
  if (error) {
    await cleanupNewSession()
    return bad(error.message)
  }
  return ok({ sessionId: s.id })
}
