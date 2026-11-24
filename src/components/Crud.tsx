'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase/client'

export type Col = {
  key: string
  label: string
  type?: 'text' | 'number' | 'bool' | 'select' | 'date'
  options?: { value: string; label: string }[]
  readonly?: boolean
}

function Field({ col, value, onCommit, live }: { col: Col; value: any; onCommit: (v: any) => void; live?: boolean }) {
  const cls = 'input !rounded-lg !py-1.5 min-w-24'
  if (col.readonly) return <span>{value}</span>
  if (col.type === 'bool')
    return <input type="checkbox" className="h-5 w-5 accent-chilli" checked={!!value} onChange={e => onCommit(e.target.checked)} />
  if (col.type === 'select')
    return (
      <select className={cls} value={value ?? ''} onChange={e => onCommit(e.target.value || null)}>
        <option value="">-</option>
        {col.options?.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    )
  const parse = (s: string) => (s === '' ? null : col.type === 'number' ? Number(s) : s)
  return (
    <input
      className={cls}
      type={col.type === 'number' ? 'number' : col.type === 'date' ? 'date' : 'text'}
      step="any"
      defaultValue={value ?? ''}
      onChange={live ? e => onCommit(parse(e.target.value)) : undefined}
      onBlur={live ? undefined : e => e.target.value !== String(value ?? '') && onCommit(parse(e.target.value))}
    />
  )
}

// Editable table for a Supabase table: edit a cell and leave it to save.
export default function Crud({
  table, cols, order, desc, init = {}, onChange,
}: {
  table: string
  cols: Col[]
  order?: string
  desc?: boolean
  init?: Record<string, any>
  onChange?: () => void
}) {
  const sb = supabase()
  const [rows, setRows] = useState<any[]>([])
  const [draft, setDraft] = useState<Record<string, any>>(init)
  const [n, setN] = useState(0)
  const [err, setErr] = useState('')

  const load = () => {
    let q: any = sb.from(table).select('*')
    if (order) q = q.order(order, { ascending: !desc })
    q.then((r: any) => setRows(r.data ?? []))
  }
  useEffect(() => {
    load()
    const t = setInterval(load, 20000)
    return () => clearInterval(t)
  }, [])

  const done = (error: { message: string } | null) => {
    if (error) return setErr(error.message)
    setErr('')
    load()
    onChange?.()
  }
  const save = async (id: string, key: string, v: any) => done((await sb.from(table).update({ [key]: v }).eq('id', id)).error)
  const add = async () => {
    const { error } = await sb.from(table).insert(draft)
    if (!error) {
      setDraft(init)
      setN(n + 1)
    }
    done(error)
  }
  const del = async (id: string) => confirm('Delete this row?') && done((await sb.from(table).delete().eq('id', id)).error)

  return (
    <div className="overflow-x-auto rounded-2xl bg-white ring-1 ring-ink/10">
      <table className="w-full text-left text-sm">
        <thead className="bg-ink/5">
          <tr>
            {cols.map(c => <th key={c.key} className="px-3 py-2">{c.label}</th>)}
            <th />
          </tr>
        </thead>
        <tbody>
          {rows.map(r => (
            <tr key={r.id} className="border-t border-ink/10">
              {cols.map(c => (
                <td key={c.key} className="px-3 py-1.5">
                  <Field key={`${r.id}-${c.key}-${r[c.key]}`} col={c} value={r[c.key]} onCommit={v => save(r.id, c.key, v)} />
                </td>
              ))}
              <td className="px-3"><button className="text-chilli" onClick={() => del(r.id)}>Delete</button></td>
            </tr>
          ))}
          <tr className="border-t-2 border-ink/20 bg-sun/20">
            {cols.map(c => (
              <td key={c.key} className="px-3 py-1.5">
                {!c.readonly && (
                  <Field key={n + c.key} col={c} value={draft[c.key]} live onCommit={v => setDraft(d => ({ ...d, [c.key]: v }))} />
                )}
              </td>
            ))}
            <td className="px-3"><button className="btn-main !py-1" onClick={add}>Add</button></td>
          </tr>
        </tbody>
      </table>
      {err && <p className="px-3 py-2 text-chilli" role="alert">{err}</p>}
    </div>
  )
}
