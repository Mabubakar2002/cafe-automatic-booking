import { NextResponse } from 'next/server'
import { db } from '@/lib/supabase/server'
import { bad } from '@/lib/api'

export const dynamic = 'force-dynamic'

// Customer status poll: orders, waiting time, bell, bill and feedback for one visit.
export async function GET(req: Request) {
  const id = new URL(req.url).searchParams.get('id')
  if (!id) return bad('Missing session')

  const sb = db()
  const [sessionRes, queueRes] = await Promise.all([
    sb
      .from('table_sessions')
      .select(
        'id,closed_at,customer_name,phone,' +
          'orders(id,order_no,status,est_wait_min,eta_note,created_at,started_at,order_items(qty,unit_price,menu_items(name),order_item_modifiers(price,modifiers(name)))),' +
          'bell_calls(status),bills(subtotal,tip,total,status),feedback(id)'
      )
      .eq('id', id)
      .maybeSingle(),
    sb
      .from('orders')
      .select('id,order_no,status,created_at')
      .in('status', ['new', 'preparing'])
      .order('created_at'),
  ])

  if (!sessionRes.data) return NextResponse.json({ gone: true })

  const queue = (queueRes.data ?? []) as any[]
  const currentlyPreparing = queue.find(o => o.status === 'preparing') || queue[0] || null

  return NextResponse.json({
    ...sessionRes.data,
    kitchen_queue: {
      currently_preparing_no: currentlyPreparing ? currentlyPreparing.order_no : null,
      total_in_queue: queue.length,
    },
  })
}
