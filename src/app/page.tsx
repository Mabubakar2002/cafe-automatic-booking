'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'

const name = process.env.NEXT_PUBLIC_CAFE_NAME || 'The Grand Artisan Cafe'

export default function Home() {
  const [tables, setTables] = useState<{ number: number; booked: boolean }[]>([])
  const [checking, setChecking] = useState(true)
  const [availabilityError, setAvailabilityError] = useState(false)

  useEffect(() => {
    let active = true
    const loadTables = async () => {
      try {
        const sessionId = localStorage.getItem('cafe-sid')
        const query = sessionId ? `?sessionId=${encodeURIComponent(sessionId)}` : ''
        const response = await fetch('/api/table-status' + query, { cache: 'no-store' })
        if (!response.ok) throw new Error('Could not load table availability')
        const result = await response.json()
        if (!Array.isArray(result.tables)) throw new Error('Invalid table availability response')
        if (active) {
          setTables(result.tables)
          setAvailabilityError(false)
          setChecking(false)
        }
      } catch {
        if (active) {
          setAvailabilityError(true)
          setChecking(false)
        }
      }
    }

    loadTables()
    const timer = setInterval(loadTables, 4000)
    return () => {
      active = false
      clearInterval(timer)
    }
  }, [])

  return (
    <main className="min-h-screen bg-[#1D1B2E] text-white flex flex-col items-center justify-between px-4 py-8 sm:py-12">
      {/* Top Header */}
      <header className="flex flex-col items-center text-center space-y-4 max-w-xl">
        <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-chilli shadow-lg shadow-chilli/30">
          <svg className="w-12 h-12 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 8h1a4 4 0 0 1 0 8h-1"></path>
            <path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z"></path>
            <line x1="6" y1="1" x2="6" y2="4"></line>
            <line x1="10" y1="1" x2="10" y2="4"></line>
            <line x1="14" y1="1" x2="14" y2="4"></line>
          </svg>
        </div>
        <h1 className="text-4xl sm:text-5xl font-black tracking-tight">{name}</h1>
        <p className="text-white/70 text-base sm:text-lg">
          Smart QR Ordering & Table Service System. Select your table below to browse our menu, place orders, or call the waiter.
        </p>
      </header>

      {/* Tables Section */}
      <section className="w-full max-w-2xl my-8 bg-white/5 rounded-3xl p-6 sm:p-8 border border-white/10 backdrop-blur-md">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <span>🍽️</span> Select Your Table to Order:
          </h2>
          <span className="text-xs text-white/50 bg-white/10 px-3 py-1 rounded-full">
            {checking ? 'Checking availability' : availabilityError ? 'Availability unavailable' : 'Live availability'}
          </span>
        </div>
        {availabilityError && <p className="mb-3 text-sm text-red-200">Could not check availability. Please try again shortly.</p>}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          {tables.map(({ number, booked }) => {
            const unavailable = checking || availabilityError || booked
            const className = `flex flex-col items-center justify-center p-4 rounded-2xl transition-all duration-200 group text-center ${
              unavailable ? 'bg-white/5 text-white/45' : 'bg-white/10 hover:bg-chilli hover:-translate-y-1 hover:shadow-lg'
            }`
            const content = (
              <>
                <span className="text-2xl mb-1 group-hover:scale-110 transition">🪑</span>
                <span className="font-extrabold text-lg">Table {number}</span>
                <span className={`text-xs ${booked || availabilityError ? 'text-red-200' : 'text-white/60 group-hover:text-white/90'}`}>
                  {checking ? 'Checking…' : availabilityError ? 'Status unavailable' : booked ? 'Already reserved' : 'Available · View menu'}
                </span>
              </>
            )
            return unavailable ? (
              <div key={number} aria-disabled="true" className={className}>{content}</div>
            ) : (
              <Link key={number} href={`/t/${number}`} className={className}>{content}</Link>
            )
          })}
        </div>
      </section>

      {/* Staff & Admin Portals */}
      <footer className="w-full max-w-2xl flex flex-wrap items-center justify-center gap-3 pt-4 border-t border-white/10 text-sm">
        <Link
          href="/kitchen"
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-sun text-ink font-bold hover:brightness-105 transition"
        >
          <span>👨‍🍳</span> Kitchen Display
        </Link>
        <Link
          href="/admin"
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white/15 text-white font-bold hover:bg-white/25 transition"
        >
          <span>📊</span> Admin Dashboard
        </Link>
        <Link
          href="/login"
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white/10 text-white/70 hover:text-white transition"
        >
          <span>🔑</span> Staff Login
        </Link>
      </footer>
    </main>
  )
}
