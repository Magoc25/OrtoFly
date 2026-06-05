# 🖥️ Processar no seu PC (Windows) — servidor NodeODM local

Guia para rodar o **NodeODM** (motor de fotogrametria do OpenDroneMap) no seu **Windows**, de graça,
e usá-lo na aba **⚙️ Processar** do OrtoFly para gerar **ortomosaico, DSM, nuvem de pontos e malha 3D**
a partir das suas fotos — tudo no seu computador, **sem nuvem**.

> ## 🧑‍💻 Nunca usou terminal? Leia esta caixa uma vez
>
> Os passos com fundo cinza (código) são de **dois tipos**. O guia avisa em cada um qual é:
>
> **1) Comando para o PowerShell** 🟦/🟥 — você cola numa janela e tecla Enter.
> - **Qual terminal?** Sempre o **PowerShell** — **não** o "Prompt de Comando (CMD)".
> - **Abrir o PowerShell (normal):** **Menu Iniciar → digite `powershell` → clique em "Windows PowerShell"**.
> - **Abrir como Administrador:** **Menu Iniciar → digite `powershell` → clique com o BOTÃO DIREITO em "Windows PowerShell" → "Executar como administrador" → clique "Sim"**. *(A janela de Administrador mostra o título começando com "Administrador:".)*
> - **Como colar:** copie o comando do guia → clique dentro da janela do PowerShell → clique com o **botão direito** (isso já cola) → tecle **Enter**.
>
> **2) Arquivo de texto** 📄 — alguns passos (os `.bat` e o `.wslconfig`) **não são comandos**: são arquivos que você cria/edita no **Bloco de Notas**. O guia mostra o passo a passo certinho onde aparecem.
>
> 👉 Para não gerar dúvida, **cada passo abaixo repete** essas instruções.

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
4. **Suba o NodeODM:**

   🟦 **Abra o PowerShell (normal)** — *Menu Iniciar → digite `powershell` → clique em "Windows PowerShell"*. **Não** precisa ser Administrador. **Cole** o comando abaixo (clique com o **botão direito** dentro da janela = colar) e tecle **Enter**:
   ```powershell
   docker run -d --name nodeodm --restart unless-stopped -p 3000:3000 opendronemap/nodeodm
   ```
   *(baixa a imagem ~1,5 GB na 1ª vez e já sobe o NodeODM)*
5. **Confira:** abra no navegador **http://127.0.0.1:3000/info** — deve aparecer um texto JSON com `"version"`. ✅

➡️ Vá para **▶ Usar no app**. *(Com Docker Desktop, o localhost funciona direto — sem ajustes de rede.)*

---

## 🅱️ Caminho B — Docker no WSL (leve, sem Docker Desktop)

### B.1 — Instalar o WSL + Ubuntu (pule se já tiver)

🟥 **Abra o PowerShell como Administrador** — *Menu Iniciar → digite `powershell` → clique com o **botão direito** em "Windows PowerShell" → "Executar como administrador" → clique "Sim"*. **Cole** o comando (botão direito = colar) e tecle **Enter**:
```powershell
wsl --install -d Ubuntu
```
Depois **reinicie o PC**. Ao reabrir, uma janela do Ubuntu pede para **criar um usuário e senha** do Linux (anote a senha).

> Já usa o WSL/Ubuntu? Vá direto ao B.2.

### B.2 — Instalar o Docker dentro do Ubuntu

🟦 **Abra o PowerShell (normal)** — *Menu Iniciar → `powershell` → "Windows PowerShell"* (não precisa Administrador). **Cole** e tecle **Enter**:
```powershell
wsl -d Ubuntu -u root bash -c "apt-get update -y && apt-get install -y docker.io"
```

### B.3 — Ligar o systemd (Docker sobe sozinho e não "hiberna")

🟦 **No PowerShell (normal)** — **cole** o primeiro comando e **Enter**:
```powershell
wsl -d Ubuntu -u root bash -c "printf '[boot]\nsystemd=true\n' > /etc/wsl.conf"
```
Em seguida **cole** este e **Enter** (desliga o WSL para aplicar):
```powershell
wsl --shutdown
```
Aguarde **~10 segundos**. Depois **cole** este e **Enter**:
```powershell
wsl -d Ubuntu -u root bash -c "systemctl enable --now docker"
```

