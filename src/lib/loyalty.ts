import type { SupabaseClient } from '@supabase/supabase-js'

export function pakistanDate(value: string | Date) {
  return new Date(value).toLocaleDateString('en-CA', { timeZone: 'Asia/Karachi' })
}

export function visitSummary(dates: string[]) {
  const visit_dates = [...new Set(dates)].sort()
  let visit_count = 0
  let previous: Date | null = null

  for (const date of visit_dates) {
    const current = new Date(date + 'T12:00:00')
    if (!previous) visit_count = 1
    else {
      const diff = Math.round((current.getTime() - previous.getTime()) / 86400000)
      visit_count = diff === 1 ? visit_count + 1 : 1
    }
    previous = current
  }

  return { visit_dates, visit_count, completed: visit_count >= 7 }
}

export async function paidVisitDatesForPhone(sb: SupabaseClient, phone: string) {
  const { data: sessions, error: sessionsError } = await sb
    .from('table_sessions')
    .select('id')
    .eq('phone', phone)
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
