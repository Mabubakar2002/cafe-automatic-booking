'use client'
import { useEffect, useRef, useState } from 'react'
import { useLive } from '@/lib/live'
import { supabase } from '@/lib/supabase/client'
import { money, itemTotal, beep } from '@/lib/util'

const cafe = process.env.NEXT_PUBLIC_CAFE_NAME || 'Cafe'

export default function Bills() {
  const sb = supabase()
  const [method, setMethod] = useState<Record<string, string>>({})
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})
  const [toast, setToast] = useState<string | null>(null)
  const prevUnpaid = useRef<string[]>([])

  const [bills, reload] = useLive(
    ['bills', 'orders'],
    async () =>
      (
        await sb
          .from('bills')
          .select(
            'id,subtotal,tip,total,method,status,paid_at,created_at,session_id,' +
            'table_sessions(customer_name,phone,closed_at,cafe_tables(number),' +
            'orders(id,order_no,status,created_at,note,' +
            'order_items(qty,unit_price,note,menu_items(name),order_item_modifiers(price,modifiers(name)))))'
          )
          .order('status', { ascending: false })
          .order('created_at', { ascending: false })
          .limit(80)
      ).data ?? [],
    [] as any[]
  )

  // 🔔 Notify when new unpaid bill appears
  useEffect(() => {
    const unpaidIds = bills.filter((b: any) => b.status === 'unpaid').map((b: any) => b.id)
    const newOnes = unpaidIds.filter((id: string) => !prevUnpaid.current.includes(id))
    if (prevUnpaid.current.length > 0 && newOnes.length > 0) {
      const b = bills.find((x: any) => x.id === newOnes[0])
      const tableNum = b?.table_sessions?.cafe_tables?.number
      setToast(`💳 Table ${tableNum} has a new unpaid bill!`)
      beep()
      setTimeout(beep, 350)
      setTimeout(() => setToast(null), 7000)
    }
    prevUnpaid.current = unpaidIds
  }, [bills])

  async function pay(id: string) {
    const r = await fetch('/api/admin/paid', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ billId: id, method: method[id] }),
    }).then(r => r.json())
    if (r.error) { alert(r.error); return }
    if (r.warning) alert(r.warning)
    try {
      const bc = new BroadcastChannel('cafe-live-events')
      bc.postMessage({ table: 'bills' })
      bc.close()
    } catch {}
    reload()
  }

  const unpaid = bills.filter((b: any) => b.status === 'unpaid')
  const paid = bills.filter((b: any) => b.status === 'paid')

  return (
    <div className="space-y-6">

      {/* ── Toast Notification ── */}
      {toast && (
        <div className="fixed inset-x-4 top-4 z-50 flex items-center gap-3 rounded-2xl bg-chilli px-5 py-4 text-white shadow-2xl ring-4 ring-chilli/40 animate-bounce max-w-xl mx-auto">
          <span className="text-3xl">💳</span>
          <div className="flex-1">
            <p className="font-black text-lg">{toast}</p>
            <p className="text-xs text-white/70">Go to Bills tab to process payment</p>
          </div>
          <button onClick={() => setToast(null)} className="text-white/70 hover:text-white text-xl">✕</button>
        </div>
      )}

      {/* ── Header Stats ── */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-3xl font-extrabold">Bills</h1>
        <div className="flex gap-3">
          <div className="rounded-2xl bg-chilli/10 px-5 py-3 text-center">
            <p className="text-xs font-semibold text-chilli/80 uppercase tracking-wider">Pending</p>
            <p className="text-3xl font-black text-chilli">{unpaid.length}</p>
          </div>
          <div className="rounded-2xl bg-basil/10 px-5 py-3 text-center">
            <p className="text-xs font-semibold text-basil/80 uppercase tracking-wider">Paid Today</p>
            <p className="text-3xl font-black text-basil">{paid.length}</p>
          </div>
          <div className="rounded-2xl bg-ink/5 px-5 py-3 text-center">
            <p className="text-xs font-semibold text-ink/50 uppercase tracking-wider">Total Revenue</p>
            <p className="text-xl font-black text-ink">{money(paid.reduce((s: number, b: any) => s + b.total, 0))}</p>
          </div>
        </div>
      </div>

      {/* ── Unpaid Bills ── */}
      {unpaid.length > 0 && (
        <section className="space-y-3">
          <h2 className="flex items-center gap-2 text-lg font-extrabold text-chilli">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-chilli opacity-75" />
              <span className="relative inline-flex h-3 w-3 rounded-full bg-chilli" />
            </span>
            Waiting for Payment ({unpaid.length})
          </h2>
          {unpaid.map((b: any) => (
            <BillCard
              key={b.id}
              b={b}
              method={method[b.id] ?? ''}
              onMethodChange={v => setMethod(prev => ({ ...prev, [b.id]: v }))}
              onPay={() => pay(b.id)}
              expanded={!!expanded[b.id]}
              onToggle={() => setExpanded(prev => ({ ...prev, [b.id]: !prev[b.id] }))}
              cafeName={cafe}
            />
          ))}
        </section>
      )}

      {/* ── Empty unpaid ── */}
      {!unpaid.length && (
        <div className="rounded-2xl bg-basil/10 p-8 text-center">
          <p className="text-4xl mb-2">✅</p>
          <p className="font-bold text-basil text-lg">All bills are settled!</p>
          <p className="text-sm text-ink/60">No pending payments right now.</p>
        </div>
      )}

      {/* ── Paid Bills ── */}
      {paid.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-lg font-extrabold text-ink/60">Paid Bills ({paid.length})</h2>
          {paid.map((b: any) => (
            <BillCard
              key={b.id}
              b={b}
              method={method[b.id] ?? ''}
              onMethodChange={v => setMethod(prev => ({ ...prev, [b.id]: v }))}
              onPay={() => pay(b.id)}
              expanded={!!expanded[b.id]}
              onToggle={() => setExpanded(prev => ({ ...prev, [b.id]: !prev[b.id] }))}
              cafeName={cafe}
            />
          ))}
        </section>
      )}

      {!bills.length && <p className="text-ink/60 text-center py-10">No bills yet today.</p>}
    </div>
  )
}

