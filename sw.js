/* OrtoFly — Service Worker (a versão vive só no CACHE_NAME abaixo) */

const CACHE_NAME = 'ortofly-v61';
const HTML_ESPERA_MS = 3500;   // quanto a abertura espera a rede antes de usar a cópia do cache (escolha do app)

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
  './vendor/three/DRACOLoader.js', './vendor/three/draco/draco_decoder.wasm', './vendor/three/draco/draco_wasm_wrapper.js',   // o .glb do ODM vem com Draco
  './vendor/qrcode.js',   // QR do PIX gerado no app (offline)
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

  // App (HTML/navegação): network-first — pega a versão nova quando a rede responde
  // e cai no cache quando ela não responde. Evita ter de dar Ctrl+F5 a cada atualização.
  // v1.27.0 — três defeitos do ramo anterior, todos de uso em campo:
  //  · sem tempo-limite: com sinal que conecta e não responde, a abertura esperava o fetch
  //    desistir (dezenas de segundos) antes de usar o cache. Agora espera HTML_ESPERA_MS;
  //    a rede pode responder depois, e então a cópia nova entra no cache para a próxima vez
  //    (quem avisa que há versão nova é o banner do app_config, que compara versões);
  //  · gravava QUALQUER resposta: um 404/5xx substituía o app bom no cache. Só resposta ok entra;
  //    e resposta de erro com cópia boa no cache devolve a cópia;
  //  · sem ignoreSearch, a URL com ?… não achava o app no cache.
  if (isHTML) {
    const doCache = () => caches.match(event.request, { ignoreSearch: true });
    let gravou = Promise.resolve();
    const daRede = fetch(event.request).then(resp => {
      if (resp.ok) { const copia = resp.clone(); gravou = caches.open(CACHE_NAME).then(c => c.put(event.request, copia)); }
      return resp;
    });
    event.waitUntil(daRede.then(() => gravou).catch(() => {}));
    const espera = new Promise((_, rej) => setTimeout(() => rej(new Error('a rede não respondeu a tempo')), HTML_ESPERA_MS));
    event.respondWith(
      Promise.race([daRede, espera])
        .then(resp => (resp.ok || resp.type === 'opaqueredirect') ? resp : doCache().then(c => c || resp))   // redirecionamento de navegação passa direto
        .catch(() => doCache().then(c => c || daRede.catch(() => new Response('Offline', { status: 503 }))))
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
