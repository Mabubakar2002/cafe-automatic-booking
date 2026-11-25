import { bad } from '@/lib/api'
import { customerKey, paidVisitDatesForCustomer, visitSummary } from '@/lib/loyalty'
import { isLocalMode } from '@/lib/supabase/mode'
import { db, staffRole } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

type RewardRow = {
  customer_key: string | null
  phone: string | null
  customer_name: string | null
  visit_dates: unknown
  reward_percent: number | null
}

const columns = 'customer_key,phone,customer_name,visit_dates,reward_percent'

function escapeLike(value: string) {
  return value.replace(/\\/g, '\\\\').replace(/[%_]/g, '\\$&')
}

function matchesLocal(row: RewardRow, query: string, digits: string) {
  const name = (row.customer_name ?? '').normalize('NFKC').toLowerCase()
  const phone = (row.phone ?? '').replace(/\D/g, '')
  return name.includes(query.normalize('NFKC').toLowerCase()) || (digits.length >= 2 && phone.includes(digits))
}

export async function GET(req: Request) {
  const role = await staffRole()
  if (role !== 'admin' && role !== 'kitchen') return bad('Not allowed', 403)

  const query = new URL(req.url).searchParams.get('q')?.trim() ?? ''
  if (query.length < 2) return bad('Enter at least 2 characters to search.')
  if (query.length > 100) return bad('Search term is too long.')

  const sb = db()
  let rows: RewardRow[]
  const digits = query.replace(/\D/g, '')

  if (isLocalMode()) {
    const { data, error } = await sb.from('customer_loyalty').select(columns)
    if (error) {
      console.error('Could not search customer rewards', error)
      return bad('Could not search customer rewards.', 500)
    }
    rows = (data ?? []).filter((row: RewardRow) => matchesLocal(row, query, digits))
  } else {
    const nameSearch = sb
      .from('customer_loyalty')
      .select(columns)
      .ilike('customer_name', `%${escapeLike(query)}%`)
      .limit(20)
    const phoneSearch = digits.length >= 2
      ? sb.from('customer_loyalty').select(columns).ilike('phone', `%${digits}%`).limit(20)
      : Promise.resolve({ data: [], error: null })
    const [names, phones] = await Promise.all([nameSearch, phoneSearch])
    if (names.error || phones.error) {
      console.error('Could not search customer rewards', names.error || phones.error)
      return bad('Could not search customer rewards.', 500)
    }

    const unique = new Map<string, RewardRow>()
    for (const row of [...(names.data ?? []), ...(phones.data ?? [])] as RewardRow[]) {
      const key = row.customer_key || customerKey(row.phone || '', row.customer_name || '')
      if (key) unique.set(key, row)
    }
    rows = [...unique.values()].slice(0, 20)
  }

  const uniqueRows = new Map<string, RewardRow>()
  for (const row of rows) {
    const key = row.customer_key || customerKey(row.phone || '', row.customer_name || '')
    if (key) uniqueRows.set(key, row)
  }

  try {
    const results = await Promise.all([...uniqueRows.entries()].slice(0, 20).map(async ([key, row]) => {
      const storedDates = Array.isArray(row.visit_dates)
        ? row.visit_dates.filter((date): date is string => typeof date === 'string')
        : []
      const paidDates = await paidVisitDatesForCustomer(sb, key)
      const summary = visitSummary([...storedDates, ...paidDates])
      return {
        customer_key: key,
        customer_name: row.customer_name || 'Customer',
        phone: row.phone || '',
        ...summary,
        paid_visit_count: summary.visit_dates.length,
        reward_percent: row.reward_percent ?? 20,
      }
    }))
    return Response.json({ results })
  } catch (error) {
    console.error('Could not load paid customer reward history', error)
    return bad('Could not load paid customer reward history.', 500)
  }
}
