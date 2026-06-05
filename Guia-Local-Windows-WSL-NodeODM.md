# 🖥️ Processar no seu PC (Windows) — servidor NodeODM local

Guia para rodar o **NodeODM** (motor de fotogrametria do OpenDroneMap) no seu **Windows**, de graça,
e usá-lo na aba **⚙️ Processar** do OrtoFly para gerar **ortomosaico, DSM, nuvem de pontos e malha 3D**
a partir das suas fotos — tudo no seu computador, **sem nuvem**.

> 🧑‍💻 **Não tem familiaridade com terminal? Sem problema.** Cada passo diz exatamente o que digitar e onde.
> O "PowerShell" é o terminal do Windows: Menu Iniciar → digite **PowerShell** → Enter. Aí é só **colar** os comandos (clique direito cola) e dar Enter.

## ✅ O que você terá no final
- Um servidor **NodeODM** rodando no seu PC em `http://127.0.0.1:3000`.
- O OrtoFly conectado a ele (aba **Processar → 💻 PC Local**).

## 💻 Requisitos (hardware)
- Windows 10 (versão 2004+) ou Windows 11.
- **Disco livre:** o ODM usa **muito** espaço de rascunho — planeje **5–10× o tamanho do conjunto de fotos** livre. Para **DSM / modo completo**, conte com **dezenas de GB** (ex.: **50 GB+**). Veja **🧹 Limpeza de disco** mais abaixo (essencial!).
- **RAM:** mínimo prático **8 GB** (poucas dezenas de fotos + **Rápido**); **16 GB** confortável; **32 GB+** para **DSM/modo completo** e datasets grandes.
- **CPU:** 4+ núcleos (mais = mais rápido).
- Internet só na 1ª vez (baixa a imagem ~3 GB).

> ℹ️ ODM é **faminto por disco e RAM**. Falha em **modo completo (DSM)** quase sempre é **disco cheio** ou **RAM insuficiente** — veja **Memória e CPU** e **Limpeza de disco** abaixo.

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

## ▶ Usar no app (vale para os dois caminhos)
1. Abra o OrtoFly: **https://magoc25.github.io/OrtoFly/ortofly.html**
2. Aba **⚙️ Processar** → **💻 PC Local**. A URL já vem **`http://127.0.0.1:3000`**.
3. O app mostra um **indicador 🟢/🔴 ao vivo**: **verde** = NodeODM conectado · **vermelho** = desligado (atualiza sozinho a cada ~10s). Com o NodeODM ligado (atalho abaixo), fica **🟢**.
4. **📷 Selecionar imagens** (fotos do drone) → **Nome** → marque **Gerar DSM** se quiser o modelo de superfície → **🚀 Enviar e processar**.
5. Ao concluir, abra os produtos: **🗺️ Ortomosaico (2D)**, **⛰️ DSM (2D)**, **🧊 Nuvem (3D)** (abre o `.laz` direto em 3D, no navegador) ou **⬇ Tudo (.zip)**.

> 🔌 **Ligar/desligar o NodeODM é pelos atalhos** (abaixo). Por ser uma página de navegador, o app **não pode** ligar/desligar o servidor (segurança do navegador) — mas o **indicador 🟢/🔴** mostra o estado o tempo todo.

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

## 🔌 Ligar e desligar — 2 atalhos (Caminho B)
O **Iniciar** sobe o NodeODM e o mantém ligado **em segundo plano** (sem precisar deixar janela aberta); o **Desligar** para e libera a memória. Crie 2 arquivos na Área de Trabalho:

**`Iniciar-NodeODM.bat`** — liga e deixa rodando em 2º plano:
```bat
@echo off
title Iniciar NodeODM (OrtoFly)
wsl -d Ubuntu -u root bash -c "systemctl start docker 2>/dev/null; docker start nodeodm 2>/dev/null"
REM keep-alive OCULTO: segura o WSL acordado em 2o plano (senao ele hiberna e derruba o NodeODM)
powershell -NoProfile -Command "Start-Process wsl -ArgumentList '-d','Ubuntu','-u','root','-e','sleep','infinity' -WindowStyle Hidden"
echo Aguardando o NodeODM ficar pronto (~10-20s)...
:wait
curl -s -o nul -m 3 http://127.0.0.1:3000/info && goto ready
timeout /t 2 /nobreak >nul & goto wait
:ready
echo NodeODM PRONTO em http://127.0.0.1:3000 (em 2o plano - pode fechar esta janela)
timeout /t 6 /nobreak >nul
```

**`Desligar-NodeODM.bat`** — desliga na hora e **libera a memória**:
```bat
@echo off
echo Desligando o NodeODM e liberando a memoria...
wsl --shutdown
echo NodeODM desligado.
timeout /t 3 /nobreak >nul
```

