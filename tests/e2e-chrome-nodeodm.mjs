/*
  tests/e2e-chrome-nodeodm.mjs — o OrtoFly num Chrome de verdade contra um NodeODM de verdade

  MANUAL, fora do CI: precisa do Chrome instalado, de um NodeODM no ar e de uma pasta
  com fotos de drone. Roda sem dependências (Node 22+: fetch, WebSocket e FormData nativos).

      node tests/e2e-chrome-nodeodm.mjs --fotos "/caminho/das/fotos"
      node tests/e2e-chrome-nodeodm.mjs --fotos "…" --odm http://127.0.0.1:3000 --html ./ortofly.html
      (o Chrome é procurado nos lugares usuais; para outro caminho: variável CHROME)

  O que ele faz, do jeito que o usuário faria:
    1. serve a pasta do app em http://localhost:<porta> e abre a página num Chrome headless,
       com perfil temporário e sem acesso a nada fora deste computador (a sonda não vira
       "aparelho novo" na contagem de uso);
    2. cria DUAS tarefas descartáveis no NodeODM (10 fotos cada) e dirige a aba Processar:
       reabrir o app com a tarefa em andamento · Cancelar · Descartar · reabrir com uma
       tarefa que não existe mais no servidor · Limpar tudo;
    3. confere o resultado NO SERVIDOR (/task/<uuid>/info e /task/list), não só na tela.

  O QUE ELE NUNCA FAZ: apagar tarefa que não criou. No Limpar tudo, ele RECUSA a segunda
  confirmação (a das tarefas que o navegador não registrou) e depois confere que todas as
  tarefas que já estavam no servidor continuam lá. As duas descartáveis são removidas ao
  final, mesmo se o roteiro falhar no meio.

  Por que existe: o jsdom do tests/smoke.js não tem CORS, nem o corpo de verdade de um
  fetch, nem o relógio de um setInterval. Foi num Chrome real que se viu, na v1.24.0, o
  pedido de Descartar sair em multipart/form-data — formato que o NodeODM não lê — e, na
  v1.24.1, sair em application/x-www-form-urlencoded e a tarefa sumir do servidor.

  Sai com 0 se tudo conferiu, 1 se alguma conferência falhou, 2 se o roteiro não chegou
  ao fim (INCONCLUSIVO — não é "passou" nem "falhou").
*/
import { createServer } from 'node:http';
import { spawn } from 'node:child_process';
import { mkdtempSync, rmSync, readdirSync, existsSync, createReadStream, statSync, openAsBlob } from 'node:fs';
import { tmpdir } from 'node:os';
import net from 'node:net';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const aqui = path.dirname(fileURLToPath(import.meta.url));
const arg = (nome, padrao) => { const i = process.argv.indexOf('--' + nome); return i > 0 && process.argv[i + 1] ? process.argv[i + 1] : padrao; };
const PASTA_FOTOS = arg('fotos', '');
const ODM = String(arg('odm', 'http://127.0.0.1:3000')).replace(/\/+$/, '');
const HTML = path.resolve(arg('html', path.join(aqui, '..', 'ortofly.html')));
const N_FOTOS = 10;
const FANTASMA = '00000000-0000-4000-8000-000000000000';   // uuid que não existe em servidor nenhum

const dorme = ms => new Promise(r => setTimeout(r, ms));
const falhas = [];
const confere = (nome, cond) => { if (cond) console.log('ok     ' + nome); else { console.error('FALHA  ' + nome); falhas.push(nome); } };
const nota = (k, v) => console.log('       ' + k + ': ' + (typeof v === 'string' ? v : JSON.stringify(v)));

const criadas = [];          // só o que ESTE roteiro criou — é a única coisa que ele remove
let chrome = null, perfil = null, servidor = null;

async function odm(caminho) { try { return await (await fetch(ODM + caminho)).json(); } catch (e) { return { erroDeRede: String(e) }; } }
async function removerNoServidor(uuid) { try { await fetch(ODM + '/task/remove', { method: 'POST', body: new URLSearchParams({ uuid }) }); } catch (e) {} }
async function limpar() {
  for (const u of criadas) await removerNoServidor(u);
  if (chrome) { try { chrome.kill(); } catch (e) {} }
  if (servidor) { try { servidor.close(); } catch (e) {} }
  if (perfil) { await dorme(400); try { rmSync(perfil, { recursive: true, force: true }); } catch (e) {} }
}
const portaLivre = () => new Promise((res, rej) => { const s = net.createServer(); s.on('error', rej); s.listen(0, '127.0.0.1', () => { const p = s.address().port; s.close(() => res(p)); }); });

