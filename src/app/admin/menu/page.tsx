'use client'
import Crud from '@/components/Crud'
import { useLive } from '@/lib/live'
import { supabase } from '@/lib/supabase/client'

const pair = (r: { data: any[] | null }) => (r.data ?? []).map(x => ({ value: x.id as string, label: x.name as string }))

export default function MenuPage() {
  const sb = supabase()
  const [o, reload] = useLive(
    [],
    async () => {
      const [c, i, g, m] = await Promise.all([
        sb.from('categories').select('id,name').order('sort'),
        sb.from('menu_items').select('id,name').order('name'),
        sb.from('ingredients').select('id,name').order('name'),
        sb.from('modifiers').select('id,name').order('name'),
      ])
      return { c: pair(c), i: pair(i), g: pair(g), m: pair(m) }
    },
    { c: [] as any[], i: [] as any[], g: [] as any[], m: [] as any[] }
  )

  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-extrabold">Menu</h1>

      <section className="space-y-2">
        <h2 className="text-xl font-bold">Categories</h2>
        <Crud table="categories" order="sort" onChange={reload} cols={[
          { key: 'name', label: 'Name' },
          { key: 'sort', label: 'Position', type: 'number' },
        ]} />
      </section>

      <section className="space-y-2">
        <h2 className="text-xl font-bold">Items</h2>
        <p className="text-sm text-ink/60">Paste a photo link in Image URL. Untick Available to hide an item from customers.</p>
        <Crud table="menu_items" order="name" init={{ is_available: true }} onChange={reload} cols={[
          { key: 'name', label: 'Name' },
          { key: 'category_id', label: 'Category', type: 'select', options: o.c },
          { key: 'price', label: 'Price', type: 'number' },
          { key: 'description', label: 'Description' },
          { key: 'image_url', label: 'Image URL' },
          { key: 'is_available', label: 'Available', type: 'bool' },
        ]} />
      </section>

      <section className="space-y-2">
        <h2 className="text-xl font-bold">Add-ons</h2>
        <p className="text-sm text-ink/60">Extra cheese, sauces, toppings. Link an ingredient so the kitchen form includes its amount.</p>
        <Crud table="modifiers" order="name" onChange={reload} cols={[
          { key: 'name', label: 'Name' },
          { key: 'price', label: 'Extra price', type: 'number' },
          { key: 'ingredient_id', label: 'Ingredient', type: 'select', options: o.g },
          { key: 'ingredient_qty', label: 'Amount used', type: 'number' },
        ]} />
      </section>

      <section className="space-y-2">
        <h2 className="text-xl font-bold">Add-ons for each item</h2>
        <Crud table="menu_item_modifiers" cols={[
          { key: 'menu_item_id', label: 'Item', type: 'select', options: o.i },
          { key: 'modifier_id', label: 'Add-on', type: 'select', options: o.m },
        ]} />
      </section>

      <section className="space-y-2">
        <h2 className="text-xl font-bold">Recipes</h2>
        <p className="text-sm text-ink/60">What one serving uses. Add the ingredients on the Stock page first.</p>
        <Crud table="recipes" cols={[
          { key: 'menu_item_id', label: 'Item', type: 'select', options: o.i },
          { key: 'ingredient_id', label: 'Ingredient', type: 'select', options: o.g },
          { key: 'qty', label: 'Amount per serving', type: 'number' },
        ]} />
      </section>
    </div>
  )
}
