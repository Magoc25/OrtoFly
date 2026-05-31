# 🍎 Processar no seu Mac (macOS) — servidor NodeODM local

Guia para rodar o **NodeODM** (motor de fotogrametria do OpenDroneMap) no **macOS** e usá-lo na aba
**⚙️ Processar** do OrtoFly para gerar **ortomosaico, DSM, nuvem de pontos e malha 3D** — tudo no seu Mac, **de graça**.

> 🍏 **No macOS a rede é mais simples que no Windows:** o `localhost`/`127.0.0.1` funcionam direto, sem ajustes.
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
1. Abra o OrtoFly: **https://magoc25.github.io/OrtoFly/ortofly.html**
2. Aba **⚙️ Processar** → **💻 PC Local** → URL **`http://127.0.0.1:3000`** → **Testar**.
3. **✅ NodeODM vX.Y.Z** → **📷 Selecionar imagens** → **Nome** → deixe **☑ Rápido** → **🚀 Enviar e processar**.
4. Ao concluir, **🗺️ Ortomosaico (2D)** abre no visualizador georreferenciado.

---

## 🔧 Solução de problemas
- **"Failed to fetch" / não conecta:**
  1. Confirme o Docker rodando: `docker ps` no Terminal deve listar **nodeodm**. Se não: `docker start nodeodm` (no Colima, antes: `colima start`).
  2. Abra **http://127.0.0.1:3000/info** no navegador. Abriu? Então é **cache do app** → recarregue com **⌘+Shift+R**.
  3. Use `127.0.0.1` (o app já usa por padrão).
- **Apple Silicon (M1/M2/M3...):** a imagem `opendronemap/nodeodm` tem versão **ARM nativa** — roda direto. Se algum dia reclamar de arquitetura, force `--platform linux/amd64` (emulação, mais lenta).

## 🔁 Reusar / parar
- **Depois de reiniciar o Mac:** abra o Docker Desktop (ou rode `colima start`); o NodeODM volta sozinho (`--restart`). Se não, `docker start nodeodm`.
- **Parar:** `docker stop nodeodm` (e, no Colima, `colima stop` para desligar a máquina).

## 📝 Notas
- Tudo roda **no seu Mac** — as fotos **não** vão para servidores externos.
- Comece com **algumas dezenas** de fotos + opção **Rápido (fast-orthophoto)**.

*Guia para macOS (Docker Desktop ou Colima). A configuração do app (URL `127.0.0.1:3000`) é idêntica à do Windows. © MGC Dev.*
