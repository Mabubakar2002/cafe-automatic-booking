import fs from 'fs'
import path from 'path'
import { randomUUID } from 'crypto'

export interface LocalDbData {
  cafe_tables: any[]
  categories: any[]
  menu_items: any[]
  ingredients: any[]
  recipes: any[]
  modifiers: any[]
  menu_item_modifiers: any[]
  table_sessions: any[]
  orders: any[]
  order_items: any[]
  order_item_modifiers: any[]
  order_usage: any[]
  stock_movements: any[]
  bell_calls: any[]
  bills: any[]
  feedback: any[]
  expenses: any[]
  staff: any[]
  staff_activity: any[]
  customer_loyalty: any[]
}

const DB_PATH = path.join(process.cwd(), 'data', 'cafe-data.json')

function getInitialData(): LocalDbData {
  // Pre-seed tables 1 to 10
  const cafe_tables = Array.from({ length: 10 }, (_, i) => ({
    id: `table-id-${i + 1}`,
    number: i + 1,
  }))

  const catHotCoffee = { id: 'cat-1', name: 'Hot Coffee & Teas', sort: 1 }
  const catColdDrinks = { id: 'cat-2', name: 'Cold Beverages & Frappes', sort: 2 }
  const catBurgers = { id: 'cat-3', name: 'Burgers & Sandwiches', sort: 3 }
  const catSnacks = { id: 'cat-4', name: 'Snacks & Appetizers', sort: 4 }
  const catDesserts = { id: 'cat-5', name: 'Desserts & Bakery', sort: 5 }
  const catDeals = { id: 'cat-6', name: 'Offers & Deals', sort: 6 }
  const categories = [catHotCoffee, catColdDrinks, catBurgers, catSnacks, catDesserts, catDeals]

  // Ingredients for stock management
  const ingCoffee = { id: 'ing-1', name: 'Coffee Beans', unit: 'g', stock: 10000, low_stock_level: 800 }
  const ingMilk = { id: 'ing-2', name: 'Fresh Milk', unit: 'ml', stock: 25000, low_stock_level: 2000 }
  const ingSugar = { id: 'ing-3', name: 'Sugar', unit: 'g', stock: 5000, low_stock_level: 500 }
  const ingBuns = { id: 'ing-4', name: 'Burger Buns', unit: 'pcs', stock: 80, low_stock_level: 15 }
  const ingChicken = { id: 'ing-5', name: 'Chicken Patty / Fillet', unit: 'pcs', stock: 60, low_stock_level: 15 }
  const ingBeef = { id: 'ing-6', name: 'Beef Mince / Patty', unit: 'pcs', stock: 50, low_stock_level: 10 }
  const ingCheese = { id: 'ing-7', name: 'Cheese Slices', unit: 'pcs', stock: 100, low_stock_level: 20 }
  const ingFries = { id: 'ing-8', name: 'Potato Fries', unit: 'g', stock: 15000, low_stock_level: 2000 }
  const ingChocolate = { id: 'ing-9', name: 'Belgian Chocolate', unit: 'g', stock: 5000, low_stock_level: 600 }
  const ingredients = [ingCoffee, ingMilk, ingSugar, ingBuns, ingChicken, ingBeef, ingCheese, ingFries, ingChocolate]

  // Add-ons / Modifiers
  const modCheese = { id: 'mod-1', name: 'Extra Cheddar Cheese', price: 90, ingredient_id: ingCheese.id, ingredient_qty: 1 }
  const modShot = { id: 'mod-2', name: 'Extra Espresso Shot', price: 120, ingredient_id: ingCoffee.id, ingredient_qty: 18 }
  const modCaramel = { id: 'mod-3', name: 'Caramel Drizzle', price: 80, ingredient_id: null, ingredient_qty: 0 }
  const modIceCream = { id: 'mod-4', name: 'Vanilla Ice Cream Scoop', price: 110, ingredient_id: null, ingredient_qty: 0 }
  const modifiers = [modCheese, modShot, modCaramel, modIceCream]

  // Menu items with photos
  const menu_items = [
    // Hot Coffees
    {
      id: 'item-1',
      category_id: catHotCoffee.id,
      name: 'Artisan Espresso',
      description: 'Rich, bold, and intense concentrated double shot of Italian roast.',
      price: 260,
      image_url: 'https://images.unsplash.com/photo-1510591509098-f4fdc6d0ff04?w=600&q=80',
      is_available: true,
    },
    {
      id: 'item-2',
      category_id: catHotCoffee.id,
      name: 'Creamy Cappuccino',
      description: 'Equal parts espresso, silky steamed milk, and velvety foam with cocoa.',
      price: 380,
      image_url: 'https://images.unsplash.com/photo-1534778101976-62847782c213?w=600&q=80',
      is_available: true,
    },
    {
      id: 'item-3',
      category_id: catHotCoffee.id,
      name: 'Caramel Macchiato',
      description: 'Steamed milk stained with espresso, vanilla syrup and buttery caramel sauce.',
      price: 440,
      image_url: 'https://images.unsplash.com/photo-1485808191679-5f86510681a2?w=600&q=80',
      is_available: true,
    },
    {
      id: 'item-4',
      category_id: catHotCoffee.id,
      name: 'Spanish Latte',
      description: 'Velvety condensed milk blended with double espresso and micro-foam.',
      price: 460,
      image_url: 'https://images.unsplash.com/photo-1541167760496-1628856ab772?w=600&q=80',
      is_available: true,
    },
    {
      id: 'item-5',
      category_id: catHotCoffee.id,
      name: 'Belgian Hot Chocolate',
      description: 'Rich dark Belgian melted chocolate folded with creamy whole milk.',
      price: 420,
      image_url: 'https://images.unsplash.com/photo-1542990253-0d0f5be5f0ed?w=600&q=80',
      is_available: true,
    },

    // Cold Beverages
    {
      id: 'item-6',
      category_id: catColdDrinks.id,
      name: 'Iced Vanilla Latte',
      description: 'Cold espresso over iced milk with a touch of Madagascar vanilla.',
      price: 470,
      image_url: 'https://images.unsplash.com/photo-1517701550927-30cf4ba1dba5?w=600&q=80',
      is_available: true,
    },
    {
      id: 'item-7',
      category_id: catColdDrinks.id,
      name: 'Chocolate Mocha Frappe',
      description: 'Thick blended iced espresso with dark chocolate chips & whipped cream.',
      price: 520,
      image_url: 'https://images.unsplash.com/photo-1572490122747-3968b75cc699?w=600&q=80',
      is_available: true,
    },
    {
      id: 'item-8',
      category_id: catColdDrinks.id,
      name: 'Peach Iced Tea',
      description: 'Chilled freshly brewed black tea with juicy peach extract and lemon slices.',
      price: 360,
      image_url: 'https://images.unsplash.com/photo-1556679343-c7306c1976bc?w=600&q=80',
      is_available: true,
    },
    {
      id: 'item-9',
      category_id: catColdDrinks.id,
      name: 'Mint Lemonade Fizz',
      description: 'Crushed garden mint, freshly squeezed lemons, and bubbly sparkling soda.',
      price: 340,
      image_url: 'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?w=600&q=80',
      is_available: true,
    },

    // Burgers & Sandwiches
    {
      id: 'item-10',
      category_id: catBurgers.id,
      name: 'Crispy Zinger Burger',
      description: 'Hand-breaded crunchy chicken fillet, fiery garlic mayo, iceberg lettuce.',
      price: 590,
      image_url: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=600&q=80',
      is_available: true,
    },
    {
      id: 'item-11',
      category_id: catBurgers.id,
      name: 'Smash Beef Cheeseburger',
      description: 'Twin beef smashed patties, melted cheddar, caramelized onions, brioche bun.',
      price: 680,
      image_url: 'https://images.unsplash.com/photo-1550547660-d9450f859349?w=600&q=80',
      is_available: true,
    },
    {
      id: 'item-12',
      category_id: catBurgers.id,
      name: 'Artisan Club Sandwich',
      description: '3-layer toasted bread with shredded chicken, fried egg, cheese & herb mayo.',
      price: 520,
      image_url: 'https://images.unsplash.com/photo-1528735602780-2552fd46c7af?w=600&q=80',
      is_available: true,
    },

    // Snacks & Appetizers
    {
      id: 'item-13',
      category_id: catSnacks.id,
      name: 'Loaded Cheesy Fries',
      description: 'Crispy golden fries smothered with cheddar cheese sauce & jalapenos.',
      price: 430,
      image_url: 'https://images.unsplash.com/photo-1585109649139-366815a0d713?w=600&q=80',
      is_available: true,
    },
    {
      id: 'item-14',
      category_id: catSnacks.id,
      name: 'Crispy Honey BBQ Wings',
      description: '6 pieces of golden wings tossed in smoky honey barbecue sauce.',
      price: 540,
      image_url: 'https://images.unsplash.com/photo-1567620832903-9fc6debc209f?w=600&q=80',
      is_available: true,
    },

    // Desserts
    {
      id: 'item-15',
      category_id: catDesserts.id,
      name: 'Sizzling Molten Lava',
      description: 'Warm chocolate cake with flowing molten center served with vanilla scoop.',
      price: 490,
      image_url: 'https://images.unsplash.com/photo-1606313564200-e75d5e30476c?w=600&q=80',
      is_available: true,
    },
    {
      id: 'item-16',
      category_id: catDesserts.id,
      name: 'Lotus Biscoff Cheesecake',
      description: 'Creamy New York cheesecake smothered in rich caramelized Lotus spread.',
      price: 550,
      image_url: 'https://images.unsplash.com/photo-1533134242443-d4fd215305ad?w=600&q=80',
      is_available: true,
    },
    {
      id: 'item-17',
      category_id: catDesserts.id,
      name: 'Fudge Brownie with Ice Cream',
      description: 'Warm chocolate fudge brownie loaded with walnuts and dark chocolate fudge.',
      price: 380,
      image_url: 'https://images.unsplash.com/photo-1624353365286-3f8d62daad51?w=600&q=80',
      is_available: true,
    },

    // Offers & Deals
    {
      id: 'item-18',
      category_id: catDeals.id,
      name: 'Zinger Burger Combo',
      description: 'Crispy zinger burger with loaded fries and a chilled soft drink.',
      price: 790,
      image_url: 'https://images.unsplash.com/photo-1594212699903-ec8a3eca50f5?w=600&q=80',
      is_available: true,
    },
    {
      id: 'item-19',
      category_id: catDeals.id,
      name: 'Family Burger Feast',
      description: 'Two beef burgers, two crispy fries and two soft drinks.',
      price: 1490,
      image_url: 'https://images.unsplash.com/photo-1571091718767-18b5b1457add?w=600&q=80',
      is_available: true,
    },
    {
      id: 'item-20',
      category_id: catDeals.id,
      name: 'Coffee & Dessert Deal',
      description: 'Any signature latte paired with a Lotus cheesecake or brownie.',
      price: 850,
      image_url: 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=600&q=80',
      is_available: true,
    },
  ]

  // Link modifiers to items
  const menu_item_modifiers = [
    { id: 'mim-1', menu_item_id: 'item-1', modifier_id: modShot.id },
    { id: 'mim-2', menu_item_id: 'item-2', modifier_id: modShot.id },
    { id: 'mim-3', menu_item_id: 'item-2', modifier_id: modCaramel.id },
    { id: 'mim-4', menu_item_id: 'item-3', modifier_id: modShot.id },
    { id: 'mim-5', menu_item_id: 'item-6', modifier_id: modShot.id },
    { id: 'mim-6', menu_item_id: 'item-6', modifier_id: modCaramel.id },
    { id: 'mim-7', menu_item_id: 'item-10', modifier_id: modCheese.id },
    { id: 'mim-8', menu_item_id: 'item-11', modifier_id: modCheese.id },
    { id: 'mim-9', menu_item_id: 'item-13', modifier_id: modCheese.id },
    { id: 'mim-10', menu_item_id: 'item-15', modifier_id: modIceCream.id },
    { id: 'mim-11', menu_item_id: 'item-17', modifier_id: modIceCream.id },
  ]

  // Recipes
  const recipes = [
    { id: 'rec-1', menu_item_id: 'item-1', ingredient_id: ingCoffee.id, qty: 18 },
    { id: 'rec-2', menu_item_id: 'item-2', ingredient_id: ingCoffee.id, qty: 18 },
    { id: 'rec-3', menu_item_id: 'item-2', ingredient_id: ingMilk.id, qty: 150 },
    { id: 'rec-4', menu_item_id: 'item-6', ingredient_id: ingCoffee.id, qty: 18 },
    { id: 'rec-5', menu_item_id: 'item-6', ingredient_id: ingMilk.id, qty: 200 },
    { id: 'rec-6', menu_item_id: 'item-10', ingredient_id: ingBuns.id, qty: 1 },
    { id: 'rec-7', menu_item_id: 'item-10', ingredient_id: ingChicken.id, qty: 1 },
    { id: 'rec-8', menu_item_id: 'item-11', ingredient_id: ingBuns.id, qty: 1 },
    { id: 'rec-9', menu_item_id: 'item-11', ingredient_id: ingBeef.id, qty: 1 },
    { id: 'rec-10', menu_item_id: 'item-13', ingredient_id: ingFries.id, qty: 250 },
    { id: 'rec-11', menu_item_id: 'item-13', ingredient_id: ingCheese.id, qty: 2 },
  ]

  const staff = [
    { user_id: 'admin-user-id', email: 'admin@example.com', password: 'admin123', role: 'admin' },
    { user_id: 'chef-user-id', email: 'chef@example.com', password: 'chef123', role: 'kitchen' },
  ]

  return {
    cafe_tables,
    categories,
    menu_items,
    ingredients,
    recipes,
    modifiers,
    menu_item_modifiers,
    table_sessions: [],
    orders: [],
    order_items: [],
    order_item_modifiers: [],
    order_usage: [],
    stock_movements: [],
    bell_calls: [],
    bills: [],
    feedback: [],
    expenses: [
      { id: 'exp-1', category: 'Groceries', title: 'Milk and Coffee Beans Restock', amount: 5500, spent_on: new Date().toISOString().split('T')[0] }
    ],
    staff,
    staff_activity: [],
    customer_loyalty: [],
  }
}

