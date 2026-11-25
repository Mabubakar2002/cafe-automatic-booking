import { NextResponse } from 'next/server'
import { db } from '@/lib/supabase/server'
import { customerKey, paidVisitDatesForCustomer, visitSummary } from '@/lib/loyalty'
import { normalizePhone } from '@/lib/util'

export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  const { name, phone } = await req.json().catch(() => ({}))
  if (!name || !phone) {
    return NextResponse.json({ error: 'Please provide both name and phone number.' }, { status: 400 })
  }

  const sb = db()
  const key = customerKey(phone, name)
  if (!key) {
    return NextResponse.json({ error: 'Invalid name or phone number.' }, { status: 400 })
  }

  try {
    const { data: stored, error: lookupError } = await sb
      .from('customer_loyalty')
      .select('phone,customer_name,visit_dates,visit_count,completed,reward_percent')
      .eq('customer_key', key)
      .maybeSingle()

    if (lookupError) {
      console.error('Could not lookup customer loyalty', lookupError)
      return NextResponse.json({ error: 'Could not load reward details.' }, { status: 500 })
    }

    const historyDates = await paidVisitDatesForCustomer(sb, key)

    if (!stored) {
      if (historyDates.length === 0) {
        return NextResponse.json({ found: false, reward: null })
      }
      const summary = visitSummary(historyDates)
      return NextResponse.json({
        found: true,
        reward: {
          customer_name: name.trim().slice(0, 60),
          phone: normalizePhone(phone),
          ...summary,
          reward_percent: 20,
        },
      })
    }

    const storedDates = Array.isArray(stored.visit_dates) ? stored.visit_dates : []
    const summary = visitSummary([...storedDates, ...historyDates])

    return NextResponse.json({
      found: true,
      reward: {
        customer_name: stored.customer_name || name.trim().slice(0, 60),
        phone: stored.phone || normalizePhone(phone),
        ...summary,
        reward_percent: stored.reward_percent ?? 20,
      },
    })
  } catch (error) {
    console.error('Loyalty lookup failed', error)
    return NextResponse.json({ error: 'Could not load reward details.' }, { status: 500 })
  }
}