/*
  check.js — Verificador estático do OrtoFly (degrau 1 · sem dependências)

  O que ele confere no ortofly.html:
    1. SINTAXE de todo <script> inline (compila com o motor do Node — um erro
       de sintaxe aqui derrubaria o app inteiro no navegador).
    2. HANDLERS ÓRFÃOS: todo onclick/onchange/oninput/… (no HTML e no HTML
       gerado por strings JS) deve chamar uma função que exista no script.
    3. IDS ÓRFÃOS: todo $('id') / getElementById('id') / querySelector('#id')
       com id literal deve apontar para um id que exista no HTML (ou que o
       próprio JS crie).
    4. ARQUIVOS LOCAIS: todo src/href relativo (./vendor/…, ícones, docs) e
       toda entrada da lista PRECACHE do sw.js devem existir no disco (um
       arquivo faltando quebra o app publicado ou a instalação do SW).

  COMO USAR (no terminal — PowerShell ou Git Bash —, dentro da pasta do projeto):
      node check.js
  Sai com código 0 se tudo ok; 1 se achou problema (a lista aparece no console).
  Rode SEMPRE antes de dar git push (push = deploy no GitHub Pages).

  (Opcional: `node check.js caminho/para/outro.html` verifica outro arquivo.)
*/
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const file = process.argv[2] || path.join(__dirname, 'ortofly.html');
const html = fs.readFileSync(file, 'utf8');

let fails = 0;
const fail = m => { console.error('FALHA  ' + m); fails++; };
const ok = m => console.log('ok     ' + m);

/* ── 1) sintaxe dos <script> inline ── */
const scripts = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m => m[1]);
if (!scripts.length) fail('nenhum <script> inline encontrado');
scripts.forEach((src, i) => {
  try { new vm.Script(src, { filename: 'inline-' + i + '.js' }); ok(`sintaxe do <script> ${i + 1}/${scripts.length} (${src.split('\n').length} linhas)`); }
  catch (e) {
    const ln = (e.stack.match(/inline-\d+\.js:(\d+)/) || [])[1];
    fail(`sintaxe do <script> ${i + 1}: ${e.message}` + (ln ? `\n       linha ${ln}: ${(src.split('\n')[ln - 1] || '').trim().slice(0, 120)}` : ''));
  }
});
const js = scripts.join('\n');

/* FONTE SEM COMENTÁRIOS — para as asserções de AUSÊNCIA.
   Asserção de ausência não pode ser violada por PROSA, e o comentário que explica
   um defeito contém o padrão proibido **por definição**: foi assim que a asserção
   "nenhuma cópia do pacote em new Blob([buf])" ficou vermelha contra o código que
   a corrigia, porque o comentário logo acima citava a linha antiga. Quem procura
   "isto NÃO existe no código" lê daqui. (Sanity check obrigatório: se a remoção
   comer código de verdade, a asserção passa de graça — o caso r90c.) */
const jsCode = js.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/^\s*\/\/.*$/gm, ' ');
if (jsCode.length < js.length * 0.5 || !jsCode.includes('const APP_VERSION'))
  fail(`remoção de comentários comeu código (${jsCode.length} de ${js.length} bytes) — asserções de ausência não são confiáveis`);


/* ── 2) handlers órfãos ── */
// funções/variáveis globais definidas no script (handlers inline resolvem no escopo global)
const defined = new Set();
for (const m of js.matchAll(/\bfunction\s+([A-Za-z_$][\w$]*)/g)) defined.add(m[1]);
for (const m of js.matchAll(/\b(?:const|let|var)\s+([A-Za-z_$][\w$]*)/g)) defined.add(m[1]);

