'use client'
import { useLive } from '@/lib/live'
import { supabase } from '@/lib/supabase/client'

export default function Feedback() {
  const sb = supabase()
  const [rows] = useLive(
    ['feedback'],
    async () =>
      (
        await sb
          .from('feedback')
          .select('id,rating,comment,created_at,table_sessions(customer_name,phone,cafe_tables(number))')
          .order('created_at', { ascending: false })
          .limit(100)
      ).data ?? [],
    [] as any[]
  )
  const avg = rows.length ? (rows.reduce((s: number, r: any) => s + r.rating, 0) / rows.length).toFixed(1) : '-'

  return (
    <div className="space-y-4">
      <h1 className="text-3xl font-extrabold">Feedback <span className="text-chilli">{avg}</span></h1>
      <div className="space-y-2">
        {rows.map((r: any) => (
          <div key={r.id} className="rounded-2xl bg-white p-4 ring-1 ring-ink/10">
            <p className="text-xl">{'★'.repeat(r.rating)}<span className="text-ink/20">{'★'.repeat(5 - r.rating)}</span></p>
            {r.comment && <p>{r.comment}</p>}
            <p className="text-sm text-ink/60">
              {r.table_sessions?.customer_name || 'Guest'} {r.table_sessions?.phone} · table {r.table_sessions?.cafe_tables?.number} · {new Date(r.created_at).toLocaleString()}
            </p>
          </div>
        ))}
        {!rows.length && <p className="text-ink/60">No feedback yet.</p>}
      </div>
    </div>
  )
}
