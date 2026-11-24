'use client'
import { useEffect, useState } from 'react'
import Crud from '@/components/Crud'
import { supabase } from '@/lib/supabase/client'

export default function Stock() {
  const sb = supabase()
  const [k, setK] = useState(0)
  const [ing, setIng] = useState<any[]>([])
  const [moves, setMoves] = useState<any[]>([])
  const [mv, setMv] = useState({ ingredient_id: '', qty: '', reason: 'purchase' })
  const [err, setErr] = useState('')

  const load = () => {
    sb.from('ingredients').select('id,name,unit').order('name').then((r: any) => setIng(r.data ?? []))
    sb.from('stock_movements').select('qty,reason,created_at,ingredients(name,unit)').order('created_at', { ascending: false }).limit(15).then((r: any) => setMoves(r.data ?? []))
  }
  useEffect(load, [])

  async function addMove() {
    const q = Number(mv.qty)
    if (!mv.ingredient_id || !q) return setErr('Pick an ingredient and enter an amount.')
    const { error } = await sb.from('stock_movements').insert({
      ingredient_id: mv.ingredient_id,
      qty: mv.reason === 'adjust' ? q : Math.abs(q),
      reason: mv.reason,
    })
    if (error) return setErr(error.message)
    setErr('')
    setMv({ ...mv, qty: '' })
    setK(k + 1)
    load()
  }

  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-extrabold">Stock</h1>

      <section className="space-y-2">
        <h2 className="text-xl font-bold">Ingredients</h2>
        <p className="text-sm text-ink/60">Stock goes down by itself when the kitchen taps Done. Use the form below to add new stock.</p>
        <Crud key={k} table="ingredients" order="name" onChange={load} cols={[
          { key: 'name', label: 'Name' },
          { key: 'unit', label: 'Unit (pcs, g, ml)' },
          { key: 'stock', label: 'In stock', readonly: true },
          { key: 'low_stock_level', label: 'Warn me at', type: 'number' },
        ]} />
      </section>

      <section className="space-y-2">
        <h2 className="text-xl font-bold">Add stock</h2>
        <div className="flex flex-wrap gap-2 rounded-2xl bg-white p-4 ring-1 ring-ink/10">
          <select className="input !w-auto" value={mv.ingredient_id} onChange={e => setMv({ ...mv, ingredient_id: e.target.value })}>
            <option value="">Ingredient</option>
            {ing.map(i => <option key={i.id} value={i.id}>{i.name} ({i.unit})</option>)}
          </select>
          <input className="input !w-32" type="number" step="any" placeholder="Amount" value={mv.qty} onChange={e => setMv({ ...mv, qty: e.target.value })} />
          <select className="input !w-auto" value={mv.reason} onChange={e => setMv({ ...mv, reason: e.target.value })}>
            <option value="purchase">New purchase</option>
            <option value="adjust">Correction (+ or -)</option>
          </select>
          <button className="btn-main" onClick={addMove}>Save</button>
          {err && <p className="w-full text-chilli">{err}</p>}
        </div>
      </section>

      <section className="space-y-2">
        <h2 className="text-xl font-bold">Recent movements</h2>
        <ul className="rounded-2xl bg-white p-4 text-sm ring-1 ring-ink/10">
          {moves.map((m, i) => (
            <li key={i} className="flex justify-between py-0.5">
              <span>{m.ingredients?.name} <span className="text-ink/60">({m.reason})</span></span>
              <span className={m.qty < 0 ? 'text-chilli' : 'text-basil'}>{m.qty > 0 ? '+' : ''}{m.qty} {m.ingredients?.unit}</span>
            </li>
          ))}
          {!moves.length && <li className="text-ink/60">Nothing yet.</li>}
        </ul>
      </section>
    </div>
  )
}
