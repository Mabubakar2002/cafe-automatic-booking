'use client'
import { useState } from 'react'
import { useLive } from '@/lib/live'
import { supabase } from '@/lib/supabase/client'
import { money, today } from '@/lib/util'

export default function Overview() {
  const sb = supabase()
  const [releasing, setReleasing] = useState<number | null>(null)
  const [d, reload] = useLive(
    ['orders', 'bills', 'feedback', 'ingredients', 'table_sessions', 'cafe_tables'],
    async () => {
      const t = today()
      const [day, orders, unpaid, ing, fb, activeTables, allTables] = await Promise.all([
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
        sb.from('cafe_tables').select('number').order('number'),
      ])
      return {
        day: day.data as any,
        orders: orders.count ?? 0,
        unpaid: unpaid.count ?? 0,
        low: (ing.data ?? []).filter((i: any) => i.stock <= i.low_stock_level),
        fb: fb.data ?? [],
        activeTables: activeTables.data ?? [],
        activeTablesError: activeTables.error ? 'Could not load reserved tables.' : null,
        allTables: allTables.data ?? [],
      }
    },
    {
      day: null as any,
      orders: 0,
      unpaid: 0,
      low: [] as any[],
      fb: [] as any[],
      activeTables: [] as any[],
      activeTablesError: null as string | null,
      allTables: [] as any[],
    }
  )

  const releaseTable = async (table: number) => {
    setReleasing(table)
    try {
      const r = await fetch('/api/table-release', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ table }),
      })
      const j = await r.json()
      if (!r.ok) {
        alert(j.error || 'Could not release table')
        return
      }
      reload()
    } finally {
      setReleasing(null)
    }
  }

  const tableNums: number[] = d.allTables?.length
    ? d.allTables.map((t: any) => Number(t.number))
    : [1, 2, 3, 4, 5, 6, 7, 8]

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-chilli">Live overview</p>
          <h1 className="mt-1 text-3xl font-black md:text-4xl">Good day, Team</h1>
        </div>
        <div className="rounded-xl bg-white px-4 py-2 text-sm font-bold text-ink/60 ring-1 ring-ink/10 shadow-sm">
          {new Date().toLocaleDateString([], { weekday: 'long', day: '2-digit', month: 'short' })}
        </div>
      </header>

      {/* Top KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-chilli to-[#e85a38] p-6 text-white shadow-lg shadow-chilli/20 sm:col-span-2">
          <div className="absolute -right-8 -top-10 h-36 w-36 rounded-full border-[22px] border-white/10" />
          <p className="text-sm font-bold text-white/80">Today&apos;s Sales</p>
          <p className="mt-1 text-4xl font-black tracking-tight">{money(d.day?.sales ?? 0)}</p>
          <p className="mt-4 flex items-center gap-1.5 text-xs font-bold text-white/75">
            <span className="inline-block h-2 w-2 rounded-full bg-green-300 animate-pulse" />
            Live reporting
          </p>
        </div>
        {[
          ['Orders', d.orders, '▦', 'bg-sun/25 text-amber-800'],
          ['Customers', d.day?.customers ?? 0, '👤', 'bg-basil/15 text-basil'],
          ['Bills Paid', d.day?.bills ?? 0, '✓', 'bg-basil/15 text-basil'],
          ['Unpaid Bills', d.unpaid, '!', 'bg-chilli/10 text-chilli'],
        ].map(([label, v, icon, tone]) => (
          <div key={String(label)} className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-ink/[0.07] transition hover:shadow-md">
            <div className={`flex h-10 w-10 items-center justify-center rounded-xl text-base font-bold ${tone}`}>{icon}</div>
            <p className="mt-4 text-xs font-bold uppercase tracking-wide text-ink/45">{label}</p>
            <p className="mt-1 text-3xl font-black text-ink">{v}</p>
          </div>
        ))}
      </div>

      {/* Main Content Grid */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Table Availability Grid */}
        <section className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-ink/[0.07] lg:col-span-2">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-extrabold">Floor &amp; Table Status</h2>
              <p className="text-xs text-ink/55">
                {d.activeTables.length} occupied · {Math.max(0, tableNums.length - d.activeTables.length)} available
              </p>
            </div>
            <span className="rounded-full bg-chilli/10 px-3 py-1 text-xs font-bold text-chilli">
              {d.activeTables.length} active
            </span>
          </div>
          {d.activeTablesError && <p className="mb-3 text-sm font-semibold text-chilli">{d.activeTablesError}</p>}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-5">
            {tableNums.map(num => {
              const session = d.activeTables.find((s: any) => Number(s.cafe_tables?.number) === num)
              const isBooked = !!session
              return (
                <div
                  key={num}
                  className={`flex flex-col justify-between rounded-2xl p-4 ring-1 transition ${
                    isBooked
                      ? 'bg-chilli/[0.06] ring-chilli/30'
                      : 'bg-basil/[0.06] ring-basil/25'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="text-lg font-black text-ink">Table {num}</span>
                      <span
                        className={`h-2.5 w-2.5 rounded-full ${
                          isBooked ? 'bg-chilli animate-pulse' : 'bg-basil'
                        }`}
                      />
                    </div>
                    <p className={`mt-1 text-xs font-bold ${isBooked ? 'text-chilli' : 'text-basil'}`}>
                      {isBooked ? `Occupied · ${session.customer_name || 'Guest'}` : 'Available'}
                    </p>
                  </div>
                  {isBooked && (
                    <button
                      disabled={releasing === num}
                      onClick={() => releaseTable(num)}
                      className="mt-3 w-full rounded-xl bg-white py-1.5 text-xs font-bold text-chilli ring-1 ring-chilli/25 hover:bg-chilli hover:text-white transition disabled:opacity-50"
                    >
                      {releasing === num ? 'Releasing...' : 'Release Table'}
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        </section>

        {/* Running Low Stock */}
        <section className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-ink/[0.07]">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-xl font-extrabold">Running Low Stock</h2>
            {d.low.length > 0 && (
              <span className="rounded-full bg-chilli/10 px-2.5 py-0.5 text-xs font-bold text-chilli">
                {d.low.length} alert{d.low.length > 1 ? 's' : ''}
              </span>
            )}
          </div>
          {!d.low.length ? (
            <div className="rounded-2xl bg-basil/10 p-4 text-sm font-semibold text-basil">
              ✓ Every ingredient is above its low-stock level.
            </div>
          ) : (
            <ul className="divide-y divide-ink/5">
              {d.low.map((i: any) => (
                <li key={i.name} className="flex items-center justify-between py-2.5 text-sm">
                  <span className="font-semibold text-ink">{i.name}</span>
                  <span className="rounded-lg bg-chilli/10 px-2.5 py-1 text-xs font-extrabold text-chilli">
                    {i.stock} {i.unit} left
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Latest Feedback */}
        <section className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-ink/[0.07]">
          <h2 className="mb-3 text-xl font-extrabold">Latest Feedback</h2>
          {!d.fb.length ? (
            <p className="rounded-2xl bg-ink/[0.03] p-4 text-sm text-ink/55">No feedback yet.</p>
          ) : (
            <ul className="space-y-3">
              {d.fb.map((f: any, i: number) => (
                <li key={i} className="rounded-2xl bg-ink/[0.03] p-3 ring-1 ring-ink/5">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-bold text-amber-500">
                      {'★'.repeat(f.rating)}
                      <span className="text-ink/15">{'★'.repeat(5 - f.rating)}</span>
                    </p>
                    <span className="text-xs font-semibold text-ink/50">
                      Table {f.table_sessions?.cafe_tables?.number ?? '?'}
                    </span>
                  </div>
                  {f.comment && <p className="mt-1 text-sm text-ink/85">&ldquo;{f.comment}&rdquo;</p>}
                  <p className="mt-1 text-xs text-ink/50">
                    {f.table_sessions?.customer_name || 'Guest'}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  )
}
