# Aviso de Privacidade — OrtoFly

**Versão:** 1.0 · **Última atualização:** Maio de 2026

Este Aviso explica como o **OrtoFly** trata dados pessoais, em conformidade com a
**Lei nº 13.709/2018 (LGPD)**. O OrtoFly é um aplicativo web (PWA) de planejamento de
voo fotogramétrico para drones, desenvolvido de forma independente.

---

## 1. Quem somos (controlador)

- **Responsável:** Marlon Gomes da Costa (MGC Dev) — pessoa natural.
- **Contato de privacidade:** marlongc25@protonmail.com
- **Localidade:** São Raimundo das Mangabeiras — MA, Brasil.

Atuamos como **Agente de Tratamento de Pequeno Porte (ATPP)**, conforme a
**Resolução CD/ANPD nº 2/2022**. Por isso, o tratamento de dados é minimizado e o
canal de comunicação acima substitui a figura formal do Encarregado (DPO).

## 2. Princípio geral: seus dados ficam com você

O OrtoFly foi desenhado para funcionar **localmente no seu dispositivo**. A maior parte
dos dados que você gera **nunca sai do seu navegador**:

- **Projetos de voo** (áreas desenhadas/coordenadas, parâmetros de câmera e voo, nomes
  de projetos) e **preferências** são salvos no **armazenamento local do navegador**
  (`localStorage`). **O controlador não tem acesso a esses dados.**

## 3. Quais dados são efetivamente tratados pelo controlador

| Dado | Quando | Visibilidade |
|---|---|---|
| **Nome e comentário de avaliação** + nota (estrelas) + data | Apenas se você **optar por enviar uma avaliação** | **Público** (visível a outros usuários do app) |
| **Identificador aleatório de dispositivo** (gerado no aparelho) + nome do app + versão + data | Envio automático de **1 ping anônimo por dia** | Apenas estatística agregada |

> O nome de avaliação pode ser um pseudônimo — você não é obrigado a usar seu nome real.
> O identificador de dispositivo é gerado aleatoriamente e **não está vinculado** a você,
> à sua conta ou aos seus projetos; serve apenas para contar dispositivos ativos.

## 4. Dados acessados por provedores de terceiros (em razão do funcionamento)

Por ser um app que roda no navegador, alguns pedidos de rede expõem dados técnicos a
terceiros, **sem que o controlador os armazene**:

- **Provedores de mapa** (Esri / ArcGIS World Imagery e OpenStreetMap): ao visualizar uma
  região do mapa, o provedor recebe seu **endereço IP** e as coordenadas dos blocos
  (tiles) solicitados — o que pode indicar a área de interesse exibida.
- **Redes de distribuição de conteúdo (CDN)** (cdnjs, jsDelivr): ao carregar as bibliotecas
  do app, recebem seu endereço IP e o agente de usuário do navegador.
- **GitHub Pages** (hospedagem do app) e **api.qrserver.com / chart.googleapis.com**
  (geração do QR Code de PIX, somente se você abrir o modal de apoio).

## 5. Finalidades e bases legais (Art. 7º da LGPD)

| Tratamento | Finalidade | Base legal |
|---|---|---|
| Armazenamento local de projetos | Permitir que o app funcione e guarde seu trabalho | Não há coleta pelo controlador (dado permanece no dispositivo) |
| Envio de avaliação (nome, comentário) | Exibir avaliações compartilhadas do app | **Consentimento** (Art. 7º, I) — você decide enviar |
| Ping anônimo de dispositivo | Métrica agregada de uso (dispositivos ativos) | **Legítimo interesse** (Art. 7º, IX), com impacto mínimo ao titular |
| Carregamento de mapas, bibliotecas e hospedagem | Viabilizar o funcionamento técnico do app | **Legítimo interesse** (Art. 7º, IX) |

## 6. Com quem compartilhamos

Não vendemos nem comercializamos dados. Há compartilhamento técnico com:

- **Supabase** — hospedagem do banco de dados de avaliações e da contagem anônima de dispositivos;
- **Provedores de mapa, CDN e hospedagem** listados na Seção 4.

## 7. Transferência internacional (Art. 33 da LGPD)

Os provedores acima (Supabase, GitHub, Esri, CDNs) podem processar dados em **servidores
fora do Brasil**. Esse tratamento se baseia no **legítimo interesse** e na execução do
serviço, limitando-se ao mínimo necessário (dados técnicos e, no caso de avaliações,
dados que você optou por tornar públicos). Não há transferência internacional de
projetos de voo, pois estes permanecem no seu dispositivo.

## 8. Por quanto tempo guardamos

- **Projetos e preferências:** enquanto você mantiver no dispositivo — você pode apagá-los
  a qualquer momento limpando os dados do site ou pela função de exclusão do app.
- **Avaliações:** por prazo indeterminado, enquanto forem úteis ao app, ou até solicitação de remoção.
- **Ping anônimo:** mantido de forma agregada; registros individuais não identificam o titular.

## 9. Seus direitos (Art. 18 da LGPD)

Você pode, a qualquer momento e gratuitamente, solicitar: **confirmação** da existência de
tratamento; **acesso** aos dados; **correção**; **anonimização, bloqueio ou eliminação**
de dados desnecessários ou tratados em desconformidade; **portabilidade**; **eliminação**
dos dados tratados com consentimento; **informação** sobre compartilhamentos; **informação**
sobre a possibilidade de não consentir; e **revogação do consentimento**.

Como a maioria dos dados está **somente no seu dispositivo**, você já exerce a maior parte
desses direitos diretamente (exportar JSON = portabilidade; apagar dados do navegador =
eliminação).

## 10. Como exercer seus direitos

Envie um e-mail para **marlongc25@protonmail.com**. Como ATPP, o prazo de resposta é de
até **30 dias**. Para remoção de uma avaliação, informe o nome utilizado e a data aproximada.

## 11. Segurança dos dados

Adotamos medidas técnicas descritas em [SECURITY.md](./SECURITY.md), incluindo HTTPS,
política de segurança de conteúdo (CSP), sanitização de entradas e restrições no banco de
dados de avaliações.

## 12. Tratamento de menores

O OrtoFly é uma ferramenta técnica de planejamento de voo **destinada a maiores de 18 anos**.
Não é direcionado a crianças ou adolescentes e não coleta intencionalmente seus dados. Caso
identifiquemos uso por menor, removeremos os dados associados mediante contato.

## 13. Cookies e tecnologias similares

O OrtoFly **não usa cookies de rastreamento ou publicidade**. Utiliza apenas o
`localStorage` do navegador — equiparado a cookies sob a LGPD — para guardar seus projetos
e preferências **no próprio dispositivo**. Você pode limpá-lo pelas configurações do navegador.

## 14. Alterações neste Aviso

Podemos atualizar este Aviso. Mudanças materiais serão sinalizadas pela versão e data no
topo do documento e, quando cabível, por aviso dentro do app.

---

**Base legal e referências:** [Lei nº 13.709/2018 (LGPD)](https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/l13709.htm)
· [Resolução CD/ANPD nº 2/2022 (ATPP)](https://www.gov.br/anpd/pt-br/acesso-a-informacao/institucional/atos-normativos/regulamentacoes_anpd/resolucao-cd-anpd-no-2-de-27-de-janeiro-de-2022)
· [ANPD](https://www.gov.br/anpd/)

*© 2026 MGC Dev — Marlon Gomes da Costa*
