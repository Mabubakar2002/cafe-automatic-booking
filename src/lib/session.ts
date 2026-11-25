import type { SupabaseClient } from '@supabase/supabase-js'

// Reuses the customer's open visit, or starts a new one for that table.
export async function openSession(sb: SupabaseClient, id: string | null, table: number) {
  if (id) {
    const { data } = await sb
      .from('table_sessions')
      .select('id,phone,table_id')
      .eq('id', id)
      .is('closed_at', null)
      .maybeSingle()
    if (data) {
      const { data: t } = await sb.from('cafe_tables').select('number').eq('id', data.table_id).maybeSingle()
      if (t?.number === table) return { ...(data as { id: string; phone: string | null }), isNew: false }
    }
  }
  const { data: t } = await sb.from('cafe_tables').select('id').eq('number', table).maybeSingle()
  if (!t) return null

  const { data: active } = await sb
    .from('table_sessions')
    .select('id')
    .eq('table_id', t.id)
    .is('closed_at', null)
    .limit(1)
    .maybeSingle()
  if (active) return null

  const { data } = await sb.from('table_sessions').insert({ table_id: t.id }).select('id,phone').single()
  return data ? { ...(data as { id: string; phone: string | null }), isNew: true } : null
}
