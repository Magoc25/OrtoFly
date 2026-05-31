# 🖥️ Processar no seu PC (Windows) — servidor NodeODM local

Guia para rodar o **NodeODM** (motor de fotogrametria do OpenDroneMap) no seu **Windows**, de graça,
e usá-lo na aba **⚙️ Processar** do OrtoFly para gerar **ortomosaico, DSM, nuvem de pontos e malha 3D**
a partir das suas fotos — tudo no seu computador, **sem nuvem**.

> 🧑‍💻 **Não tem familiaridade com terminal? Sem problema.** Cada passo diz exatamente o que digitar e onde.
> O "PowerShell" é o terminal do Windows: Menu Iniciar → digite **PowerShell** → Enter. Aí é só **colar** os comandos (clique direito cola) e dar Enter.

## ✅ O que você terá no final
- Um servidor **NodeODM** rodando no seu PC em `http://127.0.0.1:3000`.
- O OrtoFly conectado a ele (aba **Processar → 💻 PC Local**).

## 💻 Requisitos
- Windows 10 (versão 2004+) ou Windows 11.
- ~5–10 GB livres em disco (imagem do NodeODM + arquivos de processamento).
- Internet (só na 1ª vez, para baixar).

---

Existem **dois caminhos** — escolha **um**:

| Caminho | Para quem | Observação |
|---|---|---|
| **A — Docker Desktop** | a maioria | Mais simples (tem interface). `localhost` funciona sozinho. |
| **B — Docker no WSL** | quem não quer/poder instalar o Docker Desktop (ex.: pouco disco) | Mais leve, mas exige **ajustes de rede** (documentados aqui). Foi o caminho que validamos. |

---

## 🅰️ Caminho A — Docker Desktop (mais fácil)

1. **Baixe:** acesse **https://www.docker.com/products/docker-desktop/** → **Download for Windows**.
2. **Instale:** abra o instalador, deixe marcado **"Use WSL 2"**, clique **OK/Next** até o fim. **Reinicie** o PC se pedir.
3. **Abra o Docker Desktop** (Menu Iniciar → Docker Desktop). Aceite os termos. Espere o indicador (baleia 🐳, canto inferior) ficar **"Engine running"** (verde).
4. **Abra o PowerShell** e cole:
   ```powershell
   docker run -d --name nodeodm --restart unless-stopped -p 3000:3000 opendronemap/nodeodm
   ```
   *(baixa a imagem ~1,5 GB na 1ª vez e já sobe o NodeODM)*
5. **Confira:** abra no navegador **http://127.0.0.1:3000/info** — deve aparecer um texto JSON com `"version"`. ✅

➡️ Vá para **▶ Configurar no app**. *(Com Docker Desktop, o localhost funciona direto — sem ajustes de rede.)*

---

## 🅱️ Caminho B — Docker no WSL (leve, sem Docker Desktop)

### B.1 — Instalar o WSL + Ubuntu (pule se já tiver)
1. Abra o **PowerShell como Administrador** (Menu Iniciar → PowerShell → clique direito → **Executar como administrador**).
2. Cole e Enter:
   ```powershell
   wsl --install -d Ubuntu
   ```
3. **Reinicie** o PC. Ao reabrir, uma janela do Ubuntu pede para **criar um usuário e senha** do Linux (anote a senha).

> Já usa o WSL/Ubuntu? Vá direto ao B.2.

### B.2 — Instalar o Docker dentro do Ubuntu
No **PowerShell** (normal), cole:
```powershell
wsl -d Ubuntu -u root bash -c "apt-get update -y && apt-get install -y docker.io"
```

### B.3 — Ligar o systemd (Docker sobe sozinho e não "hiberna")
```powershell
wsl -d Ubuntu -u root bash -c "printf '[boot]\nsystemd=true\n' > /etc/wsl.conf"
wsl --shutdown
```
Aguarde ~10 segundos e então:
```powershell
wsl -d Ubuntu -u root bash -c "systemctl enable --now docker"
```

