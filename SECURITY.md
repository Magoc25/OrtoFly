# Política de Segurança — OrtoFly

**Versão:** 1.1 · **Última atualização:** Julho de 2026

Este documento descreve as medidas de segurança do **OrtoFly**, o canal de reporte de
vulnerabilidades e o plano de resposta a incidentes, em linha com a
**Lei nº 13.709/2018 (LGPD), Arts. 46–49**, a **Resolução CD/ANPD nº 15/2024** e o
**art. 8º da Lei nº 9.609/1998** (correção de defeitos).

---

## 1. Modelo de arquitetura e responsabilidades

O OrtoFly opera em camadas com responsabilidades distintas:

- **Camada 1 (controlador):** banco de dados compartilhado de avaliações e contagem de
  dispositivos (Supabase), código distribuído e versão hospedada no GitHub Pages.
- **Camada 2 (usuário):** dados do app no `localStorage` e no dispositivo do usuário.
- **Camada 3 (terceiros):** provedores de mapa e o serviço de QR Code, acionados em razão
  do funcionamento técnico. *(Desde a v1.19.0 as bibliotecas do app são servidas pelo
  próprio site — não há mais CDNs de terceiros.)*

## 2. Medidas técnicas implementadas

- **HTTPS** obrigatório em produção (GitHub Pages).
- **Content Security Policy (CSP)** declarada no `<head>`, restringindo origens de
  scripts, estilos, conexões e quadros, como defesa em profundidade contra XSS.
  Desde a **v1.19.0**, `script-src`/`style-src` não permitem **nenhuma origem externa**:
  todas as bibliotecas são servidas pelo próprio site (`vendor/`, versões pinadas).
- **Sanitização de saída (`esc()`)** aplicada a todos os campos de texto fornecidos por
  usuários (incluindo avaliações vindas de fonte compartilhada) antes de serem inseridos
  no HTML, prevenindo *Cross-Site Scripting* (XSS).
- **Validação de entradas** numéricas e geográficas do planejamento de voo.
- **Sem credenciais sensíveis no código:** o app não usa login nem tokens de OAuth; não há
  segredos de usuário embutidos no código-fonte público.
- **Banco de avaliações com restrições (constraints) no servidor:** limites de tamanho de
  campos e bloqueio de marcações perigosas (`<script>`, `<iframe>`, `javascript:`,
  manipuladores `on*=`), além de limitação de frequência de envio.

> Camadas não aplicáveis a esta versão: sanitização de HTML rico (o app não possui editor
> de texto rico) e armazenamento de tokens OAuth (o app não usa autenticação de terceiros).

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
