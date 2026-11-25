import { NextResponse } from 'next/server'
import { db } from '@/lib/supabase/server'
import { bad, ok } from '@/lib/api'

export const dynamic = 'force-dynamic'

// Admin/staff can release/cancel a booked table by closing its open session.
// Body: { table: number }
export async function POST(req: Request) {
  const sb = db()
  const b = await req.json().catch(() => ({}))
  const table = Number(b.table)
  if (!Number.isInteger(table) || table < 1) return bad('Invalid table number')

  // Find the table
  const { data: t, error: tErr } = await sb
    .from('cafe_tables')
    .select('id')
    .eq('number', table)
    .maybeSingle()
  if (tErr || !t) return bad('Table not found')

  // Find the open session for this table
  const { data: session, error: sErr } = await sb
    .from('table_sessions')
    .select('id')
    .eq('table_id', t.id)
    .is('closed_at', null)
    .maybeSingle()
  if (sErr || !session) return bad('No active booking for this table')

  // Cancel any pending orders for this session
  await sb.from('orders').update({ status: 'cancelled' }).eq('session_id', session.id).eq('status', 'pending')

  // Close the session to free the table
  const { error } = await sb
    .from('table_sessions')
    .update({ closed_at: new Date().toISOString() })
    .eq('id', session.id)

  if (error) return bad(error.message)

  return ok({ message: `Table ${table} released` })
}