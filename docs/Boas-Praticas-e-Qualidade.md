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

## 3. Processamento (aba ⚙️ Processar / NodeODM)
- **Rápido (fast-orthophoto):** ortomosaico **rápido**, mas **nuvem esparsa** (com buracos). Ótimo para um 1º resultado.
- **Completo (desmarque o Rápido):** faz a **reconstrução densa** → nuvem/DSM **muito melhores** (mais lento).
- **Gerar DSM:** marque para obter o **modelo de superfície** (o ODM não gera por padrão).
- **Nº de fotos:** dezenas a centenas. Mais fotos = mais **RAM e tempo**.

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

**Quando preferir um software pago:** trabalhos que exigem **precisão certificada, suporte, relatórios e fluxos avançados de GCP/RTK** (engenharia, cadastro legal, aerolevantamento profissional). Para **educação, agricultura, inspeção, pequenas operações e quem preza privacidade/orçamento**, o OrtoFly + ODM cobre muito bem.

## ❓ "Qual a confiabilidade dos produtos gerados (NodeODM)?"

O NodeODM é só a **API** do **OpenDroneMap** — usado mundialmente em **pesquisa, agricultura, mapeamento humanitário** (OpenAerialMap, HOT) e ensino. É **confiável** dentro dos limites da fotogrametria:

- **Precisão relativa** (medidas internas, áreas, volumes) costuma ser **boa**.
- **Precisão absoluta** (posição no mundo) é **limitada pelo GPS do drone** — tipicamente **metros** sem apoio. Com **GCPs** ou **RTK/PPK**, chega a **centímetros**.
- **Qualidade = qualidade da entrada:** sobreposição, luz, textura e nº de fotos mandam no resultado.

**Recomendação:** para **visualização, agro, inspeção e estudo**, use à vontade. Para **topografia/cadastro com valor legal**, use **GCPs/RTK** e **valide** os produtos (checar pontos conhecidos).

---

*Guia de apoio — OrtoFly · © MGC Dev.*
