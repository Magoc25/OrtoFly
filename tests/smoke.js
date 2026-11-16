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
    - no ciclo de vida da tarefa do NodeODM — Descartar, Cancelar, Limpar tudo e
      a tarefa que sumiu do servidor —, manda o uuid num formato que o servidor
      LÊ e reage a cada resposta dele, contra um duplo que imita o contrato
      medido no NodeODM 2.2.4 (cenário 5, v1.24.1);
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

  /* margem além da área (v1.27.0). "Sem margem" tem de reproduzir a grade de antes PONTO POR PONTO: a
     referência abaixo foi MEDIDA na v1.26.0 (commit 9bf4347), com a AOI de exemplo e os padrões da tela —
     198 fotos, 9 faixas, e o hash das coordenadas com 9 casas. Com "Automática", a grade ganha uma faixa
     de cada lado e as pontas passam meia pegada (no sentido do voo) além do polígono. */
  const hashGrade = () => require('crypto').createHash('sha256').update(String(ev('JSON.stringify(state.lastPlan.grid.waypoints.map(p=>[p.lat.toFixed(9),p.lon.toFixed(9)]))'))).digest('hex').slice(0, 16);
  const REF_V126 = { wp: 198, linhas: 9, hash: '7477e61bdbd8ccff' };
  const margemPadrao = val(doc, 'margem');
  const g0 = { wp: ev('state.lastPlan.grid.waypoints.length'), linhas: ev('state.lastPlan.grid.nLines'), hash: hashGrade() };
  console.log('       [captura] grade sem margem = ' + JSON.stringify(g0) + ' · referência v1.26.0 = ' + JSON.stringify(REF_V126));
  check('margem: "Sem margem" dá a MESMA grade da v1.26.0, ponto por ponto (198 fotos, 9 faixas, mesmo hash)',
    margemPadrao === 'none' && g0.wp === REF_V126.wp && g0.linhas === REF_V126.linhas && g0.hash === REF_V126.hash);
  const selMargem = el(doc, 'margem');
  if (selMargem) { selMargem.value = 'auto'; selMargem.dispatchEvent(new w.Event('change')); }
  const fora = ev(`(function(){ var p=state.lastPlan, f=localFrame(state.polygon), b=p.bearing*Math.PI/180, dv=[Math.sin(b),Math.cos(b)];
    var d=function(q){ return q[0]*dv[0]+q[1]*dv[1]; }, W=p.grid.waypoints.map(function(x){ return d(f.toXY([x.lat,x.lon])); }), P=state.polygon.map(function(q){ return d(f.toXY(q)); });
    return JSON.stringify({linhas:p.grid.nLines, wp:p.grid.waypoints.length, meia:p.footAlong/2, alem:Math.max.apply(null,W)-Math.max.apply(null,P), aquem:Math.min.apply(null,P)-Math.min.apply(null,W)}); })()`);
  const fa = fora ? JSON.parse(fora) : {};
  console.log('       [captura] grade com margem automática = ' + fora + ' · dica = ' + JSON.stringify(String(txt(doc, 'margemHint')).slice(0, 90)));
  check('margem: "Automática" acrescenta uma faixa de cada lado (9 -> 11)', fa.linhas === REF_V126.linhas + 2);
  check('margem: com "Automática" as pontas das faixas passam meia pegada além da área (±1 m), nas duas pontas',
    Math.abs(fa.alem - fa.meia) <= 1 && Math.abs(fa.aquem - fa.meia) <= 1);
  check('margem: os Resultados contam as fotos da margem', String(txt(doc, 'oPhotos')) === Number(fa.wp).toLocaleString('pt-BR'));
  const snapM = ev('JSON.stringify(snapshot().params)');
  check('margem: a escolha vai no projeto salvo', /"margem":"auto"/.test(String(snapM)));
  ev("applySnapshot({polygon:state.polygon, droneId:state.droneId, params:{alt:100, fo:75, so:65, speed:+$('speed').value, dir:'auto', dirDeg:0, cross:false}})");
  check('margem: projeto salvo ANTES da margem existir abre sem margem — o plano com que foi salvo', val(doc, 'margem') === 'none' && hashGrade() === REF_V126.hash);

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
  ev3('_rasterMeta={gr:__gr,bands:4,mn:0,mx:255,ycc:false,factor:1,alphaIdx:3,orig:{xmin:__gr.xmin,xmax:__gr.xmax,ymin:__gr.ymin,ymax:__gr.ymax}}');
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
  ev3('_rasterMeta={gr:__gr,bands:4,mn:0,mx:255,ycc:false,factor:1,alphaIdx:3,orig:{xmin:__gr.xmin,xmax:__gr.xmax,ymin:__gr.ymin,ymax:__gr.ymax}}');
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
  ev3('_rasterMeta={gr:__gr,bands:4,mn:0,mx:255,ycc:false,factor:1,alphaIdx:3,orig:{xmin:__gr.xmin,xmax:__gr.xmax,ymin:__gr.ymin,ymax:__gr.ymax}}');
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

  /* 4a BANDA (v1.27.0): quem diz se ela e alfa e o ARQUIVO (tag ExtraSamples), nao o numero de bandas.
     Dois rasters de 4 bandas identicos, com a 4a banda = 0 na metade de cima: num RGBA ela e mascara
     (metade dos pixels sai), num R-G-B-NIR ela e dado (todos os pixels entram, e a banda e reportada). */
  check('4a banda: ExtraSamples decide o alfa (2 -> ultima banda; 0 -> nenhum; sem a tag -> nenhum; [0,2] em 5 bandas -> a 5a)',
    ev3('_alfaDoTiff({ExtraSamples:2},4)') === 3 && ev3('_alfaDoTiff({ExtraSamples:[0]},4)') === -1 && ev3('_alfaDoTiff({},4)') === -1
    && ev3('_alfaDoTiff({ExtraSamples:[0,2]},5)') === 4 && ev3('_alfaDoTiff({ExtraSamples:new Uint16Array([1])},2)') === 1);
  const quarta = []; for (let r = 0; r < 40; r++) quarta.push(new Uint8Array(40).fill(r < 20 ? 0 : 90));
  w3.__gr4 = await w3.parseGeoraster([banda3, banda3, banda3, quarta], { noDataValue: null, projection: 31983, xmin: 443000, ymax: 9224000, pixelWidth: 1, pixelHeight: 1 });
  const area4 = alfa => { ev3('_rasterMeta={gr:__gr4,bands:4,mn:0,mx:255,ycc:false,factor:1,alphaIdx:' + alfa + ',orig:{xmin:__gr4.xmin,xmax:__gr4.xmax,ymin:__gr4.ymin,ymax:__gr4.ymax}}; _rasterIndex=null; zonalAreaStats()');
    const r = ev3('JSON.stringify(_zonalResults&&_zonalResults.results[0]?{n:_zonalResults.results[0].n,bandas:_zonalResults.labels.length}:null)'); return r ? JSON.parse(r) : null; };
  const comAlfa = area4(3), semAlfa = area4(-1);
  console.log('       [captura] 4 bandas — RGBA: ' + JSON.stringify(comAlfa) + ' · R-G-B-NIR: ' + JSON.stringify(semAlfa));
  check('4a banda: RGBA declarado -> 3 bandas reportadas e a area sem dado fica de fora (800 de 1600 px)', !!comAlfa && comAlfa.bandas === 3 && comAlfa.n === 800);
  check('4a banda: R-G-B-NIR (sem alfa declarado) -> as 4 bandas reportadas e NENHUM pixel descartado por NIR = 0 (antes: metade sumia)', !!semAlfa && semAlfa.bandas === 4 && semAlfa.n === 1600);
  // recorte com mascara num raster SEM alfa: a mascara vira banda NOVA, a 4a continua sendo dado
  ev3('_rasterMeta={gr:__gr4,bands:4,mn:0,mx:255,ycc:false,factor:1,alphaIdx:-1,orig:{xmin:__gr4.xmin,xmax:__gr4.xmax,ymin:__gr4.ymin,ymax:__gr4.ymax}}');
  await w3.performCrop([llCanto(443002, 9223998), llCanto(443038, 9223998), llCanto(443038, 9223962), llCanto(443002, 9223962)], true);
  check('4a banda: recortar um R-G-B-NIR por poligono acrescenta a mascara como 5a banda e preserva o NIR', ev3('_rasterMeta.bands') === 5 && ev3('_rasterMeta.alphaIdx') === 4 && ev3('_rasterMeta.gr.values[3][30][20]') === 90);

  /* SIRGAS 2000 GEOGRAFICO (EPSG:4674): e graus, como o 4326 (v1.27.0 -- antes: "nao reprojeta" e raio em metros lido como grau) */
  const bandaG2 = []; for (let r = 0; r < 100; r++) bandaG2.push(new Float32Array(100).fill(7));
  w3.__gr4674 = await w3.parseGeoraster([bandaG2], { noDataValue: null, projection: 4674, xmin: -45.4850, ymax: -7.0140, pixelWidth: 0.0001, pixelHeight: 0.0001 });
  ev3('_rasterMeta={gr:__gr4674,bands:1,mn:7,mx:7,ycc:false,factor:1,alphaIdx:-1,orig:{xmin:__gr4674.xmin,xmax:__gr4674.xmax,ymin:__gr4674.ymin,ymax:__gr4674.ymax}}; renderCRS()');
  const nome4674 = String(txt(doc3, 'crsName'));
  console.log('       [captura] faixa de CRS (4674) = ' + JSON.stringify(nome4674.slice(0, 80)) + ' · aviso oculto = ' + has(doc3, 'crsWarn', 'hidden'));
  check('SIRGAS geografico: a faixa diz "graus" e NAO avisa que o app nao reprojeta', /SIRGAS 2000/.test(nome4674) && /graus/.test(nome4674) && has(doc3, 'crsWarn', 'hidden') === true);
  if (campoPts) campoPts.value = '-7.0190, -45.4800';
  if (campoRaio) campoRaio.value = '20';
  ev3('_rasterIndex=null; zonalCompute()');
  const z4674 = ev3('JSON.stringify(_zonalResults&&_zonalResults.results[0]?{n:_zonalResults.results[0].n,erro:_zonalResults.results[0].error||null,media:_zonalResults.results[0].bands&&_zonalResults.results[0].bands[0]&&_zonalResults.results[0].bands[0].mean}:null)');
  console.log('       [captura] zonal em 4674 = ' + z4674);
  const zz = z4674 ? JSON.parse(z4674) : {};
  // 20 m de raio a -7° = ~0,00018° de lat: com pixel de 0,0001° sao ~1,8 px de raio -> 9 a 13 px. Raio lido como GRAU pegaria o raster inteiro (10.000).
  check('SIRGAS geografico: ponto em lat/lon cai no raster e o raio de 20 m vira GRAUS na latitude (poucos pixels, nao o raster inteiro)',
    !zz.erro && zz.n > 0 && zz.n < 40 && zz.media === 7);

  /* CONTORNO DA AREA COBERTA PELAS FOTOS (v1.27.0): vem do shots.geojson do pacote; desenhado tracejado,
     com a nota e o botao de recorte. 5 centros: os 4 cantos e um no meio (que nao entra na envoltoria). */
  const shots = { type: 'FeatureCollection', features: [[-45.484, -7.0145], [-45.478, -7.0145], [-45.478, -7.0185], [-45.484, -7.0185], [-45.481, -7.0165]]
    .map((c, i) => ({ type: 'Feature', properties: { filename: 'DJI_' + i + '.JPG' }, geometry: { type: 'Point', coordinates: [c[0], c[1], 100] } })) };
  w3.__shots = JSON.stringify(shots);
  ev3("window.__zipF={names:function(){ return ['odm_report/shots.geojson','odm_orthophoto/odm_orthophoto.tif']; }, extrair:function(n){ return Promise.resolve({blob:new Blob([window.__shots]),name:'shots.geojson'}); }}; 1");
  const cobR = await (async () => { try { return await w3.eval('odmLerCobertura(__zipF)'); } catch (e) { return 'erro: ' + e.message; } })();
  console.log('       [captura] cobertura lida = ' + JSON.stringify(cobR));
  check('contorno: lido do shots.geojson do pacote — envoltoria dos centros (4 vertices; o do meio fica de fora)', !!cobR && cobR.n === 5 && Array.isArray(cobR.hull) && cobR.hull.length === 4);
  w3.__cob = cobR; ev3('mostrarCobertura(__cob)');
  const notaCob = String(txt(doc3, 'rasterCobertura'));
  check('contorno: o app desenha o tracejado e diz o que ele significa (fora dele a borda pode sair deformada)',
    ev3('!!_coberturaLayer') === true && /área coberta pelas fotos/.test(notaCob) && /deformad/.test(notaCob));
  let recortouCom = null; const pcReal = w3.performCrop;
  w3.performCrop = (poly, mask) => { recortouCom = { n: poly.length, mask }; return Promise.resolve(); };
  const btnCob = doc3.querySelector('#rasterCobertura button'); if (btnCob) btnCob.click();
  check('contorno: o botao recorta o raster PELA envoltoria das fotos (com mascara)', !!btnCob && !!recortouCom && recortouCom.n === 4 && recortouCom.mask === true);
  w3.performCrop = pcReal;
  ev3('clearRaster()');
  check('contorno: some com o raster (o proximo produto nao herda o contorno de outro)', ev3('_coberturaLayer') === null && String(txt(doc3, 'rasterCobertura')) === '');

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
  /* VIRGULA DECIMAL (v1.27.0): "21 443162,71 9221928,44" virava 21, 443162, 71, 9221928, 44 -- o ponto ia
     parar em outro lugar, sem erro. E os pares de GCP tiravam numero do ROTULO ("P1" dava a coordenada 1). */
  const pz = l => { w4.__l = l; const r = ev4('JSON.stringify(parseZonalPoints(__l))'); return r ? JSON.parse(r) : null; };
  const vBR = pz('21 443162,71 9221928,44'), vLat = pz('-7,019; -45,480'), vP2 = pz('P2, -7.019, -45.480'), vJunto = pz('443162,9221928');
  console.log('       [captura] virgula decimal = ' + JSON.stringify({ vBR, vLat, vP2, vJunto }));
  check('virgula decimal: "21 443162,71 9221928,44" -> ponto 21 em E 443162,71 / N 9221928,44, sem raio',
    !!vBR && vBR.length === 1 && vBR[0].name === '21' && vBR[0].v0 === 443162.71 && vBR[0].v1 === 9221928.44 && vBR[0].r === null);
  check('virgula decimal: "-7,019; -45,480" -> lat -7,019 / lon -45,48', !!vLat && vLat.length === 1 && vLat[0].v0 === -7.019 && vLat[0].v1 === -45.48);
  check('virgula decimal: o que ja funcionava continua igual ("P2, -7.019, -45.480" e "443162,9221928")',
    !!vP2 && vP2.length === 1 && vP2[0].name === 'P2' && vP2[0].v0 === -7.019 && vP2[0].v1 === -45.48 && !!vJunto && vJunto.length === 1 && vJunto[0].v0 === 443162 && vJunto[0].v1 === 9221928);
  w4.__g = 'P1 443160,10 9221930,50 => 443162,71 9221928,44';
  const parBR = ev4('JSON.stringify(parseGcpPairs(__g))'), pBR = parBR ? JSON.parse(parBR) : null;
  console.log('       [captura] par de GCP com rotulo e virgula = ' + parBR);
  check('virgula decimal: par de GCP com rotulo "P1" e virgula -> UM par, dx ~2,61 m (o "1" do rotulo nao vira coordenada)',
    !!pBR && pBR.length === 1 && pBR[0].f0 === 443160.1 && Math.abs((pBR[0].t0 - pBR[0].f0) - 2.61) < 0.001 && Math.abs((pBR[0].t1 - pBR[0].f1) + 2.06) < 0.001);
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

  /* (e) tabela de câmeras — o teste do DADO, não do mecanismo (guia r71a).
     Os números esperados estão aqui DE PROPÓSITO, fora do app, com a fonte ao lado: um dígito
     trocado na tabela muda a altura de voo de toda missão planejada com aquele drone, e nenhum
     teste de mecanismo veria. Focal = a que a própria câmera grava na EXIF (a que o ODM/Pix4D
     usam de partida); sensor dos 1" de 50 MP em 4:3 = a diagonal que a DJI declara duas vezes
     (EXIF 8,67 mm ↔ 24 mm eq., e FOV de 84°) — não o 13,2×8,8 do 1" em 3:2. */
  const FONTES = {
    air2s:       { sw: 13.2, sh: 8.8,  focal: 8.38, iw: 5472, ih: 3648, fmin: 31, fonte: 'manual DJI v1.2 + EXIF FC3411' },
    air3s:       { sw: 12.5, sh: 9.38, focal: 8.67, iw: 8192, ih: 6144, fmin: 45, fonte: 'EXIF FC9113 (40/40) + FOV 84°' },
    mini5pro50:  { sw: 12.5, sh: 9.38, focal: 8.67, iw: 8192, ih: 6144, fmin: 36, fonte: 'ficha DJI Mini 5 Pro + EXIF FC9313' },
    mini5pro50p: { sw: 12.5, sh: 9.38, focal: 8.67, iw: 8192, ih: 6144, fmin: 52, fonte: 'idem, bateria Plus' },
    mini5pro12:  { sw: 12.5, sh: 9.38, focal: 8.67, iw: 4096, ih: 3072, fmin: 36, fonte: 'idem, 12 MP (pixel 2×2)' },
    mini5pro12p: { sw: 12.5, sh: 9.38, focal: 8.67, iw: 4096, ih: 3072, fmin: 52, fonte: 'idem, 12 MP + bateria Plus' },
  };
  for (const [id, e] of Object.entries(FONTES)) {
    const j = ev4("(function(){ var d=DRONES.find(function(x){ return x.id==='" + id + "'; }); return d ? JSON.stringify(d) : null; })()");
    const d = j ? JSON.parse(j) : null;
    check('câmeras: ' + id + ' bate com a fonte (' + e.fonte + ')',
      !!d && ['sw', 'sh', 'focal', 'iw', 'ih', 'fmin'].every(k => d[k] === e[k]) && !d.wpml);
  }
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
  // Mini 5 Pro em 12 MP pela tela: é o modo em que o GSD DOBRA — quem fotografa em 12 MP e planeja
  // com a entrada de 50 MP voaria com metade da altura necessária para o GSD que pediu
  const optM12 = selDrone ? [...selDrone.options].find(o => /Mini 5 Pro/.test(o.textContent) && /12 MP/.test(o.textContent) && /padrão/.test(o.textContent)) : undefined;
  if (selDrone && optM12) { selDrone.value = optM12.value; selDrone.dispatchEvent(new w4.Event('change')); }
  if (campoAlt) { campoAlt.value = '100'; campoAlt.dispatchEvent(new w4.Event('input')); }
  await new Promise(r => setTimeout(r, 300));
  const gsdM12 = ev4('state.lastPlan ? state.lastPlan.gsd : null');
  const gsdM12Fonte = 12.5 * 100 * 100 / (8.67 * 4096);   // ~3,52 cm/px — o dobro do modo 50 MP
  console.log('       [captura] Mini 5 Pro 12 MP a 100 m: GSD ' + gsdM12 + ' cm/px (fonte: ' + gsdM12Fonte.toFixed(4) + ') · rótulo "' + (optM12 ? optM12.textContent : '—') + '"');
  check('Mini 5 Pro 12 MP: escolhido no seletor, a 100 m dá o GSD das fontes (~3,52 cm/px, o dobro do 50 MP)',
    !!optM12 && typeof gsdM12 === 'number' && Math.abs(gsdM12 - gsdM12Fonte) / gsdM12Fonte < 0.005);

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

  /* -- cenario 5: ciclo de vida da tarefa no NodeODM (descartar, cancelar, limpar, tarefa que sumiu) --
     Existe porque Descartar, Limpar tudo e Cancelar NUNCA chegaram ao servidor, da v1.18.0 a
     v1.24.0, e nenhum teste viu: o app mandava o uuid em multipart/form-data (FormData) e o
     NodeODM so le urlencoded ou JSON nessas rotas -- responde HTTP 200 com
     {"error":"uuid param missing."}, que o app lia como "servidor offline".
     O duplo abaixo imita o CONTRATO MEDIDO no NodeODM 2.2.4 em 2026-11-15 (curl contra o
     servidor real, com uuid inexistente):
       POST /task/remove | /task/cancel  multipart   -> 200 {"error":"uuid param missing."}
       idem, urlencoded ou JSON, uuid desconhecido   -> 200 {"success":false,"error":"<uuid> not found"}
       GET  /task/<uuid>/info, uuid desconhecido     -> 200 {"error":"<uuid> not found"}
       GET  /task/list                               -> 200 [{"uuid":"..."}]
     Se o NodeODM mudar, quem acusa e tests/contrato-nodeodm.sh (manual, contra o servidor de
     verdade) -- este cenario prova o que o APP faz com cada resposta.
     O duplo devolve copia a cada resposta (r85a) e conta as chamadas: cada bloco cobra que
     ele foi EXERCITADO (r91), senao "nao chamou" e "chamou e falhou" dao o mesmo vermelho.
     setInterval/clearInterval sao capturados para dar para afirmar que a consulta periodica
     PAROU sem esperar 5 s de relogio. */
  const rej5 = rejeicoes.length;
  const T_VIVA = '11111111-1111-4111-8111-111111111111', T_SUMIU = '22222222-2222-4222-8222-222222222222';
  const X1 = '33333333-3333-4333-8333-333333333333', X2 = '44444444-4444-4444-8444-444444444444';
  const errs5 = [];
  async function subir5(cfg) {
    const fake = { tarefas: new Map((cfg.tarefas || []).map(([u, t]) => [u, { ...t }])), cont: { info: 0, remove: 0, cancel: 0, list: 0, options: 0, init: 0, upload: 0, commit: 0, legado: 0, download: 0 }, corpos: [], cancelFalha: cfg.cancelFalha || null, criadas: [],
      abertas: new Map(), vistoNoUpload: [], reinicios: [], opfsApagado: [], idb: new Map() };
    // opcoes que o servidor falso conhece (GET /options). O de verdade (ODM 3.5.6, medido em 2026-11-15) NAO tem
    // `resize-to`, e o NodeODM descarta em silencio o que nao conhece -- por isso o duplo tambem descarta.
    const OPCOES = cfg.opcoes || ['fast-orthophoto', 'dsm', 'skip-3dmodel', 'orthophoto-resolution', 'dem-resolution', 'rolling-shutter', 'feature-quality', 'pc-quality', 'max-concurrency'];
    const intervalos = new Map(); let nInt = 0;
    const confirms = [];
    const vc5 = new VirtualConsole();
    vc5.on('jsdomError', e => errs5.push((cfg.nome || '?') + ' jsdomError: ' + ((e && e.message) || e)));
    const json = o => Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(JSON.parse(JSON.stringify(o))) });
    // o que o NodeODM consegue ler do corpo: urlencoded (URLSearchParams ou string) e JSON; multipart (FormData), nao
    const lerCorpo = b => {
      const nome = Object.prototype.toString.call(b);
      if (nome === '[object URLSearchParams]') return { tipo: 'urlencoded', uuid: b.get('uuid') };
      if (nome === '[object FormData]') return { tipo: 'multipart', uuid: null };
      if (typeof b === 'string') { try { return { tipo: 'json', uuid: JSON.parse(b).uuid || null }; } catch (_) { return { tipo: 'urlencoded', uuid: new URLSearchParams(b).get('uuid') }; } }
      return { tipo: 'vazio', uuid: null };
    };
    const responder = (u, o) => {
      const p = (String(u).match(/^https?:\/\/[^/]+(\/.*)$/) || [])[1] || String(u);
      if (p === '/info') return cfg.semInfo ? Promise.reject(new TypeError('Failed to fetch')) : json({ version: '2.2.4', taskQueueCount: 0, engine: 'odm', engineVersion: '3.5.6', cpuCores: 8 });
      if (p === '/options') { fake.cont.options++; return json(OPCOES.map(name => ({ name, type: 'x', value: '', domain: '', help: '' }))); }
      /* envio em TRES passos (lido no codigo do NodeODM 2.2.4 em 2026-11-15): init (multipart: name, options) -> {uuid};
         upload/<uuid> (multipart: images[]) -> {success:true}; commit/<uuid> -> {uuid}. So no commit a tarefa passa a
         existir. Erro vem como HTTP 200 + {error}; uuid que nao passou pelo init -> "Invalid uuid (not found)". */
      if (p === '/task/new') { fake.cont.legado++; return json({ error: 'o duplo nao aceita mais o envio num pedido so' }); }
      if (p === '/task/new/init') {
        fake.cont.init++; const b = o && o.body; let pedidas = null, nome = '';
        try { pedidas = JSON.parse(b.get('options')); nome = String(b.get('name')); } catch (e) { pedidas = null; }
        if (!Array.isArray(pedidas)) return json({ error: 'options invalidas' });
        const uuid = '55555555-5555-4555-8555-' + String(fake.cont.init).padStart(12, '0');
        fake.abertas.set(uuid, { pedidas, nome, nImg: 0 });
        return json({ uuid });
      }
      const mu = p.match(/^\/task\/new\/upload\/([^/]+)$/);
      if (mu) {
        fake.cont.upload++; fake.vistoNoUpload.push(String(txt(doc5, 'odmStatus')));
        const ab = fake.abertas.get(mu[1]); if (!ab) return json({ error: 'Invalid uuid (not found)' });
        if (cfg.uploadPendura) return new Promise((_, rej) => { const s = o && o.signal; if (s) s.addEventListener('abort', () => rej(new DOMException('abortado', 'AbortError'))); });
        if (fake.cont.upload <= (cfg.falhaUpload || 0)) return Promise.reject(new TypeError('Failed to fetch'));   // rede caiu no meio: o lote NAO chegou
        // o NodeODM 2.2.4 move todo .txt para a pasta gcp/ (libs/taskNew.js): ele nao conta como imagem
        let arqs = []; try { arqs = o.body.getAll('images'); } catch (e) { arqs = []; }
        if (!arqs.length) return json({ error: 'Need at least 1 file.', noRetry: true });
        const txts = arqs.filter(f => /\.txt$/i.test(String(f && f.name)));
        ab.nImg += arqs.length - txts.length; ab.gcp = (ab.gcp || []).concat(txts.map(f => String(f.name))); return json({ success: true });
      }
      const mc = p.match(/^\/task\/new\/commit\/([^/]+)$/);
      if (mc) {
        fake.cont.commit++; const ab = fake.abertas.get(mc[1]); if (!ab) return json({ error: 'Invalid uuid (not found)' });
        const aceitas = ab.pedidas.filter(x => OPCOES.includes(x.name));   // o NodeODM guarda so o que conhece
        fake.abertas.delete(mc[1]); fake.tarefas.set(mc[1], { code: 20, options: aceitas, nImg: ab.nImg });
        fake.criadas.push({ uuid: mc[1], pedidas: ab.pedidas, aceitas, nImg: ab.nImg, nome: ab.nome, gcp: ab.gcp || [] });
        return json({ uuid: mc[1] });
      }
      // reprocessar: urlencoded/JSON com uuid + options (JSON em texto); so tarefa concluida (40), falha (30) ou cancelada (50)
      if (p === '/task/restart') {
        const b = o && o.body, c = lerCorpo(b); let novas = null;
        try { novas = JSON.parse(Object.prototype.toString.call(b) === '[object URLSearchParams]' ? b.get('options') : JSON.parse(b).options); } catch (e) { novas = null; }
        fake.reinicios.push({ tipo: c.tipo, uuid: c.uuid, options: novas });
        if (!c.uuid) return json({ error: 'uuid param missing.' });
        const t = fake.tarefas.get(c.uuid); if (!t) return json({ success: false, error: c.uuid + ' not found' });
        if (![30, 40, 50].includes(t.code)) return json({ success: false, error: 'Task cannot be restarted' });
        if (Array.isArray(novas)) t.options = novas.filter(x => OPCOES.includes(x.name));
        t.code = 10; return json({ success: true });
      }
      if (/^\/task\/[^/]+\/download\/all\.zip$/.test(p)) { fake.cont.download++; return new Promise(() => {}); }   // o pacote nunca chega: so interessa quantas vezes foi pedido
      if (p === '/task/list') { fake.cont.list++; return json([...fake.tarefas.keys()].map(uuid => ({ uuid }))); }
      const mi = p.match(/^\/task\/([^/]+)\/info$/);
      if (mi) { fake.cont.info++; const t = fake.tarefas.get(mi[1]); return json(t ? { uuid: mi[1], name: 'voo', status: { code: t.code }, progress: 0, imagesCount: cfg.imagensNoServidor || t.nImg || 34, options: t.options || [] } : { error: mi[1] + ' not found' }); }
      if (p === '/task/remove' || p === '/task/cancel') {
        const acao = p.slice(6); fake.cont[acao]++;
        const { tipo, uuid } = lerCorpo(o && o.body); fake.corpos.push(acao + ':' + tipo);
        if (!uuid) return json({ error: 'uuid param missing.' });
        if (!fake.tarefas.has(uuid)) return json({ success: false, error: uuid + ' not found' });
        if (acao === 'cancel') { if (fake.cancelFalha) return json({ success: false, error: fake.cancelFalha }); fake.tarefas.get(uuid).code = 50; return json({ success: true }); }
        fake.tarefas.delete(uuid); return json({ success: true });
      }
      return Promise.reject(new TypeError('rota nao simulada no duplo: ' + p));
    };
    const dom5 = new JSDOM(html, {
      url: 'https://magoc25.github.io/OrtoFly/ortofly.html', runScripts: 'dangerously', pretendToBeVisual: true, virtualConsole: vc5,
      beforeParse(window) {
        window.L = chainProxy();
        Object.defineProperty(window.navigator, 'vendor', { configurable: true, get: () => 'Google Inc.' });
        window.fetch = (u, o) => responder(u, o);
        window.confirm = msg => { confirms.push(String(msg)); return cfg.confirmar ? !!cfg.confirmar(String(msg), confirms.length - 1) : true; };
        window.setInterval = (fn, ms) => { const id = ++nInt; intervalos.set(id, { fn, ms }); return id; };
        window.clearInterval = id => { intervalos.delete(id); };
        window.URL.createObjectURL = () => 'blob:stub'; window.URL.revokeObjectURL = () => {};
        window.matchMedia = window.matchMedia || (() => ({ matches: false, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} }));
        window.scrollTo = () => {}; window.structuredClone = window.structuredClone || structuredClone;
        // estado de um app que ja foi usado: e por aqui (wire) que a tarefa volta ao card ao reabrir
        // leitor de EXIF falso (a lib de verdade nao e carregada no smoke): devolve o que o cenario mandar, por nome de arquivo
        if (cfg.exif) window.exifr = { parse: async f => cfg.exif(String(f && f.name)) };
        // IndexedDB falso (o jsdom nao tem): 'ok' grava num Map; 'aborta' imita falta de espaco -- a transacao e ABORTADA,
        // sem `onerror`, que e como o navegador se comporta quando a cota estoura
        if (cfg.idb) {
          const mkTx = () => { const tx = { error: null, objectStore: () => ({
            put: (v, k) => { setTimeout(() => { if (cfg.idb === 'aborta') { tx.error = new Error('QuotaExceededError (simulado)'); if (tx.onabort) tx.onabort(); } else { fake.idb.set(k, v); if (tx.oncomplete) tx.oncomplete(); } }, 5); return {}; },
            delete: k => { setTimeout(() => { fake.idb.delete(k); if (tx.oncomplete) tx.oncomplete(); }, 5); return {}; },
            get: k => { const q = {}; setTimeout(() => { q.result = fake.idb.get(k); if (q.onsuccess) q.onsuccess(); }, 5); return q; } }) }; return tx; };
          window.indexedDB = { open: () => { const r = { result: { objectStoreNames: { contains: () => true }, transaction: () => mkTx() } }; setTimeout(() => { if (r.onsuccess) r.onsuccess(); }, 5); return r; } };
        }
        // area de arquivos temporarios (OPFS) falsa: so registra o que o app manda apagar
        if (cfg.opfs) Object.defineProperty(window.navigator, 'storage', { configurable: true, value: { getDirectory: async () => ({ removeEntry: async nome => { fake.opfsApagado.push(String(nome)); } }) } });
        const ls = { ortofly_beta_ack: '1', 'ortofly_odm_auth_http://127.0.0.1:3000': '1', ...(cfg.ls || {}) };
        for (const [k, v] of Object.entries(ls)) window.localStorage.setItem(k, v);
      }
    });
    const w5 = dom5.window, doc5 = w5.document;
    await new Promise((res, rej) => {
      const t = setTimeout(() => rej(new Error('cenario 5 (' + (cfg.nome || '?') + '): load nao disparou em 5 s')), 5000);
      if (w5.document.readyState === 'complete') { clearTimeout(t); res(); }
      else w5.addEventListener('load', () => { clearTimeout(t); res(); });
    });
    const esperar = async (cond, ms = 2000) => { for (let i = 0; i < ms / 10; i++) { let ok = false; try { ok = !!cond(); } catch (e) { ok = false; } if (ok) return true; await new Promise(r => setTimeout(r, 10)); } return false; };
    return { fake, confirms, w: w5, doc: doc5, esperar,
      clicar: sel => { const b = doc5.querySelector(sel); if (b) b.click(); return !!b; },
      ls: k => { try { return w5.localStorage.getItem(k); } catch (e) { return undefined; } },
      pollVivo: () => [...intervalos.values()].some(i => i.ms === 5000),
      status: () => String(txt(doc5, 'odmStatus')), toast: () => { const n = el(doc5, 'toast'); return n ? { texto: String(n.textContent), erro: n.classList.contains('error') } : { texto: '', erro: false }; },
      ev: evOf(w5),
      // espera uma promessa criada DENTRO do app, com teto de tempo: promessa que nunca resolve vira 'NUNCA RESOLVEU', nao um teste pendurado
      aguardar: (expr, ms = 1500) => { let p; try { p = w5.eval(expr); } catch (e) { return Promise.resolve('eval falhou: ' + e.message); }
        return Promise.race([Promise.resolve(p).then(v => v, e => 'rejeitou: ' + ((e && e.message) || e)), new Promise(r => setTimeout(() => r('NUNCA RESOLVEU'), ms))]); },
      envioAberto: () => has(doc5, 'odmEnvio', 'hidden') === false, botaoEnviarLivre: () => { const b = el(doc5, 'odmCreateBtn'); return b ? b.disabled === false : undefined; },
      // escolhe N fotos pelo campo de arquivo de verdade (dispara o mesmo `change` que o usuario dispara)
      selecionar: n => { try { const inp = doc5.getElementById('odmImages'); const fs = Array.from({ length: n }, (_, i) => new w5.File(['x'], 'DJI_' + String(i + 1).padStart(4, '0') + '.JPG', { type: 'image/jpeg' }));
        Object.defineProperty(inp, 'files', { configurable: true, value: fs }); inp.dispatchEvent(new w5.Event('change')); return true; } catch (e) { return false; } },
      marcar: (sel, v) => { const n = doc5.querySelector(sel); if (!n) return false; n.checked = v; n.dispatchEvent(new w5.Event('change')); return true; },
      escolher: (id, v) => { const n = doc5.getElementById(id); if (!n) return false; n.value = v; n.dispatchEvent(new w5.Event('change')); return n.value === v; },
      // envia a tarefa e devolve as opcoes que SAIRAM do app (ou null se nada chegou ao duplo)
      enviar: async () => { const antes = fake.criadas.length; const b = doc5.querySelector('button[onclick="odmCreate()"]'); if (b) b.click();
        await esperar(() => fake.criadas.length > antes || /❌/.test(String(txt(doc5, 'odmStatus'))), 3000); return fake.criadas.length > antes ? fake.criadas[fake.criadas.length - 1] : null; },
      fechar: () => { try { w5.close(); } catch (e) {} } };
  }
  const lsTarefa = (atual, lista) => ({ ...(atual ? { ortofly_odm_task: atual } : {}), ortofly_odm_tasks: JSON.stringify(lista) });

  { // (a) Descartar uma tarefa que existe no servidor
    const c = await subir5({ nome: '5a', tarefas: [[T_VIVA, { code: 40 }]], ls: lsTarefa(T_VIVA, [T_VIVA]) });
    await c.esperar(() => c.fake.cont.info > 0);
    const foi = c.clicar('button[onclick="odmDiscard()"]');
    await c.esperar(() => c.fake.cont.remove > 0 && (has(c.doc, 'odmTaskCard', 'hidden') === true || /❌/.test(c.status())));
    console.log('       [captura] descartar: corpos recebidos pelo duplo = ' + JSON.stringify(c.fake.corpos) + ' · status = ' + JSON.stringify(c.status().slice(0, 120)));
    check('tarefa/descartar: o pedido chegou ao NodeODM (o duplo foi exercitado, r91)', foi && c.fake.cont.remove === 1 && c.confirms.length === 1);
    check('tarefa/descartar: o servidor LEU o uuid e apagou a tarefa (multipart ele nao le)', c.fake.cont.remove === 1 && !c.fake.tarefas.has(T_VIVA));
    check('tarefa/descartar: o card fecha e a tarefa sai do registro do app',
      has(c.doc, 'odmTaskCard', 'hidden') === true && c.ls('ortofly_odm_task') === null && c.ls('ortofly_odm_tasks') === '[]');
    c.fechar();
  }
  { // (b) app reaberto com uma tarefa que ja nao existe no servidor (apagada pelo terminal, container recriado)
    const c = await subir5({ nome: '5b', tarefas: [], ls: lsTarefa(T_SUMIU, [T_SUMIU]) });
    await c.esperar(() => c.fake.cont.info > 0 && /existe|desconhecido/.test(String(txt(c.doc, 'odmTaskStatus'))));
    const st = String(txt(c.doc, 'odmTaskStatus'));
    console.log('       [captura] tarefa que sumiu: card = ' + JSON.stringify(st.slice(0, 130)));
    check('tarefa que sumiu: o card foi ao servidor perguntar por ela (o duplo foi exercitado, r91)', c.fake.cont.info >= 1 && has(c.doc, 'odmTaskCard', 'hidden') === false);
    check('tarefa que sumiu: o card DIZ que ela nao existe mais no servidor (antes: "status desconhecido")', /não existe mais/i.test(st) && !/desconhecido/.test(st));
    check('tarefa que sumiu: a consulta periodica PARA (antes: a cada 5 s, para sempre)', c.fake.cont.info >= 1 && c.pollVivo() === false);
    let evSaida; try { evSaida = new c.w.Event('beforeunload', { cancelable: true }); c.w.dispatchEvent(evSaida); } catch (e) { evSaida = undefined; }
    check('tarefa que sumiu: fechar a aba nao pede mais confirmacao (nao ha nada a perder)', !!evSaida && evSaida.defaultPrevented === false);
    const btnFechar = qsa(c.doc, '#odmOutputs button').find(b => /Fechar/.test(b.textContent));
    if (btnFechar) btnFechar.click();
    check('tarefa que sumiu: o botao Fechar some com o card e limpa o registro',
      !!btnFechar && has(c.doc, 'odmTaskCard', 'hidden') === true && c.ls('ortofly_odm_task') === null && c.ls('ortofly_odm_tasks') === '[]');
    c.fechar();
  }
  { // (c) o mesmo estado, pelo botao Descartar: tarefa que ja nao existe conta como removida e o card fecha
    const c = await subir5({ nome: '5c', tarefas: [], ls: lsTarefa(T_SUMIU, [T_SUMIU]) });
    await c.esperar(() => c.fake.cont.info > 0);
    const foi = c.clicar('button[onclick="odmDiscard()"]');
    await c.esperar(() => c.fake.cont.remove > 0 && (has(c.doc, 'odmTaskCard', 'hidden') === true || /❌/.test(c.status())));
    check('tarefa que sumiu: Descartar fecha o card em vez de falhar para sempre',
      foi && c.fake.cont.remove === 1 && has(c.doc, 'odmTaskCard', 'hidden') === true && c.ls('ortofly_odm_task') === null);
    c.fechar();
  }
  { // (d) Cancelar: o servidor tem de ler o uuid; e, se recusar, o app tem de dizer por que
    const c = await subir5({ nome: '5d', tarefas: [[T_VIVA, { code: 20 }]], ls: lsTarefa(T_VIVA, [T_VIVA]) });
    await c.esperar(() => c.fake.cont.info > 0);
    check('tarefa em processamento: a consulta periodica esta LIGADA (controle: o arreio enxerga o timer)', c.pollVivo() === true);
    const foi = c.clicar('button[onclick="odmCancel()"]');
    await c.esperar(() => c.fake.cont.cancel > 0); await new Promise(r => setTimeout(r, 40));
    console.log('       [captura] cancelar: corpos recebidos pelo duplo = ' + JSON.stringify(c.fake.corpos));
    check('tarefa/cancelar: o servidor LEU o uuid e cancelou a tarefa', foi && c.fake.cont.cancel === 1 && (c.fake.tarefas.get(T_VIVA) || {}).code === 50);
    c.fechar();
    const c2 = await subir5({ nome: '5d2', tarefas: [[T_VIVA, { code: 20 }]], ls: lsTarefa(T_VIVA, [T_VIVA]), cancelFalha: 'Task is not running' });
    await c2.esperar(() => c2.fake.cont.info > 0);
    c2.clicar('button[onclick="odmCancel()"]');
    await c2.esperar(() => c2.fake.cont.cancel > 0 && c2.toast().erro);
    console.log('       [captura] cancelar recusado: toast = ' + JSON.stringify(c2.toast()));
    check('tarefa/cancelar: se o servidor recusa, o app AVISA com o motivo dele (antes: resposta ignorada)',
      c2.fake.cont.cancel === 1 && c2.toast().erro === true && /Task is not running/.test(c2.toast().texto));
    c2.fechar();
  }
  { // (e) Limpar tudo, PC Local: enxerga tambem as tarefas que este navegador nao criou (GET /task/list)
    const tarefas = [[T_VIVA, { code: 40 }], [X1, { code: 40 }], [X2, { code: 30 }]];
    const c = await subir5({ nome: '5e', tarefas, ls: lsTarefa(null, [T_VIVA]) });
    const foi = c.clicar('button[onclick="odmCleanAll()"]');
    await c.esperar(() => /🧹/.test(c.status()));
    console.log('       [captura] limpar tudo (local): confirmacoes = ' + JSON.stringify(c.confirms.map(m => m.split('\n')[0].slice(0, 110))) + ' · status = ' + JSON.stringify(c.status().slice(0, 110)));
    check('limpar tudo/local: consulta a lista do servidor (o duplo foi exercitado, r91)', foi && c.fake.cont.list >= 1 && c.fake.cont.remove >= 1);
    check('limpar tudo/local: avisa quantas tarefas de FORA do registro vai apagar, antes de apagar', c.confirms.length === 2 && /\b2\b/.test(c.confirms[1]));
    check('limpar tudo/local: com as duas confirmacoes, o servidor fica vazio', c.fake.tarefas.size === 0 && c.ls('ortofly_odm_tasks') === '[]');
    c.fechar();
    // recusando a 2a confirmacao, so saem as que o app criou
    const c2 = await subir5({ nome: '5e2', tarefas, ls: lsTarefa(null, [T_VIVA]), confirmar: (m, i) => i === 0 });
    c2.clicar('button[onclick="odmCleanAll()"]');
    await c2.esperar(() => /🧹/.test(c2.status()));
    check('limpar tudo/local: recusar a 2a confirmacao preserva as tarefas que o app nao criou',
      c2.fake.cont.remove === 1 && !c2.fake.tarefas.has(T_VIVA) && c2.fake.tarefas.has(X1) && c2.fake.tarefas.has(X2));
    c2.fechar();
    // modo Servidor: as outras podem ser de terceiros -- nem pergunta, so informa
    const c3 = await subir5({ nome: '5e3', tarefas, ls: { ...lsTarefa(null, [T_VIVA]), ortofly_odm_mode: 'server', ortofly_odm_url_server: 'https://odm.exemplo.test' } });
    c3.clicar('button[onclick="odmCleanAll()"]');
    await c3.esperar(() => /🧹/.test(c3.status()));
    console.log('       [captura] limpar tudo (servidor): status = ' + JSON.stringify(c3.status().slice(0, 170)));
    check('limpar tudo/servidor: remove so as tarefas do app e NAO toca nas outras (podem ser de terceiros)',
      c3.confirms.length === 1 && !c3.fake.tarefas.has(T_VIVA) && c3.fake.tarefas.has(X1) && c3.fake.tarefas.has(X2));
    check('limpar tudo/servidor: diz quantas tarefas ficaram no servidor', /\b2\b/.test(c3.status()) && /outra/i.test(c3.status()));
    c3.fechar();
  }
  /* -- cenario 5, 2a parte: o que o app PEDE ao ODM em cada tarefa (v1.25.0) ----------------------
     Ate a v1.24.1 o app nunca mandava `orthophoto-resolution` (o ODM usa 5 cm/px por padrao: um voo
     de 1,78 cm/px saia com 1/8 dos pixels), mandava `resize-to` (que o ODM 3.5.6 nao tem e o NodeODM
     descarta calado) e o texto de Material e Metodos afirmava SfM + Multi-View Stereo ate no modo
     Rapido. A EXIF abaixo e a de uma foto real do voo de teste (DJI Air 2S, FC3411, 60,1 m): a conta
     do app tem de dar 1,80 cm/px -- o ODM estimou 1,785 para o mesmo voo. */
  const exifVoo = (dtSeg, passoM) => nome => { const i = (parseInt((nome.match(/(\d+)/) || [])[1], 10) || 1) - 1;
    return { latitude: -7.0378815 + i * passoM / 110540, longitude: -45.5176857, RelativeAltitude: '+60.10', FocalLength: 8.38, FocalLengthIn35mmFormat: 22,
      ExifImageWidth: 5472, ExifImageHeight: 3648, Model: 'FC3411', DateTimeOriginal: new Date(Date.UTC(2026, 10, 14, 12, 43, 28) + i * dtSeg * 1000) }; };
  const op = (t, nome) => { const x = t && Array.isArray(t.pedidas) ? t.pedidas.find(o => o.name === nome) : undefined; return x ? x.value : undefined; };
  const nomes = t => (t && Array.isArray(t.pedidas)) ? t.pedidas.map(o => o.name) : [];
  const gsdLido = c => c.esperar(() => /GSD estimado|Não consegui/.test(String(txt(c.doc, 'odmGsdInfo'))));

  { // (f) padrao da tela (Rapido + resolucao nativa), fotos de um voo CONTINUO: 13 m e 2 s entre fotos
    const c = await subir5({ nome: '5f', exif: exifVoo(2, 13) });
    const sel = c.selecionar(6); await gsdLido(c);
    const infoGsd = String(txt(c.doc, 'odmGsdInfo')), infoRS = String(txt(c.doc, 'odmRSInfo')), rsMarcado = (el(c.doc, 'odmRS') || {}).checked;
    console.log('       [captura] nativa: ' + JSON.stringify(infoGsd.slice(0, 150)) + ' · obturador: ' + JSON.stringify(infoRS.slice(0, 90)));
    check('resolucao: o app le a altura das fotos e mostra o GSD delas (1,80 cm/px para a EXIF do voo de teste)', sel && /1,80 cm\/px/.test(infoGsd));
    check('obturador: voo continuo (13 m a cada 2 s) deixa a correcao MARCADA e diz por que', rsMarcado === true && /contínuo/.test(infoRS) && /m\/s/.test(infoRS));
    const t = await c.enviar();
    console.log('       [captura] opcoes enviadas (Rapido, nativa) = ' + JSON.stringify(t && t.pedidas));
    check('tarefa nova: o pedido chegou ao NodeODM com as 6 fotos (o duplo foi exercitado, r91)', !!t && t.nImg === 6 && c.fake.cont.options >= 1);
    check('resolucao: a tarefa pede orthophoto-resolution = GSD das fotos (antes: nada, e saia a 5 cm/px)', Math.abs(op(t, 'orthophoto-resolution') - 1.80) <= 0.02);
    check('resolucao: no modo Rapido nao vai dem-resolution (nao ha DSM)', !!t && op(t, 'fast-orthophoto') === true && op(t, 'dem-resolution') === undefined);
    check('obturador: rolling-shutter vai junto quando a correcao esta marcada', op(t, 'rolling-shutter') === true);
    check('opcoes: nunca mais `resize-to` (o ODM 3.5.6 nao tem essa opcao)', !!t && !nomes(t).includes('resize-to'));
    await c.esperar(() => /orthophoto-resolution/.test(String(txt(c.doc, 'odmTaskOpts'))));
    console.log('       [captura] card da tarefa = ' + JSON.stringify(String(txt(c.doc, 'odmTaskOpts')).slice(0, 160)));
    check('card: mostra as opcoes que o SERVIDOR aceitou', /orthophoto-resolution 1\.8/.test(String(txt(c.doc, 'odmTaskOpts'))) && /rolling-shutter/.test(String(txt(c.doc, 'odmTaskOpts'))));
    const mmRapido = String(c.ev('citeText().mm'));
    console.log('       [captura] M&M (Rapido) = ' + JSON.stringify(mmRapido.slice(0, 260)));
    check('M&M: no modo Rapido NAO afirma Multi-View Stereo nem DSM (antes afirmava sempre)', mmRapido.length > 60 && !/Multi-View/.test(mmRapido) && !/DSM/.test(mmRapido) && /esparsa/.test(mmRapido));
    check('M&M: diz a resolucao pedida e a correcao de obturador, porque foram usadas', /1,80 cm\/px/.test(mmRapido) && /obturador de rolagem/.test(mmRapido));
    c.fechar();
  }
  { // (g) DSM + ortomosaico, Economizar RAM, fotos de missao que PARA em cada ponto: 13 m e 20 s entre fotos
    const c = await subir5({ nome: '5g', exif: exifVoo(20, 13), ls: { ortofly_odm_rs: '1' } });   // a escolha antiga era "marcado": a deteccao tem de vencer
    c.selecionar(6); await gsdLido(c);
    const infoRS = String(txt(c.doc, 'odmRSInfo'));
    check('obturador: drone parado em cada foto (13 m a cada 20 s) deixa a correcao DESMARCADA', (el(c.doc, 'odmRS') || {}).checked === false && /parado|lento/.test(infoRS));
    const foiModo = c.marcar('input[name="odmOut"][value="dsm"]', true), foiLite = c.marcar('#odmLite', true);
    const t = await c.enviar();
    console.log('       [captura] opcoes enviadas (DSM, nativa, Economizar RAM) = ' + JSON.stringify(t && t.pedidas));
    check('resolucao: nos modos com DSM vai dem-resolution = 2x a do ortomosaico', foiModo && op(t, 'dsm') === true && op(t, 'skip-3dmodel') === true && Math.abs(op(t, 'dem-resolution') - 3.60) <= 0.04);
    check('obturador: sem a correcao marcada, rolling-shutter NAO vai', !!t && op(t, 'rolling-shutter') === undefined);
    check('Economizar RAM: manda feature-quality, pc-quality e metade dos nucleos do servidor (8 -> 4)',
      foiLite && op(t, 'feature-quality') === 'medium' && op(t, 'pc-quality') === 'low' && op(t, 'max-concurrency') === 4);
    // o filtro pelo /options ja impediria o `resize-to` de SAIR; o que denuncia a volta dele e o aviso de opcao ignorada
    // (com o ODM 3.5.6 simulado, nada do que o app monta pode ser desconhecido do servidor)
    check('Economizar RAM: nao monta mais `resize-to` nem outra opcao que o ODM 3.5.6 nao tenha (nenhum aviso de opcao ignorada)',
      foiLite && !!t && !nomes(t).includes('resize-to') && /Tarefa criada/.test(c.status()) && !/ignorad/.test(c.status()));
    const mmDenso = String(c.ev('citeText().mm'));
    check('M&M: no modo com DSM afirma SfM + Multi-View Stereo e DSM, e nao cita correcao que nao foi usada', /Multi-View/.test(mmDenso) && /DSM/.test(mmDenso) && !/obturador/.test(mmDenso));
    c.fechar();
  }
  { // (h) "Leve — 5 cm/px": nao pede resolucao nenhuma (fica o padrao do ODM)
    const c = await subir5({ nome: '5h', exif: exifVoo(2, 13) });
    c.selecionar(6); await gsdLido(c);
    const foiRes = c.escolher('odmRes', 'odm5'); c.marcar('input[name="odmOut"][value="dsm"]', true);
    const t = await c.enviar();
    check('resolucao: a opcao de 5 cm/px nao manda orthophoto-resolution nem dem-resolution', foiRes && !!t && op(t, 'orthophoto-resolution') === undefined && op(t, 'dem-resolution') === undefined);
    check('resolucao: a escolha fica guardada para a proxima vez', c.ls('ortofly_odm_res') === 'odm5');
    c.fechar();
  }
  { // (i) fotos sem altura de voo na EXIF: pede 1 cm/px e deixa o ODM limitar pelo GSD que ele estima
    const c = await subir5({ nome: '5i', exif: () => ({}) });
    c.selecionar(6); await gsdLido(c);
    const info = String(txt(c.doc, 'odmGsdInfo'));
    const t = await c.enviar();
    console.log('       [captura] sem altura nas fotos: ' + JSON.stringify(info.slice(0, 140)));
    check('resolucao: sem a altura nas fotos, o app DIZ isso e pede 1 cm/px (o ODM limita sozinho)', /Não consegui ler a altura/.test(info) && op(t, 'orthophoto-resolution') === 1);
    c.fechar();
  }
  { // (j) servidor que NAO conhece `rolling-shutter` (ODM antigo): o app nao manda e avisa
    const c = await subir5({ nome: '5j', exif: exifVoo(2, 13), opcoes: ['fast-orthophoto', 'dsm', 'skip-3dmodel', 'orthophoto-resolution', 'dem-resolution'] });
    c.selecionar(6); await gsdLido(c);
    const t = await c.enviar();
    console.log('       [captura] servidor sem rolling-shutter: status = ' + JSON.stringify(c.status().slice(0, 170)));
    check('opcoes: o app consulta GET /options e nao manda o que o servidor nao conhece', !!t && c.fake.cont.options >= 1 && !nomes(t).includes('rolling-shutter') && nomes(t).includes('orthophoto-resolution'));
    check('opcoes: e AVISA qual opcao ficou de fora (o NodeODM descartaria calado)', /rolling-shutter/.test(c.status()) && /ignorada/.test(c.status()));
    const mm = String(c.ev('citeText().mm'));
    check('M&M: nao afirma a correcao de obturador que o servidor nao aceitou', mm.length > 60 && !/obturador/.test(mm));
    c.fechar();
  }
  { // (k) sem tarefa e sem conexao: o texto nao inventa versao do ODM
    const c = await subir5({ nome: '5k', semInfo: true });
    await new Promise(r => setTimeout(r, 60));
    const mm = String(c.ev('citeText().mm')), abnt = String(c.ev('citeText().abnt'));
    console.log('       [captura] M&M sem tarefa nem conexao = ' + JSON.stringify(mm.slice(0, 200)));
    check('M&M: sem tarefa e sem conexao NAO cita versao fixa do ODM (antes: "3.5.6" chumbado)', mm.length > 60 && !/3\.5\.6/.test(mm) && !/3\.5\.6/.test(abnt) && /não registrada/.test(mm));
    check('M&M: sem tarefa, nao afirma modo de processamento nenhum', !/Multi-View/.test(mm) && !/DSM/.test(mm));
    c.fechar();
  }

  /* -- cenario 5, 3a parte: envio em partes, pacote, armazenamento e reprocessamento (v1.26.0) ------
     Ate a v1.25.0: todas as fotos num POST so (sem progresso, sem repeticao, sem cancelar); dois
     cliques baixavam o all.zip duas vezes para o mesmo arquivo; uma gravacao abortada por falta de
     espaco deixava "Salvando..." para sempre; e a falha ao gravar o projeto era anunciada como
     sucesso -- com o Salvar no projeto apagando a tarefa do servidor mesmo assim. */
  const esperasCurtas = c => c.ev('ODM_LOTE_ESPERAS[0]=10; ODM_LOTE_ESPERAS[1]=10; ODM_LOTE_ESPERAS[2]=10; 1');   // nao esperar 13 s de relogio por repeticao

  { // (l) envio em tres passos, em lotes
    const c = await subir5({ nome: '5l', exif: exifVoo(2, 13) });
    c.selecionar(6); await gsdLido(c);
    const t = await c.enviar();
    console.log('       [captura] envio em partes: ' + JSON.stringify({ init: c.fake.cont.init, upload: c.fake.cont.upload, commit: c.fake.cont.commit, legado: c.fake.cont.legado }) + ' · na tela durante o envio = ' + JSON.stringify(c.fake.vistoNoUpload.slice(-1)));
    check('envio: abre a tarefa, manda as fotos em LOTES e fecha (antes: tudo num pedido so)', !!t && c.fake.cont.init === 1 && c.fake.cont.upload === 2 && c.fake.cont.commit === 1 && c.fake.cont.legado === 0);
    check('envio: as 6 fotos chegam, sem faltar nem repetir', !!t && t.nImg === 6);
    check('envio: a tela mostra o andamento em fotos enquanto envia', c.fake.vistoNoUpload.length > 0 && c.fake.vistoNoUpload.some(s => /Enviando \d+\/6 fotos/.test(s)));
    check('envio: ao terminar, a barra some e o botao Enviar volta a funcionar', c.envioAberto() === false && c.botaoEnviarLivre() === true);
    c.fechar();
  }
  { // (m) a rede cai no meio: o lote que nao chegou e repetido sozinho
    const c = await subir5({ nome: '5m', exif: exifVoo(2, 13), falhaUpload: 1 });
    c.selecionar(6); await gsdLido(c); esperasCurtas(c);
    const t = await c.enviar();
    check('envio: um lote que falha e REPETIDO e a tarefa sai completa (antes: perdia tudo)', !!t && t.nImg === 6 && c.fake.cont.upload === 3 && c.fake.cont.commit === 1);
    c.fechar();
  }
  { // (n) a rede nao volta: desiste, diz por que e nao deixa tarefa pela metade
    const c = await subir5({ nome: '5n', exif: exifVoo(2, 13), falhaUpload: 99 });
    c.selecionar(6); await gsdLido(c); esperasCurtas(c);
    const t = await c.enviar();
    await c.esperar(() => c.botaoEnviarLivre() === true);
    console.log('       [captura] envio que desiste: status = ' + JSON.stringify(c.status().slice(0, 150)));
    check('envio: sem rede, desiste depois das repeticoes, sem criar tarefa', t === null && c.fake.cont.commit === 0 && c.fake.tarefas.size === 0 && c.fake.cont.upload >= 4);
    check('envio: a falha e DITA na tela e nada fica no registro do app', /❌/.test(c.status()) && /Failed to fetch/.test(c.status()) && c.ls('ortofly_odm_tasks') === '[]' && c.ls('ortofly_odm_task') === null);
    check('envio: depois da falha da para tentar de novo (botao livre, barra fechada)', c.botaoEnviarLivre() === true && c.envioAberto() === false);
    c.fechar();
  }
  { // (o) Cancelar envio, com um lote parado na rede
    const c = await subir5({ nome: '5o', exif: exifVoo(2, 13), uploadPendura: true });
    c.selecionar(6); await gsdLido(c);
    // duas chamadas seguidas ao proprio handler: um segundo `click()` nem chegaria la, porque o botao trava no primeiro —
    // e ai quem segura e so o botao, nao a trava interna (mutacao que a remove passava verde: condicao ausente, r90)
    c.ev('odmCreate(); odmCreate(); 1');
    await c.esperar(() => c.fake.cont.upload > 0);
    let evSaida; try { evSaida = new c.w.Event('beforeunload', { cancelable: true }); c.w.dispatchEvent(evSaida); } catch (e) { evSaida = undefined; }
    check('envio: duplo clique abre UMA tarefa so (o botao trava durante o envio)', c.fake.cont.init === 1 && c.botaoEnviarLivre() === false && c.envioAberto() === true);
    check('envio: fechar a aba durante o envio pede confirmacao (as fotos se perderiam)', !!evSaida && evSaida.defaultPrevented === true);
    const foi = c.clicar('button[onclick="odmCancelarEnvio()"]');
    await c.esperar(() => /cancelado/i.test(c.status()));
    console.log('       [captura] envio cancelado: status = ' + JSON.stringify(c.status().slice(0, 150)));
    check('envio: Cancelar envio interrompe, nao cria tarefa e libera a tela', foi && /cancelado/i.test(c.status()) && c.fake.cont.commit === 0 && c.fake.tarefas.size === 0 && c.botaoEnviarLivre() === true && c.envioAberto() === false && c.ls('ortofly_odm_tasks') === '[]');
    c.fechar();
  }
  { // (p) o servidor ficou com mais fotos do que as escolhidas (lote que chegou duas vezes): o card avisa
    const c = await subir5({ nome: '5p', exif: exifVoo(2, 13), imagensNoServidor: 8 });
    c.selecionar(6); await gsdLido(c); await c.enviar();
    await c.esperar(() => /img/.test(String(txt(c.doc, 'odmTaskStatus'))));
    const st = String(txt(c.doc, 'odmTaskStatus'));
    console.log('       [captura] contagem diferente: card = ' + JSON.stringify(st.slice(0, 170)));
    check('envio: se o servidor tem um numero de fotos diferente do escolhido, o card AVISA', /⚠️/.test(st) && /\b6\b/.test(st) && /\b8\b/.test(st));
    c.fechar();
  }
  { // (q) dois pedidos do pacote ao mesmo tempo viram UM download
    const c = await subir5({ nome: '5q', tarefas: [[T_VIVA, { code: 40 }]], ls: lsTarefa(T_VIVA, [T_VIVA]) });
    await c.esperar(() => c.fake.cont.info > 0);
    c.ev('odmGetZip().catch(function(){}); odmGetZip().catch(function(){}); 1');
    await new Promise(r => setTimeout(r, 80));
    check('pacote: dois pedidos simultaneos do all.zip fazem UM download (antes: dois, para o mesmo arquivo)', c.fake.cont.download === 1);
    c.fechar();
  }
  { // (r) gravacao abortada por falta de espaco: a promessa tem de REJEITAR
    const c = await subir5({ nome: '5r', idb: 'aborta' });
    const r = await c.aguardar("idbPut('chave', 1).then(function(){ return 'gravou'; })");
    console.log('       [captura] gravacao abortada = ' + JSON.stringify(String(r).slice(0, 120)));
    check('armazenamento: gravacao abortada (sem espaco) REJEITA com o motivo (antes: ficava pendurada para sempre)', /^rejeitou: /.test(String(r)) && /Quota|espaço/i.test(String(r)));
    c.fechar();
  }
  { // (s) falha ao gravar a lista de projetos (armazenamento cheio/bloqueado)
    const c = await subir5({ nome: '5s', idb: 'ok', tarefas: [[T_VIVA, { code: 40 }]], ls: lsTarefa(T_VIVA, [T_VIVA]) });
    await c.esperar(() => c.fake.cont.info > 0);
    let trocou = false;
    try { const orig = c.w.Storage.prototype.setItem; c.w.Storage.prototype.setItem = function (k, v) { if (k === 'ortofly_projects') throw new c.w.DOMException('cota excedida', 'QuotaExceededError'); return orig.call(this, k, v); }; trocou = true; } catch (e) { trocou = false; }
    const foi = c.clicar('button[onclick="saveProject()"]');
    console.log('       [captura] salvar projeto com armazenamento cheio: toast = ' + JSON.stringify(c.toast()));
    check('projetos: falha ao gravar NAO e anunciada como "Projeto salvo" (antes: era)', trocou && foi && c.toast().erro === true && !/Projeto salvo/.test(c.toast().texto));
    // Salvar no projeto, com o pacote ja "baixado": se o projeto nao grava, a tarefa do servidor NAO pode ser apagada
    c.ev("_odmZipRaw={size:10}; _odmZip={names:function(){ return []; }}; _odmZipFor=_odmTask; 1");
    const antes = c.fake.cont.remove;
    const r = await c.aguardar('odmSaveResult().then(function(){ return "terminou"; })', 3000);
    console.log('       [captura] salvar resultado com armazenamento cheio: ' + JSON.stringify(String(r)) + ' · status = ' + JSON.stringify(c.status().slice(0, 150)));
    check('salvar no projeto: sem conseguir gravar o projeto, a tarefa NAO e apagada do servidor (antes: era)',
      r === 'terminou' && /❌/.test(c.status()) && c.fake.cont.remove === antes && c.fake.tarefas.has(T_VIVA));
    check('salvar no projeto: o pacote orfao e retirado do banco do app', c.fake.idb.size === 0);
    c.fechar();
  }
  { // (t) arquivos temporarios de uma sessao anterior sao apagados ao abrir o app
    const c = await subir5({ nome: '5t', opfs: true });
    await c.esperar(() => c.fake.opfsApagado.length > 0, 800);
    check('temporarios: ao abrir, o app apaga a area temporaria de uma sessao anterior', c.fake.opfsApagado.includes('ortofly-tmp'));
    c.fechar();
  }
  { // (u) Reprocessar: opcoes novas, mesmas fotos
    const meta = { modo: 'fast', gsd: 1.8, n: 34, res: 1.8, options: [{ name: 'fast-orthophoto', value: true }], engineVersion: '3.5.6' };
    const c = await subir5({ nome: '5u', tarefas: [[T_VIVA, { code: 40, options: meta.options }]], ls: { ...lsTarefa(T_VIVA, [T_VIVA]), ['ortofly_odm_meta_' + T_VIVA]: JSON.stringify(meta) } });
    await c.esperar(() => c.fake.cont.info > 0);
    c.marcar('input[name="odmOut"][value="dsm"]', true);
    const foi = c.clicar('button[onclick="odmReprocessar()"]');
    await c.esperar(() => c.fake.reinicios.length > 0 && /Reprocessando|❌/.test(c.status()));
    const re = c.fake.reinicios[0] || {}, opRe = n => { const x = (re.options || []).find(o => o.name === n); return x ? x.value : undefined; };
    console.log('       [captura] reprocessar: ' + JSON.stringify(re) + ' · confirmacao = ' + JSON.stringify((c.confirms[0] || '').slice(0, 160)));
    check('reprocessar: o pedido vai em urlencoded, com o uuid e as opcoes da tela (o duplo foi exercitado, r91)', foi && re.tipo === 'urlencoded' && re.uuid === T_VIVA && opRe('dsm') === true && opRe('skip-3dmodel') === true);
    check('reprocessar: usa o GSD registrado DESTA tarefa, sem fotos escolhidas na tela', opRe('orthophoto-resolution') === 1.8 && Math.abs(opRe('dem-resolution') - 3.6) < 0.01);
    check('reprocessar: pergunta antes e avisa que as fotos nao sao reenviadas', c.confirms.length === 1 && /não são reenviadas/.test(c.confirms[0]));
    check('reprocessar: nenhuma foto e enviada de novo', c.fake.cont.init === 0 && c.fake.cont.upload === 0 && c.fake.cont.legado === 0);
    const mm = String(c.ev('citeText().mm'));
    check('reprocessar: o registro da tarefa passa a ser o do NOVO processamento (M&M com DSM)', /DSM/.test(mm) && /Multi-View/.test(mm));
    c.fechar();
    // reprocessar num modo que gera MENOS produtos: o NodeODM nao apaga os antigos (medido em 2026-11-16: o dsm.tif
    // do processamento anterior continua na pasta e no all.zip) -- o app avisa antes e nao abre o DSM que sobrou
    const metaDsm = { modo: 'dsm', gsd: 1.8, n: 34, res: 1.8, resEscolha: 'native', options: [{ name: 'dsm', value: true }], engineVersion: '3.5.6' };
    const c4 = await subir5({ nome: '5u4', tarefas: [[T_VIVA, { code: 40, options: metaDsm.options }]], ls: { ...lsTarefa(T_VIVA, [T_VIVA]), ['ortofly_odm_meta_' + T_VIVA]: JSON.stringify(metaDsm) } });
    await c4.esperar(() => c4.fake.cont.info > 0);
    c4.marcar('input[name="odmOut"][value="fast"]', true);
    c4.clicar('button[onclick="odmReprocessar()"]');
    await c4.esperar(() => c4.fake.reinicios.length > 0 && /Reprocessando|❌/.test(c4.status()));
    console.log('       [captura] reprocessar para um modo menor: confirmacao = ' + JSON.stringify((c4.confirms[0] || '').slice(-190)));
    check('reprocessar: trocar para um modo que gera MENOS produtos avisa que o DSM antigo continua no pacote', /DSM/.test(c4.confirms[0] || '') && /anterior/.test(c4.confirms[0] || '') && /anterior/.test(c4.status()));
    c4.ev("_odmZip={names:function(){ return ['odm_dem/dsm.tif','odm_orthophoto/odm_orthophoto.tif']; }, extrair:function(){ return Promise.resolve({blob:null,name:'dsm.tif'}); }}; _odmZipFor=_odmTask; 1");
    const rDsm = await c4.aguardar("odmExtract('dsm').then(function(){ return 'abriu o dsm antigo'; })");
    console.log('       [captura] abrir o DSM que sobrou = ' + JSON.stringify(String(rDsm).slice(0, 150)));
    check('reprocessar: depois de ir para o Rapido, o app NAO abre o dsm.tif do processamento anterior', /^rejeitou: /.test(String(rDsm)) && /Rápido/.test(String(rDsm)) && /anterior/.test(String(rDsm)));
    c4.fechar();
    // app reaberto: a tela volta com as opcoes DA TAREFA, senao o Reprocessar trocaria o que ninguem pediu para trocar
    const metaD = { modo: 'dsm', gsd: 1.8, n: 34, res: 3.6, resEscolha: '2x', rs: true, lite: true, options: [{ name: 'dsm', value: true }], engineVersion: '3.5.6' };
    const c3 = await subir5({ nome: '5u3', tarefas: [[T_VIVA, { code: 40, options: metaD.options }]], ls: { ...lsTarefa(T_VIVA, [T_VIVA]), ['ortofly_odm_meta_' + T_VIVA]: JSON.stringify(metaD) } });
    await c3.esperar(() => c3.fake.cont.info > 0);
    const tela = { modo: ((c3.doc.querySelector('input[name="odmOut"]:checked') || {}).value), res: val(c3.doc, 'odmRes'), rs: (el(c3.doc, 'odmRS') || {}).checked, lite: (el(c3.doc, 'odmLite') || {}).checked };
    console.log('       [captura] tela ao reabrir com a tarefa = ' + JSON.stringify(tela));
    check('reprocessar: ao reabrir o app, a tela mostra as opcoes com que a tarefa foi feita (saida, resolucao, obturador, RAM)',
      tela.modo === 'dsm' && tela.res === '2x' && tela.rs === true && tela.lite === true);
    c3.clicar('button[onclick="odmReprocessar()"]');
    await c3.esperar(() => c3.fake.reinicios.length > 0);
    const re3 = (c3.fake.reinicios[0] || {}).options || [];
    check('reprocessar: sem mexer em nada, repete as opcoes da tarefa — a correcao de obturador nao cai sozinha', re3.some(o => o.name === 'rolling-shutter' && o.value === true) && re3.some(o => o.name === 'orthophoto-resolution' && o.value === 3.6));
    c3.fechar();
    const c2 = await subir5({ nome: '5u2', tarefas: [[T_VIVA, { code: 20 }]], ls: lsTarefa(T_VIVA, [T_VIVA]) });
    await c2.esperar(() => c2.fake.cont.info > 0);
    c2.clicar('button[onclick="odmReprocessar()"]');
    await c2.esperar(() => /❌/.test(c2.status()));
    console.log('       [captura] reprocessar tarefa em andamento: status = ' + JSON.stringify(c2.status().slice(0, 170)));
    check('reprocessar: tarefa em andamento e recusada pelo servidor e o app diz o que fazer', c2.fake.reinicios.length === 1 && /cannot be restarted/i.test(c2.status()) && /cancele/i.test(c2.status()));
    c2.fechar();
  }

  /* -- cenario 5, 4a parte: precisao do produto e pontos de controle (v1.27.0) ---------------------------
     O stats.json abaixo traz os numeros da tarefa C da auditoria (34 fotos do voo de teste, com correcao de
     obturador): GSD das fotos 1,78 cm, reprojecao 1,02 px, CE90 pelo GPS 2,82 m, sem GCP. */
  const statsC = { reconstruction_statistics: { has_gcp: false, initial_shots_count: 34, reconstructed_shots_count: 34, reprojection_error_pixels: 1.0197 },
    gps_errors: { ce90: 2.8197 }, gcp_errors: {}, odm_processing_statistics: { average_gsd: 1.7847 } };
  const zipCom = (w5, stats) => { w5.__stats = JSON.stringify(stats);
    return "({names:function(){ return ['odm_report/stats.json','odm_orthophoto/odm_orthophoto.tif']; }, extrair:function(){ return Promise.resolve({blob:new Blob([window.__stats]),name:'stats.json'}); }})"; };
  { // (v) precisao: lida do stats.json do pacote baixado, no card, no registro da tarefa e no M&M
    const meta = { modo: 'dsm', gsd: 1.8, n: 34, res: 1.8, rs: true, options: [{ name: 'dsm', value: true }, { name: 'orthophoto-resolution', value: 1.8 }, { name: 'rolling-shutter', value: true }], engineVersion: '3.5.6' };
    const c = await subir5({ nome: '5v', tarefas: [[T_VIVA, { code: 40, options: meta.options }]], ls: { ...lsTarefa(T_VIVA, [T_VIVA]), ['ortofly_odm_meta_' + T_VIVA]: JSON.stringify(meta) } });
    await c.esperar(() => c.fake.cont.info > 0 && has(c.doc, 'odmOutputs', 'hidden') === false);
    const antes = String(txt(c.doc, 'odmPrecisao'));
    const zexpr = zipCom(c.w, statsC);
    const r = await c.aguardar('odmCarregarPrecisao(' + zexpr + ', _odmTask).then(function(p){ return p?"leu":"nada"; })');
    const card = String(txt(c.doc, 'odmPrecisao')), mm = String(c.ev('citeText().mm')), reg = c.ls('ortofly_odm_meta_' + T_VIVA) || '';
    console.log('       [captura] precisao: antes = ' + JSON.stringify(antes.slice(0, 80)) + ' · card = ' + JSON.stringify(card.slice(0, 200)));
    console.log('       [captura] M&M com precisao = ' + JSON.stringify(mm.slice(-260)));
    check('precisao: com a tarefa concluida e o pacote ainda nao baixado, o card diz onde a precisao vai aparecer', /quando o pacote for baixado/.test(antes));
    check('precisao: o card mostra GSD das fotos, erro de reprojecao e CE90 do ODM, e diz que nao ha pontos de controle',
      r === 'leu' && /1,78 cm/.test(card) && /1,02 px/.test(card) && /CE90/.test(card) && /2,8 m/.test(card) && /sem pontos de controle/.test(card));
    check('precisao: o numero fica no registro da tarefa (vai junto ao Salvar no projeto)', /"precisao"/.test(reg) && /2\.8197/.test(reg));
    check('precisao: o M&M passa a citar a reprojecao e a ausencia de pontos de controle', /reprojeção foi de 1,02 px/.test(mm) && /Não foram usados pontos de controle/.test(mm) && /2,8 m/.test(mm));
    // com GCP usado, o card fala do erro NOS PONTOS DE CONTROLE (e nao do GPS das fotos)
    const zg = zipCom(c.w, { ...statsC, reconstruction_statistics: { ...statsC.reconstruction_statistics, has_gcp: true }, gcp_errors: { ce90: 0.041 } });
    await c.aguardar('odmCarregarPrecisao(' + zg + ', _odmTask)');
    const cardG = String(txt(c.doc, 'odmPrecisao'));
    check('precisao: com GCP no processamento, o card mostra o erro nos pontos de controle', /pontos de controle \(CE90\) 0,04 m/.test(cardG) && /com pontos de controle/.test(cardG));
    c.fechar();
  }
  { // (w) pontos de controle: o arquivo vai junto, com o nome que o NodeODM entende, e nao conta como foto
    const c = await subir5({ nome: '5w', exif: exifVoo(2, 13) });
    c.selecionar(6); await gsdLido(c);
    const gcpTxt = 'EPSG:31983\n443100.1 9222000.2 30.5 2736 1824 DJI_0001.JPG GCP1\n443100.1 9222000.2 30.5 2700 1800 DJI_0002.JPG GCP1\n'
      + '443150.0 9222050.0 31.0 1000 900 DJI_0003.JPG GCP2\n443200.0 9221980.0 29.8 4000 3000 DJI_0004.JPG GCP3\n';
    const escolherGcp = (conteudo, nome) => { try { const inp = c.doc.getElementById('odmGcp'); Object.defineProperty(inp, 'files', { configurable: true, value: [new c.w.File([conteudo], nome, { type: 'text/plain' })] }); inp.dispatchEvent(new c.w.Event('change')); return true; } catch (e) { return false; } };
    const foiG = escolherGcp(gcpTxt, 'meus_pontos.txt');
    await c.esperar(() => /ponto/.test(String(txt(c.doc, 'odmGcpInfo'))));
    const info = String(txt(c.doc, 'odmGcpInfo'));
    console.log('       [captura] GCP escolhido = ' + JSON.stringify(info.slice(0, 160)));
    check('GCP: o app confere o arquivo e diz quantos pontos, marcacoes e fotos ele tem', foiG && /3 ponto/.test(info) && /4 marcaç/.test(info) && /4 foto/.test(info) && /EPSG:31983/.test(info));
    const t = await c.enviar();
    console.log('       [captura] envio com GCP: ' + JSON.stringify(t && { nImg: t.nImg, gcp: t.gcp }) + ' · uploads = ' + c.fake.cont.upload);
    check('GCP: o arquivo sobe junto, com o nome gcp_list.txt, e as 6 fotos continuam sendo 6 imagens', !!t && t.nImg === 6 && t.gcp.length === 1 && t.gcp[0] === 'gcp_list.txt');
    const mm = String(c.ev('citeText().mm'));
    check('GCP: o M&M diz que o arquivo foi ENVIADO (que foi usado, so o relatorio do ODM pode afirmar)', /arquivo de pontos de controle \(GCP\) com 3 ponto/.test(mm) && !/usou/.test(mm));
    c.fechar();
    // arquivo sem a linha do sistema: nao envia nada e diz o que falta
    const c2 = await subir5({ nome: '5w2', exif: exifVoo(2, 13) });
    c2.selecionar(6); await gsdLido(c2);
    try { const inp = c2.doc.getElementById('odmGcp'); Object.defineProperty(inp, 'files', { configurable: true, value: [new c2.w.File(['443100.1 9222000.2 30.5 2736 1824 DJI_0001.JPG\n'], 'x.txt')] }); inp.dispatchEvent(new c2.w.Event('change')); } catch (e) {}
    await c2.esperar(() => /❌/.test(String(txt(c2.doc, 'odmGcpInfo'))));
    c2.clicar('button[onclick="odmCreate()"]'); await new Promise(r => setTimeout(r, 60));
    console.log('       [captura] GCP fora do formato: ' + JSON.stringify(String(txt(c2.doc, 'odmGcpInfo')).slice(0, 120)) + ' · toast = ' + JSON.stringify(c2.toast()));
    check('GCP: arquivo sem a linha do sistema de coordenadas e recusado ANTES do envio, com o motivo', /sistema de coordenadas/.test(String(txt(c2.doc, 'odmGcpInfo'))) && c2.toast().erro === true && c2.fake.cont.init === 0);
    c2.fechar();
  }

  await new Promise(r => setTimeout(r, 50));
  const rejC5 = rejeicoes.slice(rej5);
  check('cenario 5: nenhuma excecao nao tratada (nem promessa rejeitada sem tratamento)', errs5.length === 0 && rejC5.length === 0);
  [...errs5, ...rejC5].forEach(e => console.error('       ' + e));

  /* -- cenario 6: o SERVICE WORKER abrindo o app com sinal fraco (v1.27.0) ---------------------------------
     O jsdom nao roda service worker; aqui o sw.js de verdade roda num contexto do Node com `caches`, `fetch` e
     relogio FALSOS -- o tempo-limite dispara quando o teste manda, sem esperar 3,5 s. Antes: sem tempo-limite
     (a abertura esperava a rede desistir), qualquer resposta entrava no cache (um 500 substituia o app bom) e a
     URL com ?... nao achava o app. Quem confere no navegador de verdade e o roteiro do V7 (plano). */
  {
    const vm = require('vm');
    const swFile = fs.existsSync(path.join(path.dirname(file), 'sw.js')) ? path.join(path.dirname(file), 'sw.js') : path.join(__dirname, '..', 'sw.js');
    const ORIG = 'https://magoc25.github.io';
    const subirSW = () => {
      const h = {}, store = new Map(), timers = [];
      class Resp { constructor(body, init) { this.body = body; this.status = (init && init.status) || 200; this.ok = this.status >= 200 && this.status < 300; this.type = (init && init.type) || 'basic'; } clone() { return new Resp(this.body, { status: this.status, type: this.type }); } }
      const chave = (u, ign) => ign ? String(u).split('?')[0] : String(u);
      const ctx = {
        self: { location: { origin: ORIG }, addEventListener: (t, f) => { h[t] = f; }, skipWaiting: () => Promise.resolve() },
        clients: { claim: () => Promise.resolve() },
        caches: { open: async () => ({ put: async (req, r) => { store.set(chave(req.url || req), r); }, addAll: async () => {} }),
                  match: async (req, o) => { const ign = o && o.ignoreSearch; for (const [k, v] of store) if (chave(k, ign) === chave(req.url || req, ign)) return v; return undefined; },
                  keys: async () => [], delete: async () => true },
        fetch: () => new Promise(() => {}), Response: Resp, Promise, Error, console,
        setTimeout: (fn) => { timers.push(fn); return timers.length; }, clearTimeout: () => {}
      };
      vm.createContext(ctx); vm.runInContext(fs.readFileSync(swFile, 'utf8'), ctx, { filename: 'sw.js' });
      const navegar = url => { const ev = { request: { method: 'GET', url, mode: 'navigate' }, esperas: [], respondWith(p) { this.resposta = Promise.resolve(p); }, waitUntil(p) { this.esperas.push(p); } }; h.fetch(ev); return ev; };
      const comTeto = (p, ms = 300) => Promise.race([p, new Promise(r => setTimeout(() => r('NUNCA RESPONDEU'), ms))]);
      return { ctx, store, timers, Resp, navegar, comTeto, dispararRelogio: () => timers.splice(0).forEach(f => f()) };
    };
    const APP = ORIG + '/OrtoFly/ortofly.html';
    let sw = null; try { sw = subirSW(); } catch (e) { console.error('       sw.js nao carregou: ' + e.message); }
    check('sw: o sw.js de verdade carrega no arreio e registra o fetch (o arreio foi exercitado, r91)', !!sw && typeof sw.ctx.self === 'object');
    if (sw) {
      // (a) sinal que conecta e nao responde: a abertura usa a copia do cache ao estourar o tempo-limite
      sw.store.set(APP, new sw.Resp('app-bom'));
      let soltarRede; sw.ctx.fetch = () => new Promise(res => { soltarRede = res; });
      const ev = sw.navegar(APP);
      const semRelogio = await sw.comTeto(ev.resposta, 50);
      sw.dispararRelogio();
      const r1 = await sw.comTeto(ev.resposta);
      console.log('       [captura] sw, rede parada: antes do tempo-limite = ' + JSON.stringify(semRelogio === 'NUNCA RESPONDEU' ? 'esperando' : semRelogio && semRelogio.body) + ' · depois = ' + JSON.stringify(r1 && r1.body));
      check('sw: com a rede parada, a abertura usa a copia do cache quando o tempo-limite estoura (antes: esperava a rede desistir)', semRelogio === 'NUNCA RESPONDEU' && !!r1 && r1.body === 'app-bom');
      soltarRede(new sw.Resp('app-novo')); await Promise.all(ev.esperas);
      check('sw: se a rede responde DEPOIS do tempo-limite, a copia nova entra no cache para a proxima abertura', (sw.store.get(APP) || {}).body === 'app-novo');
      // (b) 500 do servidor com copia boa no cache: entrega a copia e NAO a substitui
      sw.ctx.fetch = () => Promise.resolve(new sw.Resp('erro do servidor', { status: 500 }));
      const ev2 = sw.navegar(APP); const r2 = await sw.comTeto(ev2.resposta); await Promise.all(ev2.esperas);
      check('sw: resposta de erro (500) nao substitui o app no cache, e a abertura usa a copia boa', !!r2 && r2.body === 'app-novo' && (sw.store.get(APP) || {}).body === 'app-novo');
      // (c) URL com ?... e sem rede: acha o app mesmo assim
      sw.ctx.fetch = () => Promise.reject(new TypeError('Failed to fetch'));
      const ev3b = sw.navegar(APP + '?utm=qr'); const r3 = await sw.comTeto(ev3b.resposta);
      check('sw: offline, a URL com ?... ainda acha o app no cache (ignoreSearch)', !!r3 && r3.body === 'app-novo');
      // (d) rede normal: entrega a da rede e atualiza o cache (continua network-first)
      sw.ctx.fetch = () => Promise.resolve(new sw.Resp('app-v2'));
      const ev4b = sw.navegar(APP); const r4 = await sw.comTeto(ev4b.resposta); await Promise.all(ev4b.esperas);
      check('sw: com rede normal, abre a versao da rede e ela entra no cache (network-first mantido)', !!r4 && r4.body === 'app-v2' && (sw.store.get(APP) || {}).body === 'app-v2');
      // (e) redirecionamento de navegacao passa direto (nao vira copia do cache)
      sw.ctx.fetch = () => Promise.resolve(new sw.Resp(null, { status: 0, type: 'opaqueredirect' }));
      const ev5b = sw.navegar(APP); const r5 = await sw.comTeto(ev5b.resposta);
      check('sw: redirecionamento da navegacao passa direto ao navegador', !!r5 && r5.type === 'opaqueredirect');
    }
  }

  /* -- cenario 7: ARMAZENAMENTO BLOQUEADO (cookies/dados do site bloqueados) (v1.27.0) -----------------------
     Ler window.localStorage lanca SecurityError. Ate a v1.26.0 isso estourava dentro de wire(), antes de ligar
     a importacao de fotos/raster/3D: a tela aparecia e nada respondia, sem mensagem. */
  {
    const errs7 = [], rej7 = rejeicoes.length;
    const vc7 = new VirtualConsole();
    vc7.on('jsdomError', e => errs7.push('jsdomError: ' + ((e && e.message) || e)));
    const dom7 = new JSDOM(html, {
      url: 'https://magoc25.github.io/OrtoFly/ortofly.html', runScripts: 'dangerously', pretendToBeVisual: true, virtualConsole: vc7,
      beforeParse(window) {
        window.L = chainProxy();
        Object.defineProperty(window, 'localStorage', { configurable: true, get() { throw new window.DOMException('O acesso ao armazenamento foi negado', 'SecurityError'); } });
        window.fetch = () => Promise.reject(new Error('offline (stub)'));
        window.URL.createObjectURL = () => 'blob:stub'; window.URL.revokeObjectURL = () => {};
        window.matchMedia = window.matchMedia || (() => ({ matches: false, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} }));
        window.scrollTo = () => {}; window.structuredClone = window.structuredClone || structuredClone;
      }
    });
    const w7 = dom7.window, doc7 = w7.document, ev7 = evOf(w7);
    await new Promise((res, rej) => { const t = setTimeout(() => rej(new Error('cenario 7: load nao disparou em 5 s')), 5000);
      if (w7.document.readyState === 'complete') { clearTimeout(t); res(); } else w7.addEventListener('load', () => { clearTimeout(t); res(); }); });
    let bloqueado = false; try { void w7.localStorage; } catch (e) { bloqueado = e.name === 'SecurityError'; }
    await new Promise(r => setTimeout(r, 1000));   // o aviso sai depois do aviso do exemplo (700 ms)
    const toast7 = el(doc7, 'toast');
    console.log('       [captura] armazenamento bloqueado: toast = ' + JSON.stringify(toast7 ? toast7.textContent.slice(0, 110) : null) + ' · cSw = ' + JSON.stringify(val(doc7, 'cSw')));
    check('armazenamento bloqueado: o cenario e real (ler localStorage lanca SecurityError)', bloqueado);
    check('armazenamento bloqueado: o app abre inteiro — AOI de exemplo, plano calculado e o FIM de wire() executado',
      ev7('state.polygon.length') === 4 && ev7('!!state.lastPlan && state.lastPlan.gsd>0') === true && !!val(doc7, 'cSw') && ev7('ls.memoria') === true);
    check('armazenamento bloqueado: o usuario e avisado de que nada sera salvo nesta sessao',
      !!toast7 && /bloqueou o armazenamento/.test(toast7.textContent) && toast7.classList.contains('error'));
    const sp = ev7("(function(){ $('projName').value='Teste'; saveProject(); return $('toast').textContent; })()");
    check('armazenamento bloqueado: salvar projeto diz que NAO salvou (nao anuncia "Projeto salvo")', /Não consegui salvar/.test(String(sp)));
    await new Promise(r => setTimeout(r, 30));
    check('cenario 7: nenhuma excecao nao tratada', errs7.length === 0 && rejeicoes.length === rej7);
    errs7.forEach(e => console.error('       ' + e));
    try { w7.close(); } catch (e) {}
  }

  /* -- cenario 8: TECLADO, LEITOR DE TELA e o id de projeto num onclick (v1.28.0) -------------------------
     O ACCESSIBILITY.md prometia modais operaveis por teclado: o foco ficava atras do modal, o Tab saia dele e
     ao fechar nao voltava; as estrelas eram <span> (nao dava para avaliar sem mouse). E a lista de projetos
     interpolava o id (vindo do localStorage) num onclick: um registro com aspas no id executava codigo. */
  {
    const errs8 = [], rej8 = rejeicoes.length;
    const vc8 = new VirtualConsole(); vc8.on('jsdomError', e => errs8.push('jsdomError: ' + ((e && e.message) || e)));
    const ID_MAU = "x');window.__xss=1;//";
    const dom8 = new JSDOM(html, {
      url: 'https://magoc25.github.io/OrtoFly/ortofly.html', runScripts: 'dangerously', pretendToBeVisual: true, virtualConsole: vc8,
      beforeParse(window) {
        window.L = chainProxy(); window.fetch = () => Promise.reject(new Error('offline (stub)'));
        window.URL.createObjectURL = () => 'blob:stub'; window.URL.revokeObjectURL = () => {};
        window.matchMedia = window.matchMedia || (() => ({ matches: false, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} }));
        window.scrollTo = () => {}; window.structuredClone = window.structuredClone || structuredClone;
        window.localStorage.setItem('ortofly_beta_ack', '1');
        window.localStorage.setItem('ortofly_projects', JSON.stringify([{ id: ID_MAU, name: 'Projeto com id adulterado', ts: 1, data: { polygon: [[-7.01, -45.49], [-7.01, -45.48], [-7.02, -45.48]], droneId: 'mavic3', params: {} } }]));
      }
    });
    const w8 = dom8.window, doc8 = w8.document, ev8 = evOf(w8);
    await new Promise((res, rej) => { const t = setTimeout(() => rej(new Error('cenario 8: load nao disparou em 5 s')), 5000);
      if (w8.document.readyState === 'complete') { clearTimeout(t); res(); } else w8.addEventListener('load', () => { clearTimeout(t); res(); }); });
    const tique = () => new Promise(r => setTimeout(r, 20));   // o observador dos modais roda depois da troca de classe
    const tecla = (alvo, key, extra) => { const e = new w8.KeyboardEvent('keydown', { key, bubbles: true, cancelable: true, ...(extra || {}) }); (alvo || doc8).dispatchEvent(e); return e; };
    const ativo = () => doc8.activeElement;

    // (a) modal "Como usar" aberto pelo botao: o foco entra, o Tab nao sai, o Esc fecha e o foco volta ao botao
    const btnAjuda = doc8.querySelector('button[onclick="openAbout()"]');
    if (btnAjuda) { btnAjuda.focus(); btnAjuda.click(); }
    await tique();
    const modalAjuda = el(doc8, 'aboutModal');
    const dentro = () => !!modalAjuda && !!ativo() && modalAjuda.contains(ativo());
    check('teclado: abrir um modal leva o foco PARA DENTRO dele (antes: ficava atras)', !!btnAjuda && has(doc8, 'aboutModal', 'hidden') === false && dentro());
    const focaveis = modalAjuda ? [...modalAjuda.querySelectorAll('button,[href],input,select,textarea')].filter(n => !n.closest('.hidden')) : [];
    if (focaveis.length) focaveis[focaveis.length - 1].focus();
    const evTab = tecla(ativo(), 'Tab');
    check('teclado: o Tab no ultimo controle volta ao primeiro do modal, sem sair dele', focaveis.length >= 2 && evTab.defaultPrevented && ativo() === focaveis[0]);
    if (focaveis.length) focaveis[0].focus();   // parte do PRIMEIRO de proposito: sem o tratamento, o foco ficaria nele e a assercao falha
    const evShift = tecla(ativo(), 'Tab', { shiftKey: true });
    check('teclado: Shift+Tab no primeiro vai ao ultimo do modal', focaveis.length >= 2 && evShift.defaultPrevented && ativo() === focaveis[focaveis.length - 1]);
    tecla(ativo(), 'Escape'); await tique();
    check('teclado: Esc fecha o modal e o foco VOLTA ao botao que o abriu', has(doc8, 'aboutModal', 'hidden') === true && ativo() === btnAjuda);
    check('leitor de tela: o modal e um dialogo com titulo', !!modalAjuda && modalAjuda.getAttribute('role') === 'dialog' && modalAjuda.getAttribute('aria-modal') === 'true'
      && !!el(doc8, modalAjuda.getAttribute('aria-labelledby')) && /Como usar/.test(txt(doc8, modalAjuda.getAttribute('aria-labelledby'))));

    // (b) abas: aria-selected acompanha a aba ativa
    const abaProc = doc8.querySelector('button.tab[data-tab="proc"]'); if (abaProc) abaProc.click();
    check('leitor de tela: as abas sao role="tab" e aria-selected acompanha a aba ativa',
      !!abaProc && abaProc.getAttribute('role') === 'tab' && abaProc.getAttribute('aria-selected') === 'true'
      && doc8.querySelector('button.tab[data-tab="voo"]').getAttribute('aria-selected') === 'false' && el(doc8, 'tab-proc').getAttribute('role') === 'tabpanel');

    // (c) estrelas: botoes de verdade, com nome e estado
    ev8("openReviewsModal('form')"); await tique();
    const estrelas = qsa(doc8, '.star-btn');
    if (estrelas[3]) estrelas[3].click();
    check('teclado: as estrelas da avaliacao sao <button> com nome (antes: <span>, fora do alcance do teclado)',
      estrelas.length === 5 && estrelas.every(b => b.tagName === 'BUTTON' && /estrela/.test(b.getAttribute('aria-label') || '')));
    check('leitor de tela: escolher 4 estrelas marca aria-pressed nas 4 primeiras e grava 4', val(doc8, 'reviewStarInput') === '4'
      && estrelas.map(b => b.getAttribute('aria-pressed')).join(',') === 'true,true,true,true,false');
    ev8('closeReviewsModal()'); await tique();

    // (d) toast anunciado; erro como alerta
    ev8("toast('teste de erro','error')");
    const tEl = el(doc8, 'toast');
    check('leitor de tela: o toast e anunciado (aria-live) e o de erro vira alerta', !!tEl && !!tEl.getAttribute('aria-live') && tEl.getAttribute('role') === 'alert');
    ev8("toast('teste comum')");
    check('leitor de tela: toast comum fica como status (nao interrompe)', !!tEl && tEl.getAttribute('role') === 'status');

    // (e) id adulterado na lista de projetos: nada executa, e o projeto abre pelo teclado
    ev8('openProjects()'); await tique();
    const nome = doc8.querySelector('#projectsList .pn');
    if (nome) nome.click();
    const btnAbrir = qsa(doc8, '#projectsList button').find(b => /Abrir/.test(b.textContent));
    if (btnAbrir) btnAbrir.click();
    console.log('       [captura] id adulterado: __xss = ' + JSON.stringify(w8.__xss) + ' · nome do projeto = ' + JSON.stringify(val(doc8, 'projName')));
    check('seguranca: id de projeto com aspas NAO executa codigo ao clicar no nome nem em Abrir (antes: executava)', !!nome && !!btnAbrir && w8.__xss === undefined);
    check('seguranca: e o projeto abre normalmente pelo id de verdade', val(doc8, 'projName') === 'Projeto com id adulterado');
    ev8("$('projName').value=''; openProjects()"); await tique();
    const nome2 = doc8.querySelector('#projectsList .pn');
    if (nome2) nome2.focus(); tecla(nome2, 'Enter');
    check('teclado: o nome do projeto (role="button") abre o projeto com Enter', !!nome2 && nome2.getAttribute('tabindex') === '0' && val(doc8, 'projName') === 'Projeto com id adulterado');

    await tique();
    check('cenario 8: nenhuma excecao nao tratada', errs8.length === 0 && rejeicoes.length === rej8);
    errs8.forEach(e => console.error('       ' + e));
    try { w8.close(); } catch (e) {}
  }

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