/* ───────── Bill Card Component ───────── */
function BillCard({
  b, method, onMethodChange, onPay, expanded, onToggle, cafeName
}: {
  b: any
  method: string
  onMethodChange: (v: string) => void
  onPay: () => void
  expanded: boolean
  onToggle: () => void
  cafeName: string
}) {
  const isPaid = b.status === 'paid'
  const tableNum = b.table_sessions?.cafe_tables?.number ?? '?'
  const custName = b.table_sessions?.customer_name
  const phone = b.table_sessions?.phone
  const orders: any[] = b.table_sessions?.orders ?? []

  // Calculate item-level total from order lines
  const computedTotal = orders.reduce((s: number, o: any) =>
    s + (o.order_items ?? []).reduce((a: number, oi: any) => a + itemTotal(oi), 0), 0)

  const billTime = new Date(b.created_at).toLocaleTimeString('en-PK', {
    hour: '2-digit', minute: '2-digit'
  })
  const paidTime = b.paid_at ? new Date(b.paid_at).toLocaleTimeString('en-PK', {
    hour: '2-digit', minute: '2-digit'
  }) : null

  return (
    <div className={`rounded-2xl bg-white ring-2 shadow-sm transition-all ${isPaid ? 'ring-basil/30' : 'ring-chilli/40 shadow-chilli/10'}`}>

      {/* ── Card Header ── */}
      <div className="flex flex-wrap items-center gap-3 p-4">
        {/* Table badge */}
        <div className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl text-2xl font-black text-white ${isPaid ? 'bg-basil' : 'bg-chilli'}`}>
          {tableNum}
        </div>

        {/* Customer info */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-bold uppercase tracking-wider text-ink/40">Table {tableNum}</span>
            {isPaid
              ? <span className="rounded-full bg-basil/15 px-2 py-0.5 text-xs font-bold text-basil">✓ Paid by {b.method}</span>
              : <span className="rounded-full bg-chilli/10 px-2 py-0.5 text-xs font-bold text-chilli animate-pulse">⏳ Awaiting Payment</span>
            }
          </div>
          <p className="font-extrabold text-lg text-ink leading-tight">
            {custName || 'Walk-in Guest'}
          </p>
          {phone && (
            <p className="text-xs text-ink/50">{phone}</p>
          )}
        </div>

        {/* Amount */}
        <div className="text-right">
          <p className="text-2xl font-black text-ink">{money(b.total)}</p>
          {(Number(b.subtotal) > 0 || Number(b.tip) > 0) && (
            <p className="text-xs text-ink/50">
              Subtotal {money(Number(b.subtotal) || computedTotal)} · Tip {money(Number(b.tip) || 0)}
            </p>
          )}
          <p className="text-xs text-ink/40">
            {isPaid ? `Paid at ${paidTime}` : `Billed at ${billTime}`}
          </p>
        </div>
      </div>

      {/* ── Action row ── */}
      <div className="flex flex-wrap items-center gap-2 border-t border-ink/5 px-4 py-3">
        {/* Expand toggle */}
        <button
          className="flex items-center gap-1 rounded-xl bg-ink/5 px-3 py-2 text-xs font-bold text-ink/70 hover:bg-ink/10 transition"
          onClick={onToggle}
        >
          <span>{expanded ? '▲ Hide' : '▼ Show'} Order Details</span>
          <span className="ml-1 rounded-full bg-ink/20 px-1.5 py-0.5 text-xs">
            {orders.length} order{orders.length !== 1 ? 's' : ''}
          </span>
        </button>

        {!isPaid && (
          <>
            <select
              className="input !w-auto !py-2 text-sm flex-1 min-w-[140px]"
              value={method}
              onChange={e => onMethodChange(e.target.value)}
            >
              <option value="">Select payment method</option>
              <option value="cash">💵 Cash</option>
              <option value="jazzcash">📱 JazzCash</option>
              <option value="easypaisa">📱 EasyPaisa</option>
              <option value="card">💳 Card</option>
            </select>
            <button
              className="btn-main !bg-basil hover:!bg-basil/90 !py-2 text-sm font-bold flex items-center gap-1.5"
              disabled={!method}
              onClick={onPay}
            >
              <span>✓ Confirm Payment</span>
            </button>
          </>
        )}

        {isPaid && phone && (
          <a
            href={`https://wa.me/${String(phone).replace(/\D/g, '')}?text=${encodeURIComponent(
              `Hi ${custName || 'there'}, thank you for visiting ${cafeName}! We hope to see you again soon. 😊`
            )}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-xl bg-[#25D366] px-3 py-2 text-sm font-bold text-white hover:bg-[#128C7E] transition"
          >
            💬 WhatsApp Thanks
          </a>
        )}
      </div>

      {/* ── Expanded Order Details ── */}
      {expanded && (
        <div className="border-t border-ink/5 px-4 pb-4 pt-3 space-y-4">
          {orders.length === 0 && (
            <p className="text-sm text-ink/50">No order details available.</p>
          )}
          {orders.map((o: any) => {
            const orderTotal = (o.order_items ?? []).reduce((s: number, oi: any) => s + itemTotal(oi), 0)
            return (
              <div key={o.id} className="rounded-xl bg-ink/[0.03] border border-ink/8 p-3">
                {/* Order header */}
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="rounded-lg bg-ink text-white px-2 py-0.5 text-xs font-black">#{o.order_no}</span>
                    <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${
                      o.status === 'served' ? 'bg-basil/15 text-basil' :
                      o.status === 'ready'  ? 'bg-blue-100 text-blue-700' :
                      o.status === 'preparing' ? 'bg-sun/40 text-amber-700' :
                      'bg-ink/10 text-ink/60'
                    }`}>
                      {o.status === 'served' ? '✓ Served' :
                       o.status === 'ready' ? '🛎 Ready' :
                       o.status === 'preparing' ? '🔥 Cooking' : o.status}
                    </span>
                    <span className="text-xs text-ink/40">
                      {new Date(o.created_at).toLocaleTimeString('en-PK', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <span className="font-extrabold text-sm">{money(orderTotal)}</span>
                </div>

                {/* Customer order note */}
                {o.note && (
                  <div className="mb-2 flex items-start gap-2 rounded-lg bg-chilli/8 p-2 text-xs">
                    <span className="text-chilli">📝</span>
                    <span className="text-chilli font-semibold italic">Customer note: "{o.note}"</span>
                  </div>
                )}

                {/* Items */}
                <ul className="divide-y divide-ink/5">
                  {(o.order_items ?? []).map((oi: any, idx: number) => {
                    const lineTotal = itemTotal(oi)
                    return (
                      <li key={idx} className="flex flex-col py-1.5">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <span className="font-semibold text-sm">
                              {oi.qty}× {oi.menu_items?.name}
                            </span>
                            {oi.order_item_modifiers?.length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-0.5">
                                {oi.order_item_modifiers.map((m: any, mi: number) => (
                                  <span key={mi} className="rounded bg-sun/50 px-1.5 py-0.5 text-xs font-medium">
                                    +{m.modifiers?.name}
                                    {m.price > 0 && <span className="text-ink/60"> (+{money(m.price)})</span>}
                                  </span>
                                ))}
                              </div>
                            )}
                            {oi.note && (
                              <p className="text-xs text-chilli italic mt-0.5">"{oi.note}"</p>
                            )}
                          </div>
                          <span className="text-sm font-bold text-ink shrink-0">{money(lineTotal)}</span>
                        </div>
                      </li>
                    )
                  })}
                </ul>
              </div>
            )
          })}

          {/* Bill Summary */}
          <div className="rounded-xl bg-ink text-white p-4">
            <div className="flex justify-between items-center mb-1">
              <span className="text-white/60 text-sm">Subtotal</span>
              <span className="font-bold">{money(Number(b.subtotal) || computedTotal)}</span>
            </div>
            <div className="flex justify-between items-center mb-1">
              <span className="text-white/60 text-sm">Tip</span>
              <span className="font-bold text-sun">{money(Number(b.tip) || 0)}</span>
            </div>
            <div className="flex justify-between items-center border-t border-white/20 pt-2 mt-2">
              <span className="font-black text-lg">Total Bill</span>
              <span className="font-black text-2xl text-sun">{money(b.total)}</span>
            </div>
            {isPaid && (
              <div className="mt-2 flex items-center gap-2 rounded-lg bg-basil/30 px-3 py-2 text-sm font-bold text-white">
                <span>✅</span>
                <span>Paid {b.method ? `by ${b.method}` : ''} at {paidTime}</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
