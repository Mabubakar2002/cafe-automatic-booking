// Keeps the menu page and menu data available when the connection drops.
const CACHE = 'cafe-v1'

self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', e => e.waitUntil(clients.claim()))

self.addEventListener('fetch', e => {
  const { request } = e
  const url = new URL(request.url)
  const cacheable =
    request.method === 'GET' &&
    url.origin === location.origin &&
    (url.pathname.startsWith('/_next/static') || url.pathname.startsWith('/t/') || url.pathname === '/api/menu')
  if (!cacheable) return

  e.respondWith(
    caches.open(CACHE).then(async cache => {
      const cached = await cache.match(request)
      const fresh = fetch(request)
        .then(res => {
          if (res.ok) cache.put(request, res.clone())
          return res
        })
        .catch(() => cached)
      return cached || fresh
    })
  )
})