### B.4 — Ajuste de rede do WSL (IMPORTANTE)
Na configuração padrão, o Windows **não consegue alcançar** o servidor dentro do WSL (firewall do Hyper-V + IPv6). Este passo cria o arquivo de configuração `.wslconfig` já com a rede certa.

🟦 **No PowerShell (normal)** — **cole** o comando abaixo (ele cria o arquivo sozinho) e tecle **Enter**:
```powershell
"[wsl2]`nnetworkingMode=mirrored`nfirewall=false" | Set-Content -Encoding ascii "$env:USERPROFILE\.wslconfig"
```
Em seguida **cole** este e **Enter**:
```powershell
wsl --shutdown
```
Aguarde **~10 segundos**.
> Isso ativa o modo de rede **"espelhado"** e desliga o **firewall do Hyper-V** — foi exatamente o que destravou na nossa máquina.
> 💡 Mais adiante, a seção **🧠 Memória e CPU** vai **completar** este mesmo arquivo com RAM e swap (recomendado para datasets grandes).

### B.5 — Subir o NodeODM

🟦 **No PowerShell (normal)** — **cole** e tecle **Enter**:
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
   - **Caminho A:** confira o Docker Desktop em **"Engine running"**; 🟦 **no PowerShell (normal)**, `docker ps` deve listar `nodeodm` (se não, cole `docker start nodeodm` e Enter).
   - **Caminho B:** 🟦 **no PowerShell (normal)**, cole e Enter:
     ```powershell
     wsl -d Ubuntu -u root bash -c "systemctl start docker; docker start nodeodm; docker ps"
     ```
3. **Abre no navegador, mas o app não conecta?** É cache do app → recarregue com **Ctrl+Shift+R**.
4. **(Caminho B) "timeout":** quase sempre é o **firewall do Hyper-V**. Confirme o `.wslconfig` (passo B.4) com `networkingMode=mirrored` e `firewall=false`, depois 🟦 cole `wsl --shutdown` no PowerShell e reabra.
5. **Funcionava e "sumiu":** o WSL hibernou. No Caminho B, garanta o **systemd** (passo B.3) e use o atalho abaixo para reerguer.

---

## 🔌 Ligar e desligar — 2 atalhos (Caminho B)
O **Iniciar** sobe o NodeODM e o mantém ligado **em segundo plano** (sem precisar deixar janela aberta); o **Desligar** para e libera a memória. Estes são **arquivos `.bat`** (não são comandos do PowerShell).

📄 **Como criar um arquivo `.bat`:** abra o **Bloco de Notas** (*Menu Iniciar → digite `bloco de notas` → Enter*) → **cole** o conteúdo → menu **Arquivo → Salvar como** → em **"Tipo"** escolha **"Todos os arquivos (*.*)"** → digite o nome **com `.bat` no final** → salve na **Área de Trabalho**.

**Arquivo 1 — `Iniciar-NodeODM.bat`** (liga e deixa rodando em 2º plano):
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

**Arquivo 2 — `Desligar-NodeODM.bat`** (desliga na hora e **libera a memória**):
```bat
@echo off
echo Desligando o NodeODM e liberando a memoria...
wsl --shutdown
echo NodeODM desligado.
timeout /t 3 /nobreak >nul
```

- **Como usar:** **duplo-clique** no **`Iniciar-NodeODM.bat`** → espere aparecer **"PRONTO"** → **pode fechar a janela** (o NodeODM segue ligado em 2º plano). Terminou de usar? **Duplo-clique** no **`Desligar-NodeODM.bat`** → memória liberada. *(Estes dois não precisam de Administrador.)*
- ⚠️ **Por que o keep-alive oculto?** O WSL **hiberna sozinho** quando fica ocioso (~1 min) e derruba o NodeODM (causa de "desconectado" / "Failed to fetch"). O `sleep infinity` oculto segura o WSL acordado até você Desligar.
- **Caminho A (Docker Desktop):** não precisa desses atalhos — abra/feche o **Docker Desktop**; o NodeODM volta sozinho pela política `--restart`. Para parar: 🟦 no PowerShell, `docker stop nodeodm`.

---

## 🧠 Memória e CPU do WSL (evita o "Not enough memory" e o PC travar)

O **"Not enough memory"** do ODM — e até o **PC desligar sozinho** no meio do processamento — acontece quando o WSL fica sem memória. A defesa tem **duas peças**:

- **`memory`** — quanta RAM o WSL pode usar. Deixe **~50% para o WSL** e **~50% para o Windows**. Se o WSL toma quase tudo, o **Windows trava/desliga**.
- **`swap`** — a **rede de segurança**: memória virtual em disco que o WSL usa **quando a RAM acaba**. Em vez de **falhar**, o ODM fica mais lento e **conclui**. O swap **cresce conforme a necessidade** (de quase 0 até o teto que você definir). `swap` pequeno (ou ausente) = ODM morre por falta de memória.

Aqui você vai **editar o arquivo `.wslconfig`** (o mesmo do passo B.4) no **Bloco de Notas**. Siga na ordem:

**Passo 1.** 🟦 **Abra o PowerShell (normal)** — *Menu Iniciar → `powershell` → "Windows PowerShell"* (não precisa Administrador). **Cole** o comando abaixo e tecle **Enter**. Ele **abre o arquivo no Bloco de Notas** (este comando não muda nada sozinho — só abre o arquivo para você editar):
```powershell
notepad "$env:USERPROFILE\.wslconfig"
```
> Se aparecer "Deseja criar um novo arquivo?", clique **Sim**.

**Passo 2.** No **Bloco de Notas** que abriu, **apague tudo** o que estiver lá e **cole exatamente** este conteúdo *(ele já inclui as linhas de rede do B.4)*:
```ini
[wsl2]
networkingMode=mirrored
firewall=false
memory=16GB
swap=32GB

[experimental]
autoMemoryReclaim=gradual
```

**Passo 3.** **Troque os números** `memory` e `swap` conforme a **RAM do seu PC** (veja a tabela). O exemplo acima (`16GB`/`32GB`) é para um PC de **32 GB**.

| RAM do seu PC | troque para `memory=` | troque para `swap=` |
|---|---|---|
| 8 GB  | `memory=4GB`  | `swap=8GB`  |
| 16 GB | `memory=8GB`  | `swap=16GB` |
| 32 GB | `memory=16GB` | `swap=32GB` |
| 64 GB | `memory=32GB` | `swap=32GB` |

> ❓ **Não sabe quanta RAM tem?** *Menu Iniciar → digite `Sobre o seu PC` → Enter* → veja **"RAM instalada"**.

**Passo 4.** Salve o arquivo: tecle **Ctrl+S** e **feche** o Bloco de Notas.

**Passo 5.** Volte ao **PowerShell**, **cole** este comando e tecle **Enter** (desliga o WSL para aplicar a nova configuração):
```powershell
wsl --shutdown
```

**Passo 6.** Reabra o NodeODM (**duplo-clique no `Iniciar-NodeODM.bat`**) e confira em **http://127.0.0.1:3000/info** — o `totalMemory` deve refletir o `memory` que você definiu. ✅

> O `autoMemoryReclaim=gradual` devolve ao Windows a RAM que o WSL parou de usar (memória "progressiva"). Por padrão o WSL usa **todos os núcleos** da CPU — para limitar, adicione uma linha `processors=8` dentro de `[wsl2]`.
> Quer priorizar **velocidade** e usa pouco o Windows enquanto processa? Pode subir o `memory` para ~⅔–¾ da RAM (ex.: 32 GB → `memory=24GB`) — mas **deixe sempre folga** para o Windows, senão volta o risco de travar.

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

**Passo 1 — (Se ainda não limpou pelo app) Apague as tarefas do NodeODM.**

🟦 **No PowerShell (normal)** — **cole** o primeiro comando e **Enter**:
```powershell
wsl -d Ubuntu -u root -- docker exec nodeodm sh -lc "rm -rf /var/www/data/*"
```
Em seguida **cole** este e **Enter**:
```powershell
wsl -d Ubuntu -u root -- docker restart nodeodm
```
> Isso apaga **todas** as tarefas do servidor — inclusive as "órfãs" que o app não enxerga.

