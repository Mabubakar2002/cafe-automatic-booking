import { createBrowserClient } from '@supabase/ssr'
import { createLocalClient } from '../local-db/client'

let client: any

export const isLocalMode = () => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  return !url || url === 'local' || url.startsWith('http://localhost')
}

export const supabase = () => {
  if (isLocalMode()) {
    return (client ??= createLocalClient())
  }
  return (client ??= createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  ))
}
