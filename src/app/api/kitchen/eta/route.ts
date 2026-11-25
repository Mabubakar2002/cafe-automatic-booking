import { db, staffRole } from '@/lib/supabase/server'
import { bad, ok } from '@/lib/api'

export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  const role = await staffRole()
  if (role !== 'admin' && role !== 'kitchen') return bad('Not allowed', 403)

  const body = await req.json().catch(() => ({}))
  const orderId = typeof body.orderId === 'string' ? body.orderId : ''
  const extraMinutes = Number(body.extraMinutes)
  if (!orderId) return bad('Missing order')
  if (!Number.isInteger(extraMinutes) || extraMinutes < 1 || extraMinutes > 180) {
    return bad('Add between 1 and 180 minutes')
  }
  if (body.note != null && typeof body.note !== 'string') return bad('The kitchen note must be text')
  const note = typeof body.note === 'string' ? body.note.trim().slice(0, 500) : ''

  const sb = db()
  const { data: order, error: loadError } = await sb
    .from('orders')
    .select('id,status,est_wait_min')
    .eq('id', orderId)
    .maybeSingle()
  if (loadError) return bad('Could not load the order')
  if (!order) return bad('Order not found', 404)
  if (order.status !== 'new' && order.status !== 'preparing') {
    return bad('Only waiting or preparing orders can have their ETA changed', 409)
  }

  const { data: updated, error: updateError } = await sb
    .from('orders')
    .update({
      est_wait_min: Number(order.est_wait_min || 15) + extraMinutes,
      eta_note: note || null,
    })
    .eq('id', orderId)
    .eq('status', order.status)
    .select('id,status,est_wait_min,eta_note')
    .single()
  if (updateError || !updated) return bad('The order changed before its ETA could be updated', 409)
  return ok({ order: updated })
}
