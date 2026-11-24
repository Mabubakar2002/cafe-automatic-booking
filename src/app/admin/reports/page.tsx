'use client'
import { useLive } from '@/lib/live'
import { supabase } from '@/lib/supabase/client'
import { daysAgo, downloadCsv, money } from '@/lib/util'

export default function Reports() {
  const sb = supabase()
  const [d] = useLive(
    [],
    async () => {
      const [m, dy, top, us] = await Promise.all([
        sb.from('monthly_report').select('*').order('month', { ascending: false }).limit(12),
        sb.from('daily_report').select('*').order('day', { ascending: false }).limit(30),
        sb.from('top_items').select('*').limit(10),
        sb.from('usage_report').select('*').gte('day', daysAgo(7)),
      ])
      const byIng: Record<string, any> = {}
      for (const u of us.data ?? []) {
        const x = (byIng[u.ingredient] ??= { name: u.ingredient, unit: u.unit, expected: 0, used: 0 })
        x.expected += Number(u.expected)
        x.used += Number(u.used)
      }
      return { m: m.data ?? [], dy: dy.data ?? [], top: top.data ?? [], us: Object.values(byIng) }
    },
    { m: [] as any[], dy: [] as any[], top: [] as any[], us: [] as any[] }
  )
  const max = Math.max(1, ...d.dy.map((r: any) => r.sales))
  const box = 'rounded-2xl bg-white p-5 ring-1 ring-ink/10'

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-3xl font-extrabold">Reports</h1>
        <div className="flex gap-2 print:hidden">
          <button className="btn-soft" onClick={() => downloadCsv('monthly-report', d.m)}>Monthly CSV</button>
          <button className="btn-soft" onClick={() => downloadCsv('daily-report', d.dy)}>Daily CSV</button>
          <button className="btn-alt" onClick={() => window.print()}>Print / PDF</button>
        </div>
      </div>

      <section className={box}>
        <h2 className="mb-2 text-xl font-bold">Monthly</h2>
        <table className="w-full text-left text-sm">
          <thead><tr className="text-ink/60"><th>Month</th><th>Sales</th><th>Expenses</th><th>Profit</th></tr></thead>
          <tbody>
            {d.m.map((r: any) => (
              <tr key={r.month} className="border-t border-ink/10">
                <td className="py-1.5">{r.month}</td>
                <td>{money(r.sales)}</td>
                <td>{money(r.expenses)}</td>
                <td className={`font-bold ${r.profit < 0 ? 'text-chilli' : 'text-basil'}`}>{money(r.profit)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {!d.m.length && <p className="text-ink/60">Reports appear after the first paid bill.</p>}
      </section>

      <section className={box}>
        <h2 className="mb-2 text-xl font-bold">Last 30 days</h2>
        <div className="space-y-1 text-sm">
          {d.dy.map((r: any) => (
            <div key={r.day} className="grid grid-cols-[5.5rem_1fr_auto] items-center gap-3">
              <span>{r.day}</span>
              <span className="h-3 rounded bg-sun" style={{ width: `${(r.sales / max) * 100}%` }} />
              <span className="text-right">{money(r.sales)} · {r.customers} customers</span>
            </div>
          ))}
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className={box}>
          <h2 className="mb-2 text-xl font-bold">Best sellers</h2>
          <ul className="space-y-1 text-sm">
            {d.top.map((t: any) => (
              <li key={t.name} className="flex justify-between"><span>{t.name}</span><span>{t.qty} sold · {money(t.revenue)}</span></li>
            ))}
          </ul>
        </section>
        <section className={box}>
          <h2 className="mb-2 text-xl font-bold">Ingredients used, last 7 days</h2>
          <table className="w-full text-left text-sm">
            <thead><tr className="text-ink/60"><th>Ingredient</th><th>Expected</th><th>Used</th></tr></thead>
            <tbody>
              {d.us.map((u: any) => (
                <tr key={u.name} className={u.used > u.expected * 1.1 ? 'font-bold text-chilli' : ''}>
                  <td>{u.name}</td><td>{u.expected} {u.unit}</td><td>{u.used} {u.unit}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="mt-2 text-xs text-ink/60">Red means more than 10% over the recipe.</p>
        </section>
      </div>
    </div>
  )
}