**Passo 2 — Compacte o disco virtual do WSL** (é o que devolve o espaço ao C:). Este é um **arquivo `.bat`** que roda **como Administrador**.

📄 **Crie o arquivo:** abra o **Bloco de Notas** (*Menu Iniciar → `bloco de notas` → Enter*) → **cole** o conteúdo abaixo → **Arquivo → Salvar como** → em **"Tipo"** escolha **"Todos os arquivos (*.*)"** → salve como **`compactar-wsl.bat`** na **Área de Trabalho**:
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
▶️ **Rode como Administrador:** clique no arquivo `compactar-wsl.bat` com o **botão direito → "Executar como administrador" → "Sim"**. Espere terminar (1–3 min) e feche.

> O NodeODM volta sozinho ao reabrir o WSL/Docker (política `--restart`).
> 💡 Ajuste `Ubuntu` / `nodeodm` se o nome do seu distro/contêiner for diferente (🟦 no PowerShell: `wsl -l -v` e `docker ps`).

---

## ♻️ Recuperar espaço depois de o PC desligar no meio (pagefile)

Se o PC **desligou sozinho** durante um processamento pesado, pode ter sumido espaço no **C:** que os scripts de limpeza acima **não** recuperam — eles cuidam do disco do WSL; este é **outro** arquivo: o **`pagefile.sys`** (memória virtual do Windows). Sob pressão de RAM ele **incha** (dezenas de GB) e, com o desligamento abrupto, **fica preso grande** mesmo sem estar em uso.

**Passo 1 — Conferir o tamanho atual.**

🟦 **No PowerShell (normal)** — **cole** e tecle **Enter**:
```powershell
Get-CimInstance Win32_PageFileUsage | Select-Object Name, AllocatedBaseSize
```
O número `AllocatedBaseSize` é em **MB**. Se estiver muito acima do normal (ex.: `20000`–`40000` = 20–40 GB), vale ajustar.

**Passo 2 — Recuperar pela tela do Windows** (define um tamanho com teto e devolve o resto ao C:). Aqui **não há terminal** — é tudo por janelas:
1. Tecle **Win+R** (abre a caixa "Executar") → digite **`sysdm.cpl`** → **Enter**.
2. Aba **Avançado** → em **Desempenho**, botão **Configurações…**.
3. Aba **Avançado** → em **Memória virtual**, botão **Alterar…**.
4. **Desmarque** a caixa **"Gerenciar automaticamente o tamanho do arquivo de paginação"**.
5. Clique no disco **C:** → marque **"Tamanho personalizado"** e preencha:
   - **Tamanho inicial (MB):** `4096`  *(= 4 GB)*
   - **Tamanho máximo (MB):** o **tamanho da sua RAM em MB** → 8 GB = `8192` · 16 GB = `16384` · 32 GB = `32768` · 64 GB = `65536`.
6. Clique **Definir** → **OK** → **OK**.
7. **Reinicie o PC.** No próximo boot o `pagefile.sys` recria pequeno (4 GB) e **o espaço volta ao C:**.

> **Por que "4 GB → tamanho da RAM"?** Começa pequeno (recupera o espaço) e só **cresce até o teto** se algum programa realmente precisar — sem ficar preso gigante de novo.
> 💡 O pagefile do **Windows não acelera o ODM** (que roda no WSL, com a memória/swap do `.wslconfig`). Quem evita o "Not enough memory" é o **swap do WSL** (seção 🧠 acima).

---

## 📝 Notas
- A imagem `opendronemap/nodeodm` é **multiarquitetura** (Intel/AMD e ARM).
- Tudo roda **localmente** — suas fotos **não** vão para servidores externos.
- Datasets grandes (centenas de fotos) pedem mais RAM/tempo; comece com **algumas dezenas** + **Rápido**.

*Validado em Windows 11 + WSL2 (Ubuntu 22.04) + Docker Engine. © MGC Dev.*