const KEYWORDS = new Set(['if', 'else', 'for', 'while', 'switch', 'return', 'catch', 'function', 'new', 'typeof', 'in', 'of', 'do', 'throw', 'delete', 'void', 'instanceof']);
const BROWSER = new Set(['alert', 'confirm', 'prompt', 'String', 'Number', 'Boolean', 'Date', 'parseInt', 'parseFloat', 'encodeURIComponent', 'decodeURIComponent', 'setTimeout', 'clearTimeout', 'requestAnimationFrame']);

// atributos on*="…" no arquivo inteiro (pega o HTML estático E o HTML montado em strings JS)
const handlers = [...html.matchAll(/\bon[a-z]+\s*=\s*"((?:[^"\\]|\\.)*)"/g)].map(m => m[1]);
let orfHandlers = 0;
const seenCalls = new Set();
for (const h of handlers) {
  const code = h.replace(/'(?:[^'\\]|\\.)*'/g, "''");   // apaga strings literais do snippet (senão "Foo (bar)" dentro de um texto vira falso órfão)
  for (const m of code.matchAll(/(?<![.\w$])([A-Za-z_$][\w$]*)\s*\(/g)) {
    const name = m[1];
    if (KEYWORDS.has(name) || BROWSER.has(name)) continue;
    seenCalls.add(name);
    if (!defined.has(name)) { fail(`handler órfão: "${name}(…)" não existe — em on*="${h.slice(0, 90)}"`); orfHandlers++; }
  }
}
if (!orfHandlers) ok(`handlers: ${handlers.length} atributos on*, ${seenCalls.size} funções distintas — todas definidas`);

