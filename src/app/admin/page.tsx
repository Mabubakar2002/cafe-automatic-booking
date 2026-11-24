'use client'
import { useLive } from '@/lib/live'
import { supabase } from '@/lib/supabase/client'
import { money, today } from '@/lib/util'

export default function Overview() {
  const sb = supabase()
  const [d] = useLive(
    ['orders', 'bills', 'feedback', 'ingredients', 'table_sessions'],
    async () => {
      const t = today()
      const [day, orders, unpaid, ing, fb, activeTables] = await Promise.all([
        sb.from('daily_report').select('*').eq('day', t).maybeSingle(),
        sb.from('orders').select('id', { count: 'exact', head: true }).gte('created_at', t + 'T00:00:00+05:00').neq('status', 'cancelled'),
        sb.from('bills').select('id', { count: 'exact', head: true }).eq('status', 'unpaid'),
        sb.from('ingredients').select('name,unit,stock,low_stock_level'),
        sb
          .from('feedback')
          .select('rating,comment,created_at,table_sessions(customer_name,cafe_tables(number))')
          .order('created_at', { ascending: false })
          .limit(5),
        sb
          .from('table_sessions')
          .select('id,customer_name,started_at,cafe_tables(number)')
          .is('closed_at', null)
          .order('started_at'),
      ])
      return {
        day: day.data as any,
        orders: orders.count ?? 0,
        unpaid: unpaid.count ?? 0,
        low: (ing.data ?? []).filter((i: any) => i.stock <= i.low_stock_level),
        fb: fb.data ?? [],
        activeTables: activeTables.data ?? [],
        activeTablesError: activeTables.error ? 'Could not load reserved tables.' : null,
      }
    },
    { day: null as any, orders: 0, unpaid: 0, low: [] as any[], fb: [] as any[], activeTables: [] as any[], activeTablesError: null as string | null }
  )

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-chilli">Live overview</p>
          <h1 className="mt-1 text-3xl font-black md:text-4xl">Good day, Team</h1>
        </div>
        <div className="rounded-xl bg-white px-4 py-2 text-sm font-bold text-ink/60 ring-1 ring-ink/10">
          {new Date().toLocaleDateString([], { weekday: 'long', day: '2-digit', month: 'short' })}
        </div>
      </header>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-chilli to-[#e85a38] p-5 text-white shadow-lg shadow-chilli/15 sm:col-span-2">
          <div className="absolute -right-8 -top-10 h-32 w-32 rounded-full border-[20px] border-white/5" />
          <p className="text-sm font-bold text-white/75">Today's sales</p>
          <p className="mt-1 text-4xl font-black">{money(d.day?.sales ?? 0)}</p>
          <p className="mt-3 text-xs font-bold text-white/60">● Live reporting</p>
        </div>
        {[
          ['Orders', d.orders, '▦', 'bg-sun/20 text-amber-800'],
          ['Customers', d.day?.customers ?? 0, '♙', 'bg-basil/15 text-basil'],
          ['Bills paid', d.day?.bills ?? 0, '✓', 'bg-basil/15 text-basil'],
          ['Unpaid bills', d.unpaid, '!', 'bg-chilli/10 text-chilli'],
        ].map(([label, v, icon, tone]) => (
          <div key={label} className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-ink/[0.07]">
            <div className={`flex h-9 w-9 items-center justify-center rounded-xl ${tone}`}>{icon}</div>
            <p className="mt-4 text-xs font-bold uppercase tracking-wide text-ink/40">{label}</p>
            <p className="mt-1 text-3xl font-black">{v}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-2xl bg-white p-5 ring-1 ring-ink/10">
          <div className="mb-2 flex items-center justify-between gap-3">
            <h2 className="text-xl font-bold">Reserved tables</h2>
            <span className="rounded-full bg-chilli/10 px-2.5 py-1 text-xs font-bold text-chilli">
              {d.activeTables.length} occupied
            </span>
          </div>
          {d.activeTablesError && <p className="text-chilli">{d.activeTablesError}</p>}
          {!d.activeTablesError && !d.activeTables.length && <p className="text-ink/60">No tables are currently reserved.</p>}
          <ul className="space-y-2">
            {d.activeTables.map((session: any) => (
              <li key={session.id} className="flex items-center justify-between gap-3 rounded-xl bg-ink/[0.03] px-3 py-2">
                <div>
                  <p className="font-bold">Table {session.cafe_tables?.number}</p>
                  <p className="text-sm text-ink/60">{session.customer_name || 'Guest'}</p>
                </div>
                <span className="shrink-0 text-xs font-semibold text-chilli">Reserved</span>
              </li>
            ))}
          </ul>
        </section>
        <section className="rounded-2xl bg-white p-5 ring-1 ring-ink/10">
          <h2 className="mb-2 text-xl font-bold">Running low</h2>
          {!d.low.length && <p className="text-ink/60">Every ingredient is above its low-stock level.</p>}
          <ul className="space-y-1">
            {d.low.map((i: any) => (
              <li key={i.name} className="flex justify-between">
                <span>{i.name}</span>
                <span className="font-bold text-chilli">{i.stock} {i.unit} left</span>
              </li>
            ))}
          </ul>
        </section>
        <section className="rounded-2xl bg-white p-5 ring-1 ring-ink/10">
          <h2 className="mb-2 text-xl font-bold">Latest feedback</h2>
          {!d.fb.length && <p className="text-ink/60">No feedback yet.</p>}
          <ul className="space-y-2">
            {d.fb.map((f: any, i: number) => (
              <li key={i}>
                <p className="font-bold">{'★'.repeat(f.rating)}<span className="text-ink/20">{'★'.repeat(5 - f.rating)}</span></p>
                {f.comment && <p className="text-sm">{f.comment}</p>}
                <p className="text-xs text-ink/60">
                  {f.table_sessions?.customer_name || 'Guest'}, table {f.table_sessions?.cafe_tables?.number}
                </p>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  )
}
