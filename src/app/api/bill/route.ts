import { db } from '@/lib/supabase/server'
import { bad, ok } from '@/lib/api'

export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  const { sessionId, tip } = await req.json().catch(() => ({}))
  if (!sessionId) return bad('Missing session')
  const tipAmount = Number.isFinite(Number(tip)) ? Math.max(0, Number(tip)) : 0
  const sb = db()
  const { data: total } = await sb.rpc('session_total', { p_session: sessionId })
  if (!total) return bad('There is nothing to bill yet')
  const { data, error } = await sb.rpc('request_bill', { p_session: sessionId, p_tip: tipAmount })
  if (error) return bad(error.message)
  return ok({ bill: data })
}
