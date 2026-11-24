'use client'
import { useState } from 'react'
import { supabase } from '@/lib/supabase/client'

export default function Login() {
  const [f, setF] = useState({ email: '', password: '' })
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)

  async function submit(e?: React.FormEvent, customCreds?: { email: string; password: string }) {
    if (e) e.preventDefault()
    setBusy(true)
    setErr('')
    const creds = customCreds || f
    const sb = supabase()
    const { data, error } = await sb.auth.signInWithPassword(creds)
    if (error) { setBusy(false); return setErr(error.message) }
    const { data: staff } = await sb.from('staff').select('role').eq('user_id', data.user.id).maybeSingle()
    if (!staff) {
      await sb.auth.signOut()
      setBusy(false)
      return setErr('This account has no staff access.')
    }
    location.href = staff.role === 'admin' ? '/admin' : '/kitchen'
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-sun px-4">
      <div className="w-full max-w-sm space-y-4">
        <form onSubmit={e => submit(e)} className="space-y-3 rounded-3xl bg-white p-6 shadow-sm">
          <h1 className="text-3xl font-extrabold">Staff login</h1>
          <p className="text-sm text-ink/60">Sign in to access Admin or Kitchen portal</p>
          <input className="input" type="email" placeholder="Email" required value={f.email} onChange={e => setF({ ...f, email: e.target.value })} />
          <input className="input" type="password" placeholder="Password" required value={f.password} onChange={e => setF({ ...f, password: e.target.value })} />
          {err && <p className="text-sm text-chilli" role="alert">{err}</p>}
          <button className="btn-main w-full" disabled={busy}>Sign in</button>
        </form>

        <div className="rounded-2xl bg-white/80 p-4 text-xs space-y-2 backdrop-blur-sm">
          <p className="font-bold text-ink/80">Default local login credentials:</p>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              className="rounded-lg bg-ink/10 p-2 text-left hover:bg-ink/20 transition"
              onClick={() => {
                setF({ email: 'admin@example.com', password: 'admin123' })
                submit(undefined, { email: 'admin@example.com', password: 'admin123' })
              }}
            >
              <div className="font-bold text-ink">Admin Login</div>
              <div className="text-ink/60">admin@example.com</div>
              <div className="text-ink/40">pass: admin123</div>
            </button>
            <button
              type="button"
              className="rounded-lg bg-ink/10 p-2 text-left hover:bg-ink/20 transition"
              onClick={() => {
                setF({ email: 'chef@example.com', password: 'chef123' })
                submit(undefined, { email: 'chef@example.com', password: 'chef123' })
              }}
            >
              <div className="font-bold text-ink">Kitchen Login</div>
              <div className="text-ink/60">chef@example.com</div>
              <div className="text-ink/40">pass: chef123</div>
            </button>
          </div>
        </div>
      </div>
    </main>
  )
}
