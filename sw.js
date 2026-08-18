/* OrtoFly — Service Worker v1.20.1 */

const CACHE_NAME = 'ortofly-v45';

// Tudo que o app precisa para funcionar OFFLINE (uso em campo, sem sinal):
// libs self-hosted (vendor/) + manifest + ícones. O HTML fica de fora da
// lista porque é network-first e entra no cache a cada visita online.
const PRECACHE = [
  './manifest.json', './icon-192.png', './icon-512.png',
  './vendor/leaflet/leaflet.css', './vendor/leaflet/leaflet.js',
  './vendor/leaflet/images/layers.png', './vendor/leaflet/images/layers-2x.png',
  './vendor/leaflet/images/marker-icon.png', './vendor/leaflet/images/marker-icon-2x.png',
  './vendor/leaflet/images/marker-shadow.png',
  './vendor/jszip.min.js', './vendor/supabase.js', './vendor/exifr.umd.js',
  './vendor/geotiff.min.js', './vendor/georaster.min.js', './vendor/georaster-layer.min.js',
  './vendor/three/three.min.js', './vendor/three/OrbitControls.js', './vendor/three/PLYLoader.js',
  './vendor/three/MTLLoader.js', './vendor/three/OBJLoader.js', './vendor/three/GLTFLoader.js',
  './vendor/laz-perf/index.mjs', './vendor/laz-perf/laz-perf.wasm'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(c => c.addAll(PRECACHE)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    ).then(() => clients.claim())
  );
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  if (!event.request.url.startsWith(self.location.origin)) return;

  const isHTML = event.request.mode === 'navigate' || event.request.url.includes('ortofly.html');

  // App (HTML/navegação): network-first — sempre pega a versão nova quando online
  // e cai no cache só se estiver offline. Evita ter de dar Ctrl+F5 a cada atualização.
  if (isHTML) {
    event.respondWith(
      fetch(event.request).then(response => {
        const clone = response.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        return response;
      }).catch(() => caches.match(event.request).then(c => c || new Response('Offline', { status: 503 })))
    );
    return;
  }

  // Demais recursos do mesmo origin (vendor/, manifest, ícones, docs): cache-first,
  // com fallback na rede — e o que vier da rede entra no cache p/ a próxima vez.
  event.respondWith(
    caches.match(event.request).then(cached => {
      return cached || fetch(event.request).then(response => {
        if (response.ok) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        }
        return response;
      }).catch(() => new Response('Offline', { status: 503 }));
    })
  );
});
