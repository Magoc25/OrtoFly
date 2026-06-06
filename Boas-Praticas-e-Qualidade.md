# 📘 Boas práticas e qualidade — OrtoFly

Dicas para tirar bons produtos (ortomosaico, DSM, nuvem 3D) e entender a **confiabilidade** do que o app gera.

---

## 1. Planejamento de voo
- **Sobreposição:** use **75% frontal** e **~70% lateral**. Para **3D / nuvem densa**, suba para **80%+**.
- **Altura / GSD:** quanto mais baixo, **mais detalhe** (GSD menor) — e mais fotos/baterias. Defina o GSD pelo objetivo (ex.: 2–3 cm/px para topografia).
- **Grade cruzada (cross-grid):** ative para **3D e fachadas** (melhora muito a reconstrução).
- **Margem:** planeje a área um pouco **além** do alvo (as bordas reconstroem pior).

## 2. Captura (no voo)
- **Luz difusa** é a melhor (céu encoberto). Evite **sol a pino** e **sombras duras**.
- **Evite água, vidro, metal brilhante e superfícies lisas/uniformes** — não têm textura para casar entre fotos (viram buracos).
- **Voo estável**, sem borrão; velocidade compatível com o tempo de obturador.
- **GPS bom**; para precisão **absoluta**, use **GCPs** (pontos de controle no solo) ou drone **RTK**.

## 3. Processamento: Rápido × Completo (DSM)

Na aba **⚙️ Processar / NodeODM** você escolhe entre dois caminhos. Eles **partem do mesmo lugar e divergem no meio** — entender isso evita rodar o modo pesado (e faminto por RAM) **sem precisar**.

### A essência
Os dois começam igual: o **SfM** (*Structure from Motion*) descobre de onde cada foto foi tirada e monta uma **nuvem esparsa** de pontos. A partir daí eles divergem:

- **Rápido (`fast-orthophoto`)** — pula a **nuvem densa** e a **malha 3D**. Mas ainda monta uma **malha 2.5D** da nuvem esparsa e **textura ela** (o **mesmo passo** do Completo) para gerar **só o ortomosaico**. ⚠️ Essa **texturização ainda consome RAM** — o Rápido é mais leve, não "de graça".
- **Completo (Gerar DSM)** — *roda* a parte pesada: **reconstrução densa (MVS)** → **malha 3D** → **DSM/DTM**. É o pipeline inteiro.

### O que cada etapa faz (e onde a RAM some)

| Etapa | Rápido | Completo (DSM) |
|---|:---:|:---:|
| SfM — poses + nuvem **esparsa** | ✅ | ✅ |
| **MVS** — nuvem **densa** (densificação) | ❌ pula | ✅ **pesado (RAM)** |
| **Malha** (superfície) | 2.5D (leve) | **3D** (pesado) |
| **Texturização** (gera o ortho) | ✅ **pesado (RAM)** | ✅ **pesado (RAM)** |
| Georreferenciamento | ✅ | ✅ |
| **DSM / DTM** (modelo de superfície) | ❌ | ✅ pesado |
| Ortomosaico | ✅ (sobre malha 2.5D) | ✅ (sobre superfície densa) |

> ⚠️ **A texturização roda nos DOIS modos** e é um dos maiores consumidores de RAM (carrega muitas imagens ao mesmo tempo). Por isso **até o Rápido pode estourar a memória** com **muitas fotos/views** — não só o Completo. O Completo é **mais pesado ainda**: soma **MVS (nuvem densa) + malha 3D + DSM** por cima. Resumo: o Rápido é **mais leve, mas não imune**. *(Veja **Memória e CPU** no guia de instalação do seu sistema.)*

### O que você leva pra casa em cada um

| Produto | Rápido | Completo (DSM) |
|---|:---:|:---:|
| 🗺️ Ortomosaico 2D | ✅ bom | ✅ melhor (menos distorção no relevo) |
| ⛰️ DSM (altimetria / superfície) | ❌ não gera | ✅ |
| 🧊 Nuvem 3D | ⚠️ só **esparsa** (com buracos) | ✅ **densa** |
| 🧱 Malha 3D texturizada | ⚠️ só 2.5D (do ortho) | ✅ |

> Por isso o DSM **só existe no modo Completo**: sem a reconstrução densa não há superfície para gerar o modelo — `Gerar DSM` e `Rápido` são **mutuamente exclusivos** (marcar DSM já desliga o Rápido).

### Qual usar
- **Rápido** → você só quer o **mapa 2D**: ortomosaico para NDVI/índices, contagem, medir área, inspeção visual. Terreno **mais plano** (lavoura). É **mais rápido e leve** que o Completo (mas **muitas fotos ainda pedem RAM** na texturização — veja abaixo). **Na dúvida, comece por aqui** — muitas vezes é tudo o que você precisa.
- **Completo (DSM)** → você precisa de **altimetria, volume, curvas de nível, nuvem densa ou modelo 3D**, ou o terreno tem **relevo / estruturas altas** e você quer um ortomosaico mais limpo. Exige **RAM e tempo** (garanta memória/swap suficientes — veja o guia de instalação).

> **Sobre precisão:** o georreferenciamento **horizontal** (posição no mapa) depende do **GPS/GCP** nos dois modos — o Rápido **não** deixa o mapa mais torto na horizontal em terreno plano. O que muda é a **superfície** usada para corrigir a perspectiva: em área plana o ortomosaico do Rápido já costuma servir; em área com altura (prédios, árvores, barrancos) o Completo corrige melhor. A parte **vertical / 3D (DSM)** é que só o Completo entrega de verdade.

