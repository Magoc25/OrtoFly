/*
  tests/smoke.js — Smoke-test do OrtoFly via jsdom (degrau 2 · roda no GitHub Actions)

  Sobe o ortofly.html num DOM simulado (jsdom), SEM navegador e SEM as libs de
  CDN (Leaflet vira um stub), e verifica que o app:
    - inicializa sem exceção (boot + AOI de exemplo);
    - gera o plano de voo (GSD, grade, waypoints) e preenche os Resultados;
    - exporta KML/GeoJSON com conteúdo coerente e monta o template WPML;
    - gera o CSV/TXT da estatística zonal com TODAS as linhas do tamanho do
      cabeçalho (inclusive a de um ponto com erro) e o LEIA-ME com as mesmas
      colunas — esquema derivado, nunca remontado (guia r71b);
    - mantém os índices de vegetação nos três lugares em sincronia
      (VEG_INDICES × VEG_DESC × opções do seletor), com cada fonte provando que
      não secou — conjunto vazio satisfaz "mesmos conjuntos" de graça (guia r90c);
    - mostra a versão embutida no rodapé e o modal beta da 1ª abertura;
    - na aba Processar, com a URL que o próprio app sugere, diz a CAUSA de cada
      falha por navegador — Safari (recusa http:// a partir de https, até no
      próprio computador) × Chrome (pede permissão) — e o aviso do Safari some
      se um Testar conectar (guia r112/r113);
    - e cada EXEMPLO de dado que o app sugere (pontos, GCP, GSD), lido do DOM e
      usado como aparece na tela, dá o resultado certo (guia r125);
    - e, por regex sobre o HTML FONTE, que nenhum espelho de estado nasce com o
      valor dentro (guia r72a/r74b — a asserção dinâmica não enxerga isso).

  REGRA DE LEITURA (guia r74a/r91d): toda leitura de estado ou de DOM passa por
  ev()/txt()/val()/has(), que devolvem `undefined` em vez de estourar. Motivo: uma
  mutação que renomeia um id fazia `getElementById(...).textContent` lançar e MATAR
  o processo — sem nenhum "FALHA" no stdout, indistinguível de "passou". Por isso
  também: exceção que escapa é veredito PRÓPRIO (INCONCLUSIVO), nunca verde.

  ONDE RODA: no GitHub Actions (workflow checks.yml), que instala o jsdom só lá —
  este repositório NÃO tem package.json/node_modules de propósito (OneDrive).

  PARA RODAR NO SEU PC (opcional — terminal, PowerShell ou Git Bash):
      npm install --prefix "$env:TEMP\ortofly-smoke" jsdom@24      (1ª vez)
      $env:NODE_PATH="$env:TEMP\ortofly-smoke\node_modules"; node tests/smoke.js
  Sai com código 0 se tudo ok; 1 se houver falha.
*/
'use strict';
const fs = require('fs');
const path = require('path');
const { JSDOM, VirtualConsole } = require('jsdom');

const file = process.argv[2] || path.join(__dirname, '..', 'ortofly.html');
const html = fs.readFileSync(file, 'utf8');

const problems = [];
const check = (name, cond) => { if (cond) console.log('ok     ' + name); else { console.error('FALHA  ' + name); problems.push(name); } };

/* Exceção dentro de um handler ASSÍNCRONO do app (ex.: o catch do odmTest) vira
   promessa rejeitada sem tratamento — e o Node, por padrão, MATA o processo com
   código 1: igual a "N asserções falharam", só que tudo o que vinha depois nem
   roda (guia r74a — pego pela campanha da v1.22.1, que a acusou INCONCLUSIVA).
   Aqui ela vira registro: o cenário em que ocorre cobra as suas, e a checagem
   final cobra as de qualquer cenário, para nenhum deles ficar menos sensível. */
const rejeicoes = [];
process.on('unhandledRejection', e => rejeicoes.push('unhandledRejection: ' + ((e && e.message) || e)));

// erros que o app lançar dentro do jsdom (ex.: exceção no boot) chegam por aqui
const consoleErrs = [];
const vc = new VirtualConsole();
vc.on('jsdomError', e => consoleErrs.push('jsdomError: ' + ((e && e.message) || e)));
vc.on('error', (...a) => consoleErrs.push('console.error: ' + a.map(String).join(' ')));

// stub encadeável p/ o Leaflet: L.qualquer.coisa(...).outra(...) vira no-op
// (o app é desenhado p/ funcionar "sem mapa"; o stub só evita o ReferenceError
//  do L.divIcon avaliado no topo do script)
function chainProxy() {
  const t = function () {};
  const p = new Proxy(t, {
    get(_, prop) { if (prop === Symbol.toPrimitive) return () => ''; if (prop === 'then') return undefined; return p; },
    apply() { return p; },
    construct() { return p; }
  });
  return p;
}

async function main() {
  /* ── estáticas sobre o HTML FONTE (guia r72a/r74b) ───────────────────────────
     Aqui a dinâmica é cega por construção: com o placeholder trazendo o valor
     CORRENTE e o script que o escreve desligado, "o rodapé exibe a APP_VERSION"
     fica VERDE — o placeholder sozinho satisfaz a asserção, e o teste que existe
     para provar o r38 não prova nada. Quem defende a regra é a regex sobre o
     fonte, porque a regra vive no texto-fonte e o runtime já apagou a evidência
     quando a asserção dinâmica roda (r78c).
     A captura é impressa uma vez (r98): asserção baseada em extração que lê
     menos do que se imagina fica verde para sempre, e só o que ela CAPTUROU
     denuncia o truncamento. */
  const espelho = (html.match(/<span\s+id="appVersion"[^>]*>([^<]*)</) || [])[1];
  console.log('       [captura] espelho do rodapé = ' + JSON.stringify(String(espelho).slice(0, 120)));
  check('estática: o espelho do rodapé NÃO nasce com número de versão (r72a/r74b)',
    espelho !== undefined && !/\d+\.\d+/.test(espelho));

  /* Mesmo motivo, para a faixa de CRS: se o placeholder trouxesse um EPSG de
     exemplo, as asserções dinâmicas do cenário 3 ficariam verdes com o renderCRS()
     DESLIGADO — o placeholder sozinho as satisfaz. E um EPSG chumbado no HTML é
     pior que um número de versão velho: aqui ele mentiria sobre o sistema em que
     o usuário está medindo. Quem defende esta regra é a estática (r74b). */
  const espCrs = (html.match(/<b\s+id="crsCode"[^>]*>([^<]*)</) || [])[1];
  const espNome = (html.match(/<div class="crs-sub" id="crsName"[^>]*>([^<]*)</) || [])[1];
  console.log('       [captura] espelhos de CRS = ' + JSON.stringify(String(espCrs) + ' | ' + String(espNome)));
  check('estática: os espelhos de CRS NÃO nascem com código/nome de sistema (r72a/r74b)',
    espCrs !== undefined && espNome !== undefined &&
    !/EPSG|\d{4,5}/i.test(espCrs) && !/EPSG|UTM|SIRGAS|WGS/i.test(espNome));

  const dom = new JSDOM(html, {
    url: 'https://magoc25.github.io/OrtoFly/ortofly.html',   // origem real → localStorage funciona
    runScripts: 'dangerously',
    pretendToBeVisual: true,
    virtualConsole: vc,
    beforeParse(window) {
      window.L = chainProxy();
      window.fetch = () => Promise.reject(new Error('offline (stub do smoke)'));
      window.URL.createObjectURL = () => 'blob:stub';
      window.URL.revokeObjectURL = () => {};
      window.matchMedia = window.matchMedia || (() => ({ matches: false, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} }));
      window.scrollTo = () => {};
      window.structuredClone = window.structuredClone || structuredClone;
    }
  });
  const w = dom.window, doc = w.document;

  /* ── caminho tolerante (guia r74a/r91d) ──────────────────────────────────────
     Leitura que ESTOURA mata o processo e some com tudo que vinha depois — sem
     um "FALHA" sequer no stdout, o resultado é idêntico a um teste que passou.
     Aqui toda leitura devolve `undefined` no lugar da exceção, e quem depende
     dela vira um ✗ localizado. Vale para o `eval` E para o DOM: um id renomeado
     em `getElementById(id).textContent` lança antes de a asserção ser avaliada. */
  const evOf = win => expr => { try { return win.eval(expr); } catch (e) { problems.push('eval falhou: ' + expr + ' → ' + e.message); console.error('FALHA  eval: ' + expr + ' → ' + e.message); return undefined; } };
  const ev = evOf(w);
  const el = (d, id) => { try { return d.getElementById(id) || undefined; } catch (e) { return undefined; } };
  const txt = (d, id) => { const n = el(d, id); return n ? String(n.textContent) : undefined; };
  const val = (d, id) => { const n = el(d, id); return n ? String(n.value) : undefined; };
  const has = (d, id, cls) => { const n = el(d, id); return n ? n.classList.contains(cls) : undefined; };
  const qsa = (d, sel) => { try { return [...d.querySelectorAll(sel)]; } catch (e) { return []; } };

  // no jsdom o DOMContentLoaded/load dispara DEPOIS do construtor (assíncrono) — espera o boot completar
  await new Promise((res, rej) => {
    const t = setTimeout(() => rej(new Error('evento load não disparou em 5 s — boot travado?')), 5000);
    if (w.document.readyState === 'complete') { clearTimeout(t); res(); }
    else w.addEventListener('load', () => { clearTimeout(t); res(); });
  });

  /* boot */
  check('boot: script avaliado (state/APP_VERSION existem)', ev("typeof state==='object' && typeof APP_VERSION==='string'") === true);
  check('boot: AOI de exemplo carregada (4 vértices)', ev('state.polygon.length') === 4);
  check('boot: nome do projeto de exemplo', String(val(doc, 'projName')).includes('Exemplo'));

  /* plano de voo */
  check('plano: GSD calculado (> 0)', ev('!!state.lastPlan && isFinite(state.lastPlan.gsd) && state.lastPlan.gsd>0') === true);
  const wpCount = ev('state.lastPlan && state.lastPlan.grid ? state.lastPlan.grid.waypoints.length : 0');
  check('plano: grade com waypoints (> 10)', wpCount > 10);
  const oGsd = txt(doc, 'oGsd'), oPhotos = txt(doc, 'oPhotos');
  check('plano: Resultados preenchidos na UI', oGsd !== undefined && oGsd !== '—' && oPhotos !== undefined && oPhotos !== '—');

  /* rodapé (r38): versão exibida = APP_VERSION embutida.
     O valor lido fica numa variável ANTES de virar operando (r91d): `undefined`
     usado direto em concatenação/método decapita a fase inteira. */
  const appVer = ev('APP_VERSION'), rodape = txt(doc, 'appVersion');
  check('rodapé: versão embutida', typeof appVer === 'string' && rodape === '© MGC · v' + appVer);

  /* exports (captura o downloadBlob) */
  ev('window.__dl=[]; downloadBlob=(b,n)=>window.__dl.push({name:n,blob:b});');
  ev('exportKML()'); ev('exportGeoJSON()');
  const dl = w.__dl || [];
  check('exports: KML e GeoJSON baixados', dl.length === 2 && /\.kml$/.test(dl[0].name) && /\.geojson$/.test(dl[1].name));
  const readBlob = b => new Promise((res, rej) => { const fr = new w.FileReader(); fr.onload = () => res(fr.result); fr.onerror = () => rej(fr.error); fr.readAsText(b); });   // (o Blob do jsdom não tem .text())
  if (dl.length === 2) {
    const kml = await readBlob(dl[0].blob);
    check('KML: contém área e rota de voo', kml.includes('<kml') && kml.includes('Rota de voo') && kml.includes('</kml>'));
    const gj = JSON.parse(await readBlob(dl[1].blob));
    check('GeoJSON: área + rota + 1 ponto por waypoint', gj.features.length === 2 + wpCount && gj.features[0].properties.tipo === 'area');
  }
  check('WPML: template com missionConfig e waypoint 0', ev("buildTemplateKml(state.lastPlan).includes('wpml:missionConfig') && buildTemplateKml(state.lastPlan).includes('<wpml:index>0<')") === true);

  /* export da estatística zonal — o esquema tem de ser DERIVADO, não remontado (guia r71b):
     exige IGUALDADE (nenhuma coluna sobrando, nenhuma faltando), com um ponto com erro na mistura,
     que é justamente a linha que já saiu curta em relação ao cabeçalho. */
  ev(`_zonalResults={epsg:31983,radius:10,labels:['R','G','B'],geoInput:true,results:[
    {name:'P1',lat:-7.01,lon:-45.48,X:600000,Y:9224000,radius:10,n:12,error:null,bands:[
      {label:'R',n:12,mean:1,std:0.5,min:0,max:2,median:1},
      {label:'G',n:12,mean:1,std:0.5,min:0,max:2,median:1},
      {label:'B',n:12,mean:1,std:0.5,min:0,max:2,median:1}]},
    {name:'P2',lat:-7.99,lon:-45.99,X:1,Y:2,error:'ponto fora do raster'}]};`);
  const nCols = ev('ZONAL_COLS.length');
  const csvL = String(ev("_zonalRows(',')")).split('\n'), txtL = String(ev("_zonalRows('\\t')")).split('\n');
  check('zonal CSV/TXT: 1 cabeçalho + 3 bandas + 1 linha de erro', csvL.length === 5 && txtL.length === 5);
  check('zonal CSV: toda linha com o mesmo nº de colunas do cabeçalho', csvL.every(l => l.split(',').length === nCols));
  check('zonal TXT: toda linha com o mesmo nº de colunas do cabeçalho', txtL.every(l => l.split('\t').length === nCols));
  check('zonal LEIA-ME: lista de colunas idêntica ao cabeçalho', (String(ev("_zonalReadme('csv')")).match(/COLUNAS: (.+)/) || [])[1] === ev("ZONAL_COLS.join(' | ')"));

  /* índices de vegetação — varre TODAS as variantes, não só a que se está olhando (guia r71b) */
  const sorted = a => a.slice().sort().join(',');
  const idxKeys = [...(ev('Object.keys(VEG_INDICES)') || [])], descKeys = [...(ev('Object.keys(VEG_DESC)') || [])];
  const optKeys = qsa(doc, '#indexSel option').map(o => o.value).filter(v => v !== 'none');
  // Guarda de FONTE SECA (guia r90c): a comparação de conjuntos abaixo é satisfeita
  // DE GRAÇA quando as três fontes estão vazias ('' === '' === ''), e `[].every(…)`
  // é sempre true — esvaziar VEG_INDICES deixaria as duas asserções seguintes verdes.
  // A contagem é impressa porque asserção baseada em extração tem de mostrar o que
  // capturou (r98): fonte que secou salta aos olhos aqui antes de virar debate.
  console.log(`       [captura] índices — VEG_INDICES: ${idxKeys.length} · VEG_DESC: ${descKeys.length} · <option>: ${optKeys.length}`);
  check('índices: nenhuma das três fontes secou (r90c)', idxKeys.length > 0 && descKeys.length > 0 && optKeys.length > 0);
  check('índices: VEG_INDICES × VEG_DESC × opções do seletor — mesmos conjuntos',
    sorted(idxKeys) === sorted(descKeys) && sorted(idxKeys) === sorted(optKeys));
  check('índices: todas as fórmulas devolvem número finito', ev('Object.values(VEG_INDICES).every(f=>isFinite(f(90,140,70)))') === true);
  ev('_zonalResults=null');

  /* modal beta da 1ª abertura (timer de 700 ms) + ack persistido */
  await new Promise(r => setTimeout(r, 1100));
  check('beta: modal aparece na 1ª abertura', has(doc, 'betaModal', 'hidden') === false);
  ev('ackBeta()');
  check('beta: ack gravado no localStorage', w.localStorage.getItem('ortofly_beta_ack') === '1');

  /* nenhum erro de runtime no boot */
  /* raster (v1.20.0): guarda de biblioteca ausente.
     No jsdom não existe window.GeoTIFF — a mesma situação de um 1º acesso offline
     em que o vendor/ não chegou. Sem a guarda, `GeoTIFF.fromBlob` estoura dentro do
     try e o usuário vê "Erro ao ler raster: Cannot read properties of undefined",
     que não diz nada e não sugere nada. A asserção fixa a mensagem ÚTIL, e o
     `ev` tolerante (r91d) garante que uma exceção aqui vire ✗ localizado. */
  // só o GeoTIFF fica faltando: as outras duas libs são stubadas, senão a guarda
  // dispararia pelo motivo errado e a asserção passaria sem provar nada.
  ev("window.parseGeoraster=function(){};window.GeoRasterLayer=function(){};");
  check('raster: cenário montado — só a lib de GeoTIFF ausente',
    ev("typeof window.GeoTIFF==='undefined' && !!window.parseGeoraster && typeof handleRasterFile==='function'") === true);
  ev("handleRasterFile(new Blob([1]))");
  await new Promise(r => setTimeout(r, 30));
  check('raster: mensagem é sobre a biblioteca, não um TypeError vazado',
    /Biblioteca de raster/.test(String(txt(doc, 'toast'))));
  // o aviso de resolução reduzida é derivado do raster carregado, nunca escrito à mão
  check('raster: o aviso de resolução reduzida cita o fator e a origem do limite',
    ev("(function(){_rasterMeta={gr:{pixelWidth:0.0535,projection:31983,xmin:1,ymax:1}};"
     + "var t=rasterReducedNote(2,16011,12772,817969968);_rasterMeta=null;"
     + "return /1\\/2 da resolução original/.test(t) && /16011×12772/.test(t) && /GSD 5\\.35 cm/.test(t);})()") === true);
  /* o aviso tem de OFERECER a resolução cheia com o preço à vista — a redação anterior
     afirmava que ela "não cabe na memória", o que a medição no Safari desmentiu (cabe:
     5,0 GB de pico, ~4,5 GB em repouso). Alegação sobre a plataforma dentro da UI é da
     mesma família do CHANGELOG: ou está medida, ou não se afirma (guia r109/r110). */
  check('raster: o aviso oferece a resolução cheia, com custo e GSD, e não afirma que ela "não cabe"',
    ev("(function(){_rasterMeta={gr:{pixelWidth:0.0535,projection:31983,xmin:1,ymax:1}};"
     + "var t=rasterReducedNote(2,16011,12772,817969968);_rasterMeta=null;"
     + "return /loadRasterFull\\(\\)/.test(t) && /GSD 2\\.67 cm/.test(t) && /GB de memória/.test(t) && !/não cabe/.test(t);})()") === true);
  check('raster: o botão de resolução cheia relê o MESMO arquivo já escolhido',
    ev("typeof loadRasterFull==='function' && /_rasterFile/.test(String(loadRasterFull))") === true);

  check('sem erros de console/jsdom durante o smoke', consoleErrs.length === 0);
  consoleErrs.forEach(e => console.error('       ' + e));

  /* ── cenário 2: SEM Leaflet (arquivo/rede falhou) — o app deve avisar e seguir, não morrer ── */
  const errs2 = [];
  const vc2 = new VirtualConsole();
  vc2.on('jsdomError', e => errs2.push('jsdomError: ' + ((e && e.message) || e)));   // só exceções não tratadas (o console.error do "[Map] init falhou" é esperado aqui)
  const dom2 = new JSDOM(html, {
    url: 'https://magoc25.github.io/OrtoFly/ortofly.html', runScripts: 'dangerously', pretendToBeVisual: true, virtualConsole: vc2,
    beforeParse(window) {
      window.fetch = () => Promise.reject(new Error('offline (stub)'));
      window.URL.createObjectURL = () => 'blob:stub'; window.URL.revokeObjectURL = () => {};
      window.scrollTo = () => {}; window.structuredClone = window.structuredClone || structuredClone;
    }
  });
  const w2 = dom2.window;
  await new Promise((res, rej) => {
    const t = setTimeout(() => rej(new Error('cenário sem Leaflet: load não disparou em 5 s')), 5000);
    if (w2.document.readyState === 'complete') { clearTimeout(t); res(); }
    else w2.addEventListener('load', () => { clearTimeout(t); res(); });
  });
  const ev2 = evOf(w2), doc2 = w2.document;   // o cenário 2 também lê por caminho tolerante (r91d)
  check('sem Leaflet: boot completa mesmo assim (AOI de exemplo)', ev2('state.polygon.length') === 4);
  check('sem Leaflet: usuário é avisado ("Mapa indisponível")', String(txt(doc2, 'toast')).includes('Mapa indisponível'));
  check('sem Leaflet: nenhuma exceção não tratada', errs2.length === 0);
  errs2.forEach(e => console.error('       ' + e));

  /* -- cenario 3: FERRAMENTAS DO MAPA dirigidas de verdade (guia r113) ---------
     O stub encadeavel do cenario 1 nao despacha evento nenhum: `map.on('click')`
     vira no-op, entao TODA assercao sobre recorte teria de ARRUMAR `_cropPts` na
     mao -- e assercao que monta o estado nunca descobre que o usuario nao CHEGA
     nele. Foi esse cego que deixou passar os defeitos de agosto/2026: o recorte
     por retangulo guardava um canto velho e recortava area que ninguem marcou, e
     o poligono morria no 2o vertice. Aqui o Leaflet falso DESPACHA eventos e
     converte lat/lng em pixel de tela, e o cenario clica o radio, clica o botao e
     clica o mapa -- a partir do estado inicial do app. */
  function leafletComEventos() {
    const camadas = [];
    const alvo = extra => Object.assign({
      _h: {}, on(t, f) { (this._h[t] = this._h[t] || []).push(f); return this; }, off() { return this; },
      fire(t, d) { (this._h[t] || []).forEach(f => f(d)); return this; },
      addTo() { camadas.push(this); return this; }, remove() { const i = camadas.indexOf(this); if (i >= 0) camadas.splice(i, 1); return this; },
      removeLayer() { return this; }, clearLayers() { return this; }, addLayer() { return this; },
      setLatLngs(v) { this._ll = v; return this; }, getLatLngs() { return [this._ll]; },
      getBounds() { return { isValid: () => true }; }, setOpacity() { return this; }, setStyle() { return this; },
      setLatLng(v) { this._ll = v; return this; }, getLatLng() { return { lat: 0, lng: 0 }; },
      bindTooltip() { return this; }, openTooltip() { return this; },
      bindPopup() { return this; }, openPopup() { return this; }, closePopup() { return this; }
    }, extra || {});
    // projecao linear e INVERTIVEL: e ela que faz _mesmoPonto conseguir separar
    // "dois vertices distintos" de "duplo-clique no mesmo lugar" (guia r114 -- o
    // limiar do gesto vive em pixel de tela, entao o falso precisa ter pixel).
    const K = 1e5;
    const mapa = alvo({
      getContainer() { return { style: {} }; }, setView() { return mapa; }, fitBounds() { return mapa; },
      createPane() { return { style: {} }; }, getPane() { return { style: {} }; },
      invalidateSize() { return mapa; }, getZoom() { return 16; }, getCenter() { return { lat: 0, lng: 0 }; },
      latLngToContainerPoint(ll) { return { x: (ll.lng + 46) * K, y: (7 + ll.lat) * -K }; },
      containerPointToLatLng(pt) { return { lat: -(pt.y / K) - 7, lng: (pt.x / K) - 46 }; },
      doubleClickZoom: { enable() {}, disable() {} }, dragging: { enable() {}, disable() {} },
      scrollWheelZoom: { enable() {}, disable() {} }
    });
    const L = {
      map: () => mapa, tileLayer: () => alvo(), polygon: ll => alvo({ _ll: ll }), polyline: ll => alvo({ _ll: ll }),
      marker: ll => alvo({ _ll: ll }), circle: () => alvo(), circleMarker: ll => alvo({ _ll: ll }),
      layerGroup: () => alvo(), featureGroup: () => alvo(), imageOverlay: () => alvo(),
      divIcon: () => ({}), icon: () => ({}), latLng: (a, b) => ({ lat: a, lng: b }),
      latLngBounds: () => ({ isValid: () => true, extend() { return this; } }),
      control: Object.assign(() => alvo(), { scale: () => alvo(), layers: () => alvo(), attribution: () => alvo() }),
      DomEvent: { stop() {}, preventDefault() {}, stopPropagation() {}, on() {}, off() {}, disableClickPropagation() {} },
      Browser: {}, Util: {}, CRS: { EPSG3857: {} }, _mapa: mapa
    };
    return L;
  }

  let L3;
  const pincel = { arc: 0, moveTo: 0, lineTo: 0, stroke: 0, fillText: 0 };
  pincel.lws = [];
  pincel.zerar = () => { pincel.arc = pincel.moveTo = pincel.lineTo = pincel.stroke = pincel.fillText = 0; pincel.lws = []; };
  const errs3 = [];
  const vc3 = new VirtualConsole();
  vc3.on('jsdomError', e => errs3.push('jsdomError: ' + ((e && e.message) || e)));
  const dom3 = new JSDOM(html, {
    url: 'https://magoc25.github.io/OrtoFly/ortofly.html', runScripts: 'dangerously', pretendToBeVisual: true, virtualConsole: vc3,
    beforeParse(window) {
      L3 = leafletComEventos(); window.L = L3;
      window.fetch = () => Promise.reject(new Error('offline (stub)'));
      window.URL.createObjectURL = () => 'blob:stub'; window.URL.revokeObjectURL = () => {};
      window.matchMedia = window.matchMedia || (() => ({ matches: false, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} }));
      window.scrollTo = () => {}; window.structuredClone = window.structuredClone || structuredClone;
      // gap do jsdom, nao do app (guia §35): o recorte com mascara redesenha o raster
      // num canvas, e sem `canvas` instalado o getContext estoura
      window.HTMLCanvasElement.prototype.getContext = function () {
        return { createImageData: (w2, h2) => ({ data: new Uint8ClampedArray(w2 * h2 * 4), width: w2, height: h2 }),
                 putImageData() {}, drawImage() {}, beginPath() {}, closePath() {},
                 // o pincel CONTA: é assim que se pergunta "o que saiu desenhado na imagem salva"
                 arc() { pincel.arc++; }, moveTo() { pincel.moveTo++; }, lineTo() { pincel.lineTo++; },
                 stroke() { pincel.stroke++; }, fill() {}, fillText() { pincel.fillText++; }, setLineDash() {},
                 // guarda cada espessura pedida: e por ela que se pergunta se a
                 // linha saiu fina ou grossa no arquivo
                 set lineWidth(v) { pincel.lws.push(v); }, get lineWidth() { return pincel.lws[pincel.lws.length - 1] || 1; },
                 set strokeStyle(v) {}, get strokeStyle() { return '#000'; },
                 set fillStyle(v) {}, get fillStyle() { return '#000'; },
                 set font(v) {}, get font() { return ''; },
                 set textBaseline(v) {}, get textBaseline() { return 'bottom'; } };
      };
      window.HTMLCanvasElement.prototype.toDataURL = () => 'data:image/png;base64,';
      window.HTMLCanvasElement.prototype.toBlob = function (cb) { cb(new window.Blob([''], { type: 'image/png' })); };
      window.parseGeoraster = (v, m) => { const H = v[0].length, W = v[0][0].length;
        return Promise.resolve(Object.assign({ values: v, width: W, height: H, numberOfRasters: v.length,
          xmax: m.xmin + W * m.pixelWidth, ymin: m.ymax - H * m.pixelHeight, mins: [0], maxs: [255], minValue: 0, maxValue: 255 }, m)); };
      window.GeoRasterLayer = function () { const g = L3.layerGroup(); g.getBounds = () => ({ isValid: () => true }); g.setOpacity = () => g; return g; };
      window.GeoTIFF = { fromBlob: () => Promise.reject(new Error('n/a')) };
    }
  });
  const w3 = dom3.window, doc3 = w3.document, ev3 = evOf(w3);
  await new Promise((res, rej) => {
    const t = setTimeout(() => rej(new Error('cenario 3: load nao disparou em 5 s')), 5000);
    if (w3.document.readyState === 'complete') { clearTimeout(t); res(); }
    else w3.addEventListener('load', () => { clearTimeout(t); res(); });
  });

  // raster sintetico com georreferencia conhecida (EPSG:31983 -- SIRGAS 2000 / UTM 23S)
  const banda3 = []; for (let r = 0; r < 40; r++) banda3.push(new Uint8Array(40).fill(120));
  const alfaOrig = []; for (let r = 0; r < 40; r++) alfaOrig.push(new Uint8Array(40).fill(r < 20 ? 0 : 255));   // metade norte SEM DADO
  const gr3 = await w3.parseGeoraster([banda3, banda3, banda3, alfaOrig],
    { noDataValue: null, projection: 31983, xmin: 443000, ymax: 9224000, pixelWidth: 1, pixelHeight: 1 });
  w3.__gr = gr3;
  ev3('_rasterMeta={gr:__gr,bands:4,mn:0,mx:255,ycc:false,factor:1,orig:{xmin:__gr.xmin,xmax:__gr.xmax,ymin:__gr.ymin,ymax:__gr.ymax}}');
  ev3('rasterLayer=buildRasterLayer().addTo(map); $("rasterCtrls").classList.remove("hidden"); renderCRS()');

  /* CRS na tela -- o que o usuario precisa ANTES de colar os pontos */
  const crsCode = txt(doc3, 'crsCode'), crsName = txt(doc3, 'crsName');
  console.log('       [captura] faixa de CRS = ' + JSON.stringify(String(crsCode) + ' | ' + String(crsName).slice(0, 90)));
  check('CRS: a faixa do painel mostra o codigo EPSG do raster aberto',
    String(crsCode).includes('EPSG:31983'));
  check('CRS: a faixa nomeia o sistema (nao so o numero)',
    String(crsName).includes('SIRGAS 2000 / UTM zone 23S'));
  check('CRS: o selo sobre o mapa acende com o raster', has(doc3, 'crsBadge', 'active') === true);
  const chkCrs = el(doc3, 'crsShow');
  if (chkCrs) { chkCrs.checked = false; chkCrs.dispatchEvent(new w3.Event('change')); }
  check('CRS: desmarcar a caixa apaga o selo do mapa (e a faixa do painel fica)',
    has(doc3, 'crsBadge', 'active') === false && has(doc3, 'crsBox', 'hidden') === false);
  if (chkCrs) { chkCrs.checked = true; chkCrs.dispatchEvent(new w3.Event('change')); }

  /* recorte dirigido pelo caminho do usuario */
  const mapa3 = L3._mapa;
  const clique = (lat, lng) => mapa3.fire('click', { latlng: { lat, lng } });
  const dbl = (lat, lng) => mapa3.fire('dblclick', { latlng: { lat, lng } });
  const modo = v => {
    const r = doc3.querySelector('input[name="cropMode"][value="' + v + '"]');
    const o = doc3.querySelector('input[name="cropMode"][value="' + (v === 'rect' ? 'poly' : 'rect') + '"]');
    if (r) r.checked = true; if (o) o.checked = false;
  };
  const btn3 = el(doc3, 'cropDrawBtn');
  let recortes = 0;
  const performCropReal = w3.performCrop;   // guardado: `delete` numa global de <script> nao remove (r91d)
  w3.performCrop = () => { recortes++; return Promise.resolve(); };

  // (a) o dblclick SINTETICO do Leaflet (dois vertices marcados rapido) nao pode
  //     concluir nem cancelar o desenho -- era o defeito do poligono
  //     Sao TRES vertices de proposito: com dois o desenho ainda nao tem poligono
  //     valido, entao concluir cedo nao produz recorte nenhum e a assercao passaria
  //     com ou sem a correcao -- degeneracao que nao tem como se formar (guia r90).
  //     Com tres, o dblclick sintetizado RECORTA area que o usuario nao fechou.
  modo('poly'); recortes = 0; if (btn3) btn3.click();
  clique(-7.0100, -45.4900); clique(-7.0110, -45.4880); clique(-7.0125, -45.4905);
  dbl(-7.0125, -45.4905);                       // o Leaflet sintetiza isto sozinho
  check('recorte/poligono: duplo-clique SINTETIZADO entre vertices distintos nao conclui nem cancela',
    ev3('_cropDrawing') === true && ev3('_cropPts.length') === 3 && recortes === 0);

  // (b) o duplo-clique DE VERDADE (no mesmo ponto) conclui -- e sem vertice duplicado
  clique(-7.0120, -45.4860);
  clique(-7.0120, -45.4860); dbl(-7.0120, -45.4860);
  check('recorte/poligono: duplo-clique no ULTIMO vertice conclui o recorte',
    recortes === 1 && ev3('_cropDrawing') === false);

  // (c) retangulo: reclicar o botao com 1 canto marcado LIMPA o estado -- o canto
  //     velho sobrevivendo era o "recorta alem do retangulo marcado"
  modo('rect'); recortes = 0; if (btn3) btn3.click();
  clique(-7.0100, -45.4900);
  const rotulo1 = btn3 ? String(btn3.textContent) : undefined;
  if (btn3) btn3.click();
  const limpo = ev3('_cropDrawing') === false && ev3('_cropPts.length') === 0;
  clique(-7.0300, -45.4600);                    // clique solto: nao pode virar recorte
  check('recorte/retangulo: o botao cancela e NAO deixa canto velho para o proximo clique',
    limpo === true && recortes === 0);
  check('recorte/retangulo: marcar o 1o canto da retorno visual no botao',
    rotulo1 !== undefined && /2º canto/.test(rotulo1));

  // (d) duplo-clique no retangulo nao pode virar recorte degenerado (2 cantos iguais)
  recortes = 0; if (btn3) btn3.click();
  clique(-7.0150, -45.4850); clique(-7.0150, -45.4850); dbl(-7.0150, -45.4850);
  check('recorte/retangulo: duplo-clique nao vira recorte de area zero',
    recortes === 0 && ev3('_cropPts.length') === 1);
  ev3('cancelCropDraw()');

  // (e) caminho feliz do retangulo: dois cantos de verdade recortam
  recortes = 0; if (btn3) btn3.click();
  clique(-7.0100, -45.4900); clique(-7.0200, -45.4700);
  check('recorte/retangulo: dois cantos distintos recortam', recortes === 1);

  /* mascara do poligono se SOMA a do arquivo (nao substitui) */
  w3.performCrop = performCropReal;   // volta o recorte de verdade para medir a mascara
  ev3('_rasterMeta={gr:__gr,bands:4,mn:0,mx:255,ycc:false,factor:1,orig:{xmin:__gr.xmin,xmax:__gr.xmax,ymin:__gr.ymin,ymax:__gr.ymax}}');
  const llCanto = (E, N) => w3.utmToLatLon(E, N, 23, true);
  await w3.performCrop([llCanto(443002, 9223998), llCanto(443038, 9223998), llCanto(443038, 9223962), llCanto(443002, 9223962)], true);
  const semDadoVirouDado = ev3('(function(){ var a=_rasterMeta.gr.values[3], n=0; for(var r=0;r<18;r++) for(var c=0;c<a[r].length;c++) if(a[r][c]!==0) n++; return n; })()');
  check('recorte/poligono: o alfa do ARQUIVO sobrevive (area sem dado nao vira dado)',
    semDadoVirouDado === 0);

  /* export: o que esta MARCADO no mapa tem de sair na imagem salva.
     O usuario relatou os buffers sumindo do arquivo; medido, o botao do painel
     nao desenhava nada -- nem antes nem depois do recorte. */
  w3.downloadBlob = () => {};
  w3.JSZip = function () { this.file = () => {}; this.generateAsync = () => Promise.resolve(new w3.Blob([''])); };
  ev3('_rasterMeta={gr:__gr,bands:4,mn:0,mx:255,ycc:false,factor:1,orig:{xmin:__gr.xmin,xmax:__gr.xmax,ymin:__gr.ymin,ymax:__gr.ymax}}');
  const campoPts = el(doc3, 'zonalPts'), campoRaio = el(doc3, 'zonalRadius');
  if (campoPts) campoPts.value = 'P1 443010 9223990\nP2 443020 9223980';
  if (campoRaio) campoRaio.value = '5';
  ev3('zonalCompute()');
  const nPts = ev3('_zonalResults && _zonalResults.results ? _zonalResults.results.length : 0');

  /* GATE do arreio (r117c): antes de dar valor a um zero, provo que este pincel
     CONSEGUE ver desenho — pelo botao "Figura PNG (com pontos)", que sempre desenhou. */
  pincel.zerar(); await w3.exportRasterImage(true);
  const pincelEnxerga = pincel.arc > 0;
  console.log('       [captura] pincel no caminho que sempre desenhou: arc=' + pincel.arc + ' fillText=' + pincel.fillText);
  check('export: o arreio consegue ver desenho no canvas (gate — sem isto os zeros abaixo nao valem)',
    nPts >= 2 && pincelEnxerga);

  pincel.zerar(); await w3.exportRasterImage(false);
  check('export: o botao do painel salva os BUFFERS marcados no mapa',
    pincel.arc >= 2 && pincel.fillText >= 2);
  check('export: e salva tambem a AREA DESENHADA (AOI) — que nao saia em export nenhum',
    pincel.moveTo >= 1 && pincel.lineTo >= 2);

  const cxMarks = el(doc3, 'exportMarks');
  if (cxMarks) cxMarks.checked = false;
  pincel.zerar(); await w3.exportRasterImage(false);
  check('export: desmarcar "Incluir as marcacoes" salva o raster LIMPO (o .pgw serve ao QGIS)',
    pincel.arc === 0 && pincel.moveTo === 0 && pincel.fillText === 0);
  if (cxMarks) cxMarks.checked = true;

  // e depois de RECORTAR, que foi o caso do relato
  await w3.performCrop([llCanto(443002, 9223998), llCanto(443038, 9223998), llCanto(443038, 9223962), llCanto(443002, 9223962)], false);
  pincel.zerar(); await w3.exportRasterImage(false);
  check('export: depois do RECORTE as marcacoes continuam saindo na imagem salva',
    pincel.arc >= 2 && pincel.fillText >= 2);

  /* ESPESSURA das marcacoes. A unidade e FRACAO DA LARGURA da imagem, entao a
     assercao precisa de um raster largo o bastante para o piso de 1,5 px nao
     dominar: com os 40 px do raster acima TODA opcao daria 1,5 e a assercao
     ficaria cega -- degeneracao que nao teria como se formar (guia r90/r113). */
  // 1 banda de proposito: o que esta sob teste e a ESPESSURA do traco, e o
  // rasterizador percorre uma banda por pixel -- tres bandas triplicariam o
  // tempo do smoke inteiro sem acrescentar nada a asserção.
  const bandaG = []; for (let r = 0; r < 1200; r++) bandaG.push(new Uint8Array(1200).fill(120));
  const grBig = await w3.parseGeoraster([bandaG],
    { noDataValue: null, projection: 31983, xmin: 443000, ymax: 9224000, pixelWidth: 1, pixelHeight: 1 });
  w3.__grBig = grBig;
  ev3('_rasterMeta={gr:__grBig,bands:1,mn:0,mx:255,ycc:false,factor:1,orig:{xmin:__grBig.xmin,xmax:__grBig.xmax,ymin:__grBig.ymin,ymax:__grBig.ymax}}');
  const selPeso = el(doc3, 'markWeight');
  const linhaCom = async v => {
    if (selPeso) { selPeso.value = v; selPeso.dispatchEvent(new w3.Event('change')); }
    pincel.zerar(); await w3.exportRasterImage(false);
    return pincel.lws.length ? Math.min.apply(null, pincel.lws) : 0;   // o minimo e a linha do buffer (a da AOI leva 1,2x)
  };
  const lFina = await linhaCom('1'), lMedia = await linhaCom('2'), lGrossa = await linhaCom('4');
  console.log('       [captura] linha exportada em imagem de 1200 px: fina=' + lFina + ' media=' + lMedia + ' grossa=' + lGrossa);
  check('espessura: a opcao muda a linha da imagem salva, e mais grossa sai mais grossa',
    lFina > 0 && lFina < lMedia && lMedia < lGrossa);
  check('espessura: o padrao sai em ~0,25% da largura (faixa usual de figura: 0,2-0,5%)',
    Math.abs(lMedia / 1200 - 0.0025) < 0.0003);
  if (selPeso) { selPeso.value = '2'; selPeso.dispatchEvent(new w3.Event('change')); }

  /* FIO-CRUZ: as duas linhas so existem enquanto se marca alguma coisa no mapa.
     Dirigido pelo caminho do usuario -- chama o handler de desenho e move o mouse. */
  ev3('startDraw()');
  mapa3.fire('mousemove', { latlng: { lat: -7.010, lng: -45.490 }, containerPoint: { x: 123, y: 77 } });
  const xv = el(doc3, 'xhairV'), xh = el(doc3, 'xhairH');
  check('fio-cruz: aparece ao desenhar area e segue o cursor nos dois eixos',
    has(doc3, 'xhairV', 'on') === true && has(doc3, 'xhairH', 'on') === true &&
    !!xv && xv.style.left === '123px' && !!xh && xh.style.top === '77px');
  ev3('endDraw()');
  check('fio-cruz: some quando o desenho encerra', has(doc3, 'xhairV', 'on') === false && has(doc3, 'xhairH', 'on') === false);

  modo('poly'); if (btn3) btn3.click();
  mapa3.fire('mousemove', { latlng: { lat: -7.012, lng: -45.488 }, containerPoint: { x: 200, y: 150 } });
  check('fio-cruz: aparece tambem ao marcar o RECORTE (nao so ao desenhar area)',
    has(doc3, 'xhairV', 'on') === true && !!xv && xv.style.left === '200px');
  ev3('cancelCropDraw()');
  check('fio-cruz: some ao cancelar o recorte', has(doc3, 'xhairV', 'on') === false);

  check('cenario 3: nenhuma excecao nao tratada', errs3.length === 0);
  errs3.forEach(e => console.error('       ' + e));

  /* -- cenario 4: o que o app SUGERE, usado como aparece na tela (guia r125) -----
     Placeholder, valor padrao e exemplo nao sao borda: sao o caminho que o app
     recomenda, e a lista deles e finita e mora no HTML. Cada sugestao aqui e LIDA
     DO DOM, nunca copiada a mao para o teste -- se alguem reescrever o exemplo, o
     teste passa a exercitar o texto novo sozinho.
     A URL sugerida do NodeODM e o caso que abriu o cenario: no Safari ela NUNCA
     conecta (pagina https x NodeODM http -- medido em 2026-09-26, com o NodeODM no
     ar), e a mensagem antiga afirmava que "https->http so funciona com localhost",
     mandando o usuario cacar defeito num servidor que estava bom (guia r112). O
     comportamento do NAVEGADOR nao se reproduz no jsdom: ele foi medido no WebKit e
     no Chrome de verdade. Aqui se prova o que o APP faz com cada resposta, dirigido
     a partir do estado inicial -- aba, botao do modo, botao Testar (guia r113). */
  const rej0 = rejeicoes.length;
  let vendor4 = 'Apple Computer, Inc.';
  let resposta4 = () => Promise.reject(new TypeError('Load failed'));
  const chamadas4 = [];
  const errs4 = [];
  const vc4 = new VirtualConsole();
  vc4.on('jsdomError', e => errs4.push('jsdomError: ' + ((e && e.message) || e)));   // o console.error do "[ODM] test" e esperado aqui
  const dom4 = new JSDOM(html, {
    url: 'https://magoc25.github.io/OrtoFly/ortofly.html', runScripts: 'dangerously', pretendToBeVisual: true, virtualConsole: vc4,
    beforeParse(window) {
      window.L = chainProxy();
      // o motor do navegador e escolhido pelo teste: e pelo vendor que o app reconhece o WebKit
      Object.defineProperty(window.navigator, 'vendor', { configurable: true, get: () => vendor4 });
      window.fetch = (u, o) => { chamadas4.push(String(u)); return resposta4(String(u), o); };
      window.URL.createObjectURL = () => 'blob:stub'; window.URL.revokeObjectURL = () => {};
      window.matchMedia = window.matchMedia || (() => ({ matches: false, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} }));
      window.scrollTo = () => {}; window.structuredClone = window.structuredClone || structuredClone;
    }
  });
  const w4 = dom4.window, doc4 = w4.document, ev4 = evOf(w4);
  await new Promise((res, rej) => {
    const t = setTimeout(() => rej(new Error('cenario 4: load nao disparou em 5 s')), 5000);
    if (w4.document.readyState === 'complete') { clearTimeout(t); res(); }
    else w4.addEventListener('load', () => { clearTimeout(t); res(); });
  });
  const clicar = sel => { const b = doc4.querySelector(sel); if (b) b.click(); return !!b; };
  const status4 = () => String(txt(doc4, 'odmStatus'));
  const aposTestar = async () => {   // clica Testar e espera a resposta sair do "Conectando..."
    chamadas4.length = 0;
    const foi = clicar('button[onclick="odmTest()"]');
    for (let i = 0; i < 100 && (status4() === '' || /Conectando/.test(status4())); i++) await new Promise(r => setTimeout(r, 20));
    return foi;
  };

  // (a) Safari: aba Processar -> PC Local, com a URL que o app SUGERE
  const foiAba = clicar('button.tab[data-tab="proc"]'), foiLocal = clicar('#odmModeLocal');
  const campoUrl = el(doc4, 'odmUrl');
  const urlSugerida = campoUrl ? String(campoUrl.placeholder) : undefined;
  console.log('       [captura] URL sugerida = ' + JSON.stringify(urlSugerida) + ' · no campo = ' + JSON.stringify(val(doc4, 'odmUrl')));
  check('processar: aba -> PC Local, e o campo ja vem com a URL que o app sugere (r113/r125)',
    foiAba && foiLocal && !!urlSugerida && /^http:\/\//.test(urlSugerida) && val(doc4, 'odmUrl') === urlSugerida);
  const dicaSafari = String(txt(doc4, 'odmModeHint'));
  check('processar/Safari: ANTES de testar, a dica avisa que o Safari nao conecta e aponta o Chrome/Edge',
    /Safari/.test(dicaSafari) && /Chrome/.test(dicaSafari) && /Edge/.test(dicaSafari));
  const foiTestar = await aposTestar();
  const stSafari = status4();
  console.log('       [captura] falha no Safari = ' + JSON.stringify(stSafari.slice(0, 150)));
  check('processar/Safari: o Testar foi de fato ao NodeODM na URL sugerida (o duplo foi exercitado, r91)',
    foiTestar && chamadas4.includes(urlSugerida + '/info'));
  check('processar/Safari: a falha diz a CAUSA (o Safari recusa http:// a partir de https) e o caminho (Chrome/Edge)',
    /Safari/.test(stSafari) && /http:\/\//.test(stSafari) && /Chrome/.test(stSafari));

  // (b) Chrome: a mesma URL, outra causa provavel -- e nada de Safari
  vendor4 = 'Google Inc.';
  resposta4 = () => Promise.reject(new TypeError('Failed to fetch'));
  clicar('#odmModeLocal');
  const dicaChrome = String(txt(doc4, 'odmModeHint'));
  check('processar/Chrome: o aviso do Safari NAO aparece fora do Safari', dicaChrome.length > 0 && !/Safari/.test(dicaChrome));
  await aposTestar();
  const stChrome = status4();
  console.log('       [captura] falha no Chrome = ' + JSON.stringify(stChrome.slice(0, 150)));
  check('processar/Chrome: a falha manda conferir o /info e a permissao do navegador, sem culpar o Safari',
    /\/info/.test(stChrome) && /permiss/i.test(stChrome) && !/Safari/.test(stChrome));

  // (c) a regra do Safari cede a OBSERVACAO: um Testar que conecta desliga o aviso (r112b)
  vendor4 = 'Apple Computer, Inc.';
  resposta4 = () => Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve({ version: '2.2.4', taskQueueCount: 0, engine: 'odm' }) });
  clicar('#odmModeLocal');
  const avisoVolta = /Safari/.test(String(txt(doc4, 'odmModeHint')));
  await aposTestar();
  const stOk = status4();
  clicar('#odmModeLocal');
  check('processar/Safari: se um Testar CONECTAR, o aviso some -- a frase nao sobrevive a causa (r112b)',
    avisoVolta && /✅/.test(stOk) && !/Safari/.test(String(txt(doc4, 'odmModeHint'))));

  // (d) os EXEMPLOS de dado que o app sugere, digitados como aparecem
  const ph = id => { const n = el(doc4, id); return n ? String(n.placeholder || '') : ''; };
  const exPts = ph('zonalPts'), exGcp = ph('gcpPairs'), exGsd = ph('gsdTarget');
  console.log('       [captura] exemplos — pontos: ' + JSON.stringify(exPts) + ' · GCP: ' + JSON.stringify(exGcp) + ' · GSD: ' + JSON.stringify(exGsd));
  // pontos: cada linha do exemplo e um formato ALTERNATIVO ("ou UTM: ..."), entao cada uma tem de virar
  // exatamente um ponto, com par coerente, sem raio (o exemplo nao traz raio) e sem a prosa no rotulo
  const linhasPts = exPts.split('\n').filter(l => l.trim());
  const ptsEx = linhasPts.map(l => { w4.__l = l; return ev4('parseZonalPoints(__l)'); });
  const parOk = p => !!p && ((Math.abs(p.v0) <= 90 && Math.abs(p.v1) <= 180) || (Math.abs(p.v0) >= 1000 && Math.abs(p.v1) >= 1000));
  console.log('       [captura] pontos do exemplo = ' + JSON.stringify(ptsEx));
  check('exemplo de pontos: cada linha sugerida, digitada como aparece, vira UM ponto coerente, sem raio inventado nem prosa no rotulo',
    linhasPts.length >= 2 && ptsEx.every(a => Array.isArray(a) && a.length === 1 && parOk(a[0]) && a[0].r === null && !/\b(ou|UTM)\b/i.test(a[0].name)));
  // a mesma classe de defeito fora do exemplo: nome + ID numerico + E N (arquivo de topografia)
  w4.__l = 'Poste 21 443162.71 9221928.44';
  const poste = ev4('parseZonalPoints(__l)');
  check('pontos: "nome ID E N" nao vira coordenada deslocada com raio de 9.221 km',
    Array.isArray(poste) && poste.length === 1 && poste[0].v0 === 443162.71 && poste[0].v1 === 9221928.44 && poste[0].r === null && /21/.test(poste[0].name));
  // GCP: a linha de dado vira UM par; a de instrucao ("ou clique...") e ignorada
  w4.__g = exGcp;
  const paresEx = ev4('parseGcpPairs(__g)');
  check('exemplo de GCP: a linha de dado vira UM par (a de instrucao e ignorada), com o deslocamento curto que um GCP corrige',
    Array.isArray(paresEx) && paresEx.length === 1 && Math.abs(paresEx[0].t0 - paresEx[0].f0) < 100 && Math.abs(paresEx[0].t1 - paresEx[0].f1) < 100);
  // GSD: o valor do exemplo, aplicado pelo botao, tem de dar uma altura cujo GSD bate com ele
  const alvoGsd = parseFloat(exGsd.replace(/[^\d.,]/g, '').replace(',', '.'));
  const campoGsd = el(doc4, 'gsdTarget');
  if (campoGsd) campoGsd.value = String(alvoGsd);
  const foiGsd = clicar('button[onclick="applyTargetGsd()"]');
  const gsdObtido = ev4('state.lastPlan ? state.lastPlan.gsd : null');
  console.log('       [captura] GSD sugerido = ' + alvoGsd + ' -> obtido = ' + gsdObtido + ' cm/px (altura ' + val(doc4, 'altNum') + ' m)');
  check('exemplo de GSD: o valor sugerido, pelo botao, leva a uma altura cujo GSD bate com ele (±2%)',
    foiGsd && isFinite(alvoGsd) && alvoGsd > 0 && typeof gsdObtido === 'number' && Math.abs(gsdObtido - alvoGsd) / alvoGsd < 0.02);

  /* (e) Air 2S (câmera FC3411) — o teste do DADO, não do mecanismo (guia r71a).
     Os números esperados estão aqui DE PROPÓSITO, fora do app: sensor 1" (13,2×8,8 mm),
     5472×3648 e 31 min da ficha oficial DJI (manual do Air 2S v1.2, apêndice), e a focal
     8,38 mm que a própria câmera grava na EXIF. Um dígito trocado na tabela muda a altura
     de voo de toda missão planejada com esse drone, e nenhum teste de mecanismo veria. */
  const a2Json = ev4("(function(){ var d=DRONES.find(function(x){ return x.id==='air2s'; }); return d ? JSON.stringify(d) : null; })()");
  const a2 = a2Json ? JSON.parse(a2Json) : null;
  console.log('       [captura] entrada Air 2S = ' + String(a2Json));
  check('Air 2S: a tabela bate com a ficha DJI e a EXIF da FC3411 (13,2×8,8 mm · 8,38 mm · 5472×3648 · 31 min · sem WPML)',
    !!a2 && a2.sw === 13.2 && a2.sh === 8.8 && a2.focal === 8.38 && a2.iw === 5472 && a2.ih === 3648 && a2.fmin === 31 && !a2.wpml);
  // pela TELA, a partir do seletor (r113): escolhe o drone pelo nome que o usuário procura e voa a 100 m
  const selDrone = el(doc4, 'drone');
  const optA2 = selDrone ? [...selDrone.options].find(o => /Air 2S/.test(o.textContent)) : undefined;
  if (selDrone && optA2) { selDrone.value = optA2.value; selDrone.dispatchEvent(new w4.Event('change')); }
  const campoAlt = el(doc4, 'altNum');
  if (campoAlt) { campoAlt.value = '100'; campoAlt.dispatchEvent(new w4.Event('input')); }
  await new Promise(r => setTimeout(r, 300));   // o campo de altura recalcula com espera de 140 ms
  const gsdA2 = ev4('state.lastPlan ? state.lastPlan.gsd : null'), notaA2 = String(txt(doc4, 'planNote'));
  const gsdFonte = 13.2 * 100 * 100 / (8.38 * 5472);   // cm/px a 100 m, direto das fontes
  console.log('       [captura] Air 2S a 100 m: GSD ' + gsdA2 + ' cm/px (fonte: ' + gsdFonte.toFixed(4) + ') · rótulo "' + (optA2 ? optA2.textContent : '—') + '"');
  check('Air 2S: escolhido no seletor, a 100 m dá o GSD das fontes (~2,88 cm/px) e é tratado como drone de DJI Fly (KML/CSV)',
    !!optA2 && typeof gsdA2 === 'number' && Math.abs(gsdA2 - gsdFonte) / gsdFonte < 0.005 && /CSV \(Litchi\)/.test(notaA2));

  /* (f) área grande demais: o aviso diz o LIMITE (escolha do app) e quantas linhas o plano daria (r112d).
     O limite é lido da constante do app, não escrito aqui: o que se prova é que o aviso usa a fonte única. */
  if (campoAlt) { campoAlt.value = '5'; campoAlt.dispatchEvent(new w4.Event('input')); }
  ev4('state.polygon=[[-7.00,-45.55],[-7.00,-45.45],[-7.10,-45.45],[-7.10,-45.55]]');
  await new Promise(r => setTimeout(r, 300));
  const notaGrande = String(txt(doc4, 'planNote')), limiteLin = ev4('GRADE_MAX_LINHAS');
  const nDito = parseInt(((notaGrande.match(/cerca de ([\d.]+) linhas/) || [])[1] || '').replace(/\./g, ''), 10);
  console.log('       [captura] aviso de área grande = ' + JSON.stringify(notaGrande.slice(0, 170)));
  check('área grande: o aviso diz o limite do app e quantas linhas o plano daria (r112d)',
    typeof limiteLin === 'number' && notaGrande.includes(limiteLin.toLocaleString('pt-BR')) && nDito > limiteLin);

  await new Promise(r => setTimeout(r, 50));   // deixa uma rejeição do último Testar chegar ao registro
  const rej4 = rejeicoes.slice(rej0);
  check('cenario 4: nenhuma excecao nao tratada (nem promessa rejeitada sem tratamento)', errs4.length === 0 && rej4.length === 0);
  [...errs4, ...rej4].forEach(e => console.error('       ' + e));

  check('harness: nenhuma promessa rejeitada sem tratamento, em cenario algum', rejeicoes.length === 0);
  rejeicoes.slice(0, rej0).forEach(e => console.error('       ' + e));

  console.log(problems.length ? `\n${problems.length} falha(s).` : '\nSmoke OK ✅');
  process.exit(problems.length ? 1 : 0);   // (os timers do app — ping etc. — seguram o processo; saída explícita)
}

/* Exceção que escapa = FALHA DO HARNESS, e ela é um veredito PRÓPRIO (guia r74a):
   "INCONCLUSIVO", nunca verde e nunca confundido com "N asserções falharam". A
   diferença importa ao validar o smoke por mutação: harness que morre antes da
   asserção-alvo não imprime nenhum ✗ e imita perfeitamente um teste que passou —
   e a leitura natural ("a mutação não pegou") faz apagar um teste que estava bom. */
main().catch(e => {
  console.error('\n══ INCONCLUSIVO — FALHA DO HARNESS ══');
  console.error('O smoke não chegou ao fim: o resultado NÃO é "passou" nem "falhou".');
  console.error(String(e && e.stack || e));
  console.error(problems.length ? `(${problems.length} falha(s) já registrada(s) antes da parada.)` : '(nenhuma falha registrada antes da parada.)');
  process.exit(2);
});
