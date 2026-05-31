# Changelog — OrtoFly

Todas as mudanças notáveis neste projeto estão documentadas aqui.
Formato baseado em [Keep a Changelog](https://keepachangelog.com/pt-BR/1.0.0/).

---

## [1.8.4] — Maio 2026

### ✨ Melhorado — Processar: status de conexão ao vivo + dicas

- **Indicador 🟢/🔴 ao vivo** na aba Processar: mostra se o NodeODM está **conectado** (verde, com versão e fila) ou **desconectado** (vermelho), atualizando sozinho a cada 10s. No modo Local, orienta a rodar o atalho quando estiver fora do ar.
- **Dicas (tooltip)** nos botões de resultado (passe o mouse): o que é cada produto e como abrir a nuvem `.laz`.
- README ganhou a explicação dos **produtos gerados** (o que vem no `all.zip`).

---

## [1.8.3] — Maio 2026

### 🆕 Adicionado — Processar: opção "Gerar DSM"

- Nova opção **"Gerar DSM"** ao criar a tarefa: o ODM **só produz o DSM (modelo de superfície) se solicitado** (`--dsm`). Marque para obter o DSM — usa o **modo completo** (desliga o "Rápido", mais lento). A nuvem de pontos `.laz` continua sendo gerada sempre.
- Mensagem mais clara quando o DSM não está no pacote (orienta a marcar a opção).

---

## [1.8.2] — Maio 2026

### 🐛 Correção — Processar: abrir resultados do NodeODM

- Algumas versões do NodeODM (ex.: 2.2.x) **só permitem baixar o pacote `all.zip`** (os arquivos individuais como `orthophoto.tif` retornavam "Invalid asset" — por isso o visualizador ficava em "Lendo… (0 MB)"). Agora o app **baixa o `all.zip` e extrai** o ortomosaico/DSM/nuvem no próprio navegador (JSZip) — **🗺️ Ortomosaico (2D)**, **⛰️ DSM (2D)** e **⬇ Nuvem (.laz)** voltam a funcionar.
- Ortomosaicos grandes podem demorar a abrir no navegador (memória) — alternativa: **⬇ Tudo (.zip)** e abrir no QGIS.

---

## [1.8.1] — Maio 2026

### 🐛 Correção
- **Modo Local (Processar):** a URL padrão agora é `http://127.0.0.1:3000` (em vez de `localhost`). É mais confiável, porque `localhost` pode resolver para IPv6 (`::1`) e não conectar em alguns ambientes (ex.: NodeODM em Docker no WSL2); `127.0.0.1` é sempre IPv4.

---

## [1.8.0] — Maio 2026

### 🆕 Adicionado — Processar: **PC Local e/ou Servidor (VM)**

- A aba **⚙️ Processar** agora tem um seletor **💻 PC Local / ☁️ Servidor (VM)**: rode o NodeODM no seu **próprio PC (Docker)** **ou** numa **VM na nuvem** (ex.: Oracle Cloud grátis, exposta por HTTPS/Cloudflare Tunnel) — o que preferir. A **URL de cada modo fica salva separadamente**, então dá para ter os dois configurados e alternar com um clique.
- Quem quiser usar só um, configura só aquele — nada obrigatório.
- CSP liberou `https:` no `connect-src` para o app falar com o NodeODM da VM por **HTTPS** (o local continua via `http://localhost`).

> Lembrete: `http://` simples só funciona com `localhost` (regra do navegador). Para um servidor remoto, use **HTTPS** (ex.: Cloudflare Tunnel). Guia de VM grátis em `docs/`.

---

## [1.7.0] — Maio 2026

### 🆕 Adicionado — Fase 5 (início): módulo "Processar" (NodeODM)

- Nova aba **⚙️ Processar**: conecta a um servidor **NodeODM** (no seu PC, via Docker), faz **upload das fotos**, **cria a tarefa**, **acompanha o progresso** e, ao concluir, **abre o ortomosaico/DSM no visualizador 2D** (e baixa nuvem `.laz` / `.zip`).
- A tarefa fica salva (reabre/retoma o acompanhamento após recarregar).
- CSP liberou `http://localhost` para o app falar com o NodeODM local.

> É o primeiro passo da Fase 5 (backend). Próximos: GCPs/qualidade, fila, TiTiler para orthos grandes, e atualização dos documentos de privacidade (imagens passam por um servidor).

---

## [1.6.5] — Maio 2026

### 🐛 Correções
- O **raster (GeoTIFF) sumia ao trocar para o mapa OSM** — agora ele fica numa camada própria **acima de qualquer mapa-base**, então dá para sobrepor o raster tanto no **Satélite (Esri)** quanto no **Mapa (OSM)**.

---

## [1.6.4] — Maio 2026

### ✨ Melhorado — GeoTIFF YCbCr (JPEG)

- A visualização 2D agora **detecta GeoTIFF/COG em YCbCr** (compressão JPEG — comum em orthos grandes, ex.: OpenAerialMap) e faz a **conversão YCbCr→RGB**, corrigindo o "verde/rosa". GeoTIFF RGB normal continua igual.

---

## [1.6.3] — Maio 2026

### 🐛 Correções
- Versão no rodapé "piscava" (mostrava a nova e voltava para a antiga): o cache do número lido do `CHANGELOG.md` agora é **invalidado quando o código é atualizado**, então o rodapé reflete a versão realmente carregada.

---

## [1.6.2] — Maio 2026

### 🐛 Correções
- **Visualização 2D de GeoTIFF/COG:** cores corrigidas (saíam verde/rosa) — o app agora mapeia explicitamente **banda 0/1/2 como R/G/B**, com transparência por alpha/nodata e auto-escala 8/16-bit (combina com a cor natural do QGIS).
- O status do raster mostra o **tamanho do arquivo** (GeoTIFFs grandes podem demorar a decodificar no navegador — é esperado).

---

## [1.6.1] — Maio 2026

### ✨ Melhorado — Rumo estimado pelo trajeto GPS

- Quando o EXIF **não traz o rumo (yaw)**, o app agora **estima a direção de cada foto pelo trajeto** (direção de uma foto para a próxima no tempo) e gira as fotos corretamente. Antes, sem yaw, todas ficavam "norte acima" e o mosaico saía estilhaçado.
- O status mostra a origem do rumo: **rumo EXIF**, **rumo do trajeto** ou **sem rumo**.

---

## [1.6.0] — Maio 2026

### ✨ Melhorado — Mosaico rápido mais limpo

- Cada foto entra no mosaico usando só o **miolo (80% central)** — reduz bordas, vinheta e distorção nas emendas.
- Mais fontes de **rumo (yaw)** no EXIF: `GimbalYawDegree` → `FlightYawDegree` → `GPSImgDirection`, para girar as fotos quando o dado existe.
- O status do mosaico passa a mostrar **"rumo N/total"** (quantas fotos têm rumo) — ajuda a diagnosticar mosaicos desencontrados.

> Lembrete: o mosaico rápido (por GPS) é um **preview de cobertura, não métrico**, e tem limites em áreas urbanas (relevo de prédios). O ortomosaico costurado e métrico depende do processamento fotogramétrico rigoroso (backend — fase futura).

---

## [1.5.0] — Maio 2026

### ✨ Melhorado — Mosaico usa a câmera do EXIF

- O **mosaico rápido** agora calcula a escala da câmera **direto do EXIF das fotos** (focal real + `FocalLengthIn35mmFormat` + dimensões) — **não é mais preciso selecionar o drone nem digitar specs de sensor**. A câmera selecionada em Drone/Câmera vira apenas reserva quando o EXIF não traz a informação.

---

## [1.4.1] — Maio 2026

### 🐛 Correções
- "Área p/ envoltória" (gerar AOI a partir das fotos) não dependia mais de um diálogo de confirmação que podia ser cancelado por engano — agora cria a área direto, vai para a aba ✈️ Voo e avisa.

---

## [1.4.0] — Maio 2026

### ✨ Melhorado — Interface em abas

- Painel lateral reorganizado em **3 abas** (✈️ Voo · 📷 Imagens · 🗺️ Visualizar), com **barra de Projeto fixa** no topo (nome + salvar + novo). Ao planejar, os controles de voo voltam para o topo.
- Lista de projetos e **exportar/importar JSON** movidos para o modal **📂 Projetos** (header).

---

## [1.3.3] — Maio 2026

### 🐛 Correções
- Clique nos botões sobre o mapa (✏️ 🗑️ 📍 e Concluir/Cancelar) não vira mais um vértice nem move o mapa — propagação do clique para o Leaflet bloqueada (`disableClickPropagation`).

---

## [1.3.2] — Maio 2026

### 🐛 Correções
- Botões do mapa (✏️ desenhar, 🗑️ limpar, 📍 localizar) reposicionados — não ficam mais escondidos atrás do controle de zoom do Leaflet.
- AOI de exemplo (talhão) passa a aparecer de forma consistente quando não há projeto salvo (removida trava que mostrava só uma vez).

---

## [1.3.1] — Maio 2026

### 🐛 Correções
- Título da página alinhado ao nome do app (manifest) — remove a duplicação "título/subtítulo" no PWA instalado.

---

## [1.3.0] — Maio 2026

### 🆕 Adicionado — Fase 4: Visualizador 2D/3D

- **Visualização 2D** de **GeoTIFF/COG** (ortomosaico RGB ou DSM/DTM) sobre o mapa, com paleta de cores para banda única (terreno/viridis/cinza) e opacidade.
- **Visualizador 3D** (three.js) para **nuvem de pontos (LAS, PLY)** e **malha 3D (OBJ, glTF/GLB, PLY)** — órbita, tamanho de ponto, wireframe, recentralizar e fundo claro/escuro.
- Parser **LAS próprio** (sem dependência) com cor RGB ou por elevação e subamostragem automática de nuvens grandes.
- Banco de câmeras: adicionado **Phantom 4 / 3 (FC330)**.

> Abre os resultados de fotogrametria (Pix4D/ODM/DroneMapper) em formatos abertos. `.laz` comprimido ainda não é suportado (exporte LAS/PLY); glTF/GLB recomendado para malha texturizada.

---

## [1.2.0] — Maio 2026

### 🆕 Adicionado — Fase 3: Mosaico rápido local (GPS/EXIF)

- **Mosaico rápido** que posiciona as fotos importadas pelo **GPS, rumo (yaw) e altitude** e as compõe sobre o mapa (overlay com controle de opacidade).
- Escala calculada pela câmera selecionada; opção de **usar o rumo** das fotos e de **resolução** (rápida/média/alta).
- **Exportação georreferenciada**: PNG + *world file* (`.pgw`, EPSG:4326) em um `.zip` — pronto para abrir no QGIS.
- Leitura adicional do **yaw** (`GimbalYawDegree`/`FlightYawDegree`) no EXIF/XMP das fotos.

> Pré-mosaico **não métrico** (alinhamento pela precisão do GPS). Para produtos métricos rigorosos (ortomosaico, DSM/DTM), o processamento fotogramétrico fica para o backend (fase futura).

---

## [1.1.0] — Maio 2026

### 🆕 Adicionado — Fase 2: Importação de imagens & EXIF

- Importação de fotos de drones DJI (múltiplos arquivos) com leitura de **EXIF/GPS** via `exifr`.
- Plotagem dos **centros das fotos no mapa** + **trilha de voo** (ordem temporal) e popup com miniatura, modelo, altura e data.
- Resumo das imagens (nº com GPS, modelos, faixa de altura e data) e lista clicável que centraliza a foto no mapa.
- **Definir a área (AOI) pela envoltória convexa** das fotos — útil para replanejar voos sobre a mesma região.
- Exportação dos **centros de foto em GeoJSON**.

> As imagens são lidas localmente no navegador (não são enviadas a servidores) e mantidas apenas durante a sessão.

---

## [1.0.0] — Maio 2026

### 🚀 Lançamento inicial — Módulo de Planejamento de Voo

- Desenho de área de interesse (AOI) sobre mapa de satélite (Esri) ou OpenStreetMap.
- Banco de câmeras de drones DJI (Mini 3/4 Pro, Air 3 / 3S, Mavic 3 / Classic / 3E, Phantom 4 Pro/RTK e outros).
- Calculadora fotogramétrica: GSD (cm/px), altura de voo, pegada no solo, espaçamento entre fotos e linhas a partir das sobreposições longitudinal e lateral.
- Geração da grade de mapeamento (lawnmower) recortada na área, com opção de grade cruzada (cross-grid) e direção das linhas automática/manual.
- Estimativas: número de fotos, número de linhas, distância total, tempo de voo e número de baterias.
- Exportação de missão em **KMZ (WPML, DJI Pilot 2)**, **KML**, **GeoJSON** e **CSV (Litchi)**.
- Sistema de projetos nomeados em `localStorage`, com exportação/importação em JSON e projeto de exemplo.
- PWA instalável (Android, iOS, desktop) com funcionamento offline via Service Worker.
- Sistema de avaliações compartilhadas e apoio via PIX.
- Documentação de conformidade legal (LGPD, segurança, acessibilidade, inventário de dados).

---

*© 2026 MGC Dev — Marlon Gomes da Costa · Projeto pessoal e independente*
