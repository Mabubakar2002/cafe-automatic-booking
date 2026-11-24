'use client'
import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useLive } from '@/lib/live'
import { supabase } from '@/lib/supabase/client'
import { money, beep } from '@/lib/util'

export default function BillAlerts() {
  const sb = supabase()
  const [toasts, setToasts] = useState<{ id: string; msg: string }[]>([])
  const prevIds = useRef<Set<string>>(new Set())
  const initialized = useRef(false)

  const [d] = useLive(
    ['bills'],
    async () => {
      const r = await sb
        .from('bills')
        .select('id,total,created_at,table_sessions(customer_name,cafe_tables(number))')
        .eq('status', 'unpaid')
        .order('created_at', { ascending: false })
        .limit(20)
      return { ready: true, bills: r.data ?? [] }
    },
    { ready: false, bills: [] as any[] }
  )

  useEffect(() => {
    if (!d.ready) return
    const incoming = d.bills as any[]

    if (!initialized.current) {
      // First load — seed the set silently
      initialized.current = true
      incoming.forEach((b: any) => prevIds.current.add(b.id))
      return
    }

    // Find genuinely new unpaid bills
    const newBills = incoming.filter((b: any) => !prevIds.current.has(b.id))
    if (newBills.length > 0) {
      beep()
      setTimeout(beep, 350)
      newBills.forEach((b: any) => {
        const tableNum = b.table_sessions?.cafe_tables?.number ?? '?'
        const name = b.table_sessions?.customer_name
        const id = b.id
        const msg = `💳 Table ${tableNum}${name ? ` (${name})` : ''} has requested a bill — ${money(b.total)}`
        setToasts(prev => [...prev, { id, msg }])
        prevIds.current.add(id)
        setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 10000)
      })
    }

    // Remove settled bills from tracking
    const currentIds = new Set(incoming.map((b: any) => b.id))
    prevIds.current.forEach(id => {
      if (!currentIds.has(id)) prevIds.current.delete(id)
    })
  }, [d])

  if (!toasts.length) return null

  return (
    <div className="sticky top-2 z-50 mb-4 space-y-2 print:hidden">
      {toasts.map(t => (
        <div
          key={t.id}
          className="flex items-center justify-between gap-3 rounded-2xl bg-sun px-5 py-4 font-bold text-ink shadow-2xl ring-4 ring-sun/40"
          role="alert"
        >
          <div className="flex items-center gap-3 min-w-0">
            <span className="text-3xl shrink-0">💳</span>
            <div className="min-w-0">
              <p className="text-lg font-black leading-tight truncate">{t.msg}</p>
              <p className="text-xs font-normal text-ink/60">Process payment in Bills section</p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Link
              href="/admin/bills"
              className="rounded-xl bg-ink text-white px-4 py-2 text-sm font-extrabold hover:bg-ink/80 transition"
            >
              Go to Bills →
            </Link>
            <button
              onClick={() => setToasts(prev => prev.filter(x => x.id !== t.id))}
              className="rounded-xl bg-ink/10 px-3 py-2 text-sm font-bold hover:bg-ink/20 transition"
            >
              ✕
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}

