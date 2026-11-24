import { db } from '@/lib/supabase/server'
import { bad, ok } from '@/lib/api'

export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  const b = await req.json().catch(() => ({}))
  const rating = Math.min(5, Math.max(1, Number(b.rating)))
  if (!b.sessionId || !rating) return bad('Pick a rating')
  const { error } = await db()
    .from('feedback')
    .insert({ session_id: b.sessionId, rating, comment: String(b.comment ?? '').slice(0, 500) || null })
  if (error && error.code !== '23505') return bad(error.message)
  return ok()
}
