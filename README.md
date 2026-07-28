# 🚁 OrtoFly

> **Planejamento de voo fotogramétrico e ortomosaicos para drones DJI — direto no navegador, offline e gratuito.**

Desenvolvido por **Marlon Gomes da Costa (MGC Dev)**

> ⚠️ **Este é um projeto pessoal**, desenvolvido de forma independente pelo autor.
> Não representa, não é financiado e não tem vínculo institucional com o IFMA
> ou qualquer outra organização.

> 🧪 **Versão em testes (beta).** O OrtoFly já está **funcional** — use à vontade. O processamento é feito pelo **OpenDroneMap**, motor de fotogrametria open source usado em pesquisa e produção no mundo todo. Como em **todo levantamento fotogramétrico**, a qualidade dos produtos (ortomosaico, DSM, nuvem de pontos, medidas e índices de vegetação) depende das **suas fotos** (sobreposição, luz) e do **apoio de campo**. Para **laudos ou decisões técnicas**, vale conferir os resultados — de preferência com **pontos de controle (GCP/RTK)** e/ou um software de referência (ex.: QGIS). _(Detalhes nos [Termos de Uso](./TERMS.md).)_
>
> 💬 **Ajude a validar!** Testou? **Conte como foi** — funcionou no seu fluxo? o ortomosaico/DSM ficou coerente com a realidade medida em campo? Relatos sobre o funcionamento e a **qualidade dos produtos** são muito bem-vindos e orientam a evolução do app. Use a **avaliação dentro do app** ou [abra uma issue no GitHub](https://github.com/Magoc25/OrtoFly/issues).

[![Versão](https://img.shields.io/badge/versão-1.19.1-blue)](./CHANGELOG.md)
[![Status](https://img.shields.io/badge/status-beta%20%C2%B7%20em%20valida%C3%A7%C3%A3o-yellow)](./TERMS.md)
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
- **Funciona sem internet** — depois da primeira visita online, **o app inteiro** (planejamento, EXIF, mosaico, visualizadores 2D/3D) abre e funciona offline: desde a v1.19.0 as bibliotecas ficam guardadas no seu dispositivo. Só o mapa de satélite precisa de rede em áreas ainda não visitadas.
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

O **OrtoFly** é um aplicativo web progressivo (PWA) de **fotogrametria aérea para drones DJI** que cobre o **fluxo completo** direto no navegador, em três etapas:

1. **✈️ Voo** — desenhe a área de interesse sobre o mapa de satélite, defina o GSD (resolução no solo) e as sobreposições; o app calcula a altura de voo, gera a grade de mapeamento e exporta a missão (KMZ/WPML, KML, GeoJSON, CSV).
2. **📷 Imagens** — importe as fotos DJI (lê EXIF/GPS e plota os centros no mapa), gere um **mosaico rápido** de pré-visualização e **visualize os resultados** em 2D (GeoTIFF/COG) e 3D (nuvem de pontos / malha).
3. **⚙️ Processar** — gere o **ortomosaico métrico** (e DSM/DTM, nuvem de pontos e malha 3D) a partir das suas fotos, conectando-se a um servidor **NodeODM/OpenDroneMap** que roda **no seu próprio computador**.

A arquitetura é **híbrida**: o navegador cuida de tudo o que é leve (planejamento, organização, geoprocessamento, pré-visualizações e visualização 2D/3D), enquanto o processamento fotogramétrico pesado fica para o backend **opcional** baseado em OpenDroneMap — que você controla, sem enviar nada para a nuvem.

O OrtoFly **não controla o drone diretamente** — por restrições do SDK da DJI, ele **exporta a missão** para você executar no app oficial (DJI Fly / DJI Pilot 2) ou em apps compatíveis.

---

## 🚀 Funcionalidades

### ✈️ Planejamento de voo

- **Desenho da área (AOI)** — desenhe o polígono da área a mapear sobre imagem de satélite (Esri) ou OpenStreetMap.
- **Banco de câmeras DJI** — Mini 3/4 Pro, Air 3 / 3S, Mavic 3 / 3 Classic / 3E, Phantom 4 Pro/RTK e mais, com specs de sensor para o cálculo de GSD (ou câmera personalizada).
- **Calculadora fotogramétrica** — GSD (cm/px), altura de voo, pegada da imagem no solo, espaçamento entre fotos e entre linhas a partir das sobreposições longitudinal e lateral. Informe um **GSD desejado** e o app calcula a **altura de voo** correspondente.
- **Geração da grade** — padrão "vai e volta" (lawnmower) recortado na área, com opção de grade cruzada (cross-grid) para melhor reconstrução 3D, direção das linhas automática ou manual.
- **Estimativas operacionais** — número de fotos, número de linhas, distância total, tempo de voo estimado e número de baterias.
- **Exportação de missão** — **KMZ (WPML, DJI Pilot 2)**, **KML**, **GeoJSON** e **CSV (Litchi)**; importação/exportação de áreas em GeoJSON.
- **Projetos** — salve, reabra, exporte e importe seus planos de voo (JSON), tudo no dispositivo.

### 📷 Imagens, pré-mosaico e visualização

- **Importação de fotos DJI + EXIF** — lê GPS, altitude, data e modelo das fotos e plota os centros no mapa (as imagens ficam só na sessão, não são enviadas nem salvas). Gera a **envoltória** da área a partir das fotos.
- **Mosaico rápido (GPS)** — pré-mosaico **não métrico** que posiciona as fotos pelo GPS/rumo/altitude, com exportação em PNG + world file. É um preview aproximado (para o resultado métrico, use a aba Processar).
- **Visualizador 2D** — abre **ortomosaico/DSM (GeoTIFF/COG)** no mapa, com paletas para DSM e controle de opacidade.
- **Visualizador 3D** — abre **nuvem de pontos** (LAS/LAZ/PLY) ou **malha** (OBJ/glTF/GLB) no navegador.
- **Recorte do ortomosaico** — marque a área de interesse (polígono ou retângulo, ou reaproveite a área do voo) e **recorte** o raster; passe a visualizar, calcular estatística e gerar índice **só na parte útil**, e salve o recorte (PNG + worldfile). **↺ Imagem inteira** restaura o original.
- **Índices de vegetação por RGB** — a partir de uma ortho colorida, calcula e colore **VARI, GLI, NGRDI, ExG, ExGR, MGRVI, RGBVI, TGI, VEG** (proxies de vigor; **não** são NDVI, que exige infravermelho). A estatística por pontos passa a amostrar o índice, e a imagem do índice é exportável (PNG + worldfile).
- **Estatística por pontos (zonal)** — informe pontos (`lat, lon` ou UTM `E, N`, digitados ou **clicados no mapa**) e um raio (buffer circular) e o app amostra os pixels do raster carregado dentro de cada círculo, calculando **média, desvio-padrão, mín, máx e mediana por banda** (útil para NDVI/índices, DSM ou ortomosaico). Os pontos podem ser **digitados, clicados no mapa ou importados de CSV/GeoJSON**, com **raio por ponto** opcional; também há **estatística da área inteira** (do recorte ou da imagem). Cor/estilo dos círculos configuráveis; exporta em **CSV**, **TXT** (tabulação) e **GeoJSON**, gera **figura PNG georreferenciada** (com worldfile) e um texto de **Material e Métodos (M&M)** pronto para citar.
- **Ajuste por pontos de controle (GCP)** — corrija um deslocamento com feições conhecidas (ex.: **RTK**): aplique a transformação aos **pontos** (ex.: coletados com GPS de mão) ou **desloque o próprio ortomosaico** no mapa. 1 ponto = deslocamento; 2+ = + rotação/escala, com resíduo (RMS). Os pontos de controle podem ser digitados ou **clicados na imagem**.

### ⚙️ Processamento (ortomosaico métrico) — opcional

- **Integração com NodeODM (OpenDroneMap)** — conecta a um servidor **local** (seu computador) ou em **VM na nuvem**, processa as suas fotos e gera **ortomosaico**, **DSM/DTM**, **nuvem de pontos** e **malha 3D** — sem enviar nada para serviços de terceiros.
- **Fluxo de resultado limpo** — ao concluir, **salve** os produtos dentro do app (abrem offline) ou **descarte**, liberando o disco do servidor.

---

## 📦 Como usar

### Opção 1 — Online _(recomendado)_

Use a URL pública da seção [▶ Abrir agora](#-abrir-agora--sem-baixar-nada). É a forma mais simples — sem instalação, sem cadastro, sem download. Funciona em qualquer dispositivo com navegador.

Seus projetos ficam salvos **no próprio navegador**, apenas no seu dispositivo. Para fazer backup ou levar para outro computador, exporte pelo botão **⬇ JSON** dentro do app.

### Opção 2 — Cópia local _(opcional)_

Se quiser uma cópia totalmente independente — útil para arquivamento ou para não depender do site:

1. No repositório, clique no botão verde **Code** → **Download ZIP**
2. Extraia o ZIP em uma pasta no seu computador
3. Dê duplo clique em `ortofly.html`

Desde a v1.19.0 o ZIP traz **todas as bibliotecas junto** (pasta `vendor/`), então a cópia local funciona de verdade sem internet. Duas exceções: o **mapa de satélite** continua exigindo conexão, e abrir nuvens **`.laz`** não funciona em cópia aberta por duplo clique (limitação do navegador com módulos em `file://` — use a versão online, ou converta para `.las`).

---

## 🛰️ Gerar ortomosaico (processamento) — opcional

O planejamento de voo e a visualização funcionam 100% no navegador. Para gerar a **ortomosaico métrica**
(e DSM, nuvem de pontos e malha 3D) a partir das **suas fotos**, a aba **⚙️ Processar** se conecta a um
servidor **NodeODM** (OpenDroneMap) que você roda **no seu próprio computador** — gratuitamente, sem enviar
nada para a nuvem.

Guias passo a passo (bem detalhados, mesmo para quem não usa terminal):

| Onde rodar | Guia |
|---|---|
| 🖥️ **Windows** | [Configurar no Windows (WSL + Docker)](./Guia-Local-Windows-WSL-NodeODM.md) |
| 🍎 **macOS** | [Configurar no Mac (Docker)](./Guia-Local-macOS-NodeODM.md) |
| ☁️ **Servidor remoto (sua VPS / outro PC)** | Rode o NodeODM nele (os mesmos passos do Docker) e aponte a aba **Processar** para a URL `https://…` dele — o app é só o cliente. |

> 💡 É **opcional** — use só se quiser gerar os produtos de fotogrametria. Tudo roda **localmente**, suas imagens não saem do seu dispositivo.
>
> 📖 Cada guia também explica o **dia a dia**: como **ligar, desligar e conferir** o servidor (fechar o terminal não o desliga), qual **navegador usar** e como **dar mais memória** ao NodeODM para processar muitas fotos.

### 📦 O que vem no resultado (`all.zip`)

Ao concluir, o ODM gera um pacote (`all.zip`) com os produtos de fotogrametria. Os principais:

| Arquivo / pasta | O que é |
|---|---|
| `odm_orthophoto/odm_orthophoto.tif` | **Ortomosaico** — mapa colorido georreferenciado (GeoTIFF), com escala real |
| `odm_dem/dsm.tif` | **DSM** — modelo digital de **superfície** (terreno + objetos). Só existe se marcar **Gerar DSM** |
| `odm_dem/dtm.tif` | **DTM** — modelo de **terreno** (sem objetos). _O OrtoFly **não gera DTM** (nenhum modo envia `--dtm`); listado só como referência do ODM._ |
| `odm_georeferencing/odm_georeferenced_model.laz` | **Nuvem de pontos** 3D georreferenciada (formato LAZ comprimido) |
| `odm_texturing*/` | **Malha 3D** texturizada (OBJ + texturas) |
| `odm_report/report.pdf` | **Relatório** de qualidade do processamento |
| `cameras.json` · `images.json` · `log.json` | Metadados (parâmetros de câmera, imagens usadas, log) |

No app: **🗺️ Ortomosaico** e **⛰️ DSM** abrem direto no visualizador 2D; **🧊 Nuvem (3D)** abre a nuvem `.laz` em 3D no navegador; **⬇ Tudo (.zip)** baixa o pacote completo (abra também no **CloudCompare/QGIS**).

> **Qual modo gera o quê:** o **DSM** só sai nos modos **DSM + ortomosaico** e **Completo**; o **modelo 3D texturizado** (`odm_texturing*/`), só no **Completo**. No **Rápido** a nuvem (`.laz`) é **esparsa**; nos outros dois, **densa**. Em **todos** os modos vêm ortomosaico + nuvem + relatório. Detalhes e qual escolher: **[Boas Práticas § 3](./Boas-Praticas-e-Qualidade.md)**.
>
> 💡 **Área plana e só quer o ortomosaico?** O modo **Rápido** já entrega com **qualidade equivalente** — mais rápido e leve. A diferença de qualidade do ortho só aparece em **relevo/estruturas altas**; os modos densos valem quando você precisa de **DSM/altimetria, nuvem densa ou 3D**.

> 📘 **Dicas de qualidade, confiabilidade e "por que usar o OrtoFly":** veja o **[Guia de Boas Práticas e Qualidade](./Boas-Praticas-e-Qualidade.md)** — voo, sobreposição, modo Rápido vs Completo, e a precisão dos produtos (ODM / GCP / RTK).

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

Apoiando ou não, deixe uma avaliação com **estrelas e comentário** (botão ⭐ Avaliações,
no rodapé do app). As avaliações são **compartilhadas entre todos os usuários** do app.

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
