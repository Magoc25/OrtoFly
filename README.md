# 🚁 OrtoFly

> **Planejamento de voo fotogramétrico e ortomosaicos para drones DJI — direto no navegador, offline e gratuito.**

Desenvolvido por **Marlon Gomes da Costa (MGC Dev)**

> ⚠️ **Este é um projeto pessoal**, desenvolvido de forma independente pelo autor.
> Não representa, não é financiado e não tem vínculo institucional com o IFMA
> ou qualquer outra organização.

[![Versão](https://img.shields.io/badge/versão-1.0.0-blue)](#changelog)
[![Licença](https://img.shields.io/badge/licença-não%20comercial-orange)](#-licença-e-termos-de-uso)
[![PIX](https://img.shields.io/badge/apoie-PIX-brightgreen)](#-apoiar-o-projeto)
[![Dispositivos ativos](https://img.shields.io/badge/dynamic/json?url=https://raw.githubusercontent.com/Magoc25/OrtoFly/main/stats.json&query=$.active_30d&label=dispositivos%20ativos%20(30d)&color=blue&suffix=%20dispositivos)](./stats.json)

---

## ▶ Abrir agora — sem baixar nada

O app já está publicado online. Clique e use:

**[▶ Abrir OrtoFly](https://Magoc25.github.io/OrtoFly/ortofly.html)**

Funciona em qualquer navegador moderno (Chrome, Edge, Firefox, Safari) — no celular, tablet ou computador. **Não precisa de cadastro, login, conta GitHub ou download de arquivos.** Após o primeiro acesso, o app funciona **offline**. Seus dados ficam **somente no seu dispositivo** (no armazenamento do próprio navegador).

### 📱 Instalar como app no seu dispositivo

Depois de abrir a URL acima, você pode instalar como aplicativo nativo, com ícone na tela inicial / área de trabalho:

| Plataforma | Como instalar |
|---|---|
| **Chrome / Edge no PC** | Clique no ícone de instalação (☐ com seta) na barra de endereços → Instalar |
| **Android (Chrome)** | Menu (⋮) → "Instalar app" ou "Adicionar à tela inicial" |
| **iPhone / iPad (Safari)** | Compartilhar (□↑) → "Adicionar à Tela de Início" |

---

## 🤔 Por que usar o OrtoFly?

Se você está avaliando este app, provavelmente já viu opções como Pix4Dcapture, DroneDeploy ou DJI Fly. Antes de decidir, considere:

- **Seus dados são seus** — nenhuma empresa, servidor externo ou desenvolvedor acessa seus projetos. As áreas de voo (que muitas vezes revelam a localização de propriedades e obras) ficam no seu dispositivo, sob seu controle total.
- **Sem propagandas** — apps "gratuitos" nas lojas se sustentam exibindo anúncios. Este não.
- **Sem prazo de expiração** — muitos apps de drone liberam um período de teste e depois bloqueiam recursos ou cobram assinatura (Pix4D/DroneDeploy passam de US$ 300/mês). Este é gratuito, sem limitações.
- **Funciona sem internet** — planeje o voo no campo, sem sinal. O mapa que você já visitou fica em cache.
- **Exporta missão pronta para a DJI** — calcula GSD, altura de voo e sobreposição, gera a grade automática e exporta **KMZ no padrão WPML** (DJI Pilot 2) além de KML, GeoJSON e CSV (Litchi) — algo que nenhum planejador gratuito do tipo "abre e usa" oferece em português.
- **Pensado para o Brasil** — unidades métricas, coordenadas geográficas, contexto de regras ANAC/DECEA e foco em topografia, agricultura e cadastro rural.

O único "custo" honesto: a instalação é um pouco mais manual do que clicar em "Instalar" na loja — mas você faz uma única vez e leva menos de 5 minutos.

---

## 📂 O que são todos esses arquivos?

Se você veio aqui só para **usar o app**, pode ignorar a grande maioria dos arquivos deste repositório — eles são documentação técnica e configuração voltadas para o desenvolvedor.

Para você, basta clicar na URL pública da seção [▶ Abrir agora](#-abrir-agora--sem-baixar-nada). Tudo o que importa é:

| Arquivo principal | URL para usar |
|---|---|
| `ortofly.html` | [Magoc25.github.io/OrtoFly/ortofly.html](https://Magoc25.github.io/OrtoFly/ortofly.html) |

---

## ✨ O que é

O **OrtoFly** é um aplicativo web progressivo (PWA) de **fotogrametria aérea para drones DJI**. A primeira versão entrega o módulo de **planejamento de voo**: você desenha a área de interesse sobre um mapa de satélite, define o GSD (resolução no solo) desejado e as sobreposições, e o app calcula a altura de voo, gera a grade de mapeamento e exporta a missão em formatos que a DJI e outros apps de voo entendem.

A proposta de longo prazo segue uma **arquitetura híbrida**: o navegador cuida de tudo o que é leve (planejamento, organização, visualização 2D/3D, geoprocessamento e pré-visualizações), enquanto o processamento fotogramétrico pesado (ortomosaico rigoroso, DSM/DTM, nuvem de pontos e malha 3D) fica para um backend opcional baseado em OpenDroneMap. As fases seguintes (importação de imagens + EXIF, mosaico rápido local, visualizador 2D/3D e backend ODM) serão adicionadas progressivamente.

O OrtoFly **não controla o drone diretamente** — por restrições do SDK da DJI, ele **exporta a missão** para você executar no app oficial (DJI Fly / DJI Pilot 2) ou em apps compatíveis.

---

## 🚀 Funcionalidades

**Disponível na v1.0 — Planejamento de voo:**

- **Desenho da área (AOI)** — desenhe o polígono da área a mapear sobre imagem de satélite (Esri) ou OpenStreetMap.
- **Banco de câmeras DJI** — Mini 3/4 Pro, Air 3 / 3S, Mavic 3 / 3 Classic / 3E, Phantom 4 Pro/RTK e mais, com specs de sensor para o cálculo de GSD.
- **Calculadora fotogramétrica** — GSD (cm/px), altura de voo, pegada da imagem no solo, espaçamento entre fotos e entre linhas a partir das sobreposições longitudinal e lateral.
- **Geração da grade** — padrão "vai e volta" (lawnmower) recortado na área, com opção de grade cruzada (cross-grid) para melhor reconstrução 3D, direção das linhas automática ou manual.
- **Estimativas operacionais** — número de fotos, número de linhas, distância total, tempo de voo estimado e número de baterias.
- **Exportação de missão** — **KMZ (WPML, DJI Pilot 2)**, **KML**, **GeoJSON** e **CSV (Litchi)**; importação/exportação de áreas em GeoJSON.
- **Projetos** — salve, reabra, exporte e importe seus planos de voo (JSON), tudo no dispositivo.

**Em desenvolvimento (próximas fases):** importação de imagens DJI + leitura de EXIF/GPS, mosaico rápido local, visualizador 2D (GeoTIFF/COG) e 3D (nuvem de pontos / malha), e integração com backend OpenDroneMap.

---

## 📦 Como usar

### Opção 1 — Online _(recomendado)_

Use a URL pública da seção [▶ Abrir agora](#-abrir-agora--sem-baixar-nada). É a forma mais simples — sem instalação, sem cadastro, sem download. Funciona em qualquer dispositivo com navegador.

Seus projetos ficam salvos **no próprio navegador**, apenas no seu dispositivo. Para fazer backup ou levar para outro computador, exporte pelo botão **⬇ JSON** dentro do app.

### Opção 2 — Cópia local _(opcional)_

Se quiser uma cópia totalmente independente — útil para usar sem conexão garantida ou para arquivamento:

1. No repositório, clique no botão verde **Code** → **Download ZIP**
2. Extraia o ZIP em uma pasta no seu computador
3. Dê duplo clique em `ortofly.html`

Funciona igual à versão online (o mapa de satélite exige internet na primeira visualização de cada região).

---

## 🛰️ Gerar ortomosaico (processamento) — opcional

O planejamento de voo e a visualização funcionam 100% no navegador. Para gerar a **ortomosaico métrica**
(e DSM, nuvem de pontos e malha 3D) a partir das **suas fotos**, a aba **⚙️ Processar** se conecta a um
servidor **NodeODM** (OpenDroneMap) que você roda **no seu próprio computador** — gratuitamente, sem enviar
nada para a nuvem.

Guias passo a passo (bem detalhados, mesmo para quem não usa terminal):

| Onde rodar | Guia |
|---|---|
| 🖥️ **Windows** | [Configurar no Windows (WSL + Docker)](./docs/Guia-Local-Windows-WSL-NodeODM.md) |
| 🍎 **macOS** | [Configurar no Mac (Docker)](./docs/Guia-Local-macOS-NodeODM.md) |
| ☁️ **VM grátis na nuvem (Oracle Cloud)** | _em breve_ |

> 💡 É **opcional** — use só se quiser gerar os produtos de fotogrametria. Tudo roda **localmente**, suas imagens não saem do seu dispositivo.

### 📦 O que vem no resultado (`all.zip`)

Ao concluir, o ODM gera um pacote (`all.zip`) com os produtos de fotogrametria. Os principais:

| Arquivo / pasta | O que é |
|---|---|
| `odm_orthophoto/odm_orthophoto.tif` | **Ortomosaico** — mapa colorido georreferenciado (GeoTIFF), com escala real |
| `odm_dem/dsm.tif` | **DSM** — modelo digital de **superfície** (terreno + objetos). Só existe se marcar **Gerar DSM** |
| `odm_dem/dtm.tif` | **DTM** — modelo digital de **terreno** (sem objetos), quando solicitado |
| `odm_georeferencing/odm_georeferenced_model.laz` | **Nuvem de pontos** 3D georreferenciada (formato LAZ comprimido) |
| `odm_texturing*/` | **Malha 3D** texturizada (OBJ + texturas) |
| `odm_report/report.pdf` | **Relatório** de qualidade do processamento |
| `cameras.json` · `images.json` · `log.json` | Metadados (parâmetros de câmera, imagens usadas, log) |

No app: **🗺️ Ortomosaico** e **⛰️ DSM** abrem direto no visualizador 2D; **⬇ Nuvem (.laz)** baixa a nuvem (abra no **CloudCompare** ou no **QGIS** → *Camada → Adicionar camada de nuvem de pontos*); **⬇ Tudo (.zip)** baixa o pacote completo.

---

## 🚦 Importante — segurança de voo e regras (Brasil)

O OrtoFly é uma ferramenta de **planejamento**. A operação do drone é de responsabilidade do piloto. Antes de voar no Brasil, verifique:

- **Cadastro do drone** no **SISANT (ANAC)** para aeronaves acima de 250 g;
- **Autorização de acesso ao espaço aéreo** no **SARPAS (DECEA)**;
- Regras de altura, distância e áreas proibidas aplicáveis ao local.

O app **não substitui** a checagem dessas autorizações nem garante a viabilidade legal do voo no local escolhido.

---

## 🤝 Compatibilidade DJI

- **DJI Pilot 2 / drones Enterprise** (Mavic 3E/3T, M30, M300, M350): importam o **KMZ (WPML)** gerado, com modelo de aeronave e payload declarados.
- **DJI Fly / drones consumer** (Mini 3/4 Pro, Air 3): a compatibilidade do KMZ de waypoints varia conforme o modelo e a versão do app. Para esses casos, os formatos **KML** e **CSV (Litchi)** costumam ser o caminho mais confiável.

---

## ☕ Apoiar o Projeto

O projeto é gratuito e possui **código-fonte disponível**. Se foi útil, considere apoiar:

Clique em **☕ Apoiar** no rodapé do app para contribuir via PIX.

**Chave PIX:** `4c6086a2-4bb8-474b-a4cf-ced8c8d82189` · MGC Dev

### ⭐ Avaliações compartilhadas

Após apoiar, deixe uma avaliação com estrelas e comentário. As avaliações são
**compartilhadas entre todos os usuários** do app.

### 👑 Badges de apoiador

| Badge | Meses de apoio |
|---|---|
| ☕ Apoiador | 1 mês |
| ⭐ Fã | 2–3 meses |
| 🔥 Dedicado | 4–6 meses |
| 👑 Patrono | 7+ meses |

---

## 📄 Licença e termos de uso

Este projeto possui **código-fonte disponível** para estudo, uso pessoal, familiar, educacional, acadêmico e avaliação técnica.

**Não é uma licença open source permissiva tradicional.** O uso comercial, a redistribuição comercial, o white-label, a revenda e a exploração econômica de versões derivadas dependem de autorização prévia e por escrito do autor.

Consulte os arquivos:

- [LICENSE.md](./LICENSE.md)
- [TERMS.md](./TERMS.md)
- [CHANGELOG.md](./CHANGELOG.md)
- [PRIVACY.md](./PRIVACY.md) · [SECURITY.md](./SECURITY.md) · [ACCESSIBILITY.md](./ACCESSIBILITY.md)

---

## 👤 Autor

**Marlon Gomes da Costa**
Desenvolvedor independente · MGC Dev

*Professor do IFMA Campus São Raimundo das Mangabeiras — projetos são iniciativas pessoais,
sem vínculo institucional.*

---

*© 2026 MGC Dev — Feito com ☕ no Maranhão*
