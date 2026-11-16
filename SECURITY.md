# Política de Segurança — OrtoFly

**Versão:** 1.3 · **Última atualização:** Novembro de 2026

Este documento descreve as medidas de segurança do **OrtoFly**, o canal de reporte de
vulnerabilidades e o plano de resposta a incidentes, em linha com a
**Lei nº 13.709/2018 (LGPD), Arts. 46–49**, a **Resolução CD/ANPD nº 15/2024** e o
**art. 8º da Lei nº 9.609/1998** (correção de defeitos).

---

## 1. Modelo de arquitetura e responsabilidades

O OrtoFly opera em camadas com responsabilidades distintas:

- **Camada 1 (controlador):** banco de dados compartilhado de avaliações e contagem de
  dispositivos (Supabase), código distribuído e versão hospedada no GitHub Pages.
- **Camada 2 (usuário):** dados do app no armazenamento do navegador (`localStorage`, IndexedDB)
  e no dispositivo do usuário; e o servidor NodeODM que ele mesmo roda ou indica, para onde vão
  as fotos da aba Processar.
- **Camada 3 (terceiros):** provedores de mapa, acionados em razão
  do funcionamento técnico. *(Desde a v1.19.0 as bibliotecas do app são servidas pelo
  próprio site — não há mais CDNs de terceiros; desde a v1.29.0 o QR do PIX é gerado no app.)*

## 2. Medidas técnicas implementadas

