# Inventário de Tratamento de Dados — OrtoFly

**Agente:** Marlon Gomes da Costa (MGC Dev) · **Porte:** ATPP (Resolução CD/ANPD nº 2/2022)
**Atualizado em:** Setembro de 2026

Registro simplificado das operações de tratamento, conforme **art. 37 da LGPD**. Versão
adequada a Agente de Tratamento de Pequeno Porte.

---

| # | Dado | Categoria | Origem | Finalidade | Base legal (Art. 7º) | Compartilhamento | Transf. internacional | Retenção | Medidas de segurança |
|---|---|---|---|---|---|---|---|---|---|
| 1 | Projetos de voo (áreas, coordenadas, parâmetros), preferências, resultados de processamento salvos, endereço do NodeODM | Dado de uso / não pessoal | Próprio usuário | Funcionamento do app e persistência local | Sem coleta pelo controlador (permanece no dispositivo) | Nenhum | Não | Enquanto o usuário mantiver no navegador | Armazenamento local; HTTPS; exportação/exclusão pelo usuário |
| 2 | Nome + comentário + nota (estrelas) + data e hora da avaliação + caixa «Já apoiei via PIX ☕» (autodeclaração; vem marcada, o usuário pode desmarcar) | Identificação (pseudônimo possível) | Próprio usuário (envio voluntário) | Exibir avaliações compartilhadas do app | Consentimento (Art. 7º, I) | Supabase (hospedagem) | Sim (servidores podem estar fora do BR) | Indeterminada / até pedido de remoção | RLS + constraints anti-XSS, limite de tamanho e rate limit; HTTPS |
| 3 | Identificador aleatório de dispositivo + nome do app + versão + data | Identificador técnico (não vinculado a pessoa) | Gerado no dispositivo | Métrica agregada de dispositivos ativos | Legítimo interesse (Art. 7º, IX) | Supabase (hospedagem) | Sim | Agregada | Identificador aleatório sem dados pessoais; HTTPS; ping 1x/dia |
| 4 | Endereço IP e dados técnicos do navegador | Dado de conexão | Requisições de rede | Carregar mapas, hospedagem do app (incl. bibliotecas, servidas pelo **próprio site** desde a v1.19.0) e QR de PIX | Legítimo interesse (Art. 7º, IX) | Esri, OpenStreetMap, GitHub Pages, api.qrserver.com | Sim | Conforme política de cada provedor | HTTPS; não armazenado pelo controlador |
| 5 | Fotos do voo (com a localização gravada pela câmera) e produtos do processamento | Dado de uso (a localização pode indicar o local do levantamento) | Próprio usuário | Processar no servidor NodeODM que o usuário indica | Sem coleta pelo controlador (vai só ao servidor indicado pelo usuário, no computador dele ou num servidor dele) | Nenhum pelo controlador; se o usuário escolher servidor remoto ou túnel, o provedor dele | Não pelo controlador | Enquanto o usuário mantiver no NodeODM e no navegador | Nada passa pelo controlador; HTTPS obrigatório para servidor remoto |

---

## Observações

- **Não há** tratamento de dados pessoais sensíveis (Art. 11), nem de dados de crianças e
  adolescentes (o app é destinado a maiores de 18 anos).
- **Não há** decisões automatizadas com efeitos jurídicos sobre o titular.
- O tratamento **não se enquadra como de alto risco**, mantendo o regime de ATPP.
- Direitos do titular e canal de atendimento: ver [PRIVACY.md](./PRIVACY.md).

---

**Referências:** [LGPD, Art. 37](https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/l13709.htm)
· [Resolução CD/ANPD nº 2/2022](https://www.gov.br/anpd/pt-br/acesso-a-informacao/institucional/atos-normativos/regulamentacoes_anpd/resolucao-cd-anpd-no-2-de-27-de-janeiro-de-2022)

*© 2026 MGC Dev — Marlon Gomes da Costa*
