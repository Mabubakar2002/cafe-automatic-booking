import type { SupabaseClient } from '@supabase/supabase-js'
import { normalizePhone, today } from './util'

export function pakistanDate(value: string | Date) {
  return new Date(value).toLocaleDateString('en-CA', { timeZone: 'Asia/Karachi' })
}

export function normalizeCustomerName(name: string) {
  return name.normalize('NFKC').trim().replace(/\s+/g, ' ').toLowerCase()
}

export function customerKey(phone: string, name: string) {
  const normalizedPhone = normalizePhone(phone)
  const normalizedName = normalizeCustomerName(name)
  return normalizedPhone && normalizedName ? `${normalizedPhone}:${normalizedName}` : null
}

function dayNumber(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null
  const date = new Date(`${value}T00:00:00.000Z`)
  if (Number.isNaN(date.getTime())) return null
  return date.toISOString().slice(0, 10) === value
    ? Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()) / 86400000
    : null
}

export function visitSummary(dates: string[], currentDate = today()) {
  const currentDay = dayNumber(currentDate)
  const visit_dates = [...new Set(dates)]
    .filter((date): date is string => typeof date === 'string' && dayNumber(date) !== null && date <= currentDate)
    .sort()

  if (currentDay === null) {
    return { visit_dates, visit_count: 0, completed: false }
  }

  let cycleStart: number | null = null
  let activeDates: string[] = []

  for (const date of visit_dates) {
    const visitDay = dayNumber(date)!
    if (cycleStart === null || visitDay - cycleStart >= 7) {
      cycleStart = visitDay
      activeDates = []
    }
    activeDates.push(date)
  }

  if (cycleStart === null || currentDay - cycleStart >= 7) {
    return { visit_dates, visit_count: 0, completed: false }
  }

  return {
    visit_dates,
    visit_count: activeDates.length,
    completed: activeDates.length >= 7,
  }
}

export async function paidVisitDatesForCustomer(sb: SupabaseClient, key: string) {
  const { data: sessions, error: sessionsError } = await sb
    .from('table_sessions')
    .select('id')
    .eq('customer_key', key)
  if (sessionsError) throw new Error('Could not load customer visit history')

  const sessionIds = (sessions ?? []).map((session: any) => session.id)
  if (!sessionIds.length) return []

  const { data: bills, error: billsError } = await sb
    .from('bills')
    .select('paid_at')
    .in('session_id', sessionIds)
    .eq('status', 'paid')
  if (billsError) throw new Error('Could not load customer visit history')

  return (bills ?? [])
    .filter((bill: any) => bill.paid_at)
    .map((bill: any) => pakistanDate(bill.paid_at))
}

export async function syncCustomerLoyalty(sb: SupabaseClient, phone: string, name: string) {
  const key = customerKey(phone, name)
  const normalizedPhone = normalizePhone(phone)
  const customerName = name.trim().slice(0, 60)
  if (!key || !normalizedPhone || !customerName) {
    throw new Error('Customer name or phone is invalid')
  }

  const { data: existing, error: existingError } = await sb
    .from('customer_loyalty')
    .select('id,visit_dates')
    .eq('customer_key', key)
    .maybeSingle()
  if (existingError) throw new Error('Could not load customer reward details')

  const historyDates = await paidVisitDatesForCustomer(sb, key)
  const storedDates = Array.isArray(existing?.visit_dates) ? existing.visit_dates : []
  const summary = visitSummary([...storedDates, ...historyDates])
  const values = {
    customer_key: key,
    phone: normalizedPhone,
    customer_name: customerName,
    ...summary,
    reward_percent: 20,
    updated_at: new Date().toISOString(),
  }

  const result = existing
    ? await sb.from('customer_loyalty').update(values).eq('id', existing.id)
    : await sb.from('customer_loyalty').insert(values)
  if (result.error) throw new Error('Could not save customer reward details')
}
