'use client'
import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import BellAlerts from '@/components/BellAlerts'
import { useLive } from '@/lib/live'
import { supabase } from '@/lib/supabase/client'
import { beep } from '@/lib/util'

const cols = [
  ['new', 'New orders', 'border-t-chilli', 'bg-chilli/10 text-chilli'],
  ['preparing', 'Preparing', 'border-t-sun', 'bg-sun/30 text-amber-800'],
  ['ready', 'Ready to serve', 'border-t-basil', 'bg-basil/15 text-basil'],
] as const

type Row = { id: string; name: string; unit: string; qty: number }

export default function Kitchen() {
  const sb = supabase()
  const [d, reload] = useLive(
    ['orders', 'bills'],
    async () => {
      const [o, u, i] = await Promise.all([
        sb
          .from('orders')
          .select('id,order_no,status,note,eta_note,created_at,est_wait_min,table_sessions(cafe_tables(number),bills(status)),order_items(id,qty,note,menu_items(name),order_item_modifiers(modifiers(name)))')
          .in('status', ['new', 'preparing', 'ready'])
          .order('created_at'),
        sb.from('order_expected_usage').select('order_id,ingredient_id,qty'),
        sb.from('ingredients').select('id,name,unit'),
      ])
      return { ready: true, orders: o.data ?? [], usage: u.data ?? [], ing: i.data ?? [] }
    },
    { ready: false, orders: [] as any[], usage: [] as any[], ing: [] as any[] }
  )

  const prev = useRef(-1)
  useEffect(() => {
    if (!d.ready) return
    const n = d.orders.filter((o: any) => o.status === 'new').length
    if (prev.current >= 0 && n > prev.current) beep()
    prev.current = n
  }, [d])

  const rowsFor = (orderId: string): Row[] =>
    d.usage
      .filter((u: any) => u.order_id === orderId)
      .map((u: any) => {
        const i = d.ing.find((x: any) => x.id === u.ingredient_id)
        return { id: u.ingredient_id, name: i?.name ?? 'Unknown', unit: i?.unit ?? '', qty: Number(u.qty) }
      })

  return (
    <div className="min-h-screen bg-[#eef1e8] p-4 md:p-6">
      <header className="mb-5 flex items-center justify-between rounded-2xl bg-ink px-5 py-4 text-white shadow-lg">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-sun">Live kitchen</p>
          <h1 className="text-2xl font-black md:text-3xl">Kitchen Display</h1>
        </div>
        <div className="flex gap-2 text-sm">
          <Link href="/admin" className="rounded-xl bg-white/10 px-3 py-2 font-bold hover:bg-white/15">Admin</Link>
          <button className="rounded-xl bg-sun px-3 py-2 font-bold text-ink" onClick={() => sb.auth.signOut().then(() => (location.href = '/login'))}>Sign out</button>
        </div>
      </header>
      <BellAlerts />
      <div className="grid gap-4 md:grid-cols-3">
        {cols.map(([status, title, border, tone]) => {
          const list = d.orders.filter((o: any) => o.status === status)
          return (
            <section key={status} className={`min-h-24 rounded-3xl border-t-4 bg-white/55 p-3 ${border}`}>
              <div className="mb-3 flex items-center justify-between px-1">
                <h2 className="text-lg font-black">{title}</h2>
                <span className={`flex h-8 min-w-8 items-center justify-center rounded-full px-2 text-sm font-black ${tone}`}>{list.length}</span>
              </div>
              {list.map((o: any) => (
                <Card key={o.id} o={o} border={border} rows={rowsFor(o.id)} reload={reload} />
              ))}
              {!list.length && <p className="text-sm text-ink/50">Nothing here.</p>}
            </section>
          )
        })}
      </div>
    </div>
  )
}