// In-memory cache
let memDb: LocalDbData | null = null
let orderCounter = 100

function ensureOffersAndDeals(db: LocalDbData) {
  let deals = db.categories.find(c => c.name === 'Offers & Deals')
  if (!deals) {
    deals = { id: 'cat-6', name: 'Offers & Deals', sort: 6 }
    db.categories.push(deals)
  }

  const dealItems = [
    {
      id: 'item-18',
      category_id: deals.id,
      name: 'Zinger Burger Combo',
      description: 'Crispy zinger burger with loaded fries and a chilled soft drink.',
      price: 790,
      image_url: 'https://images.unsplash.com/photo-1594212699903-ec8a3eca50f5?w=600&q=80',
      is_available: true,
    },
    {
      id: 'item-19',
      category_id: deals.id,
      name: 'Family Burger Feast',
      description: 'Two beef burgers, two crispy fries and two soft drinks.',
      price: 1490,
      image_url: 'https://images.unsplash.com/photo-1571091718767-18b5b1457add?w=600&q=80',
      is_available: true,
    },
    {
      id: 'item-20',
      category_id: deals.id,
      name: 'Coffee & Dessert Deal',
      description: 'Any signature latte paired with a Lotus cheesecake or brownie.',
      price: 850,
      image_url: 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=600&q=80',
      is_available: true,
    },
  ]

  for (const item of dealItems) {
    if (!db.menu_items.some(existing => existing.id === item.id)) db.menu_items.push(item)
  }
}

