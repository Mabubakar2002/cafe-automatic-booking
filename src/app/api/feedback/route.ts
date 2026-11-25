import { db } from '@/lib/supabase/server'
import { notify } from '@/lib/notify'
import { bad, ok } from '@/lib/api'

export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  const b = await req.json().catch(() => ({}))
  const rating = Math.min(5, Math.max(1, Number(b.rating)))
  if (!b.sessionId || !rating) return bad('Pick a rating')

  const comment = String(b.comment ?? '').slice(0, 500) || null
  const sb = db()
  const { error } = await sb
    .from('feedback')
    .insert({ session_id: b.sessionId, rating, comment })
  if (error && error.code !== '23505') return bad(error.message)

  // Auto-send WhatsApp thank-you for feedback
  const { data: s } = await sb
    .from('table_sessions')
    .select('customer_name,phone')
    .eq('id', b.sessionId)
    .maybeSingle()

  if (s?.phone) {
    await notify('feedback', {
      name: s.customer_name,
      phone: s.phone,
      rating,
      comment,
    })
  }

  return ok()
}
