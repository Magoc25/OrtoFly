# 🍎 Processar no seu Mac (macOS) — servidor NodeODM local

Guia para rodar o **NodeODM** (motor de fotogrametria do OpenDroneMap) no **macOS** e usá-lo na aba
**⚙️ Processar** do OrtoFly para gerar **ortomosaico, DSM, nuvem de pontos e malha 3D** — tudo no seu Mac, **de graça**.

> 🌐 **Use o Chrome ou o Edge** para abrir o OrtoFly. O **Safari não funciona** com o NodeODM local (ele bloqueia a conexão da página `https://` para o `http://127.0.0.1`, mesmo sendo no seu próprio Mac).

> ## 🧑‍💻 Nunca usou o Terminal? Leia esta caixa uma vez
>
> Quase todos os passos abaixo são **comandos para o Terminal** (o app de comandos do Mac). Não há arquivos para criar — é só colar e teclar Enter.
>
> - **Abrir o Terminal:** **Launchpad → Terminal**, ou **⌘ + Espaço** (Spotlight) → digite **`Terminal`** → Enter.
> - **Como colar:** copie o comando do guia → clique na janela do Terminal → tecle **⌘ + V** (colar) → tecle **Enter**.
> - **Quando pedir senha:** alguns comandos (Homebrew) pedem a **senha do seu Mac**. Ao digitar, o Terminal **não mostra nada** — nem pontinhos. É **normal**: digite a senha "às cegas" e tecle **Enter**.
> - ⚠️ **Fechar o Terminal NÃO desliga o NodeODM** — ele segue rodando em segundo plano (no Docker/Colima) até você mandar parar.
>
> 👉 Para não gerar dúvida, **cada passo abaixo repete** essas instruções.

## ✅ Resultado final
- NodeODM rodando em `http://127.0.0.1:3000`, conectado ao OrtoFly.

## 💻 Requisitos (hardware)
- macOS razoavelmente recente (Big Sur 11+).
- Saber se seu Mac é **Apple Silicon** (M1/M2/M3/M4) ou **Intel** —  menu  → **Sobre Este Mac**.
- **Disco livre:** o ODM usa **muito** rascunho — planeje **5–10× o tamanho do conjunto de fotos**; para **DSM/modo completo**, **dezenas de GB** (ex.: **50 GB+**). Veja **🧹 Limpeza de disco** abaixo.
- **RAM:** mínimo prático **8 GB** (poucas dezenas de fotos + **Rápido**); **16 GB** confortável; **32 GB+** para **DSM/modo completo**. *(No Colima/Docker Desktop você ainda escolhe quanto disso entregar — veja "Dar mais memória".)*

> ℹ️ Falha em **modo completo (DSM)** quase sempre é **disco cheio** ou **RAM insuficiente**.

---

## 🤔 Docker Desktop ou Colima? (escolha um)

Os dois rodam o NodeODM **igualmente bem** — a diferença é *como* você lida com eles:

| | 🐳 **Docker Desktop** | 🐧 **Colima** |
|---|---|---|
| **Como é** | App com **interface gráfica** (ícone na barra de menu; painéis de containers, logs) | Só **linha de comando** (Terminal), open-source |
| **Instalação** | Baixar `.dmg` e arrastar — **sem terminal** | Precisa do **Homebrew** antes; tudo por comando |
| **Memória/CPU p/ o ODM** | Ajusta por janelas (*Settings → Resources*) | **Você define no comando** (`--cpu`/`--memory`) — controle fino, ótimo p/ fotogrametria |
| **Consumo em repouso** | Maior (~300–500 MB) | Menor (~100–200 MB) |
| **Ao reiniciar o Mac** | Volta **sozinho** (se configurado p/ abrir com o Mac) | Você roda **`colima start`** antes de usar |
| **Licença/custo** | Grátis p/ uso pessoal; **pago p/ empresas grandes** (>250 funcionários ou >US$ 10M) | **100% grátis** e aberto, sem restrição comercial |

**Em uma linha:**
- Quer o **caminho mais simples**, sem terminal, e usa Docker p/ outras coisas → **Docker Desktop**.
- Quer **leveza**, **controle de RAM/CPU** p/ o processamento, ou está numa **empresa** (risco de licença) → **Colima**.

Agora siga **a opção que você escolheu**:

