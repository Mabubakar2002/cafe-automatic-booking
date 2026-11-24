const TZ = 'Asia/Karachi'

export const money = (n: number) => 'Rs ' + Math.round(n).toLocaleString('en-PK')

export const today = () => new Date().toLocaleDateString('en-CA', { timeZone: TZ })
export const daysAgo = (n: number) => new Date(Date.now() - n * 864e5).toLocaleDateString('en-CA', { timeZone: TZ })

// 0300 1234567 -> 923001234567 (digits only, country code first)
export function normalizePhone(raw: string) {
  const digits = raw.replace(/\D/g, '')
  const full = digits.startsWith('0') ? (process.env.DEFAULT_COUNTRY_CODE || '92') + digits.slice(1) : digits
  return /^\d{10,15}$/.test(full) ? full : null
}

export const itemTotal = (oi: any) =>
  (oi.unit_price + (oi.order_item_modifiers ?? []).reduce((s: number, m: any) => s + m.price, 0)) * oi.qty

export function beep() {
  try {
    const ctx = new AudioContext()
    const osc = ctx.createOscillator()
    osc.connect(ctx.destination)
    osc.frequency.value = 880
    osc.start()
    osc.stop(ctx.currentTime + 0.25)
  } catch {}
}

export function downloadCsv(name: string, rows: Record<string, any>[]) {
  if (!rows.length) return
  const keys = Object.keys(rows[0])
  const body = [keys.join(','), ...rows.map(r => keys.map(k => JSON.stringify(r[k] ?? '')).join(','))].join('\n')
  const a = document.createElement('a')
  a.href = URL.createObjectURL(new Blob([body], { type: 'text/csv' }))
  a.download = name + '.csv'
  a.click()
}
