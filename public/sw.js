const CACHE_NAME = 'textileops-v1.3.18'
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png',
  '/favicon.png'
]

self.addEventListener('install', (event) => {
  self.skipWaiting()
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS).catch((err) => console.warn('PWA cache warning:', err))
    })
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key)
          }
        })
      )
    }).then(() => self.clients.claim())
  )
})

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting()
  }
})

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url)

  if (
    event.request.method !== 'GET' ||
    url.hostname.includes('supabase.co') ||
    url.hostname.includes('google.com') ||
    url.hostname.includes('googleapis.com') ||
    url.hostname.includes('script.google.com') ||
    url.hostname.includes('telegram.org') ||
    url.pathname.startsWith('/api/')
  ) {
    return
  }

  // Network-First Strategy for HTML, JS, CSS, and Assets
  event.respondWith(
    fetch(event.request)
      .then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
          const responseToCache = networkResponse.clone()
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache)
          })
        }
        return networkResponse
      })
      .catch(async () => {
        // Fallback to cache if offline
        const cached = await caches.match(event.request)
        if (cached) return cached
        if (event.request.mode === 'navigate') {
          return caches.match('/index.html') || caches.match('/')
        }
      })
  )
})