**Nº de fotos:** de dezenas a centenas. Mais fotos = mais **RAM e tempo** — especialmente no Completo.

### Estourou a RAM (`Killed` / `Child returned 137`)?
Conjuntos grandes (muitas **fotos/views**) podem **morrer por falta de memória** na **texturização** — que roda **nos dois modos**, então acontece **mesmo no Rápido**, não só no Completo. No log: `Killed` / `Child returned 137`, e o próprio ODM diz *"You ran out of memory"*. Saídas, que **se somam** (em ordem):

- **1º — Mais memória ao NodeODM:** no **WSL**, RAM + `swap` (o swap faz a etapa pesada **terminar devagar** em vez de morrer, **sem perder qualidade**). No **Colima/Mac**, vale a **RAM real** do `--memory` (não há swap grande). Veja **🧠 Memória e CPU** no guia de instalação.
- **2º — Menos fotos por rodada:** o lever mais direto contra a texturização — ajuda **os dois modos** (divida a área em partes).
- **3º — No app, "Economizar RAM"** (`resize-to=2048` + `pc-quality=low`): ajuda **principalmente no Completo** (baixa a nuvem densa → malha/texturização mais leves; é o **"completo leve"**, ainda entrega DSM/nuvem/3D com menos detalhe).
- **Último caso:** rode num **NodeODM na nuvem** (modo Servidor) — sem o limite da sua máquina.

## 4. "Buracos" na nuvem são normais
A reconstrução depende de a **mesma textura** aparecer em várias fotos. Buracos vêm de: **modo Rápido**, **água/superfícies lisas**, **sombras**, **bordas** (menos sobreposição) e **objetos em movimento**. Para encher: **modo Completo + mais sobreposição + boa luz**.

## 5. Visualização
- **Ortomosaicos grandes** podem pesar no navegador (decodifica tudo em memória). Nesses casos, **⬇ Tudo (.zip)** e abra no **QGIS**.
- **Nuvem `.laz`:** abre em 3D no app (**🧊 Nuvem (3D)**) ou no **CloudCompare / QGIS** (Camada → Adicionar Camada de Nuvem de Pontos).

## 6. Dados e backup
- Os projetos e resultados ficam **no seu dispositivo**. Exporte o plano em **JSON** (botão no app) para backup/levar para outro PC.

---

## ❓ "Por que usar o OrtoFly se já existem softwares conhecidos?"

O OrtoFly **não tenta substituir** Pix4D, Agisoft Metashape ou DroneDeploy. Ele é uma **interface livre, em português e que roda no navegador**, usando o **OpenDroneMap (ODM)** — um motor de fotogrametria **open source maduro e respeitado** — como backend. Você usa quando quer:

- **Gratuito e sem assinatura** — Pix4D/DroneDeploy custam **centenas de dólares/mês**.
- **Seus dados são seus** — o processamento roda **no seu PC** (ou na sua própria VM). **Nada é enviado** para a nuvem de uma empresa.
- **Fluxo completo num lugar só** — planejar voo (KMZ/WPML para DJI) → importar → preview → processar (ODM) → visualizar 2D/3D — em **PT-BR**, com foco no Brasil (ANAC/DECEA, agro, topografia, cadastro).
- **Sem instalação pesada** — o app é um **PWA** (abre e usa); o motor é **um comando Docker**.

**Importante — não é uma questão de precisão.** A exatidão **não depende da marca** do software: vem do **método (fotogrametria) e das suas entradas** (sobreposição, GCPs/RTK), que valem **igual** para o ODM e para os pagos. O ODM é usado em **pesquisa, engenharia e produção** no mundo todo — e estudos científicos mostram resultados **comparáveis** aos comerciais para os mesmos dados. Para **pesquisadores, autônomos e pequenas/médias empresas**, entrega produtos **confiáveis e do mesmo nível**.

**O que os softwares pagos oferecem a mais** (não é exatidão): interface mais polida, **suporte técnico**, relatórios prontos e alguns **fluxos avançados** (GCP/RTK assistido, processamento em nuvem escalável, recursos específicos de setor). Para **pesquisa**, inclusive, o ODM tem um trunfo: é **aberto e reprodutível** (você cita a versão e repete o processamento) — algo valorizado academicamente.

## ❓ "Qual a confiabilidade dos produtos gerados (NodeODM)?"

O NodeODM é só a **API** do **OpenDroneMap** — usado mundialmente em **pesquisa, agricultura, mapeamento humanitário** (OpenAerialMap, HOT) e ensino. É **confiável** dentro dos limites da fotogrametria:

- **Precisão relativa** (medidas internas, áreas, volumes) costuma ser **boa**.
- **Precisão absoluta** (posição no mundo) é **limitada pelo GPS do drone** — tipicamente **metros** sem apoio. Com **GCPs** ou **RTK/PPK**, chega a **centímetros**.
- **Qualidade = qualidade da entrada:** sobreposição, luz, textura e nº de fotos mandam no resultado.

**Recomendação:** para **visualização, agro, inspeção e estudo**, use à vontade. Para **topografia/cadastro com valor legal**, use **GCPs/RTK** e **valide** os produtos (checar pontos conhecidos).

---

*Guia de apoio — OrtoFly · © MGC Dev.*
