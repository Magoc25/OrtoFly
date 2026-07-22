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

console.log(fails ? `\n${fails} problema(s).` : '\nTudo certo ✅');
process.exit(fails ? 1 : 0);