### B.4 — Ajuste de rede do WSL (IMPORTANTE)
Na configuração padrão, o Windows **não consegue alcançar** o servidor dentro do WSL (firewall do Hyper-V + IPv6). Cole no PowerShell:
```powershell
"[wsl2]`nnetworkingMode=mirrored`nfirewall=false" | Set-Content -Encoding ascii "$env:USERPROFILE\.wslconfig"
wsl --shutdown
```
Aguarde ~10 segundos.
> Isso ativa o modo de rede **"espelhado"** e desliga o **firewall do Hyper-V** — foi exatamente o que destravou na nossa máquina.

### B.5 — Subir o NodeODM
```powershell
wsl -d Ubuntu -u root bash -c "systemctl start docker; docker run -d --name nodeodm --restart unless-stopped -p 3000:3000 opendronemap/nodeodm"
```
*(baixa a imagem ~1,5 GB na 1ª vez)*

### B.6 — Confira
Abra no navegador **http://127.0.0.1:3000/info** → JSON com `"version"`. ✅

---

## ▶ Configurar no app (vale para os dois caminhos)
1. Abra o OrtoFly: **https://magoc25.github.io/OrtoFly/ortofly.html**
2. Aba **⚙️ Processar** → clique **💻 PC Local**.
3. A URL já vem **`http://127.0.0.1:3000`** → clique **Testar**.
4. Deve aparecer **✅ NodeODM vX.Y.Z · fila: 0 · engine: odm**.
5. **📷 Selecionar imagens** (fotos do drone) → **Nome** → deixe **☑ Rápido (fast-orthophoto)** → **🚀 Enviar e processar**.
6. Acompanhe o progresso; ao concluir, clique **🗺️ Ortomosaico (2D)** para abrir no visualizador georreferenciado.

---

## 🔧 Solução de problemas de rede (cada PC tem suas particularidades)
Se o **Testar** der **"Failed to fetch"** / não conectar:

1. **Use `127.0.0.1`, não `localhost`.** O `localhost` pode resolver para IPv6 (`::1`) e falhar; `127.0.0.1` é sempre IPv4. *(O app já usa `127.0.0.1` por padrão.)*
2. **O NodeODM está no ar?** Abra **http://127.0.0.1:3000/info** no navegador. Se **não** abrir:
   - **Caminho A:** confira o Docker Desktop em **"Engine running"**; no PowerShell, `docker ps` deve listar `nodeodm` (se não, `docker start nodeodm`).
   - **Caminho B:** `wsl -d Ubuntu -u root bash -c "systemctl start docker; docker start nodeodm; docker ps"`.
3. **Abre no navegador, mas o app não conecta?** É cache do app → recarregue com **Ctrl+Shift+R**.
4. **(Caminho B) "timeout":** quase sempre é o **firewall do Hyper-V**. Confirme o `.wslconfig` (passo B.4) com `networkingMode=mirrored` e `firewall=false`, depois `wsl --shutdown` e reabra.
5. **Funcionava e "sumiu":** o WSL hibernou. No Caminho B, garanta o **systemd** (passo B.3) e use o atalho abaixo para reerguer.

---

## 🔁 Reusar, parar e atalho de 1 clique
- **Depois de reiniciar o PC:**
  - **A:** abra o Docker Desktop (o NodeODM volta sozinho pela política `--restart`).
  - **B:** rode uma vez:
    ```powershell
    wsl -d Ubuntu -u root bash -c "systemctl start docker; docker start nodeodm"
    ```
- **Atalho (Caminho B):** crie um arquivo **`Iniciar-NodeODM.bat`** na Área de Trabalho com este conteúdo:
  ```bat
  @echo off
  wsl -d Ubuntu -u root bash -c "systemctl start docker 2>/dev/null; docker start nodeodm 2>/dev/null; docker ps --format '{{.Names}} {{.Status}}'"
  pause
  ```
  Duplo-clique sempre que quiser ligar o NodeODM.
- **Parar:** `docker stop nodeodm` (A) ou `wsl -d Ubuntu -u root docker stop nodeodm` (B).

---

## 📝 Notas
- A imagem `opendronemap/nodeodm` é **multiarquitetura** (Intel/AMD e ARM).
- Tudo roda **localmente** — suas fotos **não** vão para servidores externos.
- Datasets grandes (centenas de fotos) pedem mais RAM/tempo; comece com **algumas dezenas** + **Rápido**.

*Validado em Windows 11 + WSL2 (Ubuntu 22.04) + Docker Engine. © MGC Dev.*
