'use client'
import { useEffect, useRef, useState } from 'react'

interface ScratchCardProps {
  onClose: () => void
  cafeName: string
}

// ── All possible prizes ──────────────────────────────────────────────────────
const WIN_PRIZES = [
  {
    emoji: '☕',
    title: 'FREE Chai / Tea!',
    reward: '1x Free Doodh Patti or Green Tea',
    description: 'Ek cup chai bilkul free hai! Agli visit mein show karein.',
    color: '#7c3aed',          // purple
    bg: 'from-purple-50 to-purple-100',
    badge: 'bg-purple-600',
  },
  {
    emoji: '🍟',
    title: 'FREE Loaded Fries!',
    reward: 'Loaded Cheesy Masala Fries',
    description: 'Agli baar ek plate cheesy loaded fries bilkul free! Yummy!',
    color: '#d97706',          // amber
    bg: 'from-amber-50 to-amber-100',
    badge: 'bg-amber-500',
  },
  {
    emoji: '🥤',
    title: 'FREE Mango Shake!',
    reward: 'Fresh Mango Milkshake (Large)',
    description: 'Ek large mango shake free mein! Agli visit mein claim karein.',
    color: '#ea580c',          // orange
    bg: 'from-orange-50 to-orange-100',
    badge: 'bg-orange-500',
  },
  {
    emoji: '🍔',
    title: 'FREE Burger Upgrade!',
    reward: 'Free Upgrade to Deal (Burger + Drink)',
    description: 'Burger order karein aur free mein drink upgrade milega!',
    color: '#dc2626',          // red
    bg: 'from-red-50 to-red-100',
    badge: 'bg-red-600',
  },
  {
    emoji: '🍨',
    title: 'FREE Ice Cream!',
    reward: 'Brownie + Vanilla Scoop Dessert',
    description: 'Meetha khayen bilkul free! Agli visit mein yeh card dikhayein.',
    color: '#db2777',          // pink
    bg: 'from-pink-50 to-pink-100',
    badge: 'bg-pink-600',
  },
  {
    emoji: '🫓',
    title: 'FREE Aloo Paratha!',
    reward: '2x Aloo Paratha with Chutney',
    description: 'Ghar jaisi paratha ka maza bilkul free! Agli visit par aayein.',
    color: '#059669',          // green
    bg: 'from-green-50 to-green-100',
    badge: 'bg-emerald-600',
  },
  {
    emoji: '🎉',
    title: '20% Discount!',
    reward: '20% OFF on Next Full Bill',
    description: 'Agli visit ka poora bill mein 20% chhutt milegi. Valid 30 days.',
    color: '#2563eb',          // blue
    bg: 'from-blue-50 to-blue-100',
    badge: 'bg-blue-600',
  },
  {
    emoji: '🧋',
    title: 'FREE Cold Coffee!',
    reward: 'Iced Latte or Cold Brew (Medium)',
    description: 'Thandi thandi coffee bilkul free! Agli visit mein claim karein.',
    color: '#7c3aed',          // violet
    bg: 'from-violet-50 to-violet-100',
    badge: 'bg-violet-600',
  },
]

// No-win messages (shown when user doesn't win)
const NO_WIN = [
  { emoji: '💙', msg: 'Agli baar kismat azmayen — aap hamesha special hain!' },
  { emoji: '🌟', msg: 'Is baar naseeb ne saath nahi diya, lekin aap hamesha welcome hain!' },
  { emoji: '🤗', msg: 'Koi gal nahi! Aapka feedback hamara asli tohfa hai.' },
  { emoji: '🍀', msg: 'Better luck next time! Dobara ayen aur phir try karein.' },
]

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

