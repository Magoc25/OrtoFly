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

/* ── 4) arquivos locais referenciados existem ── */
const baseDir = path.dirname(file);
const localRefs = new Set();
for (const m of html.matchAll(/(?:src|href)\s*=\s*"\.\/([^"]+)"/g)) localRefs.add(m[1]);
for (const m of js.matchAll(/'\.\/(vendor\/[^']+)'/g)) localRefs.add(m[1]);
const swPath = path.join(baseDir, 'sw.js');
if (fs.existsSync(swPath)) for (const m of fs.readFileSync(swPath, 'utf8').matchAll(/'\.\/([^']+)'/g)) localRefs.add(m[1]);
let missing = 0;
for (const r of localRefs) if (!fs.existsSync(path.join(baseDir, r))) { fail(`arquivo local ausente: ./${r}`); missing++; }
if (!missing) ok(`arquivos locais: ${localRefs.size} referências (HTML + PRECACHE do SW) — todas existem`);

/* ── 5) apresentacao.html — a página pública do §37 ────────────────────────
   Estas asserções existem porque NENHUM passo do release toca este arquivo:
   ele não é recompilado, não entra no smoke do app e ninguém o reabre. Sem
   teste, ele apodrece sozinho — e em público. Rodam aqui, no degrau estático,
   porque nada nelas precisa de DOM. */
const presPath = path.join(baseDir, 'apresentacao.html');
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