function Card({ o, border, rows, reload }: { o: any; border: string; rows: Row[]; reload: () => void }) {
  const sb = supabase()
  const [edit, setEdit] = useState(false)
  const [vals, setVals] = useState<Record<string, string>>({})
  const [busy, setBusy] = useState(false)
  const [extrasChecked, setExtrasChecked] = useState(false)
  const [etaOpen, setEtaOpen] = useState(false)
  const [extraMinutes, setExtraMinutes] = useState('10')
  const [etaNote, setEtaNote] = useState('')
  const [etaError, setEtaError] = useState('')
  const sessionBills = o.table_sessions?.bills
  const bill = Array.isArray(sessionBills) ? sessionBills[0] : sessionBills

  const update = async (patch: object) => {
    setBusy(true)
    await sb.from('orders').update(patch).eq('id', o.id)
    try {
      const bc = new BroadcastChannel('cafe-live-events')
      bc.postMessage({ table: 'orders' })
      bc.close()
    } catch {}
    setBusy(false)
    reload()
  }

  async function done() {
    setBusy(true)
    const p_usage = rows.map(r => ({ ingredient_id: r.id, expected_qty: r.qty, used_qty: Number(vals[r.id] ?? r.qty) }))
    const { error } = await sb.rpc('complete_order', { p_order: o.id, p_usage })
    try {
      const bc = new BroadcastChannel('cafe-live-events')
      bc.postMessage({ table: 'orders' })
      bc.close()
    } catch {}
    setBusy(false)
    if (error) alert(error.message)
    else reload()
  }

  async function saveEta() {
    setBusy(true)
    setEtaError('')
    try {
      const response = await fetch('/api/kitchen/eta', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId: o.id, extraMinutes: Number(extraMinutes), note: etaNote }),
      })
      const result = await response.json()
      if (!response.ok) {
        setEtaError(result.error || 'Could not update the order time')
        return
      }
      try {
        const bc = new BroadcastChannel('cafe-live-events')
        bc.postMessage({ table: 'orders' })
        bc.close()
      } catch {}
      setEtaOpen(false)
      setEtaNote('')
      reload()
    } catch {
      setEtaError('Could not update the order time. Check the connection and try again.')
    } finally {
      setBusy(false)
    }
  }

  const hasSpecialDemands = !!o.note || o.order_items.some((oi: any) => oi.note || oi.order_item_modifiers?.length > 0)

  return (
    <article className={`space-y-3 rounded-2xl border-l-4 bg-white p-4 shadow-lg shadow-ink/[0.06] ring-1 ring-ink/[0.06] ${border.replace('border-t-', 'border-l-')}`}>
      <div className="flex items-start justify-between border-b border-ink/10 pb-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-ink/40">Table</p>
          <h3 className="text-3xl font-black">{o.table_sessions?.cafe_tables?.number}</h3>
          <span className={`mt-1 inline-flex rounded-full px-2.5 py-1 text-xs font-bold ${bill?.status === 'paid' ? 'bg-basil/15 text-basil' : 'bg-chilli/10 text-chilli'}`}>
            {bill?.status === 'paid' ? '✓ Paid' : 'Unpaid'}
          </span>
          <span className="mt-1 block text-xs text-ink/50">
            Placed at {new Date(o.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>
        <span className="rounded-full bg-ink px-3 py-1 font-mono text-sm font-bold text-white">
          #{o.order_no}
        </span>
      </div>

      {/* Special Demands & Extras Box */}
      {hasSpecialDemands && (
        <div className="rounded-xl border-2 border-dashed border-chilli/40 bg-chilli/5 p-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-extrabold uppercase tracking-wide text-chilli">
              ⚡ Special Demands & Extras:
            </span>
            <label className="flex items-center gap-1.5 text-xs font-bold text-chilli cursor-pointer">
              <input
                type="checkbox"
                checked={extrasChecked}
                onChange={e => setExtrasChecked(e.target.checked)}
                className="h-4 w-4 accent-chilli rounded"
              />
              <span>Extras Added</span>
            </label>
          </div>
          {o.note && (
            <p className="mt-1.5 rounded-lg bg-chilli/15 p-2 text-sm font-bold text-chilli">
              Customer Note: "{o.note}"
            </p>
          )}
          <div className="mt-1.5 space-y-1">
            {o.order_items.map((oi: any) => {
              const hasItemMods = oi.order_item_modifiers?.length > 0
              const hasItemNote = !!oi.note
              if (!hasItemMods && !hasItemNote) return null
              return (
                <div key={oi.id} className="rounded-lg bg-white p-2 text-xs ring-1 ring-ink/10">
                  <span className="font-bold">{oi.qty}x {oi.menu_items?.name}:</span>
                  {hasItemMods && (
                    <span className="ml-1 rounded bg-sun px-2 py-0.5 font-bold text-ink">
                      +{oi.order_item_modifiers.map((m: any) => m.modifiers?.name).join(', ')}
                    </span>
                  )}
                  {hasItemNote && (
                    <span className="ml-1 text-chilli italic font-semibold">"{oi.note}"</span>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Ordered Items List */}
      <ul className="divide-y divide-ink/5">
        {o.order_items.map((oi: any) => (
          <li key={oi.id} className="py-2 text-sm">
            <p className="font-bold">{oi.qty} x {oi.menu_items?.name}</p>
            {!hasSpecialDemands && oi.order_item_modifiers.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-0.5">
                {oi.order_item_modifiers.map((m: any, i: number) => (
                  <span key={i} className="rounded-md bg-sun px-2 py-0.5 text-xs font-semibold">+ {m.modifiers.name}</span>
                ))}
              </div>
            )}
          </li>
        ))}
      </ul>

      {/* Default Ingredients & Recipe Tracking */}
      {rows.length > 0 && (
        <div className="rounded-xl bg-sage/60 p-2 text-xs">
          <div className="flex items-center justify-between font-semibold text-ink/70">
            <span>Standard Ingredients (Default):</span>
            <button
              className="text-chilli underline hover:opacity-80"
              onClick={() => setEdit(!edit)}
            >
              {edit ? 'Hide recipe' : 'Adjust usage'}
            </button>
          </div>
          {!edit && (
            <p className="mt-1 text-ink/60 truncate">
              {rows.map(r => `${r.name} (${r.qty} ${r.unit})`).join(', ')}
            </p>
          )}
        </div>
      )}

      {o.status === 'preparing' && edit && (
        <div className="space-y-1 rounded-xl bg-sage p-3">
          <p className="text-xs font-bold text-ink/70 mb-1">Adjust ingredient inventory deduction:</p>
          {rows.map(r => (
            <label key={r.id} className="flex items-center justify-between gap-2 text-sm">
              <span>{r.name} ({r.unit})</span>
              <input
                type="number"
                step="any"
                className="input !w-24 !py-1"
                defaultValue={r.qty}
                onChange={e => setVals({ ...vals, [r.id]: e.target.value })}
              />
            </label>
          ))}
        </div>
      )}

      <div className="flex gap-2 border-t border-ink/5 pt-3">
        {o.status === 'new' && (
          <>
            <button
              className="btn-main flex-1 flex items-center justify-center gap-1.5"
              disabled={busy}
              onClick={() => update({ status: 'preparing', started_at: new Date().toISOString() })}
            >
              <span>🍳 Start Cooking</span>
            </button>
            <button className="btn-soft text-xs" disabled={busy} onClick={() => setEtaOpen(true)}>Add time</button>
            <button className="btn-soft" disabled={busy} onClick={() => confirm('Cancel this order?') && update({ status: 'cancelled' })}>Cancel</button>
          </>
        )}
        {o.status === 'preparing' && (
          <>
            <button
              className="btn-main flex-1 flex items-center justify-center gap-1.5 !bg-basil hover:!bg-basil/90"
              disabled={busy}
              onClick={done}
            >
              <span>✅ Mark Done</span>
            </button>
            <button className="btn-soft text-xs" disabled={busy} onClick={() => setEtaOpen(true)}>Add time</button>
            {rows.length > 0 && (
              <button className="btn-soft text-xs" onClick={() => setEdit(!edit)}>{edit ? 'Hide' : 'Edit amounts'}</button>
            )}
          </>
        )}
        {o.status === 'ready' && (
          <button
            className="btn-alt flex-1 flex items-center justify-center gap-1.5"
            disabled={busy}
            onClick={() => update({ status: 'served' })}
          >
            <span>🍽️ Served to Table</span>
          </button>
        )}
      </div>
      {o.eta_note && (
        <p className="rounded-xl bg-sun/25 px-3 py-2 text-sm text-ink">
          <strong>Customer update:</strong> {o.eta_note}
        </p>
      )}
      {etaOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/60 p-4" role="dialog" aria-modal="true" aria-labelledby={`eta-title-${o.id}`}>
          <div className="w-full max-w-md space-y-3 rounded-2xl bg-white p-5 shadow-2xl" onClick={event => event.stopPropagation()}>
            <h2 id={`eta-title-${o.id}`} className="text-xl font-black">Update Order #{o.order_no}</h2>
            <label className="block text-sm font-bold">
              Extra minutes to add
              <input
                type="number"
                min="1"
                max="180"
                step="1"
                className="input mt-1"
                value={extraMinutes}
                onChange={event => setExtraMinutes(event.target.value)}
              />
            </label>
            <label className="block text-sm font-bold">
              Note for the customer
              <textarea
                className="input mt-1 min-h-24"
                maxLength={500}
                placeholder="For example: Your order needs a few more minutes."
                value={etaNote}
                onChange={event => setEtaNote(event.target.value)}
              />
            </label>
            {etaError && <p role="alert" className="text-sm font-semibold text-chilli">{etaError}</p>}
            <div className="flex gap-2">
              <button className="btn-soft flex-1" disabled={busy} onClick={() => setEtaOpen(false)}>Cancel</button>
              <button className="btn-main flex-1" disabled={busy} onClick={saveEta}>{busy ? 'Saving…' : 'Update customer'}</button>
            </div>
          </div>
        </div>
      )}
    </article>
  )
}