/* ── 3) ids órfãos ── */
// ids existentes: atributos id="…"/id='…' (HTML estático e HTML em strings JS) + atribuições el.id='…'
const ids = new Set();
for (const m of html.matchAll(/\bid\s*=\s*"([\w-]+)"/g)) ids.add(m[1]);
for (const m of html.matchAll(/\bid\s*=\s*'([\w-]+)'/g)) ids.add(m[1]);
for (const m of html.matchAll(/\.id\s*=\s*['"]([\w-]+)['"]/g)) ids.add(m[1]);

const refs = [];
for (const m of js.matchAll(/\$\(\s*'([\w-]+)'\s*\)/g)) refs.push(m[1]);
for (const m of js.matchAll(/getElementById\(\s*'([\w-]+)'\s*\)/g)) refs.push(m[1]);
for (const m of js.matchAll(/querySelector(?:All)?\(\s*'#([\w-]+)/g)) refs.push(m[1]);
let orfIds = 0;
for (const r of new Set(refs)) if (!ids.has(r)) { fail(`id órfão: $('${r}') / getElementById('${r}') — nenhum id="${r}" no HTML`); orfIds++; }
if (!orfIds) ok(`ids: ${new Set(refs).size} referências literais — todas existem no HTML`);

/* ── 4) arquivos locais referenciados existem ──
   COMPANHEIRO COM FALLBACK PARA A RAIZ (guia r105d): resolver `sw.js`, `vendor/…` e
   `apresentacao.html` só ao lado do ARQUIVO SOB TESTE quebra assim que alguém aponta
   o harness para uma cópia — e apontar para uma cópia é exatamente o que faz uma
   campanha de mutação. O resultado é um ✗ FIXO em todas as rodadas, que faz toda
   mutação passar por confirmada, inclusive as que ficaram verdes. Ao lado do arquivo
   se existir; senão ao lado do próprio check.js (a raiz do repositório). */
const baseDir = path.dirname(file);
const companion = rel => { const near = path.join(baseDir, rel); return fs.existsSync(near) ? near : path.join(__dirname, rel); };
const localRefs = new Set();
for (const m of html.matchAll(/(?:src|href)\s*=\s*"\.\/([^"]+)"/g)) localRefs.add(m[1]);
for (const m of js.matchAll(/'\.\/(vendor\/[^']+)'/g)) localRefs.add(m[1]);
const swPath = companion('sw.js');
if (fs.existsSync(swPath)) for (const m of fs.readFileSync(swPath, 'utf8').matchAll(/'\.\/([^']+)'/g)) localRefs.add(m[1]);
let missing = 0;
for (const r of localRefs) if (!fs.existsSync(companion(r))) { fail(`arquivo local ausente: ./${r}`); missing++; }
if (!missing) ok(`arquivos locais: ${localRefs.size} referências (HTML + PRECACHE do SW) — todas existem`);

/* ── 4b) toda lib do vendor/ que o HTML carrega está no PRECACHE do SW ──────
   O item 4 prova que o arquivo EXISTE em disco; não prova que ele é pré-cacheado.
   Lib nova entra pelo <script> e o PRECACHE fica para trás — o app segue perfeito
   online e, em campo sem sinal, morre no primeiro uso da funcionalidade nova. É a
   falha que o self-hosting (v1.19.0) existe para impedir, e nada mais a vigia. */
const htmlVendor = [...html.matchAll(/<script\s+src="\.\/(vendor\/[^"]+)"/g)].map(m => m[1]);
const swSrc = fs.existsSync(swPath) ? fs.readFileSync(swPath, 'utf8') : '';
const precache = new Set([...swSrc.matchAll(/'\.\/([^']+)'/g)].map(m => m[1]));
if (!htmlVendor.length) fail('nenhum <script src="./vendor/…"> no HTML — a extração do PRECACHE secou');
else {
  const fora = htmlVendor.filter(v => !precache.has(v));
  if (fora.length) fail(`lib carregada pelo HTML e FORA do PRECACHE (quebra offline): ${fora.join(', ')}`);
  else ok(`offline: ${htmlVendor.length} libs do vendor/ no HTML — todas no PRECACHE do SW`);
}

/* ── 4c) leitura de raster pela pirâmide (v1.20.0) ──────────────────────────
   O bug: `file.arrayBuffer()` + `parseGeoraster(ArrayBuffer)` decodificava a
   resolução cheia — 3,8 GB de pico num ortho de 200 MP, e o navegador reiniciava
   o app. A correção é escolher o nível da pirâmide do COG e ler só os tiles dele.
   Nada no fluxo de release reabre este caminho, e a regressão é INVISÍVEL nos
   ortos pequenos com que se testa no dia a dia: só aparece no arquivo grande do
   usuário, como um app que reinicia sozinho. Daí a asserção.
   O `\s*\(` na extração não é enfeite: sem ele a captura casa por PREFIXO, e uma
   mutação que renomeia a função para `_tiffToGeorasterX` deixa a suíte inteira verde
   (pega na campanha da v1.20.0). E extrair a função certa não prova que é ela que
   roda — por isso a chamada em handleRasterFile é asserção à parte. */
const loader = (jsCode.match(/async function _tiffToGeoraster\s*\([\s\S]*?\n}/) || [])[0];
console.log('       [captura] carregador de raster = ' + (loader ? loader.split('\n').length + ' linhas' : 'NÃO ENCONTRADO'));
if (!/await\s+_tiffToGeoraster\s*\(/.test(js)) fail('raster: handleRasterFile não chama _tiffToGeoraster — o carregador testado não é o que roda');
else ok('raster: o carregador testado é o que handleRasterFile executa');
if (!loader) fail('raster: _tiffToGeoraster não encontrada — a extração secou ou o carregador foi removido');
else {
  if (/\.arrayBuffer\s*\(/.test(loader)) fail('raster: o carregador materializa o arquivo inteiro (.arrayBuffer()) — é o defeito da v1.19.1');
  else ok('raster: o carregador não materializa o arquivo inteiro em memória');
  if (!/GeoTIFF\.fromBlob\s*\(/.test(loader)) fail('raster: o carregador não usa GeoTIFF.fromBlob — sem leitura sob demanda não há pirâmide');
  else if (!/getImageCount\s*\(/.test(js)) fail('raster: ninguém enumera os níveis da pirâmide (getImageCount ausente)');
  else ok('raster: níveis da pirâmide enumerados e lidos sob demanda (fromBlob)');
  // a extensão tem de sair do nível 0: o ModelPixelScale do overview é arredondado
  // e desloca a borda em ~meio pixel — num app que mede em cima do raster, isso é erro.
  if (!/base\.im\.getBoundingBox\s*\(/.test(loader)) fail('raster: georreferência não derivada do nível 0 (base.im.getBoundingBox ausente)');
  else if (!/pixelWidth:\s*\(bb\[2\]-bb\[0\]\)\s*\/\s*W/.test(loader)) fail('raster: pixelWidth não derivado da extensão do nível 0 — a borda desloca no reamostrado');
  else ok('raster: georreferência derivada da extensão do nível 0, não do overview');
}

/* ── 4d) leitura do all.zip por faixa (v1.20.1) ─────────────────────────────
   Mesmo defeito do 4c, num arquivo maior: o caminho antigo media 2,80 GB de pico
   com um pacote de 887 MB, e o release não passa por aqui — o `all.zip` só é
   grande no NodeODM do usuário, nunca no teste. As três alocações que somavam
   aquilo (ArrayBuffer do pacote, cópia no `new Blob([buf])`, índice do JSZip) são
   *ausências*, então as mutações têm de INSERIR o padrão proibido (r84b). */
const zipLoader = (jsCode.match(/async function odmGetZip\s*\([\s\S]*?\n[^\n]*return _odmZip; \}/) || [])[0];
const zipRO = (jsCode.match(/async function zipAbrir\s*\([\s\S]*?\n}/) || [])[0];
console.log('       [captura] odmGetZip = ' + (zipLoader ? zipLoader.split('\n').length + ' linhas' : 'NÃO ENCONTRADO')
          + ' · zipAbrir = ' + (zipRO ? zipRO.split('\n').length + ' linhas' : 'NÃO ENCONTRADO'));
if (!zipLoader || !zipRO) fail('all.zip: odmGetZip/zipAbrir não encontradas — a extração secou ou o caminho foi removido');
else {
  if (/\.arrayBuffer\s*\(/.test(zipLoader)) fail('all.zip: odmGetZip materializa o pacote inteiro (.arrayBuffer()) — é o defeito da v1.20.0');
  else if (!/await r\.blob\s*\(/.test(zipLoader)) fail('all.zip: odmGetZip não guarda o download como Blob — sem isso o pacote vai para a memória');
  else ok('all.zip: o pacote fica como Blob, nunca em ArrayBuffer');
  if (/new Blob\(\[\s*buf/.test(jsCode)) fail('all.zip: cópia do pacote em new Blob([buf]) — dobra a memória e ela fica viva');
  else ok('all.zip: nenhuma cópia do pacote em memória');
  if (!/_zipDir\s*\(/.test(zipRO)) fail('all.zip: zipAbrir não lê o diretório central — sem isso não há leitura por faixa');
  else if (!/DecompressionStream/.test(zipRO)) fail('all.zip: zipAbrir não infla em fluxo (DecompressionStream ausente)');
  else ok('all.zip: diretório central por faixa + inflate em fluxo');
  // reembrulhar o File extraído copia o arquivo inteiro — a guarda é o que evita isso
  if (!/blob instanceof File && blob\.name===name/.test(js)) fail('all.zip: odmOpenZip reembrulha o File extraído — new File([blob]) COPIA o arquivo inteiro');
  else ok('all.zip: o File extraído é usado direto, sem reembrulhar');
  // Zip64 não é luxo: all.zip com nuvem densa + ortho passa de 4 GB
  if (!/0x07064b50/.test(js) || !/0x06064b50/.test(js)) fail('all.zip: sem Zip64 — pacote acima de 4 GB não abriria');
  else ok('all.zip: Zip64 tratado (pacote > 4 GB)');
}

/* ── 5) apresentacao.html — a página pública do §37 ────────────────────────
   Estas asserções existem porque NENHUM passo do release toca este arquivo:
   ele não é recompilado, não entra no smoke do app e ninguém o reabre. Sem
   teste, ele apodrece sozinho — e em público. Rodam aqui, no degrau estático,
   porque nada nelas precisa de DOM. */
const presPath = companion('apresentacao.html');
if (!fs.existsSync(presPath)) {
  console.log('ok     apresentacao.html não existe neste projeto — §37 é tópico de decisão (pulado)');
} else {
  const pres = fs.readFileSync(presPath, 'utf8');

  /* (a) lista de internals DERIVADA do app — nunca escrita à mão, senão o
     internal que nascer amanhã não entra na varredura. */
  const fontes = {};
  const lsPrefix = (js.match(/\bconst\s+LS\s*=\s*'([^']+)'/) || [])[1];
  fontes['armazenamento'] = lsPrefix ? [...new Set([...js.matchAll(/\bLS\s*\+\s*'([^']+)'/g)].map(m => lsPrefix + m[1]))] : [];
  fontes['tabelas'] = [...new Set([...js.matchAll(/\.from\(\s*'([^']+)'\s*\)/g)].map(m => m[1]))];
  fontes['identificador do projeto'] = [...new Set([...js.matchAll(/\bPROJECT_ID\s*=\s*'([^']+)'/g)].map(m => m[1]))];
  fontes['cache do SW'] = fs.existsSync(swPath) ? [...new Set([...fs.readFileSync(swPath, 'utf8').matchAll(/CACHE_NAME\s*=\s*'([^']+)'/g)].map(m => m[1]))] : [];

  // Guarda de FONTE SECA: regex que envelheceu ou constante renomeada esvazia
  // uma fonte em silêncio, e "nenhum dos zero internals apareceu" é sempre
  // verdade — a regra passaria de graça. Uma fonte morta some dentro do total
  // das outras, por isso a checagem é POR fonte.
  console.log('       [captura] internals por fonte — ' + Object.entries(fontes).map(([k, v]) => `${k}: ${v.length}`).join(' · '));
  const secas = Object.entries(fontes).filter(([, v]) => !v.length).map(([k]) => k);
  if (secas.length) fail(`§37 fonte de internals SECA: ${secas.join(', ')} — a varredura passaria de graça`);
  else ok(`§37 derivação: ${Object.keys(fontes).length} fontes de internals, nenhuma vazia`);

  /* (1) nenhum nome de internal no texto público.
     O corte é por FORMA, não por lista: em app brasileiro metade dos internals
     é palavra comum — aqui o próprio nome do app é um deles, e ele obviamente
     pode aparecer na página. Entra o que tem cara de identificador (_ - . dígito
     ou camelCase); continua sendo derivação, porque o internal que nascer amanhã
     entra sozinho desde que tenha forma de internal. */
  const formaDeInternal = s => /[_\-.\d]/.test(s) || /[a-z][A-Z]/.test(s);
  const internos = [...new Set(Object.values(fontes).flat())].filter(formaDeInternal);
  const vazados = internos.filter(t => pres.includes(t));
  if (vazados.length) fail(`§37 (1) nome de internal no texto público: ${vazados.join(', ')}`);
  else ok(`§37 (1) nenhum dos ${internos.length} internals com forma de identificador aparece na página`);

  /* (2) nenhum número que muda a cada release no texto VISÍVEL — versão, KB,
     contagens. Se entrar, a página vira mais um item do fluxo de bump, do tipo
     que nada testa e nada avisa, e passa a mentir. */
  const visivel = pres
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<[^>]+>/g, ' ');
  const versionados = [...new Set(visivel.match(/\bv\s?\d+\.\d+|\b\d+\.\d+\.\d+\b/g) || [])];
  if (versionados.length) fail(`§37 (2) número versionado no texto visível: ${versionados.join(', ')}`);
  else ok('§37 (2) nenhum número versionado no texto visível');

  /* (3) zero recurso externo: a página tem de abrir offline e passar na própria
     CSP. Só recursos CARREGADOS entram — <a href> é link, não recurso. */
  const externos = [];
  for (const m of pres.matchAll(/<(script|link|img|iframe|source|video|audio)\b[^>]*\b(?:src|href)\s*=\s*"([^"]*)"/gi))
    if (/^(?:https?:)?\/\//i.test(m[2])) externos.push(`<${m[1].toLowerCase()}> → ${m[2]}`);
  for (const m of pres.matchAll(/url\(\s*['"]?((?:https?:)?\/\/[^)'"]+)/gi)) externos.push('url() → ' + m[1]);
  for (const m of pres.matchAll(/@import\b[^;]*/gi)) externos.push(m[0].slice(0, 60));
  if (externos.length) fail(`§37 (3) recurso externo: ${externos.join(' | ')}`);
  else ok('§37 (3) zero recurso externo — nenhum script/estilo/imagem carregado de fora');

  /* (4) CSP própria (a do app vive num <meta> DENTRO dele e não se estende a
     outro arquivo) e sem `frame-ancestors` — em <meta> os navegadores IGNORAM
     a diretiva, e ela deixa só a falsa sensação de proteção.
     ⚠️ A captura é delimitada pelas ASPAS DO PRÓPRIO ATRIBUTO. Uma regex
     genérica ["']([^"']+)["'] pararia no primeiro 'self' — o valor de uma CSP
     contém aspas simples por dentro — e a asserção passaria a inspecionar
     "default-src " e nada mais: uma janela que NÃO TEM COMO conter o que ela
     proíbe, verde para sempre. Por isso o valor capturado é impresso. */
  const cspTag = (pres.match(/<meta[^>]+http-equiv\s*=\s*"Content-Security-Policy"[^>]*>/i) || [])[0] || '';
  const csp = (cspTag.match(/content\s*=\s*"([^"]*)"/i) || [])[1];
  console.log('       [captura] CSP da página = ' + JSON.stringify(String(csp).slice(0, 120)));
  if (csp === undefined) fail('§37 (4) a página não declara CSP própria');
  else if (/frame-ancestors/i.test(csp)) fail('§37 (4) CSP com frame-ancestors — ignorada em <meta>, é proteção só aparente');
  else if (!/default-src\s+'self'/.test(csp)) fail('§37 (4) CSP sem default-src \'self\'');
  else ok('§37 (4) CSP própria, com default-src \'self\' e sem frame-ancestors');

  /* (5) tema nas DUAS formas + fundo de token no body. No estado "sistema" o
     navegador não carimba nada no <html>: cor definida só dentro de @media ou
     só dentro de [data-theme] nunca se aplica numa das três situações. E body
     sem fundo explícito empresta o fundo de quem hospeda a página. */
  const temMedia = /@media[^{]*prefers-color-scheme:\s*dark[^{]*\{\s*:root:not\(\[data-theme="light"\]\)/.test(pres);
  const temAttr = /:root\[data-theme="dark"\]\s*\{/.test(pres);
  const temBody = /\bbody\s*\{[^}]*background:\s*var\(--/.test(pres);
  if (!temMedia || !temAttr || !temBody)
    fail(`§37 (5) tema incompleto — @media+:root:not([data-theme="light"]): ${temMedia ? 'ok' : 'FALTA'} · :root[data-theme="dark"]: ${temAttr ? 'ok' : 'FALTA'} · body com fundo de token: ${temBody ? 'ok' : 'FALTA'}`);
  else ok('§37 (5) tema nas duas formas escuras e body com fundo vindo de token');
}

console.log(fails ? `\n${fails} problema(s).` : '\nTudo certo ✅');
process.exit(fails ? 1 : 0);