async function main() {
  /* ── pré-requisitos, ditos com clareza antes de criar qualquer coisa ── */
  if (!PASTA_FOTOS || !existsSync(PASTA_FOTOS)) throw new Error('informe a pasta das fotos: --fotos "/caminho" (pasta ausente ou não informada)');
  const fotos = readdirSync(PASTA_FOTOS).filter(f => /\.jpe?g$/i.test(f)).sort().slice(0, N_FOTOS).map(f => path.join(PASTA_FOTOS, f));
  if (fotos.length < 5) throw new Error('a pasta precisa de pelo menos 5 fotos .JPG (achei ' + fotos.length + ')');
  if (!existsSync(HTML)) throw new Error('não achei o app em ' + HTML);
  const info = await odm('/info');
  if (!info || !info.version) throw new Error('o NodeODM não respondeu em ' + ODM + '/info — ele está no ar?');
  const exe = [process.env.CHROME, '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe', '/usr/bin/google-chrome', '/usr/bin/chromium'].find(p => p && existsSync(p));
  if (!exe) throw new Error('não achei o Chrome — aponte o executável na variável CHROME');
  const jaEstavam = (await odm('/task/list')).map(t => t.uuid);
  console.log(`NodeODM ${info.version} (ODM ${info.engineVersion || '?'}) em ${ODM} · ${jaEstavam.length} tarefa(s) que não são deste teste`);

  /* ── o app servido em localhost (origem diferente do NodeODM em 127.0.0.1: o CORS vale de verdade) ── */
  const raiz = path.dirname(HTML), TIPOS = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.wasm': 'application/wasm', '.md': 'text/markdown; charset=utf-8' };
  servidor = createServer((req, res) => {
    const alvo = path.normalize(path.join(raiz, decodeURIComponent(req.url.split('?')[0])));
    if (!alvo.startsWith(raiz) || !existsSync(alvo) || !statSync(alvo).isFile()) { res.writeHead(404); res.end(); return; }
    res.writeHead(200, { 'Content-Type': TIPOS[path.extname(alvo)] || 'application/octet-stream' }); createReadStream(alvo).pipe(res);
  });
  const portaApp = await portaLivre(); await new Promise(r => servidor.listen(portaApp, '127.0.0.1', r));
  const URL_APP = `http://localhost:${portaApp}/${path.basename(HTML)}`;

  /* ── Chrome headless, perfil temporário, sem rede externa ── */
  perfil = mkdtempSync(path.join(tmpdir(), 'ortofly-e2e-'));
  const portaCdp = await portaLivre(), CDP = 'http://127.0.0.1:' + portaCdp;
  chrome = spawn(exe, ['--headless=new', '--remote-debugging-port=' + portaCdp, '--user-data-dir=' + perfil, '--no-first-run', '--no-default-browser-check',
    '--host-resolver-rules=MAP * ~NOTFOUND, EXCLUDE localhost, EXCLUDE 127.0.0.1', 'about:blank'], { stdio: 'ignore' });
  let versao = null;
  for (let i = 0; i < 60 && !versao; i++) { try { versao = (await (await fetch(CDP + '/json/version')).json()).Browser; } catch (e) { await dorme(250); } }
  if (!versao) throw new Error('o Chrome não abriu a porta de depuração');
  const aba = await (await fetch(CDP + '/json/new?about:blank', { method: 'PUT' })).json();
  const ws = new WebSocket(aba.webSocketDebuggerUrl);
  await new Promise((res, rej) => { ws.addEventListener('open', res); ws.addEventListener('error', () => rej(new Error('não conectei ao Chrome'))); });
  let id = 0; const pendentes = new Map(), pedidos = [];
  const cmd = (method, params = {}) => new Promise(res => { const i = ++id; pendentes.set(i, res); ws.send(JSON.stringify({ id: i, method, params })); });
  ws.addEventListener('message', m => {
    const d = JSON.parse(m.data);
    if (d.id) { const f = pendentes.get(d.id); pendentes.delete(d.id); if (f) f(d); return; }
    if (d.method === 'Network.requestWillBeSent') { const h = d.params.request.headers; pedidos.push({ url: d.params.request.url, tipo: String(h['Content-Type'] || h['content-type'] || '').split(';')[0] }); }
    if (d.method === 'Page.javascriptDialogOpening') cmd('Page.handleJavaScriptDialog', { accept: true });
  });
  // leitura tolerante: erro de avaliação vira `undefined`, e a conferência que dependia dela fica vermelha — nunca derruba o roteiro
  const ev = async expr => { const r = await cmd('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true }); return (r.result && !r.result.exceptionDetails) ? r.result.result.value : undefined; };
  const esperar = async (f, ms = 15000) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { try { if (await f()) return true; } catch (e) {} await dorme(200); } return false; };
  const texto = sel => ev(`(document.querySelector(${JSON.stringify(sel)})||{}).textContent||''`).then(v => String(v || ''));
  const clicar = sel => ev(`(()=>{ const b=document.querySelector(${JSON.stringify(sel)}); if(b) b.click(); return !!b; })()`);
  const cardFechado = () => ev(`document.getElementById('odmTaskCard').classList.contains('hidden')`);
  const abrir = async () => {
    await cmd('Page.navigate', { url: URL_APP });
    if (!await esperar(async () => (await ev('document.readyState==="complete" && typeof odmRefresh==="function"')) === true)) throw new Error('o app não terminou de carregar em ' + URL_APP);
    // confirm programável: guarda a 1ª linha de cada pergunta e responde o que o passo mandar
    await ev('window.__c=[]; window.__r=()=>true; window.confirm=m=>{ __c.push(String(m).split("\\n")[0]); return !!__r(m,__c.length-1); }; 1');
  };
  // estado de um app que já foi usado: é pelo localStorage que a tarefa volta ao card ao reabrir
  const semear = (atual, lista) => ev(`localStorage.setItem('ortofly_beta_ack','1'); localStorage.setItem('ortofly_odm_auth_${ODM}','1'); localStorage.setItem('ortofly_odm_url_local',${JSON.stringify(ODM)}); localStorage.setItem('ortofly_odm_mode','local'); ${atual ? `localStorage.setItem('ortofly_odm_task','${atual}')` : `localStorage.removeItem('ortofly_odm_task')`}; localStorage.setItem('ortofly_odm_tasks',${JSON.stringify(JSON.stringify(lista))}); 1`);
  await cmd('Page.enable'); await cmd('Runtime.enable'); await cmd('Network.enable');
  await abrir();
  console.log(`${versao} · app v${await ev('APP_VERSION')} em ${URL_APP}\n`);

  /* ── duas tarefas descartáveis ── */
  const criar = async nome => {
    const fd = new FormData();
    for (const f of fotos) fd.append('images', await openAsBlob(f), path.basename(f));
    fd.append('name', nome); fd.append('options', JSON.stringify([{ name: 'dsm', value: true }]));
    const j = await (await fetch(ODM + '/task/new', { method: 'POST', body: fd })).json();
    if (!j.uuid) throw new Error('o NodeODM não criou a tarefa de teste: ' + JSON.stringify(j));
    criadas.push(j.uuid); return j.uuid;
  };
  const T1 = await criar('ortofly-e2e-descartavel-1'), T2 = await criar('ortofly-e2e-descartavel-2');
  nota('tarefas descartáveis', [T1, T2]);

  /* 1) app reaberto com a tarefa em andamento */
  await semear(T1, [T1]); await abrir();
  const voltou = await esperar(async () => /processando|na fila/.test(await texto('#odmTaskStatus')));
  nota('card ao reabrir', (await texto('#odmTaskStatus')).slice(0, 90));
  confere('reabrir: a tarefa em andamento volta ao card', voltou && (await cardFechado()) === false);

  /* 2) Cancelar */
  pedidos.length = 0; await clicar('button[onclick="odmCancel()"]');
  const cancelou = await esperar(async () => ((await odm('/task/' + T1 + '/info')).status || {}).code === 50, 15000);
  const tipoCancel = pedidos.filter(p => /\/task\/cancel$/.test(p.url)).map(p => p.tipo);
  nota('Cancelar: corpo do pedido', tipoCancel);
  confere('cancelar: o pedido sai num formato que o NodeODM lê (urlencoded, não multipart)', tipoCancel.length === 1 && tipoCancel[0] === 'application/x-www-form-urlencoded');
  confere('cancelar: a tarefa fica CANCELADA no servidor', cancelou);

  /* 3) Descartar */
  pedidos.length = 0; await clicar('button[onclick="odmDiscard()"]');
  await esperar(async () => (await cardFechado()) === true || /❌/.test(await texto('#odmStatus')), 15000);
  const tipoRemove = pedidos.filter(p => /\/task\/remove$/.test(p.url)).map(p => p.tipo);
  nota('Descartar: corpo do pedido', tipoRemove); nota('Descartar: status na tela', (await texto('#odmStatus')).slice(0, 120) || '(vazio)');
  confere('descartar: o pedido sai em urlencoded', tipoRemove.length === 1 && tipoRemove[0] === 'application/x-www-form-urlencoded');
  confere('descartar: o card fecha', (await cardFechado()) === true);
  confere('descartar: a tarefa SOME do servidor', !(await odm('/task/list')).some(t => t.uuid === T1));

  /* 4) app reaberto com uma tarefa que não existe mais no servidor */
  await semear(FANTASMA, [FANTASMA]); pedidos.length = 0; await abrir();
  await esperar(async () => /existe|desconhecido/.test(await texto('#odmTaskStatus')));
  await dorme(11500);   // dois ciclos e pouco da consulta periódica de 5 s
  const consultas = pedidos.filter(p => p.url.includes('/task/' + FANTASMA + '/info')).length;
  nota('tarefa inexistente: card', (await texto('#odmTaskStatus')).slice(0, 100)); nota('consultas /info em 11,5 s', consultas);
  confere('tarefa que sumiu: o card diz que ela não existe mais no servidor', /não existe mais/i.test(await texto('#odmTaskStatus')));
  confere('tarefa que sumiu: a consulta periódica para (1 consulta, não uma a cada 5 s)', consultas === 1);
  confere('tarefa que sumiu: fechar a aba não pede confirmação', (await ev(`(()=>{ const e=new Event('beforeunload',{cancelable:true}); window.dispatchEvent(e); return e.defaultPrevented; })()`)) === false);
  confere('tarefa que sumiu: há um botão Fechar', (await ev(`[...document.querySelectorAll('#odmOutputs button')].some(b=>/Fechar/.test(b.textContent))`)) === true);
  await clicar('button[onclick="odmDiscard()"]'); await esperar(async () => (await cardFechado()) === true || /❌/.test(await texto('#odmStatus')), 8000);
  confere('tarefa que sumiu: Descartar fecha o card em vez de falhar', (await cardFechado()) === true);

  /* 5) Limpar tudo, PC Local — só T2 está no registro; a 2ª confirmação (tarefas não registradas) é RECUSADA */
  const antes = (await odm('/task/list')).map(t => t.uuid), alheias = antes.filter(u => u !== T2);
  await semear(null, [T2]); await abrir(); await ev('window.__r=(m,i)=>i===0; 1');
  pedidos.length = 0; await clicar('button[onclick="odmCleanAll()"]');
  await esperar(async () => /🧹/.test(await texto('#odmStatus')), 25000);
  const depois = (await odm('/task/list')).map(t => t.uuid), perguntas = (await ev('__c')) || [];
  nota('Limpar tudo: confirmações pedidas', perguntas.map(p => String(p).slice(0, 80))); nota('Limpar tudo: status na tela', (await texto('#odmStatus')).slice(0, 150));
  confere('limpar tudo: consulta a lista de tarefas do servidor', pedidos.some(p => /\/task\/list$/.test(p.url)));
  confere('limpar tudo: pergunta à parte pelas tarefas que o navegador não registrou, dizendo quantas são',
    perguntas.length === (alheias.length ? 2 : 1) && (!alheias.length || new RegExp('\\b' + alheias.length + '\\b').test(String(perguntas[1]))));
  confere('limpar tudo: a tarefa registrada é removida do servidor', !depois.includes(T2));
  confere('limpar tudo: recusada a 2ª confirmação, as outras tarefas ficam intactas', alheias.every(u => depois.includes(u)));
  confere('segurança do teste: nada que já estava no servidor foi apagado', jaEstavam.every(u => depois.includes(u)));
}

main().then(async () => {
  await limpar();
  console.log(falhas.length ? `\n${falhas.length} conferência(s) falharam.` : '\nE2E OK ✅ — tarefas de teste removidas do NodeODM.');
  process.exit(falhas.length ? 1 : 0);
}).catch(async e => {
  await limpar();
  console.error('\n══ INCONCLUSIVO — o roteiro não chegou ao fim ══');
  console.error(String((e && e.stack) || e));
  console.error(falhas.length ? `(${falhas.length} conferência(s) já tinham falhado.)` : '(nenhuma conferência tinha falhado até aqui.)');
  process.exit(2);
});
