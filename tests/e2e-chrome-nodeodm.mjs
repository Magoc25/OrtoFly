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
    2. cria uma tarefa PELO APP — escolhe 10 fotos no campo de arquivo, como o usuário, e
       clica em Enviar — e confere NO SERVIDOR as opções que chegaram (resolução do
       ortomosaico lida da altura de voo das fotos, correção de obturador de rolagem);
       cria uma segunda direto no servidor; e dirige o resto da aba Processar: reabrir o
       app com a tarefa em andamento · Cancelar · Descartar · reabrir com uma tarefa que
       não existe mais no servidor · Limpar tudo;
    3. confere o resultado NO SERVIDOR (/task/<uuid>/info e /task/list), não só na tela.

  O QUE ELE NUNCA FAZ: apagar tarefa que não criou. No Limpar tudo, ele RECUSA a segunda
  confirmação (a das tarefas que o navegador não registrou) e depois confere que todas as
  tarefas que já estavam no servidor continuam lá. As duas descartáveis são removidas ao
  final, mesmo se o roteiro falhar no meio.

  MODO --completo (demorado): envia TODAS as fotos da pasta pelo app, espera o
  processamento terminar, baixa o pacote (conferindo que dois pedidos viram um download só e
  que o andamento aparece em MB), confere que os arquivos temporários somem ao reabrir o app
  e para aí, DEIXANDO a tarefa no servidor para o produto ser medido (o uuid sai no fim, com
  o comando para removê-la). Serve para conferir que o que o app manda produz o ortomosaico
  esperado — não só que as opções chegam.

      node tests/e2e-chrome-nodeodm.mjs --fotos "/caminho/das/fotos" --completo

  Com --completo --salvar, em vez de deixar a tarefa ele usa o "Salvar no projeto": confere
  que o resultado vai para o app, que a tarefa é removida do servidor e que, reaberto o app,
  o projeto devolve o resultado com o registro do que foi pedido.
  --n 10 limita o número de fotos em qualquer modo (o padrão é 10; no --completo, todas).

  As fotos precisam ser de drone DJI com a altura relativa gravada (XMP); sem ela o app
  não tem como estimar o GSD e as conferências de resolução ficam vermelhas.

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
const COMPLETO = process.argv.includes('--completo'), SALVAR = process.argv.includes('--salvar');
const N_FOTOS = parseInt(arg('n', ''), 10) || (COMPLETO ? Infinity : 10);   // --n 10 limita o número de fotos em qualquer modo
const FANTASMA = '00000000-0000-4000-8000-000000000000';   // uuid que não existe em servidor nenhum

const dorme = ms => new Promise(r => setTimeout(r, ms));
const falhas = [];
const confere = (nome, cond) => { if (cond) console.log('ok     ' + nome); else { console.error('FALHA  ' + nome); falhas.push(nome); } };
const nota = (k, v) => console.log('       ' + k + ': ' + (typeof v === 'string' ? v : JSON.stringify(v)));

const criadas = [];          // só o que ESTE roteiro criou — é a única coisa que ele remove
const deixar = [];           // no modo --completo, a tarefa processada fica no servidor para ser medida
let chrome = null, perfil = null, servidor = null;

async function odm(caminho) { try { return await (await fetch(ODM + caminho)).json(); } catch (e) { return { erroDeRede: String(e) }; } }
async function removerNoServidor(uuid) { try { await fetch(ODM + '/task/remove', { method: 'POST', body: new URLSearchParams({ uuid }) }); } catch (e) {} }
async function limpar() {
  for (const u of criadas) if (!deixar.includes(u)) await removerNoServidor(u);
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

  /* 0) tarefa criada PELO APP: as fotos entram pelo campo de arquivo, como o usuário faz */
  await semear(null, []); await abrir();
  const raizDom = await cmd('DOM.getDocument', {});
  const campo = await cmd('DOM.querySelector', { nodeId: raizDom.result.root.nodeId, selector: '#odmImages' });
  await cmd('DOM.setFileInputFiles', { files: fotos, nodeId: campo.result.nodeId });
  const leu = await esperar(async () => /GSD estimado|Não consegui/.test(await texto('#odmGsdInfo')), 90000);
  const infoGsd = await texto('#odmGsdInfo'), pedido = parseFloat(((infoGsd.match(/pedido a ([\d,]+) cm\/px/) || [])[1] || '').replace(',', '.'));
  const rsMarcado = await ev(`!!(document.getElementById('odmRS')||{}).checked`);
  nota('fotos escolhidas', fotos.length); nota('GSD lido das fotos', infoGsd.slice(0, 160));
  nota('obturador de rolagem', ((await texto('#odmRSInfo')).slice(0, 100) || '(sem leitura de velocidade)') + ' · marcado: ' + rsMarcado);
  confere('tarefa nova: o app lê a altura de voo das fotos de verdade e diz a resolução que vai pedir', leu && /GSD estimado/.test(infoGsd) && pedido > 0);
  await ev(`(()=>{ const r=document.querySelector('input[name="odmOut"][value="dsm"]'); if(r) r.checked=true; const n=document.getElementById('odmName'); if(n) n.value='ortofly-e2e-pelo-app'; return !!r; })()`);
  pedidos.length = 0; await clicar('button[onclick="odmCreate()"]');
  const andamento = new Set(); let travou = null;
  for (let i = 0; i < 3600 && !(await ev('_odmTask')) && !/❌/.test(await texto('#odmStatus')); i++) {   // o envio das fotos pode levar minutos
    const t = await texto('#odmEnvioTxt'); if (/Enviando \d+\/\d+ fotos/.test(t)) andamento.add(t);
    if (travou === null) travou = await ev(`!!(document.getElementById('odmCreateBtn')||{}).disabled`);
    await dorme(250);
  }
  const T1 = await ev('_odmTask');
  if (!T1) throw new Error('o app não criou a tarefa: ' + ((await texto('#odmStatus')) || 'sem mensagem na tela'));
  criadas.push(T1);
  const rota = r => pedidos.filter(p => r.test(p.url)).length;
  const nInit = rota(/\/task\/new\/init$/), nUp = rota(/\/task\/new\/upload\//), nCommit = rota(/\/task\/new\/commit\//), nUnico = rota(/\/task\/new$/);
  nota('envio em partes', { init: nInit, lotes: nUp, commit: nCommit, pedidoUnico: nUnico, andamentoVistoNaTela: [...andamento].slice(0, 4) });
  confere('envio: as fotos vão em vários pedidos pequenos (init → lotes → commit), não num pedido só', nInit === 1 && nUp >= 2 && nCommit === 1 && nUnico === 0);
  confere('envio: a tela mostra o andamento em fotos e o botão Enviar trava enquanto envia', andamento.size >= 1 && travou === true);
  confere('envio: o servidor ficou com exatamente as fotos escolhidas', (await odm('/task/' + T1 + '/info')).imagesCount === fotos.length);
  const chegou = (await odm('/task/' + T1 + '/info')).options || [], val = n => (chegou.find(o => o.name === n) || {}).value;
  nota('opções que chegaram ao servidor', chegou.filter(o => !['pc-ept', 'cog', 'gltf'].includes(o.name)));
  confere('tarefa nova: orthophoto-resolution chega ao servidor com o valor mostrado na tela', pedido > 0 && Math.abs(val('orthophoto-resolution') - pedido) < 0.011);
  confere('tarefa nova: dem-resolution chega como 2× a do ortomosaico (modo com DSM)', pedido > 0 && Math.abs(val('dem-resolution') - 2 * pedido) < 0.021);
  confere('tarefa nova: rolling-shutter chega ao servidor se, e só se, a correção está marcada', (val('rolling-shutter') === true) === (rsMarcado === true));
  confere('tarefa nova: o card mostra as opções que o servidor aceitou', await esperar(async () => /orthophoto-resolution/.test(await texto('#odmTaskOpts')), 12000));

  if (COMPLETO) {
    nota('modo --completo', 'tarefa ' + T1 + ' — aguardando o processamento terminar (pode levar muitos minutos)…');
    let st = {};
    for (let i = 0; i < 720; i++) { st = (await odm('/task/' + T1 + '/info')).status || {}; if ([30, 40, 50].includes(st.code)) break; await dorme(5000); }
    const info2 = await odm('/task/' + T1 + '/info');
    nota('fim do processamento', { status: st, minutos: Math.round((info2.processingTime || 0) / 6000) / 10, imagens: info2.imagesCount });
    confere('--completo: a tarefa criada pelo app termina com sucesso', st.code === 40);
    if (st.code !== 40) { deixar.push(T1); return; }

    /* pacote: dois pedidos ao mesmo tempo têm de virar UM download, com o andamento em MB na tela */
    await esperar(async () => /conclu/.test(await texto('#odmTaskStatus')), 15000);
    pedidos.length = 0;
    await ev(`window.__zip=null; Promise.all([odmGetZip(), odmGetZip()]).then(()=>{ window.__zip='ok'; }, e=>{ window.__zip='erro: '+(e&&e.message); }); 1`);
    const mbVistos = new Set();
    for (let i = 0; i < 2400 && !(await ev('window.__zip')); i++) { const s = await texto('#odmStatus'); if (/Baixando o pacote.*\d.* MB/.test(s)) mbVistos.add(s); await dorme(150); }
    nota('pacote', { resultado: await ev('window.__zip'), downloads: rota(/\/download\/all\.zip$/), andamento: [...mbVistos].slice(-2), statusFinal: (await texto('#odmStatus')).slice(0, 60) });
    confere('pacote: dois pedidos simultâneos do all.zip fazem UM download', (await ev('window.__zip')) === 'ok' && rota(/\/download\/all\.zip$/) === 1);
    confere('pacote: a tela mostra o andamento do download em MB', mbVistos.size >= 1);
    const noOpfs = () => ev(`navigator.storage.getDirectory().then(d=>d.getDirectoryHandle('ortofly-tmp')).then(h=>h.getFileHandle('all.zip')).then(()=>true,()=>false)`);
    const tinhaTemp = await noOpfs();

    if (SALVAR) {
      /* Salvar no projeto: guarda o pacote no app, grava o projeto e SÓ ENTÃO apaga a tarefa do servidor */
      await ev(`document.getElementById('projName').value='e2e-salvar'; state.name='e2e-salvar'; 1`);
      await ev(`window.__sv=null; odmSaveResult().then(()=>{ window.__sv='fim'; }, e=>{ window.__sv='erro: '+(e&&e.message); }); 1`);
      await esperar(async () => !!(await ev('window.__sv')), 240000);
      const stSalvar = await texto('#odmStatus');
      nota('Salvar no projeto', stSalvar.slice(0, 200));
      confere('salvar: o resultado é guardado no app e a tarefa é removida do servidor', /Salvo no projeto/.test(stSalvar) && /removido do NodeODM/.test(stSalvar) && !(await odm('/task/list')).some(t => t.uuid === T1));
      const projeto = await ev(`(()=>{ const p=loadProjects().find(x=>x.name==='e2e-salvar'); return p&&p.result ? {tamanho:p.result.size, modo:p.result.meta&&p.result.meta.modo, opcoes:(p.result.meta&&p.result.meta.options||[]).length} : null; })()`);
      nota('projeto gravado', projeto);
      confere('salvar: o projeto guarda o tamanho do pacote e o registro do que foi pedido', !!projeto && projeto.tamanho > 0 && projeto.modo === 'dsm' && projeto.opcoes >= 3);
      /* reabrir o app e o projeto: o resultado tem de voltar do banco do app, sem servidor */
      await abrir();
      await ev(`(()=>{ const p=loadProjects().find(x=>x.name==='e2e-salvar'); if(p) openProject(p.id); return !!p; })()`);
      const voltouSalvo = await esperar(async () => /Resultado salvo/.test(await texto('#odmTaskStatus')), 60000);
      nota('projeto reaberto', (await texto('#odmTaskStatus')).slice(0, 60) + ' · ' + (await texto('#odmTaskOpts')).slice(0, 110));
      confere('salvar: reaberto o app, o projeto devolve o resultado salvo e as opções com que ele foi feito', voltouSalvo && /orthophoto-resolution/.test(await texto('#odmTaskOpts')));
      const mm = String(await ev('citeText().mm'));
      confere('salvar: o Material e Métodos do resultado salvo descreve o processamento que o gerou', /DSM/.test(mm) && /cm\/px/.test(mm));
      await ev(`(()=>{ const p=loadProjects().find(x=>x.name==='e2e-salvar'); if(p){ window.confirm=()=>true; deleteProject(p.id); } return 1; })()`);   // limpa o perfil temporário
      return;
    }

    /* temporários: reabrir o app apaga o que a sessão anterior deixou em disco */
    await abrir(); await dorme(600);
    confere('temporários: o all.zip baixado some da área temporária ao reabrir o app', tinhaTemp === true && (await noOpfs()) === false);
    deixar.push(T1);
    return;
  }

  const T2 = await criar('ortofly-e2e-descartavel-2');
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

  /* 2b) Reprocessar a tarefa cancelada com outra saída — as fotos já estão no servidor */
  await ev(`(()=>{ const r=document.querySelector('input[name="odmOut"][value="fast"]'); if(r) r.checked=true; return !!r; })()`);
  pedidos.length = 0; await ev('window.__c.length=0; 1'); await clicar('button[onclick="odmReprocessar()"]');
  const reiniciou = await esperar(async () => { const j = await odm('/task/' + T1 + '/info'); return [10, 20].includes((j.status || {}).code) && (j.options || []).some(o => o.name === 'fast-orthophoto'); }, 20000);
  const depoisRe = await odm('/task/' + T1 + '/info'), tipoRe = pedidos.filter(p => /\/task\/restart$/.test(p.url)).map(p => p.tipo);
  nota('Reprocessar', { corpo: tipoRe, status: depoisRe.status, opcoes: (depoisRe.options || []).filter(o => !['pc-ept', 'cog', 'gltf'].includes(o.name)).map(o => o.name), imagens: depoisRe.imagesCount, tela: (await texto('#odmStatus')).slice(0, 80) });
  confere('reprocessar: o pedido sai em urlencoded e o servidor volta a processar a MESMA tarefa', tipoRe.length === 1 && tipoRe[0] === 'application/x-www-form-urlencoded' && reiniciou);
  confere('reprocessar: as opções novas substituem as antigas no servidor (Rápido no lugar de DSM)', (depoisRe.options || []).some(o => o.name === 'fast-orthophoto') && !(depoisRe.options || []).some(o => o.name === 'dsm'));
  confere('reprocessar: nenhuma foto é reenviada e o servidor mantém as mesmas', rota(/\/task\/new/) === 0 && depoisRe.imagesCount === fotos.length);
  confere('reprocessar: o app pergunta antes e diz que as fotos não são reenviadas', ((await ev('__c')) || []).length === 1);
  confere('reprocessar: depois de reabrir o app, a correção de obturador que a tarefa usava é mantida', (depoisRe.options || []).some(o => o.name === 'rolling-shutter') === (rsMarcado === true));

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
  if (deixar.length) console.log(`\nTarefa deixada no servidor para medir o produto: ${deixar.join(', ')}\n  remover depois: curl -s --data-urlencode "uuid=${deixar[0]}" ${ODM}/task/remove`);
  console.log(falhas.length ? `\n${falhas.length} conferência(s) falharam.` : (deixar.length ? '\nE2E OK ✅' : '\nE2E OK ✅ — tarefas de teste removidas do NodeODM.'));
  process.exit(falhas.length ? 1 : 0);
}).catch(async e => {
  await limpar();
  console.error('\n══ INCONCLUSIVO — o roteiro não chegou ao fim ══');
  console.error(String((e && e.stack) || e));
  console.error(falhas.length ? `(${falhas.length} conferência(s) já tinham falhado.)` : '(nenhuma conferência tinha falhado até aqui.)');
  process.exit(2);
});
