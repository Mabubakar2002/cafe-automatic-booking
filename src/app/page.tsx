'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'

const name = process.env.NEXT_PUBLIC_CAFE_NAME || 'The Grand Artisan Cafe'

type RewardResult = {
  customer_name: string
  phone: string
  visit_dates: string[]
  visit_count: number
  completed: boolean
  reward_percent: number
} | null

export default function Home() {
  const [tables, setTables] = useState<{ number: number; booked: boolean }[]>([])
  const [checking, setChecking] = useState(true)
  const [availabilityError, setAvailabilityError] = useState(false)

  const [showReward, setShowReward] = useState(false)
  const [rewardName, setRewardName] = useState('')
  const [rewardPhone, setRewardPhone] = useState('')
  const [rewardLoading, setRewardLoading] = useState(false)
  const [rewardError, setRewardError] = useState('')
  const [rewardFound, setRewardFound] = useState(false)
  const [reward, setReward] = useState<RewardResult>(null)

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

  const fetchReward = async (event: React.FormEvent) => {
    event.preventDefault()
    setRewardError('')
    setRewardFound(false)
    setReward(null)
    if (!rewardName.trim() || !rewardPhone.trim()) {
      setRewardError('Please enter both your name and mobile number.')
      return
    }
    setRewardLoading(true)
    try {
      const response = await fetch('/api/loyalty/lookup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: rewardName.trim(), phone: rewardPhone.trim() }),
      })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || 'Could not check your reward.')
      setReward(result.reward)
      setRewardFound(true)
    } catch (error) {
      setRewardError(error instanceof Error ? error.message : 'Could not check your reward. Please try again.')
    } finally {
      setRewardLoading(false)
    }
  }

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

      {/* Check My Reward Section */}
      <section className="w-full max-w-2xl bg-white/5 rounded-3xl p-6 sm:p-8 border border-white/10 backdrop-blur-md">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <span>🎁</span> Check My Reward
          </h2>
          {!showReward && (
            <button
              onClick={() => setShowReward(true)}
              className="text-xs font-bold bg-chilli text-white px-4 py-1.5 rounded-full hover:brightness-110 transition"
            >
              Fetch My Reward
            </button>
          )}
        </div>
        <p className="text-white/70 text-sm mb-4">
          Visit us 7 times in 7 days to earn a 20% reward. Enter the name and mobile number you used when
          paying your bill to see your reward status.
        </p>

        {showReward && (
          <form onSubmit={fetchReward} className="space-y-3">
            <div className="grid sm:grid-cols-2 gap-3">
              <input
                type="text"
                value={rewardName}
                onChange={(e) => setRewardName(e.target.value)}
                placeholder="Your full name"
                className="w-full rounded-xl bg-white/10 border border-white/15 px-4 py-3 text-sm placeholder-white/40 focus:outline-none focus:border-chilli"
              />
              <input
                type="tel"
                value={rewardPhone}
                onChange={(e) => setRewardPhone(e.target.value)}
                placeholder="Mobile number (e.g. 03001234567)"
                className="w-full rounded-xl bg-white/10 border border-white/15 px-4 py-3 text-sm placeholder-white/40 focus:outline-none focus:border-chilli"
              />
            </div>
            <button
              type="submit"
              disabled={rewardLoading}
              className="w-full sm:w-auto px-6 py-3 rounded-xl bg-chilli text-white font-bold hover:brightness-110 transition disabled:opacity-50"
            >
              {rewardLoading ? 'Checking…' : 'Fetch Reward'}
            </button>
          </form>
        )}

        {rewardError && <p className="mt-4 text-sm text-red-200 bg-red-500/10 border border-red-400/20 rounded-xl px-4 py-3">{rewardError}</p>}

        {rewardFound && !reward && (
          <div className="mt-4 text-sm text-amber-100 bg-amber-500/10 border border-amber-400/20 rounded-xl px-4 py-3">
            We couldn&apos;t find any previous orders under this name and mobile number. Please check the
            details and try again, or ask our staff.
          </div>
        )}

        {rewardFound && reward && (
          <div className="mt-4 rounded-xl bg-white/10 border border-white/15 p-4 sm:p-5 space-y-3">
            <div className="flex items-center justify-between">
              <p className="font-bold">
                {reward.completed ? '🎉 You have earned your reward!' : '⏳ Keep visiting to earn your reward'}
              </p>
              <span
                className={`text-xs font-bold px-3 py-1 rounded-full ${
                  reward.completed ? 'bg-green-500/20 text-green-200' : 'bg-white/10 text-white/70'
                }`}
              >
                {reward.visit_count} / 7 visits
              </span>
            </div>
            <div className="h-2 rounded-full bg-white/10 overflow-hidden">
              <div
                className={`h-full rounded-full ${reward.completed ? 'bg-green-400' : 'bg-chilli'}`}
                style={{ width: `${Math.min(100, (reward.visit_count / 7) * 100)}%` }}
              />
            </div>
            <div className="text-sm text-white/70">
              {reward.completed ? (
                <p>
                  You completed <b>{reward.visit_count}</b> visits in 7 days. Ask our staff to apply your{' '}
                  <b>{reward.reward_percent}% reward</b> on your next bill.
                </p>
              ) : (
                <p>
                  You have <b>{reward.visit_count}</b> visit{reward.visit_count === 1 ? '' : 's'} in your
                  current 7-day cycle. Visit <b>{7 - reward.visit_count}</b> more time
                  {7 - reward.visit_count === 1 ? '' : 's'} to earn your <b>{reward.reward_percent}% reward</b>.
                </p>
              )}
            </div>
            {reward.visit_dates.length > 0 && (
              <div className="text-xs text-white/50">
                Recent visits:{' '}
                {reward.visit_dates
                  .slice(-7)
                  .map((date) => (
                    <span key={date} className="inline-block bg-white/10 rounded-full px-2 py-0.5 m-1">
                      {date}
                    </span>
                  ))}
              </div>
            )}
          </div>
        )}
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
