'use client'
import { useEffect, useState } from 'react'

interface CookingTimerProps {
  startedAt: string       // ISO timestamp when kitchen clicked "Start"
  estWaitMin: number      // estimated wait minutes
  orderNo: number
}

export default function CookingTimer({ startedAt, estWaitMin, orderNo }: CookingTimerProps) {
  const [elapsed, setElapsed] = useState(0) // seconds elapsed since start

  useEffect(() => {
    const startMs = new Date(startedAt).getTime()
    const tick = () => setElapsed(Math.floor((Date.now() - startMs) / 1000))
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [startedAt])

  const totalSec = estWaitMin * 60
  const remaining = Math.max(0, totalSec - elapsed)
  const progress = Math.min(1, elapsed / totalSec)
  const isOverdue = elapsed > totalSec

  // MM:SS for remaining or elapsed-over
  const display = isOverdue ? elapsed - totalSec : remaining
  const mm = String(Math.floor(display / 60)).padStart(2, '0')
  const ss = String(display % 60).padStart(2, '0')

  // SVG ring params
  const size = 120
  const stroke = 8
  const r = (size - stroke) / 2
  const circumference = 2 * Math.PI * r
  const dash = circumference * (1 - progress)

  // Color zones: green → amber → red → pulsing red
  const color = isOverdue
    ? '#ef4444'      // red overdue
    : progress > 0.8
    ? '#f97316'      // orange near end
    : progress > 0.5
    ? '#eab308'      // yellow halfway
    : '#22c55e'      // green early

  return (
    <div className="flex flex-col items-center gap-3 rounded-2xl bg-gradient-to-b from-ink to-ink/90 p-5 shadow-xl ring-1 ring-white/10">
      {/* Header */}
      <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-white/50">
        <span className={`inline-block h-1.5 w-1.5 rounded-full ${isOverdue ? 'bg-red-500 animate-ping' : 'bg-green-400 animate-pulse'}`} />
        <span>{isOverdue ? 'Running over time' : 'Cooking in progress'}</span>
      </div>

      {/* SVG Clock Ring */}
      <div className="relative" style={{ width: size, height: size }}>
        {/* Background track */}
        <svg width={size} height={size} className="-rotate-90" style={{ display: 'block' }}>
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke="rgba(255,255,255,0.08)"
            strokeWidth={stroke}
          />
          {/* Progress arc */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke={color}
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={dash}
            style={{
              transition: 'stroke-dashoffset 0.9s linear, stroke 1s ease',
              filter: `drop-shadow(0 0 6px ${color})`,
            }}
          />
        </svg>

        {/* Center display */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span
            className="font-mono text-3xl font-black tabular-nums leading-none"
            style={{ color, textShadow: `0 0 20px ${color}60` }}
          >
            {mm}:{ss}
          </span>
          <span className="mt-0.5 text-[10px] font-semibold uppercase tracking-wider text-white/40">
            {isOverdue ? 'extra time' : 'remaining'}
          </span>
        </div>
      </div>

      {/* Order info row */}
      <div className="flex w-full items-center justify-between border-t border-white/10 pt-3 text-sm">
        <div className="text-left">
          <p className="text-xs text-white/40">Your Order</p>
          <p className="font-black text-white">#{orderNo}</p>
        </div>

        {/* Tick marks like a clock face */}
        <div className="flex items-center gap-0.5">
          {Array.from({ length: 12 }).map((_, i) => {
            const filled = i < Math.round(progress * 12)
            return (
              <div
                key={i}
                className="rounded-full transition-all duration-500"
                style={{
                  width: i % 3 === 0 ? 4 : 2,
                  height: i % 3 === 0 ? 14 : 10,
                  backgroundColor: filled ? color : 'rgba(255,255,255,0.12)',
                  boxShadow: filled ? `0 0 4px ${color}` : 'none',
                }}
              />
            )
          })}
        </div>

        <div className="text-right">
          <p className="text-xs text-white/40">Est. Total</p>
          <p className="font-black text-white">{estWaitMin} min</p>
        </div>
      </div>

      {/* Status message */}
      <p className="w-full rounded-xl px-3 py-2 text-center text-xs font-semibold"
        style={{ background: `${color}18`, color }}>
        {isOverdue
          ? `⏰ Order #${orderNo} is taking a bit longer — almost there!`
          : remaining < 60
          ? `🔥 Order #${orderNo} is almost ready! Get excited!`
          : `👨‍🍳 Chef is working on Order #${orderNo} right now`}
      </p>
    </div>
  )
}

