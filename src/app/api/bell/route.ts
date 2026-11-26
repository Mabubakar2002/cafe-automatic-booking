import { db } from '@/lib/supabase/server'
import { openSession } from '@/lib/session'
import { notify } from '@/lib/notify'
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
  let isNewCall = false
  if (!open?.length) {
    const { error } = await sb.from('bell_calls').insert({ session_id: s.id, note: note || null })
    if (error) return bad(error.message)
    isNewCall = true
  }

  // Notify the waiter/staff via WhatsApp when a new call is raised.
  if (isNewCall && process.env.STAFF_WHATSAPP_PHONE) {
    const { data: session } = await sb
      .from('table_sessions')
      .select('customer_name, phone, cafe_tables(number)')
      .eq('id', s.id)
      .maybeSingle()
    await notify('waiter', {
      name: session?.customer_name,
      phone: process.env.STAFF_WHATSAPP_PHONE,
      table: session?.cafe_tables?.number,
      note: note || undefined,
    })
  }

  return ok({ sessionId: s.id })
}
