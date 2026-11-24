'use client'
import { useCallback, useEffect, useRef, useState } from 'react'
import { supabase } from './supabase/client'

// Loads data, then reloads it whenever one of the tables changes (Supabase Realtime / BroadcastChannel).
export function useLive<T>(tables: string[], load: () => Promise<T>, initial: T) {
  const [data, setData] = useState<T>(initial)
  const loadRef = useRef(load)
  loadRef.current = load
  const reload = useCallback(() => loadRef.current().then(setData), [])

  useEffect(() => {
    reload()
    // Poll every 3 seconds for responsive live updates
    const timer = setInterval(reload, 3000)

    // Instant cross-tab real-time sync via BroadcastChannel
    let bc: BroadcastChannel | null = null
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      try {
        bc = new BroadcastChannel('cafe-live-events')
        bc.onmessage = (event) => {
          if (!tables.length || tables.includes(event.data?.table) || event.data?.all) {
            reload()
          }
        }
      } catch {}
    }

    if (!tables.length) return () => {
      clearInterval(timer)
      if (bc) bc.close()
    }

    const sb = supabase()
    const channel = sb.channel('live-' + tables.join('-') + Math.random())
    tables.forEach(t => channel.on('postgres_changes', { event: '*', schema: 'public', table: t }, reload))
    channel.subscribe()

    return () => {
      clearInterval(timer)
      if (bc) bc.close()
      sb.removeChannel(channel)
    }
  }, [])

  return [data, reload] as const
}
