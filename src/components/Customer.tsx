'use client'
import { useEffect, useMemo, useRef, useState } from 'react'
import { itemTotal, money } from '@/lib/util'
import ScratchCard from '@/components/ScratchCard'
import CookingTimer from '@/components/CookingTimer'

type Mod = { id: string; name: string; price: number }
type Item = {
  id: string
  category_id: string | null
  name: string
  description: string | null
  price: number
  image_url: string | null
  is_available: boolean
  menu_item_modifiers: { modifiers: Mod }[]
}
type Line = { item: Item; qty: number; mods: Mod[]; note: string }
type Tab = 'menu' | 'cart' | 'orders' | 'bill' | 'profile'

const cafe = process.env.NEXT_PUBLIC_CAFE_NAME || 'Cafe'
const payLines = (process.env.NEXT_PUBLIC_PAY_INFO || 'Cash at the counter').split('|')
const tints = ['bg-chilli text-white', 'bg-sun text-ink', 'bg-basil text-white', 'bg-ink text-white']
const statusLabel: Record<string, string> = {
  pending: 'Waiting for staff approval',
  new: 'Received',
  preparing: 'Being prepared',
  ready: 'Ready',
  served: 'Served',
}
const steps = ['pending', 'new', 'preparing', 'ready', 'served']

const lineKey = (l: Line) => l.item.id + l.mods.map(m => m.id).sort().join() + l.note
const lineTotal = (l: Line) => (l.item.price + l.mods.reduce((s, m) => s + m.price, 0)) * l.qty
const post = (url: string, body: unknown) =>
  fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }).then(r => r.json())

