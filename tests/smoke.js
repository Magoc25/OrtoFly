/*
  tests/smoke.js — Smoke-test do OrtoFly via jsdom (degrau 2 · roda no GitHub Actions)

  Sobe o ortofly.html num DOM simulado (jsdom), SEM navegador e SEM as libs de
  CDN (Leaflet vira um stub), e verifica que o app:
    - inicializa sem exceção (boot + AOI de exemplo);
    - gera o plano de voo (GSD, grade, waypoints) e preenche os Resultados;
    - exporta KML/GeoJSON com conteúdo coerente e monta o template WPML;
    - mostra a versão embutida no rodapé e o modal beta da 1ª abertura.

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
  const ev = expr => { try { return w.eval(expr); } catch (e) { problems.push('eval falhou: ' + expr + ' → ' + e.message); console.error('FALHA  eval: ' + expr + ' → ' + e.message); return undefined; } };

  // no jsdom o DOMContentLoaded/load dispara DEPOIS do construtor (assíncrono) — espera o boot completar
  await new Promise((res, rej) => {
    const t = setTimeout(() => rej(new Error('evento load não disparou em 5 s — boot travado?')), 5000);
    if (w.document.readyState === 'complete') { clearTimeout(t); res(); }
    else w.addEventListener('load', () => { clearTimeout(t); res(); });
  });

  /* boot */
  check('boot: script avaliado (state/APP_VERSION existem)', ev("typeof state==='object' && typeof APP_VERSION==='string'") === true);
  check('boot: AOI de exemplo carregada (4 vértices)', ev('state.polygon.length') === 4);
  check('boot: nome do projeto de exemplo', String(doc.getElementById('projName').value).includes('Exemplo'));

  /* plano de voo */
  check('plano: GSD calculado (> 0)', ev('!!state.lastPlan && isFinite(state.lastPlan.gsd) && state.lastPlan.gsd>0') === true);
  const wpCount = ev('state.lastPlan && state.lastPlan.grid ? state.lastPlan.grid.waypoints.length : 0');
  check('plano: grade com waypoints (> 10)', wpCount > 10);
  check('plano: Resultados preenchidos na UI', doc.getElementById('oGsd').textContent !== '—' && doc.getElementById('oPhotos').textContent !== '—');

  /* rodapé (r38): versão exibida = APP_VERSION embutida */
  check('rodapé: versão embutida', doc.getElementById('appVersion').textContent === '© MGC · v' + ev('APP_VERSION'));

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

  /* modal beta da 1ª abertura (timer de 700 ms) + ack persistido */
  await new Promise(r => setTimeout(r, 1100));
  check('beta: modal aparece na 1ª abertura', !doc.getElementById('betaModal').classList.contains('hidden'));
  ev('ackBeta()');
  check('beta: ack gravado no localStorage', w.localStorage.getItem('ortofly_beta_ack') === '1');

  /* nenhum erro de runtime no boot */
  check('sem erros de console/jsdom durante o smoke', consoleErrs.length === 0);
  consoleErrs.forEach(e => console.error('       ' + e));

  console.log(problems.length ? `\n${problems.length} falha(s).` : '\nSmoke OK ✅');
  process.exit(problems.length ? 1 : 0);   // (os timers do app — ping etc. — seguram o processo; saída explícita)
}
main().catch(e => { console.error('FALHA  smoke não rodou: ' + (e.stack || e)); process.exit(1); });
