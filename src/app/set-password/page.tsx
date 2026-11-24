'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase/client'
import { isLocalMode } from '@/lib/supabase/mode'

export default function SetPassword() {
  const localMode = isLocalMode()
  const [loading, setLoading] = useState(true)
  const [ready, setReady] = useState(false)
  const [error, setError] = useState('')
  const [password, setPassword] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    if (localMode) {
      setLoading(false)
      return
    }

    let active = true
    async function loadInvitation() {
      const sb = supabase()
      const url = new URL(window.location.href)
      const code = url.searchParams.get('code')

      if (code) {
        const { error: exchangeError } = await sb.auth.exchangeCodeForSession(code)
        if (exchangeError) {
          if (active) setError(exchangeError.message)
          if (active) setLoading(false)
          return
        }
        url.searchParams.delete('code')
        window.history.replaceState({}, '', url.toString())
      } else {
        const hash = new URLSearchParams(url.hash.slice(1))
        const type = hash.get('type')
        const accessToken = hash.get('access_token')
        const refreshToken = hash.get('refresh_token')

        // Supabase recovery and invitation links may return tokens in the URL hash.
        if (accessToken && refreshToken && (type === 'recovery' || type === 'invite')) {
          const { error: sessionError } = await sb.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          })
          if (sessionError) {
            if (active) setError(sessionError.message)
            if (active) setLoading(false)
            return
          }
          url.hash = ''
          window.history.replaceState({}, '', url.toString())
        } else {
          const linkError = hash.get('error_description') || hash.get('error')
          if (linkError) {
            if (active) setError(linkError.replace(/\+/g, ' '))
            if (active) setLoading(false)
            return
          }
        }
      }

      const { data, error: sessionError } = await sb.auth.getSession()
      if (!active) return
      if (sessionError) setError(sessionError.message)
      else if (data.session) setReady(true)
      else setError('This invitation link is invalid or expired. Ask the administrator to send a new one.')
      setLoading(false)
    }

    loadInvitation()
    return () => { active = false }
  }, [localMode])

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    setError('')
    if (password.length < 8) return setError('Use at least 8 characters for your password.')
    if (password !== confirmation) return setError('The passwords do not match.')

    setSaving(true)
    const { error: updateError } = await supabase().auth.updateUser({ password })
    setSaving(false)
    if (updateError) return setError(updateError.message)
    setSaved(true)
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-sun px-4">
      <section className="w-full max-w-sm space-y-4 rounded-3xl bg-white p-6 shadow-sm">
        <h1 className="text-3xl font-extrabold">Set your staff password</h1>
        {localMode ? (
          <p className="text-sm text-ink/70">Use the invitation link on the deployed cafe website to set your staff password.</p>
        ) : loading ? (
          <p className="text-sm text-ink/70" role="status">Checking your invitation…</p>
        ) : saved ? (
          <div className="space-y-3">
            <p className="text-sm text-ink/70" role="status">Password saved. You can now sign in to the staff portal.</p>
            <Link className="btn-main block text-center" href="/login">Go to staff login</Link>
          </div>
        ) : ready ? (
          <form onSubmit={submit} className="space-y-3">
            <p className="text-sm text-ink/70">Choose a password only you know.</p>
            <input
              className="input"
              type="password"
              autoComplete="new-password"
              minLength={8}
              required
              aria-label="New password"
              placeholder="New password"
              value={password}
              onChange={event => setPassword(event.target.value)}
            />
            <input
              className="input"
              type="password"
              autoComplete="new-password"
              minLength={8}
              required
              aria-label="Confirm new password"
              placeholder="Confirm new password"
              value={confirmation}
              onChange={event => setConfirmation(event.target.value)}
            />
            {error && <p className="text-sm text-chilli" role="alert">{error}</p>}
            <button className="btn-main w-full" disabled={saving}>
              {saving ? 'Saving…' : 'Save password'}
            </button>
          </form>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-chilli" role="alert">{error || 'The invitation could not be verified.'}</p>
            <Link className="btn-main block text-center" href="/login">Go to staff login</Link>
          </div>
        )}
      </section>
    </main>
  )
}