export default function ScratchCard({ onClose, cafeName }: ScratchCardProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const [scratched, setScratched] = useState(false)
  const [isDrawing, setIsDrawing] = useState(false)
  const [copied, setCopied] = useState(false)
  const [prize, setPrize] = useState<{
    won: boolean
    emoji: string
    title: string
    reward: string
    description: string
    code?: string
    color: string
    bg: string
    badge: string
  } | null>(null)

  // ── Determine winner on mount ─────────────────────────────────────────────
  useEffect(() => {
    const today = new Date().toISOString().split('T')[0]
    const storageKey = `cafe_wins_${today}`
    const winnersToday = Number(localStorage.getItem(storageKey) || '0')
    const maxPerDay = 10
    const winChance = 0.4   // 40% chance

    const isWinner = winnersToday < maxPerDay && Math.random() < winChance

    if (isWinner) {
      localStorage.setItem(storageKey, String(winnersToday + 1))
      const chosen = pickRandom(WIN_PRIZES)
      const prefix = chosen.emoji === '🎉' ? 'DISC20' :
                     chosen.emoji === '☕' ? 'CHAI' :
                     chosen.emoji === '🍟' ? 'FRIES' :
                     chosen.emoji === '🥤' ? 'SHAKE' :
                     chosen.emoji === '🍔' ? 'BURGER' :
                     chosen.emoji === '🍨' ? 'SWEET' :
                     chosen.emoji === '🫓' ? 'PRATHA' : 'COFFEE'
      const code = `${prefix}-${Math.floor(1000 + Math.random() * 9000)}`
      setPrize({ won: true, ...chosen, code })
    } else {
      const noWin = pickRandom(NO_WIN)
      setPrize({
        won: false,
        emoji: noWin.emoji,
        title: 'Agli baar InshAllah! 🤲',
        reward: noWin.msg,
        description: 'Dobara ayen — zyada chances milenge!',
        color: '#6b7280',
        bg: 'from-gray-50 to-gray-100',
        badge: 'bg-gray-500',
      })
    }
  }, [])

  // ── Draw gold foil on canvas ──────────────────────────────────────────────
  useEffect(() => {
    if (!prize) return
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const W = (canvas.width = canvas.offsetWidth || 300)
    const H = (canvas.height = canvas.offsetHeight || 160)

    // Metallic gold gradient
    const grad = ctx.createLinearGradient(0, 0, W, H)
    grad.addColorStop(0, '#BFA14A')
    grad.addColorStop(0.2, '#F5E07A')
    grad.addColorStop(0.4, '#D4AF37')
    grad.addColorStop(0.65, '#FFF3A0')
    grad.addColorStop(0.85, '#C8961E')
    grad.addColorStop(1, '#E6C665')
    ctx.fillStyle = grad
    ctx.fillRect(0, 0, W, H)

    // Sparkle dots pattern
    ctx.fillStyle = 'rgba(255,255,255,0.18)'
    for (let i = 0; i < 40; i++) {
      const sx = Math.random() * W
      const sy = Math.random() * H
      ctx.beginPath()
      ctx.arc(sx, sy, Math.random() * 3 + 1, 0, Math.PI * 2)
      ctx.fill()
    }

    // Center text
    ctx.fillStyle = '#5a3e00'
    ctx.font = 'bold 17px system-ui, sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText('🎁  SCRATCH HERE  🎁', W / 2, H / 2 - 14)
    ctx.font = '12px system-ui, sans-serif'
    ctx.fillStyle = '#7a5000'
    ctx.fillText('Ungali ya mouse se ghisayen', W / 2, H / 2 + 14)
    ctx.fillText('▼▼▼', W / 2, H / 2 + 32)
  }, [prize])

  // ── Scratch handler ───────────────────────────────────────────────────────
  const scratch = (cx: number, cy: number) => {
    const canvas = canvasRef.current
    if (!canvas || scratched) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const rect = canvas.getBoundingClientRect()
    const x = cx - rect.left
    const y = cy - rect.top

    ctx.globalCompositeOperation = 'destination-out'
    ctx.beginPath()
    ctx.arc(x, y, 28, 0, Math.PI * 2)
    ctx.fill()

    // Check coverage
    const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data
    let transparent = 0
    for (let i = 3; i < data.length; i += 16) if (data[i] === 0) transparent += 4
    const pct = (transparent / (data.length / 4)) * 100

    if (pct > 40) {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      setScratched(true)
    }
  }

  const revealAll = () => {
    const canvas = canvasRef.current
    if (canvas) {
      const ctx = canvas.getContext('2d')
      ctx?.clearRect(0, 0, canvas.width, canvas.height)
    }
    setScratched(true)
  }

  const copyCode = () => {
    if (prize?.code) {
      navigator.clipboard.writeText(prize.code).catch(() => {})
      setCopied(true)
      setTimeout(() => setCopied(false), 3000)
    }
  }

  if (!prize) return null

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 p-0 sm:p-4 backdrop-blur-md">
      <div className="relative w-full max-w-sm rounded-t-3xl sm:rounded-3xl bg-white shadow-2xl overflow-hidden">

        {/* ── Coloured header stripe ── */}
        <div className={`bg-gradient-to-r ${prize.won ? 'from-amber-500 to-yellow-400' : 'from-gray-400 to-gray-500'} px-5 pt-5 pb-6 text-center text-white`}>
          <button
            onClick={onClose}
            className="absolute right-4 top-4 h-8 w-8 rounded-full bg-black/20 hover:bg-black/30 text-white flex items-center justify-center font-bold text-sm"
          >
            ✕
          </button>
          <div className="text-5xl mb-1">{prize.won ? '🎊' : '🎁'}</div>
          <h2 className="text-xl font-black tracking-tight">{cafeName}</h2>
          <p className="text-sm text-white/80 font-medium">
            {prize.won ? 'Mubarak ho! Aap ne gift jeeta!' : 'Scratch & Win Card'}
          </p>
        </div>

        <div className="p-5 space-y-4">

          {/* ── Scratch canvas area ── */}
          <div className="relative mx-auto h-44 w-full rounded-2xl overflow-hidden shadow-inner border-2 border-amber-200">

            {/* Prize revealed underneath */}
            <div className={`absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br ${prize.bg} px-4 text-center space-y-1 select-none`}>
              <span className="text-5xl">{prize.emoji}</span>
              <p className="font-black text-base leading-tight" style={{ color: prize.color }}>
                {prize.title}
              </p>
              <p className="text-xs font-semibold text-ink/70 max-w-[200px] leading-snug">
                {prize.reward}
              </p>
              {prize.code && (
                <div className="mt-1 rounded-lg border-2 border-dashed px-3 py-1 text-xs font-mono font-black"
                  style={{ borderColor: prize.color, color: prize.color }}>
                  {prize.code}
                </div>
              )}
            </div>

            {/* Gold foil overlay canvas */}
            <canvas
              ref={canvasRef}
              className={`absolute inset-0 h-full w-full cursor-crosshair touch-none ${scratched ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}
              style={{ transition: 'opacity 0.5s ease' }}
              onMouseDown={() => setIsDrawing(true)}
              onMouseUp={() => setIsDrawing(false)}
              onMouseLeave={() => setIsDrawing(false)}
              onMouseMove={e => isDrawing && scratch(e.clientX, e.clientY)}
              onTouchStart={() => setIsDrawing(true)}
              onTouchEnd={() => setIsDrawing(false)}
              onTouchMove={e => { e.preventDefault(); scratch(e.touches[0].clientX, e.touches[0].clientY) }}
            />

            {/* Shimmer hint if not scratched */}
            {!scratched && (
              <div className="pointer-events-none absolute bottom-2 right-2 rounded-full bg-black/30 px-2 py-0.5 text-[10px] text-white font-semibold">
                ghisayen ✨
              </div>
            )}
          </div>

          {/* ── Revealed state ── */}
          {scratched && (
            <div className={`rounded-2xl bg-gradient-to-br ${prize.bg} p-4 text-center space-y-2 border border-ink/5`}>
              <span className="text-4xl">{prize.emoji}</span>
              <p className="font-black text-lg leading-tight" style={{ color: prize.color }}>{prize.title}</p>
              <p className="text-sm text-ink/70 leading-snug">{prize.description}</p>

              {prize.won && prize.code && (
                <div className="space-y-2 pt-1">
                  <div className="rounded-xl border-2 border-dashed p-2 font-mono font-black text-lg tracking-widest"
                    style={{ borderColor: prize.color, color: prize.color }}>
                    {prize.code}
                  </div>
                  <button
                    onClick={copyCode}
                    className="w-full rounded-xl py-2 text-sm font-extrabold text-white transition"
                    style={{ background: prize.color }}
                  >
                    {copied ? '✓ Copied!' : '📋 Code Copy Karein'}
                  </button>
                </div>
              )}
            </div>
          )}

          {/* ── Buttons ── */}
          <div className="space-y-2">
            {!scratched ? (
              <button
                onClick={revealAll}
                className="w-full text-center text-xs text-ink/40 underline hover:text-ink/70"
              >
                Ghisna mushkil lag raha hai? Yahan click karein
              </button>
            ) : (
              <button
                onClick={onClose}
                className="btn-main w-full !py-3 font-black text-base"
              >
                Shukriya! Phir Aayein 🙏
              </button>
            )}
          </div>

        </div>
      </div>
    </div>
  )
}