export default function Customer({ table }: { table: number }) {
  const [menu, setMenu] = useState<{ categories: { id: string; name: string }[]; items: Item[] } | null>(null)
  const [cat, setCat] = useState('')
  const [tab, setTab] = useState<Tab>('menu')
  const [cart, setCart] = useState<Line[]>([])
  const [pick, setPick] = useState<Line | null>(null)
  const [sid, setSid] = useState<string | null>(null)
  const [sess, setSess] = useState<any>(null)
  const [tick, setTick] = useState(0)
  const [form, setForm] = useState({ name: '', phone: '', note: '' })
  const [msg, setMsg] = useState<{ t: string; bad?: boolean } | null>(null)
  const [busy, setBusy] = useState(false)
  const [now, setNow] = useState(Date.now())
  const [rating, setRating] = useState(0)
  const [comment, setComment] = useState('')
  const [showScratch, setShowScratch] = useState(false)
  const [tableStatus, setTableStatus] = useState<'checking' | 'available' | 'booked' | 'unavailable'>('checking')
  const [tipPercent, setTipPercent] = useState(0)
  const [customTip, setCustomTip] = useState('')
  const [loyalty, setLoyalty] = useState<any>(null)
  const [loyaltyError, setLoyaltyError] = useState(false)
  const seen = useRef<Record<string, string>>({})

  const refresh = () => setTick(t => t + 1)

  useEffect(() => {
    setSid(localStorage.getItem('cafe-sid'))
    setCart(JSON.parse(localStorage.getItem('cafe-cart-' + table) || '[]'))
    const sessionId = localStorage.getItem('cafe-sid')
    fetch('/api/table-status?table=' + table + (sessionId ? '&sessionId=' + encodeURIComponent(sessionId) : ''))
      .then(async r => {
        if (!r.ok) throw new Error('Could not check table availability')
        const result = await r.json()
        if (typeof result.booked !== 'boolean') throw new Error('Invalid table availability response')
        setTableStatus(result.booked ? 'booked' : 'available')
      })
      .catch(() => setTableStatus('unavailable'))
    fetch('/api/menu')
      .then(r => {
        if (!r.ok) throw new Error('The cafe menu is unavailable')
        return r.json()
      })
      .then(setMenu)
      .catch(() => setMsg({ t: 'The cafe menu is temporarily unavailable. Please try again later.', bad: true }))
    const t = setInterval(() => setNow(Date.now()), 30000)
    return () => clearInterval(t)
  }, [table])

  useEffect(() => {
    localStorage.setItem('cafe-cart-' + table, JSON.stringify(cart))
  }, [cart, table])

  // Live status: poll the visit every few seconds
  useEffect(() => {
    if (!sid) return
    let on = true
    const load = () =>
      fetch('/api/session?id=' + sid)
        .then(r => r.json())
        .then(s => {
          if (!on) return
          if (s.gone) {
            localStorage.removeItem('cafe-sid')
            setSid(null)
            setSess(null)
          } else setSess(s)
        })
        .catch(() => {})
    load()
    const t = setInterval(load, 4000)
    return () => {
      on = false
      clearInterval(t)
    }
  }, [sid, tick])

  useEffect(() => {
    if (!sid) return
    fetch('/api/loyalty?sessionId=' + encodeURIComponent(sid))
      .then(async r => {
        if (!r.ok) throw new Error('Could not load loyalty history')
        return r.json()
      })
      .then(r => {
        setLoyalty(r.loyalty ?? null)
        setLoyaltyError(false)
      })
      .catch(() => {
        setLoyalty(null)
        setLoyaltyError(true)
      })
  }, [sid, tick, sess?.closed_at])

  // Tell the customer when kitchen starts preparing, order is ready, or the bill is paid
  useEffect(() => {
    for (const o of sess?.orders ?? []) {
      const was = seen.current[o.id]
      if (was && was !== 'preparing' && o.status === 'preparing') {
        setMsg({ t: `🍳 Great news! Kitchen has started preparing your Order #${o.order_no}!` })
        navigator.vibrate?.(300)
      }
      if (was && was !== 'ready' && o.status === 'ready') {
        setMsg({ t: `✅ Order #${o.order_no} is ready to serve!` })
        navigator.vibrate?.(300)
      }
      seen.current[o.id] = o.status
    }
    if (sess?.closed_at && !seen.current.closed) {
      seen.current.closed = '1'
      setTab('bill')
      // 🎁 Show scratch card ONLY ONCE per session (guard against re-renders)
      const scratchKey = `cafe_scratch_shown_${sid}`
      if (!localStorage.getItem(scratchKey)) {
        localStorage.setItem(scratchKey, '1')
        setShowScratch(true)
      }
    }
  }, [sess])

  const shown = useMemo(() => menu?.items.filter(i => !cat || i.category_id === cat) ?? [], [menu, cat])
  const orders: any[] = (sess?.orders ?? [])
    .filter((o: any) => o.status !== 'cancelled')
    .sort((a: any, b: any) => b.order_no - a.order_no)
  const total = orders.reduce((s, o) => s + o.order_items.reduce((a: number, oi: any) => a + itemTotal(oi), 0), 0)
  const bill = Array.isArray(sess?.bills) ? sess.bills[0] : sess?.bills
  const closed = !!sess?.closed_at
  const needsContact = !sess?.customer_name || closed
  const calling = !!sess?.bell_calls?.some((b: any) => b.status === 'open')
  const cartCount = cart.reduce((s, l) => s + l.qty, 0)
  const cartTotal = cart.reduce((s, l) => s + lineTotal(l), 0)

  function addLine(l: Line) {
    setCart(c => {
      const i = c.findIndex(x => lineKey(x) === lineKey(l))
      return i < 0 ? [...c, l] : c.map((x, j) => (j === i ? { ...x, qty: x.qty + l.qty } : x))
    })
    setPick(null)
  }

  function open(item: Item) {
    const l: Line = { item, qty: 1, mods: [], note: '' }
    if (item.menu_item_modifiers.length) setPick(l)
    else addLine(l)
  }

  const bump = (i: number, d: number) =>
    setCart(c => c.flatMap((x, j) => (j !== i ? [x] : x.qty + d > 0 ? [{ ...x, qty: x.qty + d }] : [])))

  async function run(fn: () => Promise<any>) {
    setBusy(true)
    const r = await fn().catch(() => ({ error: 'No internet connection. Try again in a moment.' }))
    setBusy(false)
    if (r.error) setMsg({ t: r.error, bad: true })
    return r
  }

  async function place() {
    if (!cart.length) return
    if (needsContact && (!form.name.trim() || form.phone.replace(/\D/g, '').length < 10)) {
      return setMsg({ t: 'Enter your name and mobile number to place the order.', bad: true })
    }
    const r = await run(() =>
      post('/api/order', {
        table,
        sessionId: closed ? null : sid,
        ...form,
        items: cart.map(l => ({ id: l.item.id, qty: l.qty, mods: l.mods.map(m => m.id), note: l.note })),
      })
    )
    if (r.error) return
    seen.current = {}
    localStorage.setItem('cafe-sid', r.sessionId)
    setSid(r.sessionId)
    setSess(null)
    setCart([])
    setForm(f => ({ ...f, note: '' }))
    setTab('orders')
    try {
      const bc = new BroadcastChannel('cafe-live-events')
      bc.postMessage({ table: 'orders' })
      bc.close()
    } catch {}
    refresh()
  }

  async function ring() {
    const r = await run(() => post('/api/bell', { table, sessionId: closed ? null : sid }))
    if (r.error) return
    if (r.sessionId !== sid) {
      localStorage.setItem('cafe-sid', r.sessionId)
      setSid(r.sessionId)
    }
    try {
      const bc = new BroadcastChannel('cafe-live-events')
      bc.postMessage({ table: 'bell_calls' })
      bc.close()
    } catch {}
    setMsg({ t: 'The waiter has been called.' })
    refresh()
  }

  async function getBill() {
    const custom = Number(customTip)
    const tip = custom > 0 ? custom : total * tipPercent / 100
    const r = await run(() => post('/api/bill', { sessionId: sid, tip }))
    if (!r.error) {
      try {
        const bc = new BroadcastChannel('cafe-live-events')
        bc.postMessage({ table: 'bills' })
        bc.close()
      } catch {}
      refresh()
    }
  }

  async function sendFeedback() {
    const r = await run(() => post('/api/feedback', { sessionId: sid, rating, comment }))
    if (!r.error) {
      // Scratch card only shows once per session (already shown on payment)
      // If somehow not shown yet, show it now
      const scratchKey = `cafe_scratch_shown_${sid}`
      if (!localStorage.getItem(scratchKey)) {
        localStorage.setItem(scratchKey, '1')
        setShowScratch(true)
      }
      refresh()
    }
  }

  function newOrder() {
    localStorage.removeItem('cafe-sid')
    seen.current = {}
    setSid(null)
    setSess(null)
    setTab('menu')
  }

  if (tableStatus === 'checking') {
    return <div className="p-6 text-center text-ink/60">Checking table availability...</div>
  }
  if (tableStatus === 'unavailable') {
    return (
      <main className="flex min-h-[70vh] items-center justify-center px-6">
        <section className="w-full rounded-3xl bg-white p-6 text-center shadow-sm ring-1 ring-ink/10">
          <h1 className="text-2xl font-extrabold">Table status is temporarily unavailable</h1>
          <p className="mt-2 text-ink/60">Please try again shortly or ask a staff member for help.</p>
          <button className="btn-main mt-5 w-full" onClick={() => location.reload()}>Try Again</button>
        </section>
      </main>
    )
  }
  if (tableStatus === 'booked') {
    return (
      <main className="flex min-h-[70vh] items-center justify-center px-6">
        <section className="w-full rounded-3xl bg-white p-6 text-center shadow-sm ring-1 ring-ink/10">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-chilli/10 text-3xl">🪑</div>
          <h1 className="text-2xl font-extrabold">Table {table} is already booked</h1>
          <p className="mt-2 text-ink/60">Please choose another available table.</p>
          <button className="btn-main mt-5 w-full" onClick={() => (location.href = '/')}>Choose Another Table</button>
        </section>
      </main>
    )
  }

  return (
    <div className="mx-auto min-h-screen max-w-lg pb-24">
      <header className="sticky top-0 z-10 flex items-center justify-between bg-ink px-4 py-3 text-white">
        <div>
          <h1 className="text-xl font-extrabold leading-none">{cafe}</h1>
          <p className="text-sm text-white/70">Table {table}</p>
        </div>
        <button
          className="rounded-xl bg-sun px-3 py-2 text-sm font-bold text-ink disabled:opacity-60"
          disabled={busy || calling}
          onClick={ring}
        >
          {calling ? 'Waiter is coming' : 'Call waiter'}
        </button>
      </header>

      {msg && (
        <div
          role="status"
          className={`mx-4 mt-3 flex items-start justify-between gap-3 rounded-xl px-4 py-3 text-white ${msg.bad ? 'bg-chilli' : 'bg-basil'}`}
        >
          <span>{msg.t}</span>
          <button aria-label="Dismiss" onClick={() => setMsg(null)}>✕</button>
        </div>
      )}

      {tab === 'menu' && (
        <section>
          <nav className="sticky top-[60px] z-10 flex gap-2 overflow-x-auto bg-sage px-4 py-3">
            {[{ id: '', name: 'All' }, ...(menu?.categories ?? [])].map(c => (
              <button
                key={c.id}
                onClick={() => setCat(c.id)}
                className={`shrink-0 rounded-full px-4 py-1.5 text-sm font-semibold ${cat === c.id ? 'bg-ink text-white' : 'bg-white ring-1 ring-ink/15'}`}
              >
                {c.name}
              </button>
            ))}
          </nav>
          {!menu && <p className="px-4 py-8 text-center text-ink/60">Loading menu…</p>}
          <ul className="space-y-3 px-4">
            {shown.map(it => {
              const ci = menu!.categories.findIndex(c => c.id === it.category_id)
              return (
                <li key={it.id} className="flex gap-3 rounded-2xl bg-white p-3 ring-1 ring-ink/10">
                  {it.image_url ? (
                    <img src={it.image_url} alt="" className="h-24 w-24 shrink-0 rounded-xl object-cover" />
                  ) : (
                    <div className={`flex h-24 w-24 shrink-0 items-center justify-center rounded-xl font-display text-4xl font-extrabold ${tints[(ci < 0 ? 0 : ci) % 4]}`}>
                      {it.name[0]}
                    </div>
                  )}
                  <div className="flex min-w-0 flex-1 flex-col">
                    <h3 className="font-bold leading-tight">{it.name}</h3>
                    {it.description && <p className="line-clamp-2 text-sm text-ink/60">{it.description}</p>}
                    <div className="mt-auto flex items-center justify-between pt-2">
                      <span className="font-bold">{money(it.price)}</span>
                      <button className="btn-main !py-1.5 text-sm" disabled={!it.is_available} onClick={() => open(it)}>
                        {!it.is_available ? 'Sold out' : it.menu_item_modifiers.length ? 'Customise' : 'Add'}
                      </button>
                    </div>
                  </div>
                </li>
              )
            })}
          </ul>
        </section>
      )}

      {tab === 'cart' && (
        <section className="space-y-3 px-4 pt-4">
          {!cart.length && <p className="py-10 text-center text-ink/60">Your cart is empty.</p>}
          {cart.map((l, i) => (
            <div key={lineKey(l)} className="flex items-center gap-3 rounded-2xl bg-white p-3 ring-1 ring-ink/10">
              <div className="min-w-0 flex-1">
                <p className="font-bold">{l.item.name}</p>
                {l.mods.length > 0 && <p className="text-sm text-ink/60">{l.mods.map(m => m.name).join(', ')}</p>}
                {l.note && <p className="text-sm italic text-ink/60">{l.note}</p>}
              </div>
              <div className="flex items-center gap-2">
                <button aria-label="Remove one" className="h-8 w-8 rounded-full bg-ink/10" onClick={() => bump(i, -1)}>-</button>
                <span className="w-5 text-center">{l.qty}</span>
                <button aria-label="Add one" className="h-8 w-8 rounded-full bg-ink text-white" onClick={() => bump(i, 1)}>+</button>
              </div>
              <span className="w-20 text-right font-bold">{money(lineTotal(l))}</span>
            </div>
          ))}
          {cart.length > 0 && (
            <>
              {needsContact && (
                <div className="space-y-2 rounded-2xl bg-white p-4 ring-1 ring-ink/10">
                  <p className="font-bold">Your details</p>
                  <input className="input" placeholder="Name" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
                  <input
                    className="input"
                    inputMode="tel"
                    placeholder="Mobile number (03xx xxxxxxx)"
                    value={form.phone}
                    onChange={e => setForm({ ...form, phone: e.target.value })}
                  />
                  <p className="text-xs text-ink/60">We will send a thank-you message on WhatsApp after your visit.</p>
                </div>
              )}
              <textarea
                className="input"
                rows={2}
                placeholder="Anything for the kitchen? (optional)"
                value={form.note}
                onChange={e => setForm({ ...form, note: e.target.value })}
              />
              <button className="btn-main w-full text-lg" disabled={busy} onClick={place}>
                Place order · {money(cartTotal)}
              </button>
            </>
          )}
        </section>
      )}

      {tab === 'orders' && (
        <section className="space-y-3 px-4 pt-4">
          {sess?.kitchen_queue && sess.kitchen_queue.total_in_queue > 0 && (
            <div className="rounded-2xl bg-gradient-to-r from-ink via-ink/95 to-ink/90 p-4 text-white shadow-md border border-white/10">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-sun">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-sun opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-sun"></span>
                  </span>
                  Kitchen Live Queue
                </span>
                <span className="rounded-full bg-white/15 px-2.5 py-0.5 text-xs font-semibold">
                  {sess.kitchen_queue.total_in_queue} in kitchen
                </span>
              </div>
              <div className="mt-3 flex items-center justify-between border-t border-white/10 pt-2.5">
                <div>
                  <p className="text-xs text-white/60">Now Cooking on Stove:</p>
                  <p className="text-lg font-extrabold text-sun">
                    {sess.kitchen_queue.currently_preparing_no ? `Order #${sess.kitchen_queue.currently_preparing_no}` : 'Preparing next order'}
                  </p>
                </div>
                {orders.some((o: any) => o.status === 'preparing') ? (
                  <span className="rounded-xl bg-basil/20 border border-basil/40 px-3 py-1.5 text-xs font-bold text-basil text-right">
                    🔥 Your order is being cooked!
                  </span>
                ) : (
                  <div className="text-right">
                    <p className="text-xs text-white/60">Queue Status</p>
                    <p className="text-xs font-bold text-white/90">In line for chef</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {!orders.length && <p className="py-10 text-center text-ink/60">No orders yet. Pick something from the menu.</p>}
          {orders.map(o => {
            const left = Math.max(1, Math.ceil((new Date(o.created_at).getTime() + o.est_wait_min * 60000 - now) / 60000))
            const step = Math.min(2, steps.indexOf(o.status))
            const isCooking = o.status === 'preparing'
            return (
              <article key={o.id} className="rounded-2xl bg-white ring-1 ring-ink/10 shadow-sm overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between px-4 pt-4 pb-2">
                  <div>
                    <h2 className="text-2xl font-extrabold">Order #{o.order_no}</h2>
                    <p className="text-xs text-ink/50">Placed at {new Date(o.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                  </div>
                  <span
                    className={`rounded-full px-3 py-1 text-sm font-bold ${
                      o.status === 'ready'
                        ? 'bg-basil text-white animate-pulse'
                        : o.status === 'served'
                        ? 'bg-ink/10 text-ink/70'
                        : isCooking
                        ? 'bg-sun text-ink font-extrabold shadow-sm'
                        : 'bg-amber-100 text-amber-800'
                    }`}
                  >
                    {isCooking ? '🔥 Cooking Now' : statusLabel[o.status]}
                  </span>
                </div>

                {/* Progress bar */}
                <div className="mx-4 mb-3 flex gap-1">
                  {[0, 1, 2].map(n => (
                    <i key={n} className={`h-1.5 flex-1 rounded ${n <= step ? (step === 2 ? 'bg-basil' : 'bg-chilli') : 'bg-ink/10'}`} />
                  ))}
                </div>

                {/* 🕐 Stylish Cooking Timer — only when kitchen has started */}
                {isCooking && o.started_at && (
                  <div className="mx-4 mb-4">
                    <CookingTimer
                      startedAt={o.started_at}
                      estWaitMin={o.est_wait_min || 15}
                      orderNo={o.order_no}
                    />
                  </div>
                )}

                {/* Waiting (new) state */}
                {o.status === 'new' && (
                  <div className="mx-4 mb-3 flex items-center justify-between rounded-xl bg-amber-50 border border-amber-200 px-3 py-2 text-sm">
                    <span className="font-semibold text-amber-800">⏳ Waiting for chef to start</span>
                    <span className="font-bold text-amber-600">~{left} min est.</span>
                  </div>
                )}

                {/* Ready state */}
                {o.status === 'ready' && (
                  <div className="mx-4 mb-3 flex items-center gap-2 rounded-xl bg-basil/10 border border-basil/30 px-3 py-2.5 text-sm">
                    <span className="text-xl">🛎️</span>
                    <span className="font-bold text-basil">Your order is ready! Waiter is bringing it to you.</span>
                  </div>
                )}

                {/* Items list */}
                <ul className="mx-4 mb-4 divide-y divide-ink/5 text-sm border-t border-ink/5 pt-2">
                  {o.order_items.map((oi: any, i: number) => (
                    <li key={i} className="py-1.5">
                      <div className="flex justify-between font-semibold">
                        <span>{oi.qty}x {oi.menu_items?.name}</span>
                      </div>
                      {oi.order_item_modifiers?.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-0.5">
                          {oi.order_item_modifiers.map((m: any, mi: number) => (
                            <span key={mi} className="text-xs bg-sun/40 text-ink rounded px-1.5 py-0.5 font-medium">
                              +{m.modifiers?.name || 'Extra'}
                            </span>
                          ))}
                        </div>
                      )}
                      {oi.note && <p className="text-xs text-chilli italic mt-0.5">Note: "{oi.note}"</p>}
                    </li>
                  ))}
                </ul>
              </article>
            )
          })}
        </section>
      )}

      {tab === 'bill' && (
        <section className="space-y-3 px-4 pt-4">
          {!orders.length && <p className="py-10 text-center text-ink/60">Your bill will show here after you order.</p>}
          {orders.length > 0 && (
            <div className="rounded-2xl bg-white p-4 ring-1 ring-ink/10">
              {orders.flatMap(o => o.order_items).map((oi: any, i: number) => (
                <div key={i} className="flex justify-between py-1 text-sm">
                  <span>{oi.qty} x {oi.menu_items.name}</span>
                  <span>{money(itemTotal(oi))}</span>
                </div>
              ))}
              <div className="mt-2 flex justify-between border-t border-ink/10 pt-2 text-lg font-extrabold">
                <span>Total</span>
                <span>{money(total)}</span>
              </div>
            </div>
          )}
          {orders.length > 0 && !closed && !bill && (
            <>
              <div className="rounded-2xl bg-white p-4 ring-1 ring-ink/10 space-y-2">
                <p className="font-bold">Choose a tip</p>
                <div className="grid grid-cols-4 gap-2">
                  {[0, 10, 15, 20].map(p => (
                    <button
                      key={p}
                      className={`rounded-lg px-2 py-2 text-sm font-bold ${tipPercent === p && !customTip ? 'bg-ink text-white' : 'bg-sage text-ink'}`}
                      onClick={() => { setTipPercent(p); setCustomTip('') }}
                    >
                      {p === 0 ? 'No tip' : `${p}%`}
                    </button>
                  ))}
                </div>
                <input
                  className="input"
                  type="number"
                  min="0"
                  step="1"
                  placeholder="Or enter custom tip amount"
                  value={customTip}
                  onChange={e => setCustomTip(e.target.value)}
                />
                <div className="flex justify-between text-sm"><span>Subtotal</span><span>{money(total)}</span></div>
                <div className="flex justify-between text-sm"><span>Tip</span><span>{money(Number(customTip) > 0 ? Number(customTip) : total * tipPercent / 100)}</span></div>
                <div className="flex justify-between border-t border-ink/10 pt-2 text-lg font-extrabold">
                  <span>Total</span>
                  <span>{money(total + (Number(customTip) > 0 ? Number(customTip) : total * tipPercent / 100))}</span>
                </div>
              </div>
              <button className="btn-main w-full" disabled={busy} onClick={getBill}>Get my bill</button>
            </>
          )}
          {orders.length > 0 && !closed && bill && (
            <div className="space-y-1 rounded-2xl bg-sun p-4">
              <div className="space-y-2 pb-2">
                <p className="font-bold">Choose a tip</p>
                <div className="grid grid-cols-4 gap-2">
                  {[0, 10, 15, 20].map(p => (
                    <button
                      key={p}
                      className={`rounded-lg px-2 py-2 text-sm font-bold ${tipPercent === p && !customTip ? 'bg-ink text-white' : 'bg-white text-ink'}`}
                      onClick={() => { setTipPercent(p); setCustomTip('') }}
                    >
                      {p === 0 ? 'No tip' : `${p}%`}
                    </button>
                  ))}
                </div>
                <input
                  className="input"
                  type="number"
                  min="0"
                  step="1"
                  placeholder="Or enter custom tip amount"
                  value={customTip}
                  onChange={e => setCustomTip(e.target.value)}
                />
                <div className="rounded-xl bg-white/70 p-3">
                  <div className="flex justify-between text-sm"><span>Subtotal</span><span>{money(total)}</span></div>
                  <div className="flex justify-between text-sm"><span>Tip</span><span>{money(Number(customTip) > 0 ? Number(customTip) : total * tipPercent / 100)}</span></div>
                  <div className="mt-1 flex justify-between border-t border-ink/10 pt-1 text-lg font-bold">
                    <span>Total to pay</span>
                    <span>{money(total + (Number(customTip) > 0 ? Number(customTip) : total * tipPercent / 100))}</span>
                  </div>
                </div>
              </div>
              <p className="text-lg font-bold">Pay {money(bill.total)}</p>
              {payLines.map(p => <p key={p}>{p}</p>)}
              <p className="pt-1 text-sm">Pay, then tell the staff. They will confirm your payment.</p>
              <button className="btn-alt mt-2 w-full" disabled={busy} onClick={getBill}>Update Bill & Tip</button>
            </div>
          )}
          {closed && (
            <div className="space-y-3 rounded-2xl bg-white p-4 ring-1 ring-ink/10">
              <h2 className="text-xl font-extrabold text-basil">Payment received. Thank you!</h2>
              {sess.feedback?.length ? (
                <div className="space-y-3">
                  <p className="font-semibold text-ink/80">Thanks for your valuable feedback!</p>
                  <button
                    className="btn-main w-full !bg-amber-600 hover:!bg-amber-700 text-white flex items-center justify-center gap-2"
                    onClick={() => setShowScratch(true)}
                  >
                    <span>🎁 View Your Scratch Gift</span>
                  </button>
                </div>
              ) : (
                <>
                  <p className="font-semibold text-ink">How was your visit? Rate us & unlock a surprise gift:</p>
                  <div className="flex gap-1 justify-center py-1">
                    {[1, 2, 3, 4, 5].map(n => (
                      <button
                        key={n}
                        aria-label={`${n} stars`}
                        onClick={() => setRating(n)}
                        className={`text-4xl transition-transform hover:scale-110 ${n <= rating ? 'text-sun' : 'text-ink/20'}`}
                      >
                        ★
                      </button>
                    ))}
                  </div>
                  <textarea
                    className="input"
                    rows={2}
                    placeholder="Tell us what you liked or how we can improve (optional)"
                    value={comment}
                    onChange={e => setComment(e.target.value)}
                  />
                  <button
                    className="btn-main w-full flex items-center justify-center gap-2"
                    disabled={!rating || busy}
                    onClick={sendFeedback}
                  >
                    <span>Send Feedback & Scratch Gift 🎁</span>
                  </button>
                </>
              )}
              <button className="btn-soft w-full" onClick={newOrder}>Start a new order</button>
            </div>
          )}
        </section>
      )}

      {tab === 'profile' && (
        <section className="space-y-4 px-4 pt-4">
          <div className="rounded-3xl bg-gradient-to-br from-ink to-ink/90 p-5 text-white shadow-lg">
            <div className="flex items-center gap-3">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-sun text-xl font-black text-ink">
                {(sess?.customer_name || 'Guest').trim().charAt(0).toUpperCase()}
              </div>
              <div>
                <p className="text-xs text-white/60">My Profile</p>
                <h2 className="text-xl font-black">{sess?.customer_name || 'Guest'}</h2>
                {sess?.phone && <p className="text-sm text-white/70">{sess.phone}</p>}
              </div>
            </div>
          </div>

          <div className="rounded-3xl bg-white p-4 ring-1 ring-ink/10">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-ink/40">7-Day Visit Reward</p>
                <h3 className="mt-1 text-lg font-black">
                  {loyaltyError ? 'Visit history unavailable' : loyalty?.completed ? 'Reward unlocked!' : `${loyalty?.visit_count ?? 0} of 7 visits complete`}
                </h3>
              </div>
              <span className="rounded-full bg-chilli/10 px-3 py-1.5 text-sm font-black text-chilli">20% OFF</span>
            </div>

            {!loyaltyError && <div className="mt-4 grid grid-cols-7 gap-1.5">
              {Array.from({ length: 7 }, (_, i) => {
                const visited = i < (loyalty?.visit_count ?? 0)
                return (
                  <div key={i} className="text-center">
                    <div className={`mx-auto flex h-9 w-9 items-center justify-center rounded-full border-2 text-sm font-black ${
                      visited ? 'border-basil bg-basil text-white' : 'border-ink/15 bg-ink/[0.03] text-ink/30'
                    }`}>
                      {visited ? '✓' : i + 1}
                    </div>
                    <p className="mt-1 text-[10px] text-ink/40">Day {i + 1}</p>
                  </div>
                )
              })}
            </div>}

            {!loyaltyError && loyalty?.completed && (
              <div className="mt-4 rounded-2xl border-2 border-dashed border-sun bg-sun/20 p-4 text-center">
                <p className="text-sm font-bold text-ink/70">Your 7-day reward</p>
                <p className="mt-1 text-2xl font-black text-chilli">20% OFF</p>
                <p className="mt-1 text-xs text-ink/60">Show this screen to the staff on your next visit.</p>
              </div>
            )}

            {!loyaltyError && loyalty?.visit_dates?.length > 0 && (
              <div className="mt-4 border-t border-ink/10 pt-3">
                <p className="mb-2 text-xs font-bold text-ink/50">Visit history</p>
                <div className="space-y-1.5">
                  {loyalty.visit_dates.map((date: string) => (
                    <div key={date} className="flex items-center justify-between rounded-lg bg-ink/[0.03] px-3 py-2 text-sm">
                      <span>Visit recorded</span>
                      <span className="font-bold text-basil">{new Date(date + 'T12:00:00').toLocaleDateString()}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </section>
      )}

      <nav className="fixed inset-x-0 bottom-0 z-20 mx-auto flex max-w-lg bg-white pb-[env(safe-area-inset-bottom)] ring-1 ring-ink/10">
        {(['menu', 'cart', 'orders', 'bill', 'profile'] as Tab[]).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 py-4 text-sm font-bold ${tab === t ? 'text-chilli' : 'text-ink/60'}`}
          >
            {t === 'orders' ? 'My orders' : t === 'profile' ? 'Profile' : t[0].toUpperCase() + t.slice(1)}
            {t === 'cart' && cartCount > 0 && (
              <span className="ml-1 rounded-full bg-chilli px-1.5 text-xs text-white">{cartCount}</span>
            )}
          </button>
        ))}
      </nav>

      {pick && (
        <div className="fixed inset-0 z-30 flex items-end bg-ink/50" onClick={() => setPick(null)}>
          <div className="mx-auto w-full max-w-lg space-y-3 rounded-t-3xl bg-white p-5" onClick={e => e.stopPropagation()}>
            <h2 className="text-xl font-extrabold">{pick.item.name}</h2>
            {pick.item.menu_item_modifiers.map(({ modifiers: m }) => {
              const on = pick.mods.some(x => x.id === m.id)
              return (
                <label key={m.id} className="flex items-center justify-between rounded-xl px-3 py-2 ring-1 ring-ink/15">
                  <span className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      className="h-5 w-5 accent-chilli"
                      checked={on}
                      onChange={() => setPick({ ...pick, mods: on ? pick.mods.filter(x => x.id !== m.id) : [...pick.mods, m] })}
                    />
                    {m.name}
                  </span>
                  <span className="text-sm">{m.price > 0 ? '+ ' + money(m.price) : 'Free'}</span>
                </label>
              )
            })}
            <input className="input" placeholder="Note (for example: no onions)" value={pick.note} onChange={e => setPick({ ...pick, note: e.target.value })} />
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <button aria-label="Remove one" className="h-9 w-9 rounded-full bg-ink/10" onClick={() => setPick({ ...pick, qty: Math.max(1, pick.qty - 1) })}>-</button>
                <span className="w-5 text-center">{pick.qty}</span>
                <button aria-label="Add one" className="h-9 w-9 rounded-full bg-ink text-white" onClick={() => setPick({ ...pick, qty: pick.qty + 1 })}>+</button>
              </div>
              <button className="btn-main flex-1" onClick={() => addLine(pick)}>Add · {money(lineTotal(pick))}</button>
            </div>
          </div>
        </div>
      )}

      {showScratch && <ScratchCard cafeName={cafe} onClose={() => setShowScratch(false)} />}
    </div>
  )
}
