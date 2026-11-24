import { createClient } from '@supabase/supabase-js'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { createLocalServerClient } from '../local-db/server-client'
import { isLocalMode } from './mode'

const fetchWithoutCache: typeof fetch = (input, init) =>
  fetch(input, { ...init, cache: 'no-store' })

// Service-key client: bypasses RLS, so use it only inside API routes.
export const db = () => {
  if (isLocalMode()) {
    return createLocalServerClient() as any
  }
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false },
    global: { fetch: fetchWithoutCache },
  })
}

export async function staffRole() {
  const jar = cookies()

  if (isLocalMode()) {
    const localCookie = jar.get('cafe_local_staff')?.value
    if (!localCookie) return null
    try {
      const user = JSON.parse(localCookie)
      return (user?.role ?? null) as 'admin' | 'kitchen' | null
    } catch {
      return null
    }
  }

  const sb = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    cookies: { getAll: () => jar.getAll(), setAll: () => {} },
  })
  const { data: { user } } = await sb.auth.getUser()
  if (!user) return null
  const { data } = await sb.from('staff').select('role').eq('user_id', user.id).maybeSingle()
  return (data?.role ?? null) as 'admin' | 'kitchen' | null
}
