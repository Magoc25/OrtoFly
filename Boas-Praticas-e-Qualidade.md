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

## 3. Processamento (NodeODM): os 3 modos de saída + Economizar RAM

Na aba **⚙️ Processar** você escolhe **um modo** (rádio) e, opcionalmente, marca **Economizar RAM**. Todos começam igual — o **SfM** (*Structure from Motion*) descobre de onde cada foto foi tirada e monta uma **nuvem esparsa** — e divergem a partir daí. Entender isso evita rodar o modo pesado **sem precisar**.

### O que cada modo ENTREGA

| Produto | 🟢 Rápido | 🟡 DSM + ortomosaico (sem 3D) | 🔴 Completo |
|---|:---:|:---:|:---:|
| 🗺️ **Ortomosaico** (GeoTIFF) | ✅ | ✅ | ✅ |
| ⛰️ **DSM** (altimetria/superfície) | ❌ | ✅ | ✅ |
| 🧊 **Nuvem de pontos** (`.laz`) | ✅ **esparsa** (com buracos) | ✅ **densa** | ✅ **densa** |
| 🧱 **Modelo 3D texturizado** (OBJ) | só a malha **2.5D** interna (do ortho) | ❌ (pulado) | ✅ |
| 📄 **Relatório + metadados** | ✅ | ✅ | ✅ |
| Flags enviadas ao ODM | `fast-orthophoto` | `dsm` + `skip-3dmodel` | `dsm` |

> ⚠️ **Nenhum modo entrega "só o ortomosaico".** Até o **Rápido** traz **nuvem esparsa + malha 2.5D + relatório** no `all.zip` (a nuvem abre no **🧊 Nuvem 3D** do app). O que o Rápido **não** tem é **DSM** e **nuvem densa**.

### A diferença, etapa por etapa
- **🟢 Rápido (`fast-orthophoto`)** — pula a **densificação (MVS)** e a **malha 3D**. Monta uma malha **2.5D** da nuvem **esparsa** e textura → ortomosaico. O mais leve — mas a **texturização ainda consome RAM**.
- **🟡 DSM + ortomosaico, sem 3D (`dsm` + `skip-3dmodel`)** — roda a **densificação (MVS)** → **nuvem densa + DSM + ortomosaico**, mas **pula o modelo 3D texturizado** (`mvstex`, a etapa que mais come RAM). O **meio-termo**: dá DSM e nuvem densa sem o passo que estoura a memória.
- **🔴 Completo (`dsm`)** — o pipeline inteiro: **nuvem densa → malha 3D → modelo 3D texturizado → DSM → ortomosaico**. O mais pesado.

> O **DSM** vem em **dois** modos (DSM+orto **e** Completo), não só no Completo. A única diferença entre eles é o **modelo 3D texturizado** — que só o Completo gera.

### ❓ O ortomosaico cai de qualidade no Rápido? — **depende do relevo**
- **Posição no mapa (horizontal)** e **resolução (GSD):** **iguais** nos três modos — mesmas fotos, mesmo GPS/GCP, mesma resolução de ortho. O Rápido **não** deixa o mapa mais torto nem o ortho mais "borrado".
- **Fidelidade geométrica (ortorretificação):** aí **sim** muda. O ortho do Rápido é projetado sobre uma superfície **grosseira** (da nuvem **esparsa**):
  - **Terreno plano** (lavoura, campo): diferença **mínima** — o ortho do Rápido já serve.
  - **Relevo / objetos altos** (prédios, árvores, barrancos): o Rápido mostra **distorção/arrasto** nas bordas; **DSM+orto** e **Completo** projetam sobre a superfície **densa** → ortho **mais limpo e reto**.
- **Resumo:** a "queda" do Rápido é **geométrica e só aparece onde há altura**. Em área plana, o ortho é praticamente o mesmo.

### Economizar RAM (`resize-to=2048` + `pc-quality=low`) — soma a qualquer modo
Troca **detalhe por leveza**:

| Combinação | Efeito |
|---|---|
| **Rápido + EconRAM** | só o `resize-to=2048` age (fotos menores → ortho mais grosseiro). `pc-quality` **não faz nada** (não há nuvem densa no Rápido). |
| **DSM+orto + EconRAM** | DSM, ortho e nuvem densa **mais grosseiros**, bem mais leves. |
| **Completo + EconRAM** | o "**completo leve**": tudo, com menos detalhe — alivia a texturização que estoura a RAM. |

> ⚠️ `resize-to=2048` **reduz a resolução de TODOS os produtos finais** (inclusive o ortomosaico), pois encolhe as imagens de entrada. Marque só em **conjuntos grandes** que estouram a memória.

### Qual usar
- **🟢 Rápido** → você só quer o **mapa 2D** (NDVI/índices, contagem, medir área, inspeção) e o terreno é **plano**. Mais rápido e leve. **Na dúvida, comece aqui.**
- **🟡 DSM + ortomosaico (sem 3D)** → precisa de **DSM/altimetria e nuvem densa**, mas **não** do modelo 3D — e quer **evitar o estouro de RAM** da texturização. Ideal p/ máquinas de ~16 GB.
- **🔴 Completo** → precisa do **modelo 3D texturizado** (além de DSM + nuvem densa), ou quer o ortho mais limpo em **relevo**. O mais pesado (garanta RAM/swap).

**Nº de fotos:** de dezenas a centenas. Mais fotos = mais **RAM e tempo** — especialmente nos modos densos (DSM+orto e Completo).

### Estourou a RAM (`Killed` / `Child returned 137`)?
A **texturização** roda em **todos os modos** (carrega muitas imagens ao mesmo tempo), então conjuntos grandes podem **morrer por falta de memória mesmo no Rápido**. No log: `Killed` / `Child returned 137`, e o ODM diz *"You ran out of memory"*. Saídas que **se somam** (em ordem):

- **1º — Mais memória ao NodeODM:** no **WSL**, RAM + `swap` (o swap faz a etapa pesada **terminar devagar** em vez de morrer, **sem perder qualidade**). No **Colima/Mac**, vale a **RAM real** do `--memory`. Veja **🧠 Memória e CPU** no guia de instalação.
- **2º — Trocar de modo:** se não precisa do 3D, **DSM + ortomosaico (sem 3D)** já pula a etapa mais pesada (`mvstex`); se nem de DSM precisa, o **Rápido** é o mais leve.
- **3º — Menos fotos por rodada:** divida a área em partes — ajuda todos os modos.
- **4º — "Economizar RAM"** (`resize-to=2048` + `pc-quality=low`): baixa a resolução de tudo; ajuda principalmente os modos densos.
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
