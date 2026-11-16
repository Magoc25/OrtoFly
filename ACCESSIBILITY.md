# Declaração de Acessibilidade — OrtoFly

**Versão:** 1.1 · **Última auditoria:** Novembro de 2026 · **Próxima revisão prevista:** Novembro de 2027

## Compromisso

O **OrtoFly** busca ser utilizável pelo maior número possível de pessoas, em conformidade
com a **Lei nº 13.146/2015 (Lei Brasileira de Inclusão), art. 63**, e seguindo as diretrizes
técnicas da **ABNT NBR 17225:2025** e das **WCAG 2.2 (W3C)**.

## Padrões seguidos

- **WCAG 2.2 — nível AA** (meta de conformidade).
- **ABNT NBR 17225:2025** — Acessibilidade em sistemas web.
- **Lei nº 13.146/2015 (LBI)**.

## Status de conformidade

**Parcialmente conforme.** A auditoria de novembro de 2026 encontrou que esta declaração
prometia mais do que o app entregava (botões só de ícone sem nome, modais que não prendiam
nem devolviam o foco, avaliação por estrelas só com mouse); isso foi corrigido na
**v1.28.0**. A lista abaixo descreve **só o que existe e foi conferido**; o que ainda não
foi avaliado está em *Limitações conhecidas*.

## Recursos de acessibilidade implementados

- Idioma da página declarado (`<html lang="pt-BR">`).
- Regiões da página: `header`, área principal (`role="main"`) e `footer`; rótulos `label` associados aos campos de formulário.
- **Nome acessível em todo botão só de ícone** (📂, ❓, ✏️, 🗑️, 📍, 💾, ✨, ✕ de fechar…), por `aria-label` — conferido a cada versão pelo verificador estático (`check.js`).
- **Abas** (✈️ Voo, 📷 Imagens, ⚙️ Processar) com `role="tab"`/`tabpanel` e `aria-selected` acompanhando a aba ativa.
- **Modais como diálogos** (`role="dialog"`, `aria-modal`, título associado): ao abrir, o foco entra no modal; `Tab` e `Shift+Tab` ficam dentro dele; `Esc` fecha; ao fechar, o foco volta ao botão que o abriu.
- **Avaliação por estrelas operável por teclado** (cada estrela é um botão com nome — "4 estrelas" — e estado `aria-pressed`).
- **Mensagens anunciadas** pelo leitor de tela: o aviso na base da tela é `role="status"` (sem interromper) e, quando é erro, `role="alert"`.
- Itens de lista clicáveis (nome do projeto, linha de foto) alcançáveis por `Tab` e acionáveis com `Enter` ou `Espaço`.
- **Foco visível** (contorno) em campos e botões navegados por teclado.
- Mensagens de erro descritas em texto.

## Limitações conhecidas

- **Não avaliado com leitor de tela real** (VoiceOver/NVDA) nesta auditoria: o comportamento
  acima foi conferido por testes automatizados no navegador simulado e pelo teclado; a leitura
  em voz é a próxima verificação.
- **Contraste de cores e tamanho dos alvos de toque** não foram medidos nesta auditoria.
- **Ordem de foco do painel lateral:** os controles seguem a ordem do documento; não há atalho
  para pular o mapa.

- O **desenho da área no mapa** (criação e edição de polígonos) depende de interação por
  ponteiro/toque e **não é totalmente operável por teclado nem por leitor de tela**. Como
  alternativa, é possível **importar a área em GeoJSON** já definida em outra ferramenta.
- A **visualização cartográfica** (blocos de satélite) é, por natureza, visual; os
  resultados numéricos do planejamento (GSD, altura, nº de fotos, etc.) são apresentados
  também em **texto e tabela**, acessíveis a leitores de tela.

## Contato para problemas de acessibilidade

Encontrou uma barreira de acessibilidade? Escreva para **marlongc25@protonmail.com** —
descreva o problema, o dispositivo e a tecnologia assistiva usada. Buscaremos corrigir
nas próximas versões.

---

**Referências:** [Lei nº 13.146/2015 (LBI)](https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2015/lei/l13146.htm)
· [WCAG 2.2 (W3C)](https://www.w3.org/WAI/standards-guidelines/wcag/)
· [eMAG](https://emag.governoeletronico.gov.br/)

*© 2026 MGC Dev — Marlon Gomes da Costa*
