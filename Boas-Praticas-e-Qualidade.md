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
- **Posição no mapa (horizontal)** e **resolução (GSD):** **iguais** nos três modos — mesmas fotos, mesmo GPS/GCP, mesma resolução de ortho (a que você escolher em **Resolução do ortomosaico**, abaixo). O Rápido **não** deixa o mapa mais torto nem o ortho mais "borrado".
- **Fidelidade geométrica (ortorretificação):** aí **sim** muda. O ortho do Rápido é projetado sobre uma superfície **grosseira** (da nuvem **esparsa**):
  - **Terreno plano** (lavoura, campo): diferença **mínima** — o ortho do Rápido já serve.
  - **Relevo / objetos altos** (prédios, árvores, barrancos): o Rápido mostra **distorção/arrasto** nas bordas; **DSM+orto** e **Completo** projetam sobre a superfície **densa** → ortho **mais limpo e reto**.
- **Resumo:** a "queda" do Rápido é **geométrica e só aparece onde há altura**. Em área plana, o ortho é praticamente o mesmo.

> 💡 **Regra prática:** **área plana + você só quer o ortomosaico** → use o **🟢 Rápido**. Ele entrega o ortho com **praticamente a mesma qualidade** dos modos densos, porém **mais rápido e mais leve**. Reserve **DSM+orto** ou **Completo** para quando precisar de **DSM/altimetria, nuvem densa ou modelo 3D**, ou quando o terreno tem **relevo/estruturas altas** (aí o ortho denso fica mais limpo).

### Resolução do ortomosaico — o app pede a das suas fotos (desde a v1.25.0)
O ODM gera o ortomosaico a **5 cm/px** se ninguém pedir outra coisa — mesmo que as fotos tenham 2 cm/px. Até a v1.24.1 o app não pedia nada, e um voo de **1,78 cm/px** saía a **5 cm/px**: cerca de **1/8 dos pixels** que as fotos sustentam.

Agora, ao escolher as imagens, o app **lê a altura de voo gravada nas próprias fotos** (e a câmera, da EXIF), mostra o **GSD estimado** e pede essa resolução ao ODM:

| Opção | O que pede | Quando usar |
|---|---|---|
| **Nativa das fotos (GSD)** — padrão | o GSD lido das fotos | quase sempre: é o detalhe que você voou para ter |
| **Equilibrada (2× o GSD)** | o dobro do GSD (¼ dos pixels) | área grande, máquina modesta, ou mapa de visão geral |
| **Leve — 5 cm/px** | nada (fica o padrão do ODM) | só conferir a cobertura do voo |

- **O preço é o tamanho:** os pixels crescem com o quadrado. Medido com 34 fotos de um Air 2S a 60 m: **3159 × 3638 px (34 MB)** a 5 cm → **8875 × 10268 px (209 MB)** a 1,78 cm. O app mostra essa conta antes de enviar.
- **Não dá para "inventar" resolução:** o ODM limita o que foi pedido ao GSD que ele mesmo estima na reconstrução. Pedir mais fino que as fotos não melhora nada.
- **O DSM sai a 2× a resolução do ortomosaico** (nos modos com DSM): na resolução das fotos ele seria ruído e quadruplicaria o arquivo.
- **Sem a altura nas fotos** (fotos que não são DJI, ou editadas), o app avisa, pede 1 cm/px e deixa o ODM limitar.
- No **visualizador do app**, um ortomosaico grande pode abrir a ½ da resolução, com aviso e botão de resolução cheia — o **arquivo** baixado está sempre inteiro.

### Corrigir obturador de rolagem — para voo contínuo (desde a v1.25.0)
Quase todo drone lê o sensor **linha a linha** (obturador eletrônico). Se a foto é tirada com o drone **andando**, a imagem sai levemente distorcida. Sem correção, o ODM "absorve" essa distorção numa **calibração de câmera irreal**.

