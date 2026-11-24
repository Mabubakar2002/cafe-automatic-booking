import { NextResponse } from 'next/server'
import { db } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  if (process.env.NODE_ENV === 'production' && (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY)) {
    console.error('Table availability unavailable: Supabase server environment variables are missing')
    return NextResponse.json({ error: 'Table availability is temporarily unavailable.' }, { status: 503 })
  }

  const url = new URL(req.url)
  const requestedTable = url.searchParams.get('table')
  const table = requestedTable === null ? null : Number(requestedTable)
  const sessionId = url.searchParams.get('sessionId')
  if (table !== null && (!Number.isInteger(table) || table < 1)) {
    return NextResponse.json({ error: 'Unknown table' }, { status: 400 })
  }

  const sb = db()
  const [{ data: tables, error: tablesError }, { data: activeSessions, error: sessionsError }] = await Promise.all([
    sb.from('cafe_tables').select('id,number').order('number'),
    sb.from('table_sessions').select('id,table_id').is('closed_at', null),
  ])
  if (tablesError || sessionsError) {
    console.error('Failed to check table availability', { tablesError, sessionsError })
    return NextResponse.json({ error: 'Table availability is temporarily unavailable.' }, { status: 503 })
  }

  const tableRows = tables ?? []
  if (table !== null && !tableRows.some((row: any) => row.number === table)) {
    return NextResponse.json({ error: 'Unknown table' }, { status: 404 })
  }

  const sessionRows = activeSessions ?? []
  const result = tableRows.map((row: any) => {
    return {
      number: row.number,
      booked: sessionRows.some((session: any) => session.table_id === row.id && session.id !== sessionId),
    }
  })

  if (table !== null) {
    return NextResponse.json({ booked: result.find((row: any) => row.number === table)?.booked ?? false })
  }
  return NextResponse.json({ tables: result })
}
