import { db, staffRole } from '@/lib/supabase/server'
import { notify } from '@/lib/notify'
import { bad, ok } from '@/lib/api'
import { syncCustomerLoyalty } from '@/lib/loyalty'

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

  const { data: s, error: sessionError } = await sb
    .from('table_sessions')
    .update({ closed_at: now })
    .eq('id', bill.session_id)
    .select('customer_name,phone')
    .single()
  let warning: string | undefined
  if (sessionError) {
    console.error('Payment approved but customer visit could not be closed', sessionError)
    warning = 'Payment was approved, but the visit could not be closed.'
  }
  if (!sessionError && s?.phone && s.customer_name) {
    try {
      await syncCustomerLoyalty(sb, s.phone, s.customer_name)
    } catch (error) {
      console.error('Payment approved but customer reward sync failed', error)
      warning = 'Payment was approved, but reward history could not be updated.'
    }
  }
  await notify('thanks', { name: s?.customer_name, phone: s?.phone })
  return ok(warning ? { warning } : {})
}