## 1️⃣ Opção 1 — Docker Desktop (mais fácil)
1. Acesse **https://www.docker.com/products/docker-desktop/** → **Download for Mac** → escolha **Apple Silicon** ou **Intel** conforme seu Mac.
2. Abra o `.dmg` e **arraste o Docker** para a pasta **Aplicativos**.
3. Abra o **Docker** (Launchpad → Docker). Autorize na 1ª vez (pode pedir sua senha). Espere a baleia 🐳 na barra de menu ficar **"running"**.
4. **Suba o NodeODM:**

   🟢 **Abra o Terminal** — *Launchpad → Terminal* (ou *⌘+Espaço → "Terminal"*). **Cole** o comando abaixo (**⌘+V**) e tecle **Enter**:
   ```bash
   docker run -d --name nodeodm --restart unless-stopped -p 3000:3000 opendronemap/nodeodm
   ```
   *(baixa a imagem ~1,5 GB na 1ª vez e sobe o NodeODM)*
5. **Confira:** abra **http://127.0.0.1:3000/info** no navegador → JSON com `"version"`. ✅

## 2️⃣ Opção 2 — Colima (leve, grátis)

1. **Instale o Homebrew** (gerenciador de pacotes do Mac), se ainda não tiver.

   🟢 **No Terminal** — *Launchpad → Terminal*. **Cole** (**⌘+V**) e tecle **Enter**:
   ```bash
   /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
   ```
   > Ele vai **pedir a senha do seu Mac** — digite "às cegas" (não aparece nada) e Enter. Ao final, pode mostrar **2 comandos** para adicionar o `brew` ao PATH: **copie e cole cada um** no Terminal e Enter.
2. **Instale o Colima + o cliente Docker.**

   🟢 **No Terminal** — **cole** e tecle **Enter**:
   ```bash
   brew install colima docker
   ```
3. **Inicie o Colima** (a "máquina" que roda os containers).

   🟢 **No Terminal** — **cole** e tecle **Enter**:
   ```bash
   colima start
   ```
4. **Suba o NodeODM.**

   🟢 **No Terminal** — **cole** e tecle **Enter**:
   ```bash
   docker run -d --name nodeodm --restart unless-stopped -p 3000:3000 opendronemap/nodeodm
   ```
5. **Confira:** **http://127.0.0.1:3000/info** no navegador → JSON. ✅

---

## ▶ Configurar no app
1. Abra o OrtoFly **no Chrome ou Edge** (não no Safari): **https://magoc25.github.io/OrtoFly/ortofly.html**
2. Aba **⚙️ Processar** → **💻 PC Local** → URL **`http://127.0.0.1:3000`** → **Testar**.
3. 🔔 **O Chrome vai perguntar se o site pode acessar a sua rede local** → clique em **Permitir**. *(É a permissão para a página falar com o NodeODM no `127.0.0.1`. Se clicar em Bloquear, não conecta — veja como reverter na Solução de problemas.)*
4. **✅ NodeODM vX.Y.Z** → **📷 Selecionar imagens** → **Nome** → deixe **☑ Rápido** → **🚀 Enviar e processar**.
5. Ao concluir, **🗺️ Ortomosaico (2D)** abre no visualizador georreferenciado.

---

## 🔧 Solução de problemas
- **Estou no Safari e não conecta:** o Safari **bloqueia** a conexão `https://` → `http://127.0.0.1` (mesmo sendo local) e **não tem como liberar**. **Use o Chrome ou o Edge.**
- **"Failed to fetch" / não conecta (Chrome/Edge):**
  1. Confirme o Docker rodando: 🟢 no Terminal, **cole** `docker ps` e Enter — deve listar **nodeodm**. Se não: `docker start nodeodm` (no Colima, antes: `colima start`).
  2. Abra **http://127.0.0.1:3000/info** no navegador. **Apareceu o JSON?** Então o servidor está ok e o problema é a **permissão de rede local** (próximo item).
  3. Use `127.0.0.1` (o app já usa por padrão) e recarregue com **⌘+Shift+R**.
- **"Permission was denied... loopback address space" (Chrome/Edge):** você clicou em **Bloquear** no aviso de acesso à rede local. Para reverter:
  1. Abra `chrome://settings/content/all` (no Edge: `edge://settings/content/all`).
  2. Busque **`github.io`**, clique no item e **apague-o** (ícone de lixeira) — isso zera a permissão.
  3. Volte ao OrtoFly, recarregue com **⌘+Shift+R** e clique em **Testar**. Quando o Chrome perguntar sobre a **rede local**, clique em **Permitir**. ✅
  > 💡 Esse aviso de "rede local" é um recurso novo do Chrome/Edge, liberado aos poucos. Por isso pode aparecer num computador e não em outro, mesmo com a mesma URL.
- **Apple Silicon (M1/M2/M3...):** a imagem `opendronemap/nodeodm` tem versão **ARM nativa** — roda direto. Se algum dia reclamar de arquitetura, force `--platform linux/amd64` (emulação, mais lenta).

## 🔁 Dia a dia — ligar, desligar e conferir
> ⚠️ **Fechar o Terminal NÃO para o NodeODM.** Ele roda em segundo plano (dentro do Docker/Colima) até você mandar parar — o Terminal é só onde você digita os comandos.

