import { NextResponse } from 'next/server'
import { db } from '@/lib/supabase/server'
import { customerKey, paidVisitDatesForCustomer, syncCustomerLoyalty, visitSummary } from '@/lib/loyalty'

export const dynamic = 'force-dynamic'

async function loyaltyForSession(sessionId: string) {
  const sb = db()
  const { data: session, error: sessionError } = await sb
    .from('table_sessions')
    .select('customer_name,phone,customer_key')
    .eq('id', sessionId)
    .maybeSingle()
  if (sessionError) throw new Error('Could not load customer details')
  if (!session?.phone) return null

  const key = session.customer_key || customerKey(session.phone, session.customer_name || '')
  if (!key) return null
  const { data, error: loyaltyError } = await sb
    .from('customer_loyalty')
    .select('customer_key,phone,customer_name,visit_dates,visit_count,completed,reward_percent,updated_at')
    .eq('customer_key', key)
    .maybeSingle()
  if (loyaltyError) throw new Error('Could not load customer reward details')

  const historyDates = await paidVisitDatesForCustomer(sb, key)
  const storedDates = Array.isArray(data?.visit_dates) ? data.visit_dates : []
  const history = visitSummary([...storedDates, ...historyDates])
  return {
    ...data,
    phone: session.phone,
    customer_name: data?.customer_name || session.customer_name,
    ...history,
    reward_percent: data?.reward_percent ?? 20,
  }
}

export async function GET(req: Request) {
  const sessionId = new URL(req.url).searchParams.get('sessionId')
  if (!sessionId) return NextResponse.json({ error: 'Missing session' }, { status: 400 })
  try {
    return NextResponse.json({ loyalty: await loyaltyForSession(sessionId) })
  } catch (error) {
    console.error('Could not load loyalty history', error)
    return NextResponse.json({ error: 'Could not load loyalty history' }, { status: 500 })
  }
}

export async function POST(req: Request) {
  const { sessionId } = await req.json().catch(() => ({}))
  if (!sessionId) return NextResponse.json({ error: 'Missing session' }, { status: 400 })

  const sb = db()
  const { data: session, error: sessionError } = await sb
    .from('table_sessions')
    .select('customer_name,phone')
    .eq('id', sessionId)
    .maybeSingle()
  if (sessionError) return NextResponse.json({ error: 'Could not load customer details' }, { status: 500 })
  if (!session?.phone || !session.customer_name) return NextResponse.json({ loyalty: null })
  try {
    await syncCustomerLoyalty(sb, session.phone, session.customer_name)
    return NextResponse.json({ loyalty: await loyaltyForSession(sessionId) })
  } catch (error) {
    console.error('Could not sync loyalty history', error)
    return NextResponse.json({ error: 'Could not save customer reward details' }, { status: 500 })
  }
}
