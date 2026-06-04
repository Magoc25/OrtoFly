# Changelog — OrtoFly

Todas as mudanças notáveis neste projeto estão documentadas aqui.
Formato baseado em [Keep a Changelog](https://keepachangelog.com/pt-BR/1.0.0/).

---

## [1.14.0] — Junho 2026

### ✨ Coletar pontos clicando no mapa (Fase 2 — etapa A)

- Botão **📍 Coletar pontos no mapa** na ferramenta de estatística: ative e **clique no mapa** para adicionar pontos — cada clique vira uma linha `P1, lat, lon` na caixa, com um **pino numerado** de confirmação. O contador aparece no botão; **Esc** ou clicar de novo conclui.
- Ideal para pontos **visíveis na ortho** (não precisa de GPS). Os pontos coletados entram no mesmo fluxo (raio, UTM, ajuste por GCP, exports). Próxima etapa (B): **índices de vegetação por RGB** (VARI/GLI/NGRDI/ExG).

---

## [1.13.1] — Junho 2026

### 🐛 Correções na exportação de imagem

- A **figura PNG** agora respeita o **estilo de círculo** escolhido na tela (Círculo, Pontilhado, Círculo + cruz, Círculo + ponto) — antes saía sempre sólido com ponto no centro.
- O **LEIA-ME** do `.zip` foi ampliado: deixa claro que é um **PNG georreferenciado** (raster + world file), que abre direto no QGIS e serve para mapas/figuras, e que **não** é um GeoTIFF — para um GeoTIFF corrigido "de verdade" (cabeçalho/CRS reescrito), use o QGIS (Georeferencer).

---

## [1.13.0] — Junho 2026

### ✨ Exportar imagem, M&M e melhorias na estatística por pontos

- **Exportar imagem (PNG + worldfile):** novo botão no visualizador 2D baixa o raster como **PNG georreferenciado** (com `.pgw`), usando a **georreferência atual — já com a correção por pontos de controle**, se aplicada. Resolve o "preciso baixar a imagem corrigida".
- **Figura com pontos:** na ferramenta de estatística, botão **⬇ Figura PNG (com pontos)** gera uma imagem com os **buffers e os nomes** desenhados — pronta para a metodologia de um trabalho.
- **Botões 📝 M&M (Material e Métodos):** cada ferramenta que entrega produto agora gera um **texto pronto de Material e Métodos** descrevendo como foi processado — na **estatística por pontos**, no **ajuste por pontos de controle** e no **ortomosaico** (aba Processar). Na aba Processar, o **M&M** ficou **separado** do **Como citar** (padronização).
- **Estatística por pontos:** botão renomeado para **"Buffer e Estatísticas"**; a tabela de resultados agora tem **altura fixa com rolagem** (cabeçalho fixo) para não empurrar os botões; e novo export em **TXT (separado por tabulação)** — ordem **CSV · TXT · GeoJSON**.

---

## [1.12.0] — Junho 2026

### ✨ Ajuste por pontos de controle (GCP) — corrige pontos ou o ortomosaico

- Nova seção **📐 Ajuste por pontos de controle** (opcional) na ferramenta de estatística. Você informa pares **de → para** (coordenada errada → verdadeira, ex.: **RTK**) e o app calcula a transformação: **1 par = deslocamento; 2+ = Helmert** (deslocamento + rotação + escala) por mínimos quadrados, mostrando o **resíduo (RMS)**.
- **Dois alvos, à sua escolha:** aplicar o ajuste aos **pontos** (ex.: marcados com GPS de mão tipo Garmin, depois corrigidos por um ponto RTK conhecido) **ou deslocar o próprio ortomosaico** no mapa (útil quando a ortho do drone, sem GCP, está deslocada alguns metros do real).
- Os pontos de controle podem ser **digitados** (lat/lon ou UTM) ou **clicados na imagem** (botão "📍 Clicar o ponto 'de' no mapa"), reaproveitando a feição visível na ortho. Ao aplicar/remover o ajuste, a estatística é reamostrada automaticamente.
- ℹ️ O ajuste corrige o erro **sistemático** (deslocamento/rotação/escala). O ruído **aleatório** de cada leitura de GPS de mão não é removido — para isso, várias leituras (média) ou RTK.

---

## [1.11.2] — Junho 2026

### ✨ Estatística por pontos — estilos de marcador e correção de X/Y trocados

- **Cor e estilo dos círculos** configuráveis: seletor de **cor** + **estilo** (Círculo, Pontilhado, Círculo + cruz no centro, Círculo + ponto no centro). Muda na hora, sem recalcular.
- **Correção automática de X/Y invertidos:** o app testa a ordem informada e a ordem trocada e usa a que **cai dentro do raster**. Em UTM já detectava E/N pela magnitude (Norte ≫ Este); agora também corrige **lat/lon trocados** em coordenadas geográficas. Quando corrige, avisa no status (`⚠️ X/Y trocados corrigidos`) e no popup do ponto.
- Os círculos continuam em **tamanho real** (raio em metros no terreno).

---

## [1.11.1] — Junho 2026

### 🐛 Estatística por pontos — aceita coordenadas UTM e SIRGAS 2000

- A ferramenta **📊 Estatística por pontos** agora aceita também **coordenadas projetadas (E, N em metros)**, além de lat/lon — detecta o formato e a ordem (E,N / N,E) **automaticamente** pela magnitude. Antes só lat/lon era aceito, o que dava erro com pontos de topografia em UTM.
- Reconhece **SIRGAS 2000 / UTM (zonas 18S–25S, EPSG 31978–31985)**, padrão em topografia no Brasil — antes só UTM WGS84 (EPSG 326xx/327xx) era suportado, e rasters em SIRGAS caíam em "CRS não suportado".
- Para pontos em E,N a estatística é calculada **direto nos pixels** (sem reprojetar), então funciona mesmo com CRS pouco comum; quando o CRS do raster é conhecido (UTM), os pontos são convertidos para lat/lon para **desenhar os círculos no mapa** e exportar **GeoJSON** (WGS84). O **CSV** agora traz também as colunas `x, y` (coordenadas no CRS do raster).

---

## [1.11.0] — Junho 2026

### ✨ Nova ferramenta — Estatística por pontos (zonal) sobre o raster

- Na aba **📷 Imagens**, abaixo do visualizador 2D, chega a **📊 Estatística por pontos**: informe pontos (`lat, lon`, um por linha, com nome opcional) e um **raio de buffer (m)**, e o app amostra os pixels do **raster carregado** (ortomosaico, DSM ou um índice como NDVI) dentro de cada círculo, calculando **n, média, desvio-padrão, mín, máx e mediana por banda** — equivalente à *estatística zonal* do QGIS, só que no navegador.
- Os **círculos** são desenhados no mapa (verde = com dados, vermelho = sem) com a média no popup, e os resultados saem em **CSV** e **GeoJSON** para levar ao QGIS/Excel/relatório.
- Reprojeção feita no próprio app (lat/lon → UTM/WGS84 ou EPSG:4326/3857, sem biblioteca extra), respeitando **nodata** e a **transparência (alfa)** do raster. Para NDVI "de verdade" é preciso um raster com banda de infravermelho (drone multiespectral) ou um índice já pronto; com ortho RGB, em breve será possível gerar índices por RGB no próprio app.

---

## [1.10.3] — Junho 2026

### 🐛 Corrigido — satélite (Esri) sumindo ao dar zoom

- **A imagem de satélite não desaparece mais ao aproximar** em várias regiões do Brasil. O Esri World Imagery só tem imagem nativa até ~z17 em muitas **áreas rurais**; ao pedir um zoom maior, o servidor devolvia um tile **em branco**. Agora o `maxNativeZoom` foi ajustado para **17** e, acima disso, o mapa **estica o último tile disponível** (overzoom) — fica um pouco menos nítido no zoom máximo, mas **continua visível** em vez de sumir.

---

## [1.10.2] — Junho 2026

### ✨ Interface mais clara e documentação revisada

- **Abas "Imagens" e "Ver" unificadas** em uma única aba **📷 Imagens**: importação de fotos + EXIF, mosaico rápido e o visualizador de resultados (2D GeoTIFF/COG e 3D nuvem/malha) agora ficam juntos. As abas passam a ser **✈️ Voo · 📷 Imagens · ⚙️ Processar**.
- **Botão do GSD renomeado** para **"→ Altura de voo"** (antes "↳ altura", cujo símbolo podia ser lido como "l,"). Ele calcula a altura de voo a partir do **GSD desejado** — não é largura × altura.
- **Documentação revisada e reorganizada:** README atualizado para o fluxo atual (todas as fases entregues, não mais "em desenvolvimento"); guias passo a passo (`Boas-Praticas`, `Guia-Local-Windows`, `Guia-Local-macOS`) movidos para a raiz; pasta `docs/` reservada para documentos arquivados.

---

## [1.10.1] — Junho 2026

### 🐛 Corrigido — conexão com o NodeODM local no Chrome/Edge (e aviso do Safari)

- **NodeODM local (`127.0.0.1`) agora só conecta após clicar em "Testar".** O app não fica mais tentando conexões automáticas (no carregamento, ao digitar a URL e no monitor a cada 10 s) antes de um gesto do usuário.
- **Por quê:** o Chrome/Edge passaram a exigir uma **permissão de "rede local"** para um site `https://` acessar o `127.0.0.1`. As requisições **automáticas** eram **bloqueadas sem mostrar o aviso** (erro *"Permission was denied… loopback address space"* / "Failed to fetch"). Disparando a conexão **só no clique em "Testar"**, o navegador exibe o aviso de forma limpa → o usuário clica **Permitir** uma vez e conecta. A autorização fica salva (e a permissão do Chrome persiste por site), então o status ao vivo volta a atualizar sozinho nas próximas vezes.
- **Guia macOS atualizado** (`Guia-Local-macOS-NodeODM.md`): use **Chrome/Edge** (o **Safari bloqueia** `https://→http://127.0.0.1` e não há como liberar), clique em **Permitir** no aviso de rede local, e como **reverter** caso tenha clicado em "Bloquear".

---

## [1.10.0] — Junho 2026

### ✨ Fluxo limpo de projeto — Salvar/Descartar (corrige a instabilidade do NodeODM local)

- **Ao concluir um processamento**, agora há **💾 Salvar no projeto** e **🗑️ Descartar**:
  - **Salvar** guarda o ortomosaico/DSM/nuvem **dentro do app** (IndexedDB) e **apaga a tarefa do NodeODM**, liberando o disco do servidor. O projeto salvo abre **offline** (não precisa do NodeODM ligado) e aparece com 🗺️ na lista de projetos.
  - **Descartar** apaga as fotos e produtos da tarefa **do NodeODM** (libera o disco) sem salvar.
- **Excluir projeto** agora também apaga os produtos salvos do app. Aviso ao **sair com processamento não salvo**.
- **Por quê:** o "🗑️ Limpar" anterior só sumia com o card — **não apagava a tarefa do NodeODM**, que acumulava as fotos + ~2,5 GB de intermediários por tarefa e **enchia o disco**, derrubando o NodeODM local ("desconectado" / "Failed to fetch"). Agora o sistema fica limpo: nada permanece no servidor sem você querer.

---

## [1.9.7] — Junho 2026

### ✨ Melhorado — barras de progresso e ajustes

- **Mosaico rápido (Imagens):** **barra de progresso com %** durante a geração (antes só "145/340"). E o **"Usar rumo" virou padrão fixo** (a melhora era pequena) — checkbox removido.
- **Processar:** **barra de progresso verde com %** enquanto a tarefa processa. O card **Tarefa** ganhou **🗑️ Limpar** para dispensar a tarefa antiga (ela fica salva entre sessões para não perder os resultados ao recarregar — agora dá pra remover). Corrigido o "0%" que aparecia em tarefa já **concluída**.

---

## [1.9.6] — Junho 2026

### 🐛 Correção

- Removida a **bolinha (●) duplicada** ao lado do indicador de conexão — agora aparece só **🟢 Conectado / 🔴 Desconectado** (o ícone verde/vermelho já vem no próprio texto).

---

## [1.9.5] — Junho 2026

### 🐛 Correção

- Indicador de conexão da aba Processar mais **limpo**: mostra só **🟢 Conectado / 🔴 Desconectado** (removido o texto extra "rode o atalho…" que quebrava de linha e parecia um segundo botão).

---

## [1.9.4] — Maio 2026

### 🆕 Adicionado — "Como citar" (app + ODM)

- Botão **📑 Como citar** na aba Processar: gera a citação do **OrtoFly e do OpenDroneMap (ODM)** em **ABNT, APA e BibTeX** (+ texto pronto de "Material e Métodos"), com **Copiar** em cada formato. A versão do ODM entra automaticamente quando você está conectado.

---

## [1.9.3] — Maio 2026

### ✨ Melhorado — avisos e documentação

- Aba **Imagens**: aviso de que o **🧩 Mosaico rápido (GPS)** é só um **preview aproximado** — para o mosaico **alinhado e métrico**, usar a aba **⚙️ Processar** (NodeODM).
- Novo **Guia de Boas Práticas e Qualidade** (voo, sobreposição, Rápido vs Completo, precisão/confiabilidade do ODM, "por que usar o OrtoFly") — linkado no README.

---

## [1.9.2] — Maio 2026

### 🐛 Correção — visualizador 3D de `.laz` (CSP)

- O decodificador WASM (laz-perf, compilado com Emscripten) usa **avaliação dinâmica de JS** — foi preciso liberar `'unsafe-eval'` no CSP. Agora o **🧊 Nuvem (3D)** decodifica o `.laz`. Os dados continuam **100% locais** (a mudança afeta só a política de scripts, não o tratamento de dados).

---

## [1.9.1] — Maio 2026

### 🐛 Correção — visualizador 3D de `.laz`

- Corrigido o carregamento do **laz-perf**: agora usa a build **web** (a anterior puxava a build Node, que usa `fs` e falha no navegador) e aponta o `.wasm` explicitamente. O **🧊 Nuvem (3D)** deve abrir o `.laz`. Mensagem de erro também ficou mais detalhada.

---

## [1.9.0] — Maio 2026

### 🆕 Adicionado — Visualizador 3D de nuvem `.laz`

- O visualizador 3D agora **abre nuvens de pontos `.laz`** (comprimidas) direto no app — decodifica no navegador via **laz-perf** (WebAssembly). Nos resultados do Processar, o botão virou **🧊 Nuvem (3D)** e abre na hora.
- CSP liberou `'wasm-unsafe-eval'` (necessário para o WebAssembly do decodificador).

> Nuvens muito grandes podem pesar no navegador — nesses casos, baixe o pacote (⬇ Tudo .zip) e use o CloudCompare/QGIS.

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
