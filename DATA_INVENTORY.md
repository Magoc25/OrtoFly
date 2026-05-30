# Inventário de Tratamento de Dados — OrtoFly

**Agente:** Marlon Gomes da Costa (MGC Dev) · **Porte:** ATPP (Resolução CD/ANPD nº 2/2022)
**Atualizado em:** Maio de 2026

Registro simplificado das operações de tratamento, conforme **art. 37 da LGPD**. Versão
adequada a Agente de Tratamento de Pequeno Porte.

---

| # | Dado | Categoria | Origem | Finalidade | Base legal (Art. 7º) | Compartilhamento | Transf. internacional | Retenção | Medidas de segurança |
|---|---|---|---|---|---|---|---|---|---|
| 1 | Projetos de voo (áreas, coordenadas, parâmetros), preferências | Dado de uso / não pessoal | Próprio usuário | Funcionamento do app e persistência local | Sem coleta pelo controlador (permanece no dispositivo) | Nenhum | Não | Enquanto o usuário mantiver no navegador | Armazenamento local; HTTPS; exportação/exclusão pelo usuário |
| 2 | Nome + comentário + nota (estrelas) + data de avaliação | Identificação (pseudônimo possível) | Próprio usuário (envio voluntário) | Exibir avaliações compartilhadas do app | Consentimento (Art. 7º, I) | Supabase (hospedagem) | Sim (servidores podem estar fora do BR) | Indeterminada / até pedido de remoção | RLS + constraints anti-XSS, limite de tamanho e rate limit; HTTPS |
| 3 | Identificador aleatório de dispositivo + nome do app + versão + data | Identificador técnico (não vinculado a pessoa) | Gerado no dispositivo | Métrica agregada de dispositivos ativos | Legítimo interesse (Art. 7º, IX) | Supabase (hospedagem) | Sim | Agregada | Identificador aleatório sem dados pessoais; HTTPS; ping 1x/dia |
| 4 | Endereço IP e dados técnicos do navegador | Dado de conexão | Requisições de rede | Carregar mapas, bibliotecas (CDN), hospedagem e QR de PIX | Legítimo interesse (Art. 7º, IX) | Esri, OpenStreetMap, cdnjs, jsDelivr, GitHub Pages, api.qrserver.com | Sim | Conforme política de cada provedor | HTTPS; não armazenado pelo controlador |

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
