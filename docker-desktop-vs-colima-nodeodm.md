# 🐳 Docker Desktop vs. Colima — Guia de Escolha para NodeODM no macOS

> Complemento ao [Guia Local macOS — NodeODM (OrtoFly)](https://github.com/Magoc25/OrtoFly/blob/main/docs/Guia-Local-macOS-NodeODM.md)  
> Ajuda a decidir qual opção de Docker usar antes de instalar o NodeODM.

---

## O que são

**Docker Desktop** é o produto oficial da Docker Inc.: um aplicativo gráfico completo para macOS, com ícone na barra de menu, painel de gerenciamento de containers, volumes, imagens e logs.

**Colima** (Containers on Lima) é uma ferramenta open-source de linha de comando que cria uma máquina virtual leve no macOS (via Lima/QEMU) para rodar o daemon do Docker — sem interface gráfica, sem empresa por trás, só terminal.

---

## 💰 Licença e custo

| | Docker Desktop | Colima |
|---|---|---|
| **Licença** | Gratuito para uso pessoal/educação; **pago para empresas com >250 funcionários ou >$10M de receita** | 100% gratuito e open-source (MIT) |
| **Risco futuro** | Termos já mudaram em 2022; podem mudar novamente | Sem restrições comerciais |

> ⚠️ Se você usa no trabalho em empresa de médio/grande porte, o Docker Desktop pode exigir licença paga (~$9–$21/mês por usuário).

---

## ⚡ Desempenho e uso de recursos

### Docker Desktop
- Roda uma VM interna (HyperKit no Intel; Virtualization Framework no Apple Silicon)
- Consome mais RAM em idle (~300–500 MB só pelo app)
- Tem overhead da interface gráfica
- No Apple Silicon, a integração com o Virtualization Framework é bem otimizada

### Colima
- VM mais leve (Lima + QEMU ou Virtualization Framework)
- Consome menos memória em idle (~100–200 MB)
- Você controla explicitamente os recursos alocados:
  ```bash
  colima start --cpu 4 --memory 8
  ```
- Para processamento pesado de fotogrametria (NodeODM), poder definir RAM e CPUs manualmente é uma **vantagem real**

---

## 🛠️ Facilidade de uso

### Docker Desktop
- Instalação simples: baixa `.dmg`, arrasta para Aplicativos, abre
- Interface gráfica: visualize containers, logs e uso de recursos sem terminal
- Inicia automaticamente com o Mac (configurável)
- Ideal para quem quer lidar com o terminal o mínimo possível

### Colima
- Exige instalar o **Homebrew** primeiro (caso não tenha)
- Tudo via terminal: `colima start`, `colima stop`, `colima status`
- Sem painel visual — para ver logs do container use `docker logs nodeodm`
- Requer um passo a mais ao reiniciar o Mac: rodar `colima start` antes de usar o Docker

---

## 🔄 Inicialização após reiniciar o Mac

| | Docker Desktop | Colima |
|---|---|---|
| **Startup automático** | ✅ Sim (abre com o Mac, se configurado) | ❌ Não — rode `colima start` manualmente* |
| **NodeODM reinicia?** | ✅ Sim, pela flag `--restart unless-stopped` | ✅ Sim, mas só após o Colima já estar rodando |

> \* É possível automatizar com `brew services start colima`, mas exige configuração extra.

---

## 🍎 Apple Silicon (M1/M2/M3/M4)

Ambos funcionam bem. A imagem `opendronemap/nodeodm` possui build ARM nativo para Apple Silicon nos dois casos. O Colima permite especificar a arquitetura explicitamente:

```bash
colima start --arch aarch64
```

Se houver reclamação de arquitetura no Docker Desktop, adicione a flag `--platform linux/amd64` ao comando `docker run` (emulação via Rosetta, mais lenta).

---

## 🎯 Tabela de decisão rápida

| Perfil | Escolha recomendada |
|---|---|
| Quer simplicidade, não quer lidar com terminal | ✅ **Docker Desktop** |
| Usa em empresa (risco de licença paga) | ✅ **Colima** |
| Quer controle fino de RAM/CPU para o NodeODM | ✅ **Colima** |
| Mac com pouca RAM disponível | ✅ **Colima** (menos overhead) |
| Vai usar Docker para outras coisas além do NodeODM | ✅ **Docker Desktop** (interface ajuda bastante) |
| Uso pessoal, quer o caminho mais rápido | ✅ **Docker Desktop** |

---

## 💡 Recomendação para fotogrametria

Para o caso de uso específico do **NodeODM/OrtoFly**, o **Colima** tem vantagem prática: você pode alocar explicitamente mais memória para o processamento, que costuma ser intenso (especialmente com muitas fotos ou alta resolução).

Exemplo de inicialização otimizada para fotogrametria:

```bash
colima start --cpu 6 --memory 12 --disk 50
```

Se preferir simplicidade e não se importar com o overhead, o **Docker Desktop** funciona perfeitamente para o mesmo fim.

---

## 🔗 Referências

- [Guia oficial OrtoFly — macOS NodeODM](https://github.com/Magoc25/OrtoFly/blob/main/docs/Guia-Local-macOS-NodeODM.md)
- [Docker Desktop — Pricing & Licensing](https://www.docker.com/pricing/)
- [Colima no GitHub](https://github.com/abiosoft/colima)
- [OpenDroneMap NodeODM](https://github.com/OpenDroneMap/NodeODM)

---

*Guia de escolha para macOS — Docker Desktop ou Colima. Complemento ao OrtoFly. © MGC Dev.*
