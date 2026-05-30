# Declaração de Acessibilidade — OrtoFly

**Versão:** 1.0 · **Última auditoria:** Maio de 2026 · **Próxima revisão prevista:** Maio de 2027

## Compromisso

O **OrtoFly** busca ser utilizável pelo maior número possível de pessoas, em conformidade
com a **Lei nº 13.146/2015 (Lei Brasileira de Inclusão), art. 63**, e seguindo as diretrizes
técnicas da **ABNT NBR 17225:2025** e das **WCAG 2.2 (W3C)**.

## Padrões seguidos

- **WCAG 2.2 — nível AA** (meta de conformidade).
- **ABNT NBR 17225:2025** — Acessibilidade em sistemas web.
- **Lei nº 13.146/2015 (LBI)**.

## Status de conformidade

**Parcialmente conforme.** A maior parte da interface (painéis, formulários, botões,
modais e tabelas de resultados) segue o nível AA. Há limitações conhecidas no componente
de **mapa interativo**, descritas abaixo.

## Recursos de acessibilidade implementados

- Idioma da página declarado (`<html lang="pt-BR">`).
- Estrutura semântica (cabeçalhos, `nav`, `main`, `footer`, rótulos `label` associados aos campos).
- Navegação por teclado nos controles, botões e modais (`Tab`, `Enter`, `Esc`).
- **Foco visível** em elementos interativos.
- Contraste de cores buscando o mínimo de **4,5:1** para texto normal.
- Alvos de toque com tamanho adequado (mínimo de 24×24 px — WCAG 2.2).
- Informações não transmitidas apenas por cor (uso de texto e ícones de apoio).
- Textos alternativos em imagens informativas e `aria-label` em botões somente-ícone.
- Mensagens de erro descritas em texto.

## Limitações conhecidas

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
