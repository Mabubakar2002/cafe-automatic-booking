'use client'
import { useEffect, useRef, useState } from 'react'
import { useLive } from '@/lib/live'
import { supabase } from '@/lib/supabase/client'
import { beep } from '@/lib/util'

// Waiter calls, new orders and feedback, live, on every admin and kitchen page.
export default function BellAlerts() {
  const sb = supabase()
  const [d, reload] = useLive(
    ['bell_calls', 'feedback', 'orders'],
    async () => {
      const [b, f, o] = await Promise.all([
        sb.from('bell_calls').select('id,status,note,created_at,table_sessions(customer_name,cafe_tables(number))').eq('status', 'open').order('created_at'),
        sb.from('feedback').select('id,rating,comment').order('created_at', { ascending: false }).limit(1),
        sb.from('orders').select('id,order_no,status,created_at,table_sessions(customer_name,cafe_tables(number))').eq('status', 'pending').order('created_at', { ascending: false }),
      ])
      return { ready: true, bells: b.data ?? [], fb: (f.data?.[0] ?? null) as any, pending: o.data ?? [] }
    },
    { ready: false, bells: [] as any[], fb: null as any, pending: [] as any[] }
  )
  const [toast, setToast] = useState<any>(null)
  const [orderToast, setOrderToast] = useState<any>(null)
  const prev = useRef({ init: false, bells: 0, fb: '', pending: '' })

  useEffect(() => {
    if (!d.ready) return
    const p = prev.current
    if (p.init) {
      if (d.bells.length > p.bells) {
        beep()
        setTimeout(beep, 300)
      }
      if (d.fb && d.fb.id !== p.fb) {
        setToast(d.fb)
        beep()
        setTimeout(() => setToast(null), 8000)
      }
      if (d.pending[0] && d.pending[0].id !== p.pending) {
        setOrderToast(d.pending[0])
        beep()
        setTimeout(beep, 300)
        setTimeout(() => setOrderToast(null), 10000)
      }
    }
    prev.current = { init: true, bells: d.bells.length, fb: d.fb?.id ?? '', pending: d.pending[0]?.id ?? '' }
  }, [d])

  const clear = (id: string) =>
    sb.from('bell_calls').update({ status: 'done', handled_at: new Date().toISOString() }).eq('id', id).then(() => {
      try {
        const bc = new BroadcastChannel('cafe-live-events')
        bc.postMessage({ table: 'bell_calls' })
        bc.close()
      } catch {}
      reload()
    })

  if (!d.bells.length && !toast && !orderToast) return null
  return (
    <div className="sticky top-2 z-50 mb-4 space-y-2 print:hidden" role="alert">
      {d.bells.map((b: any) => {
        const tableNum = b.table_sessions?.cafe_tables?.number || '1'
        const custName = b.table_sessions?.customer_name
        return (
          <div
            key={b.id}
            className="flex items-center justify-between gap-3 rounded-2xl bg-chilli px-5 py-4 font-bold text-white shadow-2xl ring-4 ring-chilli/40 animate-bounce"
          >
            <div className="flex items-center gap-3">
              <span className="text-3xl">🔔</span>
              <div>
                <p className="text-xl sm:text-2xl font-black tracking-wide">
                  Table {tableNum} is calling the waiter!
                </p>
                <p className="text-xs text-white/80 font-normal">
                  {custName ? `Customer: ${custName} • ` : ''}
                  Called at {new Date(b.created_at || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                </p>
                {b.note && <p className="mt-1 rounded-lg bg-white/15 px-2 py-1 text-sm font-semibold">Note: {b.note}</p>}
              </div>
            </div>
            <button
              className="rounded-xl bg-white px-4 py-2.5 text-sm font-extrabold text-chilli hover:bg-white/90 shadow-md transition transform active:scale-95 shrink-0"
              onClick={() => clear(b.id)}
            >
              ✓ Attended / Clear
            </button>
          </div>
        )
      })}
      {toast && (
        <div className="rounded-2xl bg-sun px-5 py-3.5 font-semibold text-ink shadow-lg flex items-center gap-3">
          <span className="text-2xl">⭐</span>
          <div>
            <p className="font-bold">New customer feedback: {toast.rating} / 5</p>
            {toast.comment && <p className="text-xs text-ink/80">&quot;{toast.comment}&quot;</p>}
          </div>
        </div>
      )}
      {orderToast && (
        <div className="flex items-center justify-between gap-3 rounded-2xl bg-ink px-5 py-4 text-white shadow-2xl ring-4 ring-ink/20">
          <div className="flex items-center gap-3">
            <span className="text-3xl">🧾</span>
            <div>
              <p className="text-lg font-black">New order #{orderToast.order_no}</p>
              <p className="text-xs text-white/70">
                Table {orderToast.table_sessions?.cafe_tables?.number}
                {orderToast.table_sessions?.customer_name ? ` • ${orderToast.table_sessions.customer_name}` : ''}
                {' • '}Waiting for staff approval
              </p>
            </div>
          </div>
          <button
            className="rounded-xl bg-sun px-4 py-2 text-sm font-extrabold text-ink"
            onClick={() => setOrderToast(null)}
          >
            Dismiss
          </button>
        </div>
      )}
    </div>
  )
}
