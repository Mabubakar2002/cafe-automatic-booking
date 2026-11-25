'use client'
import { useEffect, useState } from 'react'
import { useLive } from '@/lib/live'
import { supabase } from '@/lib/supabase/client'
import { itemTotal, money } from '@/lib/util'

const statusStyle: Record<string, string> = {
  pending: 'bg-amber-100 text-amber-800',
  new: 'bg-sun text-ink',
  preparing: 'bg-orange-100 text-orange-800',
  ready: 'bg-basil/15 text-basil',
  served: 'bg-basil text-white',
  cancelled: 'bg-ink/10 text-ink/50',
}

export default function Orders() {
  const sb = supabase()
  const [busyId, setBusyId] = useState<string | null>(null)
  const [filter, setFilter] = useState<'all' | 'pending' | 'active' | 'completed'>('all')
  const [loyaltyMap, setLoyaltyMap] = useState<Record<string, any>>({})
  const [orders] = useLive(
    ['orders', 'bills'],
    async () =>
      (
        await sb
          .from('orders')
          .select(
            'id,order_no,status,created_at,table_sessions(customer_name,phone,customer_key,cafe_tables(number),bills(status)),' +
              'order_items(qty,unit_price,note,menu_items(name),order_item_modifiers(price,modifiers(name))),' +
              'order_usage(expected_qty,used_qty,ingredients(name,unit))'
          )
          .order('created_at', { ascending: false })
          .limit(50)
      ).data ?? [],
    [] as any[]
  )

  // Fetch loyalty data for all customers in orders
  useEffect(() => {
    const keys = new Set<string>()
    orders.forEach((o: any) => {
      const key = o.table_sessions?.customer_key
      if (key) keys.add(key)
    })
    if (keys.size === 0) return
    const fetchLoyalty = async () => {
      const map: Record<string, any> = {}
      try {
        const { data } = await sb
          .from('customer_loyalty')
          .select('customer_key,phone,customer_name,visit_dates,visit_count,completed,reward_percent')
          .in('customer_key', [...keys])
        ;(data ?? []).forEach((row: any) => {
          map[row.customer_key] = row
        })
      } catch {}
      setLoyaltyMap(map)
    }
    fetchLoyalty()
  }, [orders])

  async function setStatus(orderId: string, status: 'new' | 'cancelled') {
    setBusyId(orderId)
    const { error } = await sb.from('orders').update({ status }).eq('id', orderId)
    setBusyId(null)
    if (error) alert(error.message)
  }

  const filtered = orders.filter((o: any) => {
    if (filter === 'pending') return o.status === 'pending'
    if (filter === 'active') return ['new', 'preparing', 'ready'].includes(o.status)
    if (filter === 'completed') return ['served', 'cancelled'].includes(o.status)
    return true
  })

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-extrabold">Orders</h1>
          <p className="mt-1 text-sm text-ink/50">{orders.length} total orders</p>
        </div>
        <div className="flex flex-wrap gap-2 rounded-2xl bg-white p-1.5 ring-1 ring-ink/10">
          {([
            ['all', 'All'],
            ['pending', 'Pending'],
            ['active', 'Active'],
            ['completed', 'Completed'],
          ] as const).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setFilter(key)}
              className={`rounded-xl px-3 py-2 text-sm font-bold transition ${filter === key ? 'bg-ink text-white' : 'text-ink/60 hover:bg-ink/5'}`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {filtered.map((o: any) => {
          const bills = o.table_sessions?.bills
          const bill = Array.isArray(bills) ? bills[0] : bills
          return (
            <article
              key={o.id}
              className={`overflow-hidden rounded-3xl bg-white shadow-sm ring-2 ${
                o.status === 'pending' ? 'ring-chilli/40' :
                o.status === 'cancelled' ? 'ring-ink/10' : 'ring-ink/10'
              }`}
            >
              <header className="flex items-start justify-between gap-3 border-b border-ink/10 p-4">
                <div>
                  <div className="mb-2 flex items-center gap-2">
                    <span className="rounded-lg bg-ink px-2.5 py-1 font-mono text-sm font-black text-white">#{o.order_no}</span>
                    <div className="flex flex-wrap gap-1.5">
                      <span className={`rounded-full px-2.5 py-1 text-xs font-bold capitalize ${statusStyle[o.status] ?? 'bg-ink/10 text-ink/70'}`}>
                        {o.status}
                      </span>
                      {o.status !== 'cancelled' && (
                        <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${bill?.status === 'paid' ? 'bg-basil/15 text-basil' : 'bg-chilli/10 text-chilli'}`}>
                          {bill?.status === 'paid' ? '✓ Paid' : 'Unpaid'}
                        </span>
                      )}
                      {o.table_sessions?.customer_key && loyaltyMap[o.table_sessions.customer_key] && (
                        <span
                          className={`rounded-full px-2.5 py-1 text-xs font-bold ${
                            loyaltyMap[o.table_sessions.customer_key].completed ? 'bg-basil/15 text-basil' : 'bg-sun/15 text-amber-800'
                          }`}
                        >
                          {loyaltyMap[o.table_sessions.customer_key].completed ? '🎁 Reward Ready' : `${loyaltyMap[o.table_sessions.customer_key].visit_count}/7 visits`}
                        </span>
                      )}
                    </div>
                  </div>
                  <p className="text-lg font-black">Table {o.table_sessions?.cafe_tables?.number}</p>
                  <p className="text-sm text-ink/60">{o.table_sessions?.customer_name || 'Guest'}</p>
                  {o.table_sessions?.phone && <p className="text-xs text-ink/40">{o.table_sessions.phone}</p>}
                </div>
                <div className="text-right">
                  <p className="text-xl font-black text-chilli">{money(o.order_items.reduce((s: number, oi: any) => s + itemTotal(oi), 0))}</p>
                  <p className="mt-1 text-xs text-ink/50">
                    {new Date(o.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </header>

              {o.status === 'pending' && (
                <div className="flex gap-2 border-b border-chilli/10 bg-chilli/[0.04] p-3">
                  <button
                    className="btn-main flex-1"
                    disabled={busyId === o.id}
                    onClick={() => setStatus(o.id, 'new')}
                  >
                    Send to Kitchen
                  </button>
                  <button
                    className="btn-soft"
                    disabled={busyId === o.id}
                    onClick={() => confirm('Cancel this order?') && setStatus(o.id, 'cancelled')}
                  >
                    Cancel Order
                  </button>
                </div>
              )}

              <ul className="divide-y divide-ink/5 px-4 py-2">
                {o.order_items.map((oi: any, i: number) => (
                  <li key={i} className="flex items-start justify-between gap-3 py-3">
                    <div className="min-w-0">
                      <p className="font-bold leading-tight">
                        <span className="mr-1 text-chilli">{oi.qty}×</span>
                        {oi.menu_items?.name}
                      </p>
                      {oi.order_item_modifiers?.length > 0 && (
                        <div className="mt-1.5 flex flex-wrap gap-1">
                          {oi.order_item_modifiers.map((m: any, mi: number) => (
                            <span key={mi} className="rounded-md bg-sun/60 px-2 py-0.5 text-xs font-semibold">
                              + {m.modifiers?.name}{m.price ? ` (${money(m.price)})` : ''}
                            </span>
                          ))}
                        </div>
                      )}
                      {oi.note && <p className="mt-1.5 rounded-md bg-chilli/[0.06] px-2 py-1 text-xs italic text-chilli">"{oi.note}"</p>}
                    </div>
                    <span className="shrink-0 font-bold">{money(itemTotal(oi))}</span>
                  </li>
                ))}
              </ul>

              {o.order_usage.length > 0 && (
                <div className="border-t border-ink/5 bg-ink/[0.02] px-4 py-3 text-xs">
                  <p className="mb-1 font-bold text-ink/60">Ingredient usage</p>
                  {o.order_usage.map((u: any, i: number) => (
                    <div key={i} className={`flex justify-between ${u.used_qty > u.expected_qty ? 'font-bold text-chilli' : 'text-ink/60'}`}>
                      <span>{u.ingredients?.name}</span>
                      <span>{u.used_qty} / {u.expected_qty} {u.ingredients?.unit}</span>
                    </div>
                  ))}
                </div>
              )}
            </article>
          )
        })}
        {!filtered.length && (
          <div className="col-span-full rounded-3xl bg-white py-16 text-center text-ink/50 ring-1 ring-ink/10">
            No {filter === 'all' ? '' : filter} orders.
          </div>
        )}
      </div>
    </div>
  )
}
