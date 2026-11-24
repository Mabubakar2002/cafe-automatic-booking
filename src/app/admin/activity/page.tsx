'use client'
import { useLive } from '@/lib/live'
import { supabase } from '@/lib/supabase/client'

export default function StaffActivity() {
  const sb = supabase()
  const [rows] = useLive(
    ['staff_activity'],
    async () =>
      (await sb
        .from('staff_activity')
        .select('id,actor_email,actor_role,action,table_name,record_id,details,created_at')
        .order('created_at', { ascending: false })
        .limit(100)).data ?? [],
    [] as any[]
  )

  return (
    <div className="space-y-4">
      <h1 className="text-3xl font-extrabold">Staff Activity History</h1>
      <p className="text-sm text-ink/60">Create, update, delete and kitchen actions performed by staff.</p>
      <div className="space-y-2">
        {rows.map((row: any) => (
          <article key={row.id} className="rounded-2xl bg-white p-4 ring-1 ring-ink/10">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-bold">{row.actor_email || 'Unknown staff'}</span>
              <span className="rounded-full bg-ink/10 px-2 py-0.5 text-xs font-bold">{row.actor_role}</span>
              <span className="text-chilli font-bold">{row.action}</span>
              <span>{row.table_name}</span>
              <span className="ml-auto text-xs text-ink/50">{new Date(row.created_at).toLocaleString()}</span>
            </div>
            {row.details && (
              <pre className="mt-2 max-h-32 overflow-auto rounded-lg bg-ink/5 p-2 text-xs">{typeof row.details === 'string' ? row.details : JSON.stringify(row.details, null, 2)}</pre>
            )}
          </article>
        ))}
        {!rows.length && <p className="text-ink/60">No staff activity recorded yet.</p>}
      </div>
    </div>
  )
}