Todos os comandos desta tabela rodam 🟢 **no Terminal** (cole com **⌘+V** e tecle **Enter**):

| Ação | Comando |
|---|---|
| **Conferir se está no ar** | `docker ps` — tem que listar **nodeodm** com status `Up` (ou abra `http://127.0.0.1:3000/info`) |
| **Parar só o NodeODM** (Colima continua ligado) | `docker stop nodeodm` |
| **Iniciar de novo** | `docker start nodeodm` |
| **Desligar tudo** (libera RAM/CPU) | `docker stop nodeodm` e depois `colima stop` |

- **Depois de reiniciar o Mac:** 🟢 no Terminal, rode `colima start` — o NodeODM **volta sozinho** (foi criado com `--restart unless-stopped`). Se não voltar: `docker start nodeodm`.
- **Não precisa recriar nada:** o container `nodeodm` já existe; o `docker run` da instalação é **só na primeira vez**. No dia a dia é só ligar/desligar.

## 🧠 Dar mais memória/CPU ao NodeODM — para muitas fotos
**Colima** sobe com **2 CPU / 2 GB de RAM** por padrão, o que limita o ODM (com muitas fotos fica lento ou **falha**). Para aumentar é preciso **parar e subir de novo**.

🟢 **No Terminal** — **cole** o primeiro comando e **Enter**:
```bash
colima stop
```
Em seguida **cole** este e **Enter** (ajuste os números pela RAM do seu Mac — veja a tabela):
```bash
colima start --cpu 6 --memory 16
```
- Use no máximo ~**metade a ⅔ da RAM** do Mac: **32 GB → `--memory 16`**, **16 GB → `--memory 8`**, **8 GB → `--memory 4`**. Não dê tudo, senão o macOS engasga.
- A configuração **fica salva** (os próximos `colima start` já usam). Confira em **http://127.0.0.1:3000/info** — `totalMemory`/`totalCores`.

> ⚠️ **Diferença importante vs. Windows/WSL:** no WSL dá pra configurar um **swap** grande (memória virtual em disco) que segura o ODM nos picos — o processamento **termina devagar** em vez de falhar. O **Colima não expõe** esse swap: aqui vale a **RAM real** do `--memory`. Por isso, em Mac com pouca RAM, dê o máximo que puder e — para **conjuntos grandes no modo completo (DSM)** — marque **Economizar RAM** no app (envia `pc-quality=low`, derruba o pico de memória na texturização). Veja o guia de **Boas práticas**.

**Docker Desktop:** não usa Terminal — ajuste em **⚙️ Settings → Resources** → barras de **CPU / Memory** (e **Virtual disk limit**) → **Apply & restart**.

## 🧹 Limpeza de disco (importante!)
O NodeODM guarda **todas as tarefas** (fotos + intermediários + resultados) até você apagá-las. Cada processamento — em especial **DSM/modo completo** — pode ocupar **dezenas de GB**. Sem limpar, o disco enche e **novos processamentos falham**.

**No dia a dia, pelo app** (igual ao Windows): **💾 Salvar** ou **🗑️ Descartar** cada tarefa; tarefa que **falhou também ocupa disco**; aba **⚙️ Processar → 🧹 Limpar tudo do NodeODM** remove todas de uma vez.

**Recuperar o espaço no Mac** (de vez em quando):

**Passo 1 — Apague as tarefas** (pelo app em *Limpar tudo*, ou no Terminal).

🟢 **No Terminal** — **cole** cada linha e tecle **Enter** (uma de cada vez):
```bash
docker exec nodeodm sh -lc "rm -rf /var/www/data/*"
docker restart nodeodm
docker system prune -f
```

**Passo 2 — Devolver o espaço do disco virtual do Docker** (ele não encolhe sozinho):
- **Docker Desktop:** ícone 🐞 **Troubleshoot → Clean / Purge data** (ou **Settings → Resources** → reduza o **Virtual disk limit**). Versões recentes também recuperam sozinhas com o tempo.
- **Colima:** limpeza total da VM. 🟢 No Terminal, **cole** uma linha de cada vez e Enter:
  ```bash
  colima stop
  colima delete
  colima start
  docker run -d --name nodeodm --restart unless-stopped -p 3000:3000 opendronemap/nodeodm
  ```
  *(você já salva os produtos no app, então não perde resultados)*

---

## 📝 Notas
- Tudo roda **no seu Mac** — as fotos **não** vão para servidores externos.
- Comece com **algumas dezenas** de fotos + opção **Rápido (fast-orthophoto)**.

*Guia para macOS (Docker Desktop ou Colima). A configuração do app (URL `127.0.0.1:3000`) é idêntica à do Windows. © MGC Dev.*
