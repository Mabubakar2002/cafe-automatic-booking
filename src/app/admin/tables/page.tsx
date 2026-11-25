'use client'
import { useEffect, useState } from 'react'
import QRCode from 'qrcode'
import Crud from '@/components/Crud'
import { supabase } from '@/lib/supabase/client'

const cafe = process.env.NEXT_PUBLIC_CAFE_NAME || 'Cafe'

type TableStatus = { number: number; booked: boolean }

export default function Tables() {
  const sb = supabase()
  const [cards, setCards] = useState<{ number: number; url: string; qr: string; booked: boolean }[]>([])
  const [busy, setBusy] = useState<string | null>(null)

  const load = async () => {
    const { data: tables } = await sb.from('cafe_tables').select('number').order('number')
    const status = await fetch('/api/table-status').then(r => r.json()).then(j => j.tables as TableStatus[] ?? [])
    const base = process.env.NEXT_PUBLIC_SITE_URL || location.origin
    setCards(
      await Promise.all(
        (tables ?? []).map(async (t: any) => {
          const st = status.find((s: TableStatus) => s.number === t.number)
          const url = `${base}/t/${t.number}`
          return {
            number: t.number,
            url,
            qr: await QRCode.toDataURL(url, { width: 260, margin: 1, color: { dark: '#1D1B2E', light: '#FFFFFF' } }),
            booked: !!st?.booked,
          }
        })
      )
    )
  }
  useEffect(() => { load() }, [])

  async function release(table: number) {
    setBusy(String(table))
    const r = await fetch('/api/table-release', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ table }),
    })
    const j = await r.json()
    if (!r.ok) {
      setBusy(null)
      alert(j.error || 'Could not release table')
      return
    }
    load()
    setBusy(null)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between print:hidden">
        <h1 className="text-3xl font-extrabold">Tables & QR codes</h1>
        <button className="btn-alt" onClick={() => window.print()}>Print QR codes</button>
      </div>
      <div className="print:hidden">
        <Crud table="cafe_tables" order="number" onChange={load} cols={[{ key: 'number', label: 'Table number', type: 'number' }]} />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 print:grid-cols-3">
        {cards.map(c => (
          <div key={c.number} className={`break-inside-avoid rounded-2xl p-4 text-center ring-1 ${
            c.booked ? 'bg-chilli/[0.08] ring-chilli/30' : 'bg-white ring-ink/10'
          }`}>
            <p className="font-display text-lg font-extrabold">{cafe}</p>
            <img src={c.qr} alt={`QR code for table ${c.number}`} className="mx-auto" />
            <p className={`text-2xl font-extrabold ${c.booked ? 'text-chilli' : 'text-ink'}`}>Table {c.number}</p>
            <p className={`text-sm font-bold ${c.booked ? 'text-chilli' : 'text-basil'}`}>
              {c.booked ? '🔴 Booked' : '🟢 Available'}
            </p>
            {c.booked && (
              <button
                key={c.number}
                className="mt-3 w-full py-1.5 text-xs font-bold bg-white/60 text-chilli rounded-lg hover:bg-white/80 transition disabled:opacity-50"
                disabled={busy === String(c.number)}
                onClick={() => release(c.number)}
              >
                {busy === String(c.number) ? 'Releasing…' : 'Release Table'}
              </button>
            )}
            {!c.booked && (
              <p className="mt-2 text-xs text-ink/40">Scan to see the menu and order</p>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
