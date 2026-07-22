# vendor/ — bibliotecas self-hosted do OrtoFly

Cópias **pinadas** das libs que antes vinham de CDN (cdnjs/jsdelivr). Motivo:
o Service Worker só cacheia o próprio domínio — com CDN, o app "offline" morria
quando o cache HTTP expirava (crítico em campo, sem sinal). Self-hosted, o SW
pré-cacheia tudo (`PRECACHE` no `sw.js`) e o app funciona offline de verdade
após a primeira visita. Também elimina o risco de uma lib "latest" mudar sozinha.

| Arquivo(s) | Lib | Versão | Origem |
|---|---|---|---|
| `leaflet/leaflet.{css,js}` + `leaflet/images/` | Leaflet | 1.9.4 | cdnjs |
| `jszip.min.js` | JSZip | 3.10.1 | cdnjs |
| `supabase.js` | @supabase/supabase-js (UMD) | 2.110.8 | jsdelivr |
| `exifr.umd.js` | exifr (full UMD) | 7.1.3 | jsdelivr |
| `georaster.min.js` | georaster (browser bundle) | 1.6.0 | jsdelivr |
| `georaster-layer.min.js` | georaster-layer-for-leaflet | 4.1.2 | jsdelivr |
| `three/three.min.js` + `three/*.js` | three.js (+ OrbitControls, PLY/MTL/OBJ/GLTF loaders) | 0.128.0 | jsdelivr |
| `laz-perf/index.mjs` + `laz-perf/laz-perf.wasm` | laz-perf (build ESM do jsdelivr; autocontido) | 0.0.6 | jsdelivr `+esm` |

## Como atualizar uma lib

1. Baixe a versão nova da mesma origem — **no terminal** (PowerShell ou Git Bash),
   dentro da pasta do projeto, por exemplo:
   ```
   curl -L https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.5/leaflet.min.js -o vendor/leaflet/leaflet.js
   ```
   (isso é um comando para executar, não um arquivo para editar)
2. Atualize a **tabela acima** com a versão nova.
3. Bumpe o `CACHE_NAME` no `sw.js` (senão os usuários continuam com a versão
   antiga pré-cacheada) e siga o fluxo normal de release.
4. Rode `node check.js` e dê push — o CI (checks.yml) valida o boot.

⚠️ Ao adicionar/remover arquivo daqui, mantenha a lista `PRECACHE` do `sw.js`
em dia — o `check.js` confere se todo arquivo listado existe no disco.
