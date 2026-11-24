'use client'
import { useEffect } from 'react'

export default function SwRegister() {
  useEffect(() => {
    navigator.serviceWorker?.register('/sw.js').catch(() => {})
  }, [])
  return null
}
