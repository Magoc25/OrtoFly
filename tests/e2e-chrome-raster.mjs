/*
  tests/e2e-chrome-raster.mjs — trocar de raster na aba Imagens, num Chrome de verdade

  MANUAL, fora do CI: precisa do Chrome instalado e de DOIS GeoTIFF da MESMA área (o ortomosaico e o
  DSM do mesmo voo — é a condição do defeito). Roda sem dependências (Node 22+).

      node tests/e2e-chrome-raster.mjs --ortho "/caminho/odm_orthophoto.tif" --dsm "/caminho/dsm.tif"
      (--html ./ortofly.html para outro arquivo; outro Chrome: variável CHROME)

  O defeito que ele vigia (v1.29.3): o georaster-layer 4.1.2 guarda os tiles desenhados num cache que
  mora no PROTÓTIPO da classe — um só para todas as camadas, com chave = tile + resolução. Ortho e DSM
  da mesma área caem nas mesmas chaves: o segundo aparecia com os tiles do primeiro, e trocar a paleta
  do DSM não mudava a imagem. Recarregar o app zerava o cache, por isso a 1ª abertura saía certa.

  Como mede: lê a cor média dos tiles do raster NA TELA (os canvas da camada) e compara com a de cada
  produto aberto num app recém-aberto (referência). Passos, do jeito que o usuário faz (campo de
  arquivo + 🗑️ Remover raster):
    1. app novo → DSM → paleta Cinza: a imagem tem de ficar cinza;
    2. app novo → ortho → Remover raster → DSM: tem de mostrar o DSM;
    3. app novo → DSM → Remover raster → ortho: tem de mostrar a ortho.
  Se as duas referências tiverem a mesma cor, o instrumento não distingue os produtos: sai INCONCLUSIVO.

  Sai com 0 se tudo conferiu, 1 se alguma conferência falhou, 2 se o roteiro não chegou ao fim.
*/
import { createServer } from 'node:http';
import { spawn } from 'node:child_process';
import { mkdtempSync, rmSync, existsSync, createReadStream, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import net from 'node:net';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const aqui = path.dirname(fileURLToPath(import.meta.url));
const arg = (nome, padrao) => { const i = process.argv.indexOf('--' + nome); return i > 0 && process.argv[i + 1] ? process.argv[i + 1] : padrao; };
const HTML = path.resolve(arg('html', path.join(aqui, '..', 'ortofly.html')));
const ORTHO = arg('ortho', '') && path.resolve(arg('ortho', '')), DSM = arg('dsm', '') && path.resolve(arg('dsm', ''));
const dorme = ms => new Promise(r => setTimeout(r, ms));
const falhas = [];
const confere = (nome, cond) => { if (cond) console.log('ok     ' + nome); else { console.error('FALHA  ' + nome); falhas.push(nome); } };
const portaLivre = () => new Promise((res, rej) => { const s = net.createServer(); s.on('error', rej); s.listen(0, '127.0.0.1', () => { const p = s.address().port; s.close(() => res(p)); }); });
let servidor = null, chrome = null, perfil = null;

async function main() {
  if (!ORTHO || !existsSync(ORTHO) || !DSM || !existsSync(DSM)) throw new Error('informe os dois arquivos da mesma área: --ortho "<…tif>" --dsm "<…tif>"');
  if (!existsSync(HTML)) throw new Error('não achei o app em ' + HTML);
  const exe = [process.env.CHROME, '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe', '/usr/bin/google-chrome', '/usr/bin/chromium'].find(p => p && existsSync(p));
  if (!exe) throw new Error('não achei o Chrome — aponte o executável na variável CHROME');

  /* ── o app servido em localhost ── */
  const raiz = path.dirname(HTML), TIPOS = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.wasm': 'application/wasm' };
  servidor = createServer((req, res) => {
    const alvo = path.normalize(path.join(raiz, decodeURIComponent(req.url.split('?')[0])));
    if (!alvo.startsWith(raiz) || !existsSync(alvo) || !statSync(alvo).isFile()) { res.writeHead(404); res.end(); return; }
    res.writeHead(200, { 'Content-Type': TIPOS[path.extname(alvo)] || 'application/octet-stream' }); createReadStream(alvo).pipe(res);
  });
  const portaApp = await portaLivre(); await new Promise(r => servidor.listen(portaApp, '127.0.0.1', r));
  const URL_APP = `http://localhost:${portaApp}/${path.basename(HTML)}`;

  /* ── Chrome headless, perfil temporário, sem rede externa (o mapa de fundo não carrega; o raster não precisa dele) ── */
  perfil = mkdtempSync(path.join(tmpdir(), 'ortofly-raster-'));
  const portaCdp = await portaLivre(), CDP = 'http://127.0.0.1:' + portaCdp;
  chrome = spawn(exe, ['--headless=new', '--remote-debugging-port=' + portaCdp, '--user-data-dir=' + perfil, '--no-first-run', '--no-default-browser-check',
    '--window-size=1280,900', '--host-resolver-rules=MAP * ~NOTFOUND, EXCLUDE localhost, EXCLUDE 127.0.0.1', 'about:blank'], { stdio: 'ignore' });
  let versao = null;
  for (let i = 0; i < 60 && !versao; i++) { try { versao = (await (await fetch(CDP + '/json/version')).json()).Browser; } catch (e) { await dorme(250); } }
  if (!versao) throw new Error('o Chrome não abriu a porta de depuração');
  const aba = await (await fetch(CDP + '/json/new?about:blank', { method: 'PUT' })).json();
  const ws = new WebSocket(aba.webSocketDebuggerUrl);
  await new Promise((res, rej) => { ws.addEventListener('open', res); ws.addEventListener('error', () => rej(new Error('não conectei ao Chrome'))); });
  let id = 0; const pendentes = new Map();
  const cmd = (method, params = {}) => new Promise(res => { const i = ++id; pendentes.set(i, res); ws.send(JSON.stringify({ id: i, method, params })); });
  ws.addEventListener('message', m => {
    const d = JSON.parse(m.data);
    if (d.id) { const f = pendentes.get(d.id); pendentes.delete(d.id); if (f) f(d); return; }
    if (d.method === 'Page.javascriptDialogOpening') cmd('Page.handleJavaScriptDialog', { accept: true });
  });
  // leitura tolerante: erro de avaliação vira `undefined` e a conferência que dependia dela fica vermelha
  const ev = async expr => { const r = await cmd('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true }); return (r.result && !r.result.exceptionDetails) ? r.result.result.value : undefined; };
  const esperar = async (f, ms = 15000) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { try { if (await f()) return true; } catch (e) {} await dorme(200); } return false; };
  await cmd('Page.enable'); await cmd('Runtime.enable');

  const abrir = async () => {
    await cmd('Page.navigate', { url: URL_APP });
    if (!await esperar(async () => (await ev('document.readyState==="complete" && typeof handleRasterFile==="function"')) === true)) throw new Error('o app não terminou de carregar em ' + URL_APP);
    await ev(`localStorage.setItem('ortofly_beta_ack','1'); document.querySelectorAll('.modal').forEach(m=>m.classList.add('hidden')); setTab('imagens'); if(map) map.invalidateSize(); 1`);
  };
  // abre pelo campo de arquivo, como o usuário; o fim é o toast de sucesso (ou de erro)
  const carregar = async arq => {
    await ev(`window.__fim=false; if(!window.__toastReal) window.__toastReal=toast; toast=(m,t)=>{ if(/Raster carregado|Erro/.test(m)) window.__fim=String(m); return window.__toastReal(m,t); }; 1`);
    const raizDom = await cmd('DOM.getDocument', {});
    const campo = await cmd('DOM.querySelector', { nodeId: raizDom.result.root.nodeId, selector: '#rasterInput' });
    await cmd('DOM.setFileInputFiles', { files: [arq], nodeId: campo.result.nodeId });
    if (!await esperar(async () => !!(await ev('window.__fim')), 120000)) throw new Error('não carregou ' + path.basename(arq));
    const fim = await ev('window.__fim'); if (!/carregado/.test(fim)) throw new Error('erro ao abrir ' + path.basename(arq) + ': ' + fim);
    await dorme(3000);   // os tiles desenham depois do toast
  };
  const remover = async () => { await ev(`(()=>{ const b=[...document.querySelectorAll('button')].find(x=>/Remover raster/.test(x.textContent)); if(b) b.click(); return !!b; })()`); await dorme(300); };
  // o que está NA TELA: cor média dos canvas da camada de raster
  const tela = () => ev(`(()=>{ if(!rasterLayer||!rasterLayer.getContainer()) return null;
    const cs=[...rasterLayer.getContainer().querySelectorAll('canvas')].filter(c=>c.width>0);
    let n=0,r=0,g=0,b=0; for(const c of cs){ const d=c.getContext('2d').getImageData(0,0,c.width,c.height).data; for(let i=0;i<d.length;i+=64){ if(d[i+3]===0) continue; r+=d[i];g+=d[i+1];b+=d[i+2];n++; } }
    return { tiles:cs.length, px:n, rgb:n?[r/n,g/n,b/n].map(Math.round):null, bandas:_rasterMeta&&_rasterMeta.bands }; })()`);
  const fmt = t => t ? `${t.bandas} banda(s) · ${t.tiles} tiles · cor média ${JSON.stringify(t.rgb)}` : 'nada na tela';
  const dist = (a, b) => (a && a.rgb && b && b.rgb) ? Math.hypot(a.rgb[0] - b.rgb[0], a.rgb[1] - b.rgb[1], a.rgb[2] - b.rgb[2]) : NaN;

  await abrir();
  console.log(`${versao} · app v${await ev('APP_VERSION')} · ${path.basename(ORTHO)} × ${path.basename(DSM)}\n`);

  /* 1) referência do DSM + troca de paleta */
  await carregar(DSM); const refDsm = await tela();
  await ev(`document.getElementById('rasterCmap').value='grayscale'; recolorRaster(); 1`); await dorme(3000); const cinza = await tela();
  /* 2) referência da ortho; depois, no MESMO app, Remover raster → DSM */
  await abrir(); await carregar(ORTHO); const refOrtho = await tela();
  await remover(); await carregar(DSM); const dsmDepois = await tela();
  /* 3) app novo: DSM → Remover raster → ortho */
  await abrir(); await carregar(DSM); await remover(); await carregar(ORTHO); const orthoDepois = await tela();

  console.log('       DSM  (app novo)        : ' + fmt(refDsm));
  console.log('       ORTHO(app novo)        : ' + fmt(refOrtho));
  console.log('       DSM  com paleta Cinza  : ' + fmt(cinza));
  console.log('       DSM  depois da ortho   : ' + fmt(dsmDepois));
  console.log('       ORTHO depois do DSM    : ' + fmt(orthoDepois) + '\n');
  // o instrumento tem de distinguir os dois produtos antes de qualquer veredito
  if (!(dist(refDsm, refOrtho) >= 10)) throw new Error('as referências do DSM e da ortho têm a mesma cor na tela — o instrumento não distingue os produtos');
  const ehCinza = t => !!(t && t.rgb) && Math.max(...t.rgb) - Math.min(...t.rgb) <= 3;
  confere('paleta: trocar a paleta do DSM para Cinza redesenha a imagem (cinza na tela)', !ehCinza(refDsm) && ehCinza(cinza));
  confere('mesma área: DSM aberto depois da ortho mostra o DSM, não a ortho', dist(dsmDepois, refDsm) < dist(dsmDepois, refOrtho));
  confere('mesma área: ortho aberta depois do DSM mostra a ortho, não o DSM', dist(orthoDepois, refOrtho) < dist(orthoDepois, refDsm));
}

const fechar = () => { try { if (chrome) chrome.kill(); } catch (e) {} try { if (servidor) servidor.close(); } catch (e) {} };
main().then(() => {
  fechar(); console.log(falhas.length ? `\n${falhas.length} conferência(s) falharam` : '\nTudo conferiu');
  setTimeout(() => { try { if (perfil) rmSync(perfil, { recursive: true, force: true }); } catch (e) {} process.exit(falhas.length ? 1 : 0); }, 500);
}).catch(e => {
  fechar(); console.error('\nINCONCLUSIVO — o roteiro não chegou ao fim: ' + e.message);
  setTimeout(() => { try { if (perfil) rmSync(perfil, { recursive: true, force: true }); } catch (e2) {} process.exit(2); }, 500);
});
