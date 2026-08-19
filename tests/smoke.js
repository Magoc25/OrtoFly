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
