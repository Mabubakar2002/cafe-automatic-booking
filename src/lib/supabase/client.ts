import { createBrowserClient } from '@supabase/ssr'
import { createLocalClient } from '../local-db/client'
import { isLocalMode } from './mode'

let client: any

export const supabase = () => {
  if (isLocalMode()) {
    return (client ??= createLocalClient())
  }
  return (client ??= createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  ))
}
