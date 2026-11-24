import { db, staffRole } from '@/lib/supabase/server'
import { notify } from '@/lib/notify'
import { bad, ok } from '@/lib/api'
import { visitSummary } from '@/lib/loyalty'

export const dynamic = 'force-dynamic'

// Admin confirms payment: closes the visit and triggers the WhatsApp thank-you.
export async function POST(req: Request) {
  if ((await staffRole()) !== 'admin') return bad('Not allowed', 403)
  const { billId, method } = await req.json().catch(() => ({}))
  if (!['cash', 'jazzcash', 'easypaisa', 'card'].includes(method)) return bad('Pick a payment method')

  const sb = db()
  const now = new Date().toISOString()
  const { data: bill, error } = await sb
    .from('bills')
    .update({ status: 'paid', method, paid_at: now })
    .eq('id', billId)
    .eq('status', 'unpaid')
    .select('session_id')
    .single()
  if (error) return bad(error.message)

  const { data: s } = await sb
    .from('table_sessions')
    .update({ closed_at: now })
    .eq('id', bill.session_id)
    .select('customer_name,phone')
    .single()
  if (s?.phone) {
    const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Karachi' })
    const { data: existing } = await sb
      .from('customer_loyalty')
      .select('id,visit_dates,visit_count,completed')
      .eq('phone', s.phone)
      .maybeSingle()
    const datesRaw = Array.isArray(existing?.visit_dates) ? existing.visit_dates : []
    const summary = visitSummary([...datesRaw, today])
    if (existing) {
      await sb.from('customer_loyalty').update({
        customer_name: s.customer_name,
        ...summary,
        reward_percent: 20,
        updated_at: now,
      }).eq('id', existing.id)
    } else {
      await sb.from('customer_loyalty').insert({
        phone: s.phone,
        customer_name: s.customer_name,
        ...summary,
        reward_percent: 20,
      })
    }
  }
  await notify('thanks', { name: s?.customer_name, phone: s?.phone })
  return ok()
}