- **Como usar:** duplo-clique no **Iniciar** → espere **"PRONTO"** → **pode fechar a janela** (o NodeODM segue ligado em 2º plano). Terminou de usar? Rode o **Desligar** → memória liberada.
- ⚠️ **Por que o keep-alive oculto?** O WSL **hiberna sozinho** quando fica ocioso (~1 min) e derruba o NodeODM (causa de "desconectado" / "Failed to fetch"). O `sleep infinity` oculto segura o WSL acordado até você Desligar.
- **Caminho A (Docker Desktop):** não precisa desses atalhos — abra/feche o **Docker Desktop**; o NodeODM volta sozinho pela política `--restart`. Para parar: `docker stop nodeodm`.

---

## 🧠 Memória e CPU do WSL (para datasets maiores)
Por padrão o WSL usa **~50% da RAM** do PC e **todos os núcleos**. Se o ODM ficar lento ou **falhar por falta de memória**, ajuste o `%USERPROFILE%\.wslconfig` (junte com as linhas de rede que você já criou no passo B.4):
```ini
[wsl2]
networkingMode=mirrored
firewall=false
memory=24GB
processors=8
swap=8GB
```
Depois `wsl --shutdown` e reabra. Confira em `http://127.0.0.1:3000/info` (o `totalMemory` deve subir).
> Regra de bolso: dê ao WSL no máximo ~**⅔ a ¾** da RAM do PC (deixe folga para o Windows). Ex.: **16 GB → `memory=10GB`**; **32 GB → `memory=24GB`**.

---

## 🧹 Limpeza de disco (importante!)

O NodeODM guarda **todas as tarefas** (fotos + resultados + intermediários) em disco **até você apagá-las**. Cada processamento — principalmente com **DSM (modo completo)** — pode ocupar **dezenas de GB**. Se não limpar, o disco enche e **novos processamentos falham** (falha de DSM quase sempre é **disco cheio**).

**No dia a dia, pelo app:**
- Ao concluir: **💾 Salvar no projeto** (guarda no app e apaga do servidor) ou **🗑️ Descartar** (apaga do servidor).
- Tarefa que **falhou/cancelou** **também ocupa disco** → use **🗑️ Descartar**.
- Aba **⚙️ Processar → 🧹 Limpar tudo do NodeODM**: remove de uma vez todas as tarefas que o app criou.

**⚠️ No Windows (WSL) há um detalhe:** apagar as tarefas libera o espaço **dentro** do disco virtual do WSL (`ext4.vhdx`), mas esse arquivo **não encolhe sozinho** — o **C:** só recupera o espaço depois de **compactar** o disco virtual.

### Recuperar o espaço no C: (de vez em quando)

> **No dia a dia, basta o app** (botões acima) — não precisa de script. Os passos abaixo são só **ocasionais**, para **devolver o espaço ao C:** (o app não consegue compactar o disco do WSL sozinho). O **passo 2 (compactar) é o essencial**; **pule o passo 1** se você já usou **🧹 Limpar tudo** no app.

1. **(Se ainda não limpou pelo app) Apague as tarefas do NodeODM** no PowerShell:
   ```powershell
   wsl -d Ubuntu -u root -- docker exec nodeodm sh -lc "rm -rf /var/www/data/*"
   wsl -d Ubuntu -u root -- docker restart nodeodm
   ```
2. **Compacte o disco virtual do WSL** (devolve o espaço ao C:). Crie **`compactar-wsl.bat`**, clique com o botão direito → **Executar como administrador**:
   ```bat
   @echo off
   wsl --shutdown
   timeout /t 5 /nobreak >nul
   for /f "delims=" %%P in ('powershell -NoProfile -Command "(Get-ChildItem $env:LOCALAPPDATA\Packages\CanonicalGroupLimited.Ubuntu*\LocalState\ext4.vhdx).FullName"') do set "VHDX=%%P"
   > "%TEMP%\c.txt" echo select vdisk file="%VHDX%"
   >> "%TEMP%\c.txt" echo attach vdisk readonly
   >> "%TEMP%\c.txt" echo compact vdisk
   >> "%TEMP%\c.txt" echo detach vdisk
   >> "%TEMP%\c.txt" echo exit
   diskpart /s "%TEMP%\c.txt"
   del "%TEMP%\c.txt"
   pause
   ```
   O NodeODM volta sozinho ao reabrir o WSL/Docker (política `--restart`).

> 💡 Ajuste `Ubuntu` / `nodeodm` se o nome do seu distro/contêiner for diferente (`wsl -l -v` e `docker ps`).

---

## 📝 Notas
- A imagem `opendronemap/nodeodm` é **multiarquitetura** (Intel/AMD e ARM).
- Tudo roda **localmente** — suas fotos **não** vão para servidores externos.
- Datasets grandes (centenas de fotos) pedem mais RAM/tempo; comece com **algumas dezenas** + **Rápido**.

*Validado em Windows 11 + WSL2 (Ubuntu 22.04) + Docker Engine. © MGC Dev.*
