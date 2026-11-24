'use client'
import { useEffect, useState } from 'react'
import QRCode from 'qrcode'
import Crud from '@/components/Crud'
import { supabase } from '@/lib/supabase/client'

const cafe = process.env.NEXT_PUBLIC_CAFE_NAME || 'Cafe'

export default function Tables() {
  const sb = supabase()
  const [cards, setCards] = useState<{ number: number; url: string; qr: string }[]>([])

  const load = async () => {
    const { data } = await sb.from('cafe_tables').select('number').order('number')
    const base = process.env.NEXT_PUBLIC_SITE_URL || location.origin
    setCards(
      await Promise.all(
        (data ?? []).map(async (t: any) => {
          const url = `${base}/t/${t.number}`
          return { number: t.number, url, qr: await QRCode.toDataURL(url, { width: 260, margin: 1, color: { dark: '#1D1B2E', light: '#FFFFFF' } }) }
        })
      )
    )
  }
  useEffect(() => { load() }, [])

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
          <div key={c.number} className="break-inside-avoid rounded-2xl bg-white p-4 text-center ring-1 ring-ink/10">
            <p className="font-display text-lg font-extrabold">{cafe}</p>
            <img src={c.qr} alt={`QR code for table ${c.number}`} className="mx-auto" />
            <p className="text-2xl font-extrabold">Table {c.number}</p>
            <p className="text-sm text-ink/60">Scan to see the menu and order</p>
          </div>
        ))}
      </div>
    </div>
  )
}