- **Medido** (mesmas 34 fotos, voo contínuo a ~6,4 m/s, Air 2S): com a correção, o **erro de reprojeção cai de 1,35 para 1,02 px**, o centro óptico calibrado deixa de ficar **107 px** fora do lugar (passa a 31 px) e beirais de telhado saem retos.
- **O app sugere sozinho:** pela distância e pelo intervalo entre fotos vizinhas ele estima a velocidade; acima de ~2 m/s a opção já vem **marcada**. Você pode mudar.
- **Não use** com câmera de **obturador mecânico** (ex.: Phantom 4 Pro/RTK, Mavic 3E) nem em missão que **para em cada foto** (o KMZ exportado por este app para em cada ponto).

### O que o processamento NÃO resolve: a borda do levantamento
- **A borda sai deformada** quando a área de interesse encosta no limite das fotos: ali cada ponto do terreno aparece em poucas fotos, todas de um lado só. No mesmo voo de teste, um prédio que ficou **fora da grade de voo** saiu com os painéis solares rasgados — e um programa comercial, com as mesmas fotos, deixou **buracos** no mesmo lugar. Nenhuma opção de processamento corrige isso. **Voe uma faixa além da área que você quer.**
- **Ortomosaico não é "ortofoto verdadeira":** fachadas e beirais de objetos altos podem aparecer levemente inclinados, mesmo nos modos densos.

### Economizar RAM (`feature-quality=medium` + `pc-quality=low` + menos threads) — soma a qualquer modo
Reduz o **pico de memória**, trocando **precisão e detalhe por leveza**:

| O que envia | Efeito |
|---|---|
| `feature-quality=medium` | o alinhamento usa as fotos a ¼ do tamanho (o padrão usa ½): menos memória, alinhamento um pouco menos preciso. Vale em **todos** os modos. |
| `pc-quality=low` | nuvem densa e DSM com menos detalhe. Só nos modos **com DSM** (no Rápido não há nuvem densa). |
| `max-concurrency` = metade dos núcleos | menos tarefas em paralelo — o ODM usa cerca de 1 GB de pico por thread. Fica **mais lento**. |

> ℹ️ **A resolução do ortomosaico não muda** com esta opção — ela é escolhida à parte (acima). _Até a v1.24.1 esta opção enviava `resize-to=2048`, que o ODM atual **não tem** e descartava em silêncio: no modo Rápido ela não fazia nada._ Marque só em **conjuntos grandes** que estouram a memória.

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
- **4º — "Economizar RAM"** (alinhamento com fotos menores, nuvem em baixa, menos threads): reduz o pico de memória em todos os modos; o ortomosaico mantém a resolução.
- **5º — Resolução "Equilibrada (2× o GSD)":** ¼ dos pixels no ortomosaico alivia a etapa final e o disco.
- **Último caso:** rode num **NodeODM na nuvem** (modo Servidor) — sem o limite da sua máquina.

## 4. "Buracos" na nuvem são normais
A reconstrução depende de a **mesma textura** aparecer em várias fotos. Buracos vêm de: **modo Rápido**, **água/superfícies lisas**, **sombras**, **bordas** (menos sobreposição) e **objetos em movimento**. Para encher: **modo Completo + mais sobreposição + boa luz**.

## 5. Visualização
- **Ortomosaicos grandes abrem normalmente** (desde a v1.20.0). O ODM grava o ortomosaico com **níveis de resolução prontos** dentro do arquivo, e o app carrega o maior nível que cabe na memória do navegador — só os blocos daquele nível, nunca o arquivo inteiro. Quando entra reduzido, ele **avisa na tela** o fator e o GSD resultante.
  ⚠️ **Isso importa na hora de medir:** a estatística por pontos, os índices de vegetação e o ajuste por GCP são calculados sobre o raster **como foi carregado**. Posição e área continuam corretas (o georreferenciamento vem do arquivo original); o que muda é o detalhe fino. Precisa do GSD original? **Recorte a área de interesse no QGIS** e abra o recorte no app — um pedaço pequeno cabe em resolução cheia.
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
