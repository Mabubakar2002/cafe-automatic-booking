'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import BellAlerts from '@/components/BellAlerts'
import BillAlerts from '@/components/BillAlerts'
import { supabase } from '@/lib/supabase/client'

const cafe = process.env.NEXT_PUBLIC_CAFE_NAME || 'Cafe'
const links = [
  ['/admin', 'Overview', '⌂'],
  ['/admin/orders', 'Orders', '▦'],
  ['/admin/bills', 'Bills', '▤'],
  ['/admin/menu', 'Menu', '☷'],
  ['/admin/stock', 'Stock', '◆'],
  ['/admin/expenses', 'Expenses', '₹'],
  ['/admin/reports', 'Reports', '↗'],
  ['/admin/feedback', 'Feedback', '★'],
  ['/admin/tables', 'Tables & QR', '⊞'],
  ['/admin/activity', 'Staff Activity', '◷'],
]

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const path = usePathname()
  return (
    <div className="min-h-screen bg-[#f3f5ef] md:flex">
      <aside className="bg-[#171a2e] text-white md:sticky md:top-0 md:h-screen md:w-60 md:shrink-0 print:hidden">
        <div className="flex items-center gap-3 px-5 py-5">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-chilli text-xl shadow-lg shadow-chilli/20">☕</div>
          <div>
            <p className="font-display text-lg font-black leading-tight">{cafe}</p>
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/40">Admin console</p>
          </div>
        </div>
        <nav className="flex gap-1 overflow-x-auto px-3 pb-3 md:flex-col md:px-3 md:pb-4">
          {links.map(([href, name, icon]) => (
            <Link
              key={href}
              href={href}
              className={`flex shrink-0 items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-bold transition md:w-full ${path === href ? 'bg-chilli text-white shadow-md shadow-chilli/20' : 'text-white/65 hover:bg-white/8 hover:text-white'}`}
            >
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/10 text-sm">{icon}</span>
              {name}
            </Link>
          ))}
          <div className="mt-2 hidden border-t border-white/10 pt-3 md:block">
            <Link href="/kitchen" className="mb-1 flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-bold text-sun hover:bg-white/8">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-sun/15">👨‍🍳</span>
              Kitchen view
            </Link>
            <button
              className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-bold text-white/55 hover:bg-white/8 hover:text-white"
              onClick={() => supabase().auth.signOut().then(() => (location.href = '/login'))}
            >
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/10">↪</span>
              Sign out
            </button>
          </div>
        </nav>
      </aside>
      <main className="min-w-0 flex-1 p-4 md:p-7 lg:p-8">
        <BellAlerts />
        <BillAlerts />
        {children}
      </main>
    </div>
  )
}
