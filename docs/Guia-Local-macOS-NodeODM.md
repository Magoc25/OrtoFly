# 🍎 Processar no seu Mac (macOS) — servidor NodeODM local

Guia para rodar o **NodeODM** (motor de fotogrametria do OpenDroneMap) no **macOS** e usá-lo na aba
**⚙️ Processar** do OrtoFly para gerar **ortomosaico, DSM, nuvem de pontos e malha 3D** — tudo no seu Mac, **de graça**.

> 🌐 **Use o Chrome ou o Edge** para abrir o OrtoFly. O **Safari não funciona** com o NodeODM local (ele bloqueia a conexão da página `https://` para o `http://127.0.0.1`, mesmo sendo no seu próprio Mac).
> 🧑‍💻 O "Terminal" é o app de comandos do Mac: **Launchpad → Terminal** (ou Spotlight **⌘+Espaço** → digite "Terminal"). Cole os comandos e dê Enter.

## ✅ Resultado final
- NodeODM rodando em `http://127.0.0.1:3000`, conectado ao OrtoFly.

## 💻 Requisitos
- macOS razoavelmente recente (Big Sur 11+).
- Saber se seu Mac é **Apple Silicon** (M1/M2/M3/M4) ou **Intel** —  menu  → **Sobre Este Mac**.
- ~5–10 GB livres em disco.

---

Escolha **um** jeito de instalar o Docker:

| Opção | Para quem |
|---|---|
| **1 — Docker Desktop** | mais fácil (app com interface gráfica) |
| **2 — Colima** | leve, 100% grátis/aberto, via Terminal |

## 1️⃣ Opção 1 — Docker Desktop (mais fácil)
1. Acesse **https://www.docker.com/products/docker-desktop/** → **Download for Mac** → escolha **Apple Silicon** ou **Intel** conforme seu Mac.
2. Abra o `.dmg` e **arraste o Docker** para a pasta **Aplicativos**.
3. Abra o **Docker** (Launchpad → Docker). Autorize na 1ª vez (pode pedir sua senha). Espere a baleia 🐳 na barra de menu ficar **"running"**.
4. Abra o **Terminal** e cole:
   ```bash
   docker run -d --name nodeodm --restart unless-stopped -p 3000:3000 opendronemap/nodeodm
   ```
   *(baixa a imagem ~1,5 GB na 1ª vez e sobe o NodeODM)*
5. **Confira:** abra **http://127.0.0.1:3000/info** no navegador → JSON com `"version"`. ✅

## 2️⃣ Opção 2 — Colima (leve, grátis)
1. Instale o **Homebrew** (gerenciador de pacotes do Mac), se ainda não tiver — cole no Terminal:
   ```bash
   /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
   ```
   *(siga as instruções; ao final ele pode pedir 2 comandos para adicionar o `brew` ao PATH — copie e cole)*
2. Instale o Colima + o cliente Docker:
   ```bash
   brew install colima docker
   ```
3. Inicie o Colima (a "máquina" que roda os containers):
   ```bash
   colima start
   ```
4. Suba o NodeODM:
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
  1. Confirme o Docker rodando: `docker ps` no Terminal deve listar **nodeodm**. Se não: `docker start nodeodm` (no Colima, antes: `colima start`).
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

| Ação | Comando |
|---|---|
| **Conferir se está no ar** | `docker ps` — tem que listar **nodeodm** com status `Up` (ou abra `http://127.0.0.1:3000/info`) |
| **Parar só o NodeODM** (Colima continua ligado) | `docker stop nodeodm` |
| **Iniciar de novo** | `docker start nodeodm` |
| **Desligar tudo** (libera RAM/CPU) | `docker stop nodeodm` e depois `colima stop` |

- **Depois de reiniciar o Mac:** rode `colima start` — o NodeODM **volta sozinho** (foi criado com `--restart unless-stopped`). Se não voltar: `docker start nodeodm`.
- **Não precisa recriar nada:** o container `nodeodm` já existe; o `docker run` da instalação é **só na primeira vez**. No dia a dia é só ligar/desligar.

## 🧠 Dar mais memória ao NodeODM (Colima) — para muitas fotos
Por padrão o Colima sobe com **2 CPU / 2 GB de RAM**, o que limita o ODM (com muitas fotos fica lento ou falha). Para aumentar — **precisa parar e subir de novo** (não muda com a máquina ligada):
```bash
colima stop
colima start --cpu 6 --memory 8
```
- Use no máximo ~**metade a ⅔ da RAM** do Mac: **16 GB → `--memory 8`**, **8 GB → `--memory 4`**. Não dê tudo, senão o macOS engasga.
- A configuração **fica salva**: os próximos `colima start` já usam esses valores (não precisa repetir os flags).
- Confira em **http://127.0.0.1:3000/info** — o `totalMemory` deve subir.

## 📝 Notas
- Tudo roda **no seu Mac** — as fotos **não** vão para servidores externos.
- Comece com **algumas dezenas** de fotos + opção **Rápido (fast-orthophoto)**.

*Guia para macOS (Docker Desktop ou Colima). A configuração do app (URL `127.0.0.1:3000`) é idêntica à do Windows. © MGC Dev.*