- **HTTPS** obrigatório em produção (GitHub Pages).
- **Content Security Policy (CSP)** declarada no `<head>`, restringindo origens de
  scripts, estilos, conexões e quadros, como defesa em profundidade contra XSS.
  Desde a **v1.19.0**, `script-src`/`style-src` não permitem **nenhuma origem externa**:
  todas as bibliotecas são servidas pelo próprio site (`vendor/`, versões pinadas).
  Desde a **v1.28.0**, `img-src` aceita só o próprio site, `data:`/`blob:` e os três serviços
  de imagem que o app usa (mapa Esri e mapa OpenStreetMap; o QR do PIX passou a ser gerado no
  app na v1.29.0) — antes, qualquer endereço `https:`.
  **Riscos aceitos, medidos em 2026-11-16 (Chrome 157 e WebKit 605.1.15, percurso completo:
  mapas, QR, GeoTIFF, índice, recorte, estatística, nuvem `.laz`, avaliações):**
  - `'unsafe-eval'` continua: sem ele o **decodificador de nuvem `.laz` (laz-perf)** quebra
    ("Evaluating a string as JavaScript violates the following Content Security Policy
    directive"); com ele, nenhuma violação nos dois motores.
  - `'unsafe-inline'` continua: o app tem 127 manipuladores em linha (`onclick`…); migrá-los
    é desproporcional agora. A defesa contra XSS é a sanitização abaixo, e nenhum valor vindo
    do armazenamento é interpolado dentro de um manipulador (conferido a cada versão pelo
    `check.js`).
  - `connect-src https:` continua: o modo Servidor aceita **qualquer** NodeODM em https que o
    usuário informe.
- **Sanitização de saída (`esc()`)** aplicada a todos os campos de texto fornecidos por
  usuários (incluindo avaliações vindas de fonte compartilhada) antes de serem inseridos
  no HTML, prevenindo *Cross-Site Scripting* (XSS).
- **Validação de entradas** numéricas e geográficas do planejamento de voo.
- **Sem credenciais sensíveis no código:** o app não usa login nem tokens de OAuth; não há
  segredos de usuário embutidos no código-fonte público.
- **Banco de avaliações com restrições (constraints) no servidor:** limites de tamanho de
  campos e bloqueio de marcações perigosas (`<script>`, `<iframe>`, `javascript:`,
  manipuladores `on*=`), além de limitação de frequência de envio.

- **NodeODM local só no próprio computador:** o servidor de processamento **não tem autenticação** e responde com `Access-Control-Allow-Origin: *`. Por isso o comando que o app e os guias do macOS e do Windows sugerem publica a porta só no *loopback* (`-p 127.0.0.1:3000:3000`): com `-p 3000:3000`, qualquer aparelho na mesma rede poderia listar, baixar e apagar as tarefas (medido em 2026-11-16 num Mac com Colima). No Windows 11 com WSL no modo espelhado (o do guia), medido em 2026-11-16: com o comando novo o NodeODM escuta só em `127.0.0.1`, o navegador do PC conecta (o app, num Chrome de verdade, criou, cancelou, reprocessou e apagou tarefas) e o IP da rede é recusado. Com o comando antigo ele escutava em todas as interfaces, e, naquele PC, quem barrava o celular no mesmo Wi-Fi era o firewall do Hyper-V do WSL, que estava bloqueando a entrada — proteção que depende da configuração de cada máquina, e que o *loopback* dispensa. O caminho com Docker Desktop recebeu o mesmo comando, mas não foi medido. No modo Servidor (VM), proteger o NodeODM (túnel com acesso controlado, *token*) é responsabilidade de quem o mantém. Desde a **v1.29.0** o app aceita o **token** de um NodeODM iniciado com `--token` (campo *Token*, só no modo Servidor): ele é guardado no armazenamento do navegador, só deste dispositivo, e vai em **todo** pedido como `?token=` — é assim que o NodeODM o lê —, portanto aparece nos registros de acesso do servidor e de um túnel/proxy no caminho. Use HTTPS e um token só para isso.

> Camadas não aplicáveis a esta versão: sanitização de HTML rico (o app não possui editor
> de texto rico) e armazenamento de tokens OAuth (o app não usa autenticação de terceiros).

### 2.1 Autorização — o que o app deliberadamente NÃO tem

O OrtoFly é uma página estática, sem servidor de aplicação. Nessa arquitetura **não existe
forma de proteger recurso pago, plano, papel ou área restrita**: `localStorage`, cookie,
variável de JavaScript e botão escondido são todos editáveis pelo usuário em segundos, pelo
navegador. Esconder um botão é interface, não controle de acesso.

Por isso o app **não possui** login, papel, área restrita nem recurso pago — e não deve
passar a ter enquanto não houver um backend que revalide o direito a cada operação.
A única marcação desse gênero é a caixa **«Já apoiei via PIX ☕»** da avaliação (vem marcada
por padrão), declarada por quem escreve: é **cosmético e de severidade baixa**, e está registrado aqui justamente para que o
padrão não seja reaproveitado num contexto em que passaria a valer algo.

### 2.2 Varredura de segredos no histórico do repositório

O repositório é **público**: uma chave commitada uma vez fica acessível para sempre, mesmo
que apagada no commit seguinte. Olhar apenas os arquivos atuais não responde a pergunta — a
varredura percorre **todos os objetos do histórico**, não a árvore de trabalho.

| Item | Estado |
|---|---|
| **Última varredura completa** | **2026-08-17** — 164 commits, todos os blobs |
| **Resultado** | **Limpa.** Nenhuma ocorrência de chave secreta de banco, JWT de função administrativa, token de GitHub ou credencial de nuvem |
| **Baseline esperado** | A **publishable key** do Supabase compartilhado e a URL dele, presentes no HTML. **Não é vazamento:** é exposição projetada — o app precisa alcançar avaliações e contagem sem que o usuário configure nada, e a proteção real é a política de acesso do banco (somente leitura e inserção, com restrições de conteúdo) |
| **Achado que exigiria ação** | Qualquer coisa fora desse par — em especial chave secreta de serviço, JWT de função administrativa, token pessoal de GitHub ou credencial de nuvem |

Em caso de exposição real, o procedimento é **revogar antes de investigar** (apagar do
código não resolve: o histórico é imutável), gerar a nova chave, atualizar onde ela vive e
publicar versão com o cache do Service Worker renovado — sem isso o navegador continua
servindo a página antiga com a chave velha. Não adotamos rotação por calendário: para chave
publicável de projeto pessoal, seria cerimônia sem retorno.

## 3. Dados tratados e exposição

O app **não processa imagens nem dados pessoais sensíveis** nesta versão. Os projetos de
voo permanecem no dispositivo do usuário. Os únicos dados enviados ao controlador são as
avaliações (públicas, voluntárias) e um ping anônimo de dispositivo. Detalhes em
[PRIVACY.md](./PRIVACY.md).

## 4. Canal de reporte de vulnerabilidades

Encontrou uma falha de segurança? Reporte de forma responsável para:

**marlongc25@protonmail.com** — assunto: `[SECURITY] OrtoFly`.

Pedimos que **não divulgue publicamente** a falha antes da correção. Faremos o possível
para responder e corrigir conforme a severidade (ver Seção 6).

## 5. Plano de resposta a incidentes (Resolução CD/ANPD nº 15/2024)

Em caso de incidente de segurança que possa acarretar risco ou dano relevante aos titulares:

1. **Detecção e registro** — identificar e datar o incidente.
2. **Contenção** — isolar o componente afetado, revogar credenciais comprometidas.
3. **Avaliação** — natureza dos dados, número de titulares e risco envolvido.
4. **Comunicação** — quando houver risco relevante, comunicar à **ANPD** e aos titulares
   afetados em até **3 dias úteis** (como ATPP, prazo estendido conforme regulamentação),
   admitida comunicação preliminar com complementação posterior.
5. **Remediação** — corrigir a vulnerabilidade, publicar nova versão e orientar a atualização.
6. **Pós-incidente** — relatório, lições aprendidas e melhoria de controles.

Por se tratar de aplicativo **sem coleta de dados pessoais sensíveis e com armazenamento
majoritariamente local**, a superfície de incidente com dados de titulares é reduzida.

## 6. Severidade e prazos de correção (referência)

| Severidade | Exemplo | Prazo-alvo |
|---|---|---|
| 🔴 Crítica | Execução de script via avaliação; exposição de dados | 7 dias |
| 🟡 Alta | Falha de CSP; sanitização ausente em novo campo | 30 dias |
| 🟢 Média/Baixa | Melhorias de robustez | Próxima versão |

## 7. Canal de atualização (art. 8º da Lei nº 9.609/1998)

Correções são publicadas continuamente. O app verifica a versão mais recente e exibe um
**banner de atualização** quando há nova versão disponível. **Mantenha o app atualizado** —
recarregue quando solicitado. O uso de cópias locais desatualizadas é de responsabilidade
do usuário (ver [TERMS.md](./TERMS.md), Seção 7).

---

**Referências:** [LGPD (Lei 13.709/2018)](https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/l13709.htm)
· [Resolução CD/ANPD nº 15/2024](https://www.gov.br/anpd/pt-br/assuntos/noticias)
· [Lei nº 9.609/1998](https://www.planalto.gov.br/ccivil_03/leis/l9609.htm)
· [Lei nº 12.737/2012](https://www.planalto.gov.br/ccivil_03/_ato2011-2014/2012/lei/l12737.htm)

*© 2026 MGC Dev — Marlon Gomes da Costa*
