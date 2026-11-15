// Service worker de Hestia : sans connexion, ouvrir l'app montre offline.html (la liste de courses
// gardée sur le téléphone, voir src/lib/shopping/saved.ts). Les emojis déjà vus sont gardés pour elle.
// Rien d'autre n'est mis en cache : en ligne, tout passe par le réseau comme avant.
const CACHE = 'hestia-offline-v1'

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.add('/offline.html')).then(() => self.skipWaiting()))
})

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim()),
  )
})

self.addEventListener('fetch', event => {
  const request = event.request
  if (request.method !== 'GET') return
  const url = new URL(request.url)
  if (url.origin !== self.location.origin) return

  if (request.mode === 'navigate') {
    event.respondWith(fetch(request).catch(() => caches.match('/offline.html')))
    return
  }
  // Emojis des articles : ils ne changent jamais
  if (url.pathname.startsWith('/emoji/')) {
    event.respondWith(
      caches.open(CACHE).then(cache => cache.match(request).then(hit => hit ?? fetch(request).then(response => {
        if (response.ok) cache.put(request, response.clone())
        return response
      }))),
    )
  }
})
