import { NextResponse } from 'next/server'
import { db } from '@/lib/supabase/server'
import { normalizePhone, today } from '@/lib/util'
import { paidVisitDatesForPhone, visitSummary } from '@/lib/loyalty'

export const dynamic = 'force-dynamic'

async function loyaltyForSession(sessionId: string) {
  const sb = db()
  const { data: session, error: sessionError } = await sb
    .from('table_sessions')
    .select('customer_name,phone')
    .eq('id', sessionId)
    .maybeSingle()
  if (sessionError) throw new Error('Could not load customer details')
  if (!session?.phone) return null

  const phone = normalizePhone(session.phone) ?? session.phone
  const { data, error: loyaltyError } = await sb
    .from('customer_loyalty')
    .select('phone,customer_name,visit_dates,visit_count,completed,reward_percent,updated_at')
    .eq('phone', phone)
    .maybeSingle()
  if (loyaltyError) throw new Error('Could not load customer reward details')

  const historyDates = await paidVisitDatesForPhone(sb, phone)
  const storedDates = Array.isArray(data?.visit_dates) ? data.visit_dates : []
  const history = visitSummary([...storedDates, ...historyDates])
  return {
    ...data,
    phone,
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
  } catch {
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
  if (!session?.phone) return NextResponse.json({ loyalty: null })

  const phone = normalizePhone(session.phone) ?? session.phone
  const { data: existing, error: loyaltyError } = await sb
    .from('customer_loyalty')
    .select('id,customer_name,visit_dates,visit_count,completed')
    .eq('phone', phone)
    .maybeSingle()
  if (loyaltyError) return NextResponse.json({ error: 'Could not load customer reward details' }, { status: 500 })

  const dates = existing?.visit_dates
    ? (Array.isArray(existing.visit_dates) ? existing.visit_dates : [])
    : []
  let historyDates: string[]
  try {
    historyDates = await paidVisitDatesForPhone(sb, phone)
  } catch {
    return NextResponse.json({ error: 'Could not load customer visit history' }, { status: 500 })
  }
  const summary = visitSummary([...dates, ...historyDates, today()])

  let data: any
  if (existing) {
    const r = await sb
      .from('customer_loyalty')
      .update({
        customer_name: session.customer_name,
        ...summary,
        reward_percent: 20,
        updated_at: new Date().toISOString(),
      })
      .eq('id', existing.id)
      .select('phone,customer_name,visit_dates,visit_count,completed,reward_percent')
      .single()
    if (r.error) return NextResponse.json({ error: 'Could not save customer reward details' }, { status: 500 })
    data = r.data
  } else {
    const r = await sb
      .from('customer_loyalty')
      .insert({
        phone,
        customer_name: session.customer_name,
        ...summary,
        reward_percent: 20,
      })
      .select('phone,customer_name,visit_dates,visit_count,completed,reward_percent')
      .single()
    if (r.error) return NextResponse.json({ error: 'Could not save customer reward details' }, { status: 500 })
    data = r.data
  }

  return NextResponse.json({ loyalty: data })
}
