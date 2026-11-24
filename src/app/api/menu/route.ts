import { NextResponse } from 'next/server'
import { db } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export async function GET() {
  const sb = db()
  const [cats, items] = await Promise.all([
    sb.from('categories').select('id,name').order('sort'),
    sb
      .from('menu_items')
      .select('id,category_id,name,description,price,image_url,is_available,menu_item_modifiers(modifiers(id,name,price))')
      .order('name'),
  ])
  return NextResponse.json({ categories: cats.data ?? [], items: items.data ?? [] })
}
