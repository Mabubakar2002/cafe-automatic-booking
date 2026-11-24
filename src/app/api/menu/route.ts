import { NextResponse } from 'next/server'
import { db } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export async function GET() {
  if (process.env.NODE_ENV === 'production' && (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY)) {
    console.error('Cafe menu unavailable: Supabase server environment variables are missing')
    return NextResponse.json({ error: 'Cafe menu is temporarily unavailable. Please contact staff.' }, { status: 503 })
  }

  const sb = db()
  const [cats, items] = await Promise.all([
    sb.from('categories').select('id,name').order('sort'),
    sb
      .from('menu_items')
      .select('id,category_id,name,description,price,image_url,is_available,menu_item_modifiers(modifiers(id,name,price))')
      .order('name'),
  ])
  if (cats.error || items.error) {
    console.error('Failed to load cafe menu', { categoriesError: cats.error, itemsError: items.error })
    return NextResponse.json({ error: 'Cafe menu is temporarily unavailable. Please contact staff.' }, { status: 503 })
  }
  return NextResponse.json({ categories: cats.data ?? [], items: items.data ?? [] })
}
