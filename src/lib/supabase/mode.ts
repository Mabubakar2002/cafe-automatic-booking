export const isLocalMode = () => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  if (process.env.NODE_ENV === 'production') return false
  return !url || url === 'local' || url.startsWith('http://localhost')
}