function loadDb(): LocalDbData {
  if (memDb) return memDb
  try {
    if (fs.existsSync(DB_PATH)) {
      const raw = fs.readFileSync(DB_PATH, 'utf-8')
      memDb = JSON.parse(raw)
      if (!memDb?.staff_activity) memDb!.staff_activity = []
      if (!memDb?.customer_loyalty) memDb!.customer_loyalty = []
      ensureOffersAndDeals(memDb!)
      saveDb()
      const maxOrder = memDb?.orders?.reduce((m, o) => Math.max(m, o.order_no || 0), 100) || 100
      orderCounter = maxOrder
      return memDb!
    }
  } catch (e) {
    console.error('Error reading local db, initializing defaults', e)
  }
  memDb = getInitialData()
  saveDb()
  return memDb
}

function saveDb() {
  if (!memDb) return
  try {
    const dir = path.dirname(DB_PATH)
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
    fs.writeFileSync(DB_PATH, JSON.stringify(memDb, null, 2), 'utf-8')
  } catch (e) {
    console.error('Error writing local db', e)
  }
}

export const localDb = {
  get: () => loadDb(),
  save: () => saveDb(),
  recordActivity(db: LocalDbData, actor: { id: string; email: string; role: string }, action: string, table: string, recordId: string | undefined, details: any) {
    if (!db.staff_activity) db.staff_activity = []
    db.staff_activity.unshift({
      id: randomUUID(),
      actor_id: actor.id,
      actor_email: actor.email,
      actor_role: actor.role,
      action,
      table_name: table,
      record_id: recordId ?? null,
      details: JSON.stringify(details ?? {}),
      created_at: new Date().toISOString(),
    })
  },

  // Generic query runner
  query(table: string, options: {
    filters?: Array<{ col: string; op: string; val: any }>
    order?: { col: string; ascending: boolean }
    limit?: number
    single?: boolean
    maybeSingle?: boolean
    count?: 'exact' | null
    head?: boolean
  }) {
    const db = loadDb()
    let list: any[] = []

    // Check views
    if (table === 'order_expected_usage') {
      list = localDb.getOrderExpectedUsage()
    } else if (table === 'daily_report') {
      list = localDb.getDailyReport()
    } else if (table === 'monthly_report') {
      list = localDb.getMonthlyReport()
    } else if (table === 'top_items') {
      list = localDb.getTopItems()
    } else if (table === 'usage_report') {
      list = localDb.getUsageReport()
    } else {
      list = (db as any)[table] ?? []
    }

    // Apply filters
    if (options.filters) {
      list = list.filter(row => {
        return options.filters!.every(f => {
          const val = row[f.col]
          if (f.op === 'eq') return val == f.val
          if (f.op === 'neq') return val != f.val
          if (f.op === 'gt') return Number(val) > Number(f.val)
          if (f.op === 'gte') {
            if (typeof val === 'string' && typeof f.val === 'string') return val >= f.val
            return Number(val) >= Number(f.val)
          }
          if (f.op === 'lt') return Number(val) < Number(f.val)
          if (f.op === 'lte') return Number(val) <= Number(f.val)
          if (f.op === 'in') return Array.isArray(f.val) && f.val.includes(val)
          if (f.op === 'is') {
            if (f.val === null) return val === null || val === undefined
            return val === f.val
          }
          return true
        })
      })
    }

    const totalCount = list.length

    // Sort
    if (options.order) {
      const { col, ascending } = options.order
      list = [...list].sort((a, b) => {
        const va = a[col]
        const vb = b[col]
        if (va == null) return ascending ? -1 : 1
        if (vb == null) return ascending ? 1 : -1
        if (va < vb) return ascending ? -1 : 1
        if (va > vb) return ascending ? 1 : -1
        return 0
      })
    }

    // Limit
    if (options.limit && options.limit > 0) {
      list = list.slice(0, options.limit)
    }

    if (options.head) {
      return { data: null, count: totalCount, error: null }
    }

    // Hydrate relations
    list = list.map(item => localDb.hydrate(table, item))

    if (options.single) {
      const item = list[0] ?? null
      return { data: item, count: totalCount, error: item ? null : { message: 'Row not found', code: 'PGRST116' } }
    }
    if (options.maybeSingle) {
      return { data: list[0] ?? null, count: totalCount, error: null }
    }

    return { data: list, count: totalCount, error: null }
  },

  hydrate(table: string, row: any) {
    if (!row) return row
    const db = loadDb()
    const item = { ...row }

    if (table === 'menu_items') {
      const mims = db.menu_item_modifiers.filter(m => m.menu_item_id === item.id)
      item.menu_item_modifiers = mims.map(mim => {
        const mod = db.modifiers.find(m => m.id === mim.modifier_id)
        return { modifiers: mod || { id: mim.modifier_id, name: '', price: 0 } }
      })
    } else if (table === 'orders') {
      const sess = db.table_sessions.find(s => s.id === item.session_id)
      if (sess) {
        const tbl = db.cafe_tables.find(t => t.id === sess.table_id)
        item.table_sessions = {
          ...sess,
          cafe_tables: tbl ? { number: tbl.number } : { number: 0 },
          bills: db.bills.filter(b => b.session_id === sess.id),
        }
      }
      const ois = db.order_items.filter(oi => oi.order_id === item.id)
      item.order_items = ois.map(oi => {
        const mi = db.menu_items.find(m => m.id === oi.menu_item_id)
        const oims = db.order_item_modifiers.filter(oim => oim.order_item_id === oi.id)
        const mods = oims.map(oim => {
          const mod = db.modifiers.find(m => m.id === oim.modifier_id)
          return { price: oim.price, modifiers: mod ? { name: mod.name } : { name: '' } }
        })
        return {
          ...oi,
          menu_items: mi ? { name: mi.name } : { name: 'Item' },
          order_item_modifiers: mods,
        }
      })
      const usages = db.order_usage.filter(u => u.order_id === item.id)
      item.order_usage = usages.map(u => {
        const ing = db.ingredients.find(i => i.id === u.ingredient_id)
        return {
          ...u,
          ingredients: ing ? { name: ing.name, unit: ing.unit } : { name: 'Unknown', unit: '' },
        }
      })
    } else if (table === 'bills' || table === 'feedback' || table === 'bell_calls') {
      const sess = db.table_sessions.find(s => s.id === item.session_id)
      if (sess) {
        const tbl = db.cafe_tables.find(t => t.id === sess.table_id)
        item.table_sessions = {
          ...sess,
          cafe_tables: tbl ? { number: tbl.number } : { number: 1 },
        }
      } else {
        item.table_sessions = {
          customer_name: 'Guest',
          phone: '',
          cafe_tables: { number: 1 },
        }
      }
    } else if (table === 'table_sessions') {
      const tbl = db.cafe_tables.find(t => t.id === item.table_id)
      item.cafe_tables = tbl ? { number: tbl.number } : { number: 0 }
      const ords = db.orders.filter(o => o.session_id === item.id)
      item.orders = ords.map(o => localDb.hydrate('orders', o))
      item.bell_calls = db.bell_calls.filter(b => b.session_id === item.id)
      item.bills = db.bills.filter(b => b.session_id === item.id)
      item.feedback = db.feedback.filter(f => f.session_id === item.id)
    } else if (table === 'stock_movements') {
      const ing = db.ingredients.find(i => i.id === item.ingredient_id)
      item.ingredients = ing ? { name: ing.name, unit: ing.unit } : { name: '', unit: '' }
    }

    return item
  },

  insert(table: string, payload: any, actor?: { id: string; email: string; role: string }) {
    const db = loadDb()
    const records = Array.isArray(payload) ? payload : [payload]
    const created = records.map(r => {
      const id = r.id || randomUUID()
      const item = { ...r, id }
      if (!item.created_at && ['orders', 'table_sessions', 'bell_calls', 'bills', 'feedback', 'stock_movements'].includes(table)) {
        item.created_at = new Date().toISOString()
      }
      if (table === 'cafe_tables' && !item.number) {
        const maxNo = db.cafe_tables.reduce((m, t) => Math.max(m, t.number || 0), 0)
        item.number = maxNo + 1
      }
      if (table === 'bell_calls' && !item.status) {
        item.status = 'open'
      }
      if (table === 'orders' && !item.status) {
        item.status = 'new'
      }
      if (table === 'bills' && !item.status) {
        item.status = 'unpaid'
      }
      return item
    })

    if (!(db as any)[table]) (db as any)[table] = []
    ;(db as any)[table].push(...created)

    if (actor && table !== 'staff_activity') {
      created.forEach((row: any) => this.recordActivity(db, actor, 'create', table, row.id, row))
    }

    // Trigger stock movement trigger
    if (table === 'stock_movements') {
      created.forEach(m => {
        const ing = db.ingredients.find(i => i.id === m.ingredient_id)
        if (ing) {
          ing.stock = (Number(ing.stock) || 0) + Number(m.qty)
        }
      })
    }

    saveDb()
    return { data: Array.isArray(payload) ? created : created[0], error: null }
  },

  update(table: string, patch: any, filters: Array<{ col: string; op: string; val: any }>, actor?: { id: string; email: string; role: string }) {
    const db = loadDb()
    const list = (db as any)[table] ?? []
    const updated: any[] = []

    list.forEach((row: any) => {
      const match = filters.every(f => {
        if (f.op === 'eq') return row[f.col] == f.val
        return true
      })
      if (match) {
        Object.assign(row, patch)
        updated.push(row)
      }
    })

    if (actor && updated.length && table !== 'staff_activity') {
      updated.forEach((row: any) => this.recordActivity(db, actor, 'update', table, row.id, patch))
    }

    if (table === 'orders' && patch.status === 'cancelled') {
      updated.forEach((order: any) => {
        const subtotal = Number(this.rpc('session_total', { p_session: order.session_id }).data) || 0
        const bill = db.bills.find((row: any) => row.session_id === order.session_id)
        if (!bill || bill.status !== 'unpaid') return
        if (subtotal > 0) {
          bill.subtotal = subtotal
          bill.total = subtotal + (Number(bill.tip) || 0)
        } else {
          db.bills = db.bills.filter((row: any) => row.id !== bill.id)
        }
      })
    }

    saveDb()
    return { data: updated.length === 1 ? updated[0] : updated, error: null }
  },

  delete(table: string, filters: Array<{ col: string; op: string; val: any }>, actor?: { id: string; email: string; role: string }) {
    const db = loadDb()
    const list = (db as any)[table] ?? []
    const removed = list.filter((row: any) => {
      return filters.every(f => f.op === 'eq' ? row[f.col] == f.val : true)
    })
    const remaining = list.filter((row: any) => {
      return !filters.every(f => {
        if (f.op === 'eq') return row[f.col] == f.val
        return true
      })
    })
    ;(db as any)[table] = remaining
    if (actor && removed.length && table !== 'staff_activity') {
      removed.forEach((row: any) => this.recordActivity(db, actor, 'delete', table, row.id, row))
    }
    saveDb()
    return { data: null, error: null }
  },

  getOrderExpectedUsage() {
    const db = loadDb()
    const result: Record<string, { order_id: string; ingredient_id: string; qty: number }> = {}

    db.orders.forEach(o => {
      const ois = db.order_items.filter(oi => oi.order_id === o.id)
      ois.forEach(oi => {
        const recs = db.recipes.filter(r => r.menu_item_id === oi.menu_item_id)
        recs.forEach(r => {
          const key = `${o.id}_${r.ingredient_id}`
          if (!result[key]) result[key] = { order_id: o.id, ingredient_id: r.ingredient_id, qty: 0 }
          result[key].qty += Number(r.qty) * Number(oi.qty)
        })

        const oims = db.order_item_modifiers.filter(oim => oim.order_item_id === oi.id)
        oims.forEach(oim => {
          const mod = db.modifiers.find(m => m.id === oim.modifier_id)
          if (mod && mod.ingredient_id) {
            const key = `${o.id}_${mod.ingredient_id}`
            if (!result[key]) result[key] = { order_id: o.id, ingredient_id: mod.ingredient_id, qty: 0 }
            result[key].qty += Number(mod.ingredient_qty) * Number(oi.qty)
          }
        })
      })
    })

    return Object.values(result)
  },

  getDailyReport() {
    const db = loadDb()
    const byDay: Record<string, { day: string; bills: number; sales: number; sessions: Set<string> }> = {}

    db.bills
      .filter(b => b.status === 'paid' && b.paid_at)
      .forEach(b => {
        const day = new Date(b.paid_at).toLocaleDateString('en-CA', { timeZone: 'Asia/Karachi' })
        if (!byDay[day]) byDay[day] = { day, bills: 0, sales: 0, sessions: new Set() }
        byDay[day].bills += 1
        byDay[day].sales += Number(b.total) || 0
        if (b.session_id) byDay[day].sessions.add(b.session_id)
      })

    return Object.values(byDay).map(x => ({
      day: x.day,
      bills: x.bills,
      sales: x.sales,
      customers: x.sessions.size,
    }))
  },

  getMonthlyReport() {
    const db = loadDb()
    const byMonth: Record<string, { month: string; sales: number; expenses: number }> = {}

    db.bills
      .filter(b => b.status === 'paid' && b.paid_at)
      .forEach(b => {
        const m = new Date(b.paid_at).toISOString().slice(0, 7) + '-01'
        if (!byMonth[m]) byMonth[m] = { month: m, sales: 0, expenses: 0 }
        byMonth[m].sales += Number(b.total) || 0
      })

    db.expenses.forEach(e => {
      const m = String(e.spent_on).slice(0, 7) + '-01'
      if (!byMonth[m]) byMonth[m] = { month: m, sales: 0, expenses: 0 }
      byMonth[m].expenses += Number(e.amount) || 0
    })

    return Object.values(byMonth).map(x => ({
      month: x.month,
      sales: x.sales,
      expenses: x.expenses,
      profit: x.sales - x.expenses,
    }))
  },

  getTopItems() {
    const db = loadDb()
    const byItem: Record<string, { name: string; qty: number; revenue: number }> = {}

    db.orders
      .filter(o => o.status !== 'cancelled')
      .forEach(o => {
        const ois = db.order_items.filter(oi => oi.order_id === o.id)
        ois.forEach(oi => {
          const mi = db.menu_items.find(m => m.id === oi.menu_item_id)
          const name = mi?.name || 'Item'
          if (!byItem[name]) byItem[name] = { name, qty: 0, revenue: 0 }
          byItem[name].qty += Number(oi.qty) || 0
          byItem[name].revenue += (Number(oi.qty) || 0) * (Number(oi.unit_price) || 0)
        })
      })

    return Object.values(byItem).sort((a, b) => b.qty - a.qty)
  },

  getUsageReport() {
    const db = loadDb()
    const byDayIng: Record<string, { day: string; ingredient: string; unit: string; expected: number; used: number }> = {}

    db.orders.forEach(o => {
      const day = new Date(o.created_at || Date.now()).toLocaleDateString('en-CA', { timeZone: 'Asia/Karachi' })
      const usages = db.order_usage.filter(u => u.order_id === o.id)
      usages.forEach(u => {
        const ing = db.ingredients.find(i => i.id === u.ingredient_id)
        const name = ing?.name || 'Unknown'
        const unit = ing?.unit || ''
        const key = `${day}_${name}`
        if (!byDayIng[key]) byDayIng[key] = { day, ingredient: name, unit, expected: 0, used: 0 }
        byDayIng[key].expected += Number(u.expected_qty) || 0
        byDayIng[key].used += Number(u.used_qty) || 0
      })
    })

    return Object.values(byDayIng)
  },

  // RPC Functions
  rpc(fn: string, args: Record<string, any>) {
    const db = loadDb()

    if (fn === 'place_order') {
      const { p_session, p_note, p_items } = args
      const queue = db.orders.filter(o => ['new', 'preparing'].includes(o.status)).length
      orderCounter += 1
      const orderId = randomUUID()
      const newOrder = {
        id: orderId,
        order_no: orderCounter,
        session_id: p_session,
        status: 'pending',
        note: p_note || null,
        est_wait_min: Math.min(10 + queue * 4, 60),
        created_at: new Date().toISOString(),
      }
      db.orders.push(newOrder)

      for (const item of p_items || []) {
        const mi = db.menu_items.find(m => m.id === item.id)
        if (!mi || !mi.is_available) {
          return { data: null, error: { message: 'An item in your cart is no longer available' } }
        }
        const orderItemId = randomUUID()
        db.order_items.push({
          id: orderItemId,
          order_id: orderId,
          menu_item_id: mi.id,
          qty: Number(item.qty),
          unit_price: Number(mi.price),
          note: item.note || null,
        })

        for (const modId of item.mods || []) {
          const mod = db.modifiers.find(m => m.id === modId)
          if (mod) {
            db.order_item_modifiers.push({
              id: randomUUID(),
              order_item_id: orderItemId,
              modifier_id: mod.id,
              price: Number(mod.price) || 0,
            })
          }
        }
      }

      const subtotal = Number(localDb.rpc('session_total', { p_session }).data) || 0
      const bill = db.bills.find(b => b.session_id === p_session)
      if (bill) {
        if (bill.status === 'unpaid') {
          bill.subtotal = subtotal
          bill.total = subtotal + (Number(bill.tip) || 0)
        }
      } else {
        db.bills.push({
          id: randomUUID(),
          session_id: p_session,
          subtotal,
          tip: 0,
          total: subtotal,
          method: null,
          status: 'unpaid',
          created_at: new Date().toISOString(),
          paid_at: null,
        })
      }

      saveDb()
      return { data: orderId, error: null }
    }

    if (fn === 'session_total') {
      const { p_session } = args
      let total = 0
      const ords = db.orders.filter(o => o.session_id === p_session && o.status !== 'cancelled')
      ords.forEach(o => {
        const ois = db.order_items.filter(oi => oi.order_id === o.id)
        ois.forEach(oi => {
          const mods = db.order_item_modifiers.filter(m => m.order_item_id === oi.id)
          const modTotal = mods.reduce((sum, m) => sum + (Number(m.price) || 0), 0)
          total += (Number(oi.unit_price) + modTotal) * Number(oi.qty)
        })
      })
      return { data: total, error: null }
    }

    if (fn === 'request_bill') {
      const { p_session, p_tip = 0 } = args
      const totalRes = localDb.rpc('session_total', { p_session })
      const subtotal = totalRes.data || 0
      const tip = Math.max(0, Number(p_tip) || 0)
      const total = subtotal + tip

      let bill = db.bills.find(b => b.session_id === p_session)
      if (bill) {
        if (bill.status === 'unpaid') {
          bill.subtotal = subtotal
          bill.tip = tip
          bill.total = total
        }
      } else {
        bill = {
          id: randomUUID(),
          session_id: p_session,
          subtotal,
          tip,
          total,
          method: null,
          status: 'unpaid',
          created_at: new Date().toISOString(),
          paid_at: null,
        }
        db.bills.push(bill)
      }
      saveDb()
      return { data: bill, error: null }
    }

    if (fn === 'complete_order') {
      const { p_order, p_usage } = args
      const order = db.orders.find(o => o.id === p_order)
      if (!order) return { data: null, error: { message: 'Order not found' } }

      for (const u of p_usage || []) {
        db.order_usage.push({
          order_id: p_order,
          ingredient_id: u.ingredient_id,
          expected_qty: Number(u.expected_qty),
          used_qty: Number(u.used_qty),
        })

        // Add negative movement
        db.stock_movements.push({
          id: randomUUID(),
          ingredient_id: u.ingredient_id,
          qty: -Number(u.used_qty),
          reason: 'usage',
          order_id: p_order,
          created_at: new Date().toISOString(),
        })

        // Deduct from ingredient stock
        const ing = db.ingredients.find(i => i.id === u.ingredient_id)
        if (ing) {
          ing.stock = Math.max(0, (Number(ing.stock) || 0) - Number(u.used_qty))
        }
      }

      order.status = 'ready'
      order.ready_at = new Date().toISOString()
      saveDb()
      return { data: null, error: null }
    }

    return { data: null, error: { message: `Unknown RPC function: ${fn}` } }
  },

  // Auth methods
  signInWithPassword(credentials: { email: string; password: string }) {
    const db = loadDb()
    const user = db.staff.find(s => s.email.toLowerCase() === credentials.email.toLowerCase())
    if (!user || user.password !== credentials.password) {
      return { data: { user: null, session: null }, error: { message: 'Invalid login credentials' } }
    }
    const staffUser = {
      id: user.user_id,
      email: user.email,
      role: user.role,
    }
    return {
      data: {
        user: staffUser,
        session: { access_token: `token-${user.user_id}`, user: staffUser },
      },
      error: null,
    }
  },
}
