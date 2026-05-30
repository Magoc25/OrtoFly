# Changelog — OrtoFly

Todas as mudanças notáveis neste projeto estão documentadas aqui.
Formato baseado em [Keep a Changelog](https://keepachangelog.com/pt-BR/1.0.0/).

---

## [1.1.0] — Maio 2026

### 🆕 Adicionado — Fase 2: Importação de imagens & EXIF

- Importação de fotos de drones DJI (múltiplos arquivos) com leitura de **EXIF/GPS** via `exifr`.
- Plotagem dos **centros das fotos no mapa** + **trilha de voo** (ordem temporal) e popup com miniatura, modelo, altura e data.
- Resumo das imagens (nº com GPS, modelos, faixa de altura e data) e lista clicável que centraliza a foto no mapa.
- **Definir a área (AOI) pela envoltória convexa** das fotos — útil para replanejar voos sobre a mesma região.
- Exportação dos **centros de foto em GeoJSON**.

> As imagens são lidas localmente no navegador (não são enviadas a servidores) e mantidas apenas durante a sessão.

---

## [1.0.0] — Maio 2026

### 🚀 Lançamento inicial — Módulo de Planejamento de Voo

- Desenho de área de interesse (AOI) sobre mapa de satélite (Esri) ou OpenStreetMap.
- Banco de câmeras de drones DJI (Mini 3/4 Pro, Air 3 / 3S, Mavic 3 / Classic / 3E, Phantom 4 Pro/RTK e outros).
- Calculadora fotogramétrica: GSD (cm/px), altura de voo, pegada no solo, espaçamento entre fotos e linhas a partir das sobreposições longitudinal e lateral.
- Geração da grade de mapeamento (lawnmower) recortada na área, com opção de grade cruzada (cross-grid) e direção das linhas automática/manual.
- Estimativas: número de fotos, número de linhas, distância total, tempo de voo e número de baterias.
- Exportação de missão em **KMZ (WPML, DJI Pilot 2)**, **KML**, **GeoJSON** e **CSV (Litchi)**.
- Sistema de projetos nomeados em `localStorage`, com exportação/importação em JSON e projeto de exemplo.
- PWA instalável (Android, iOS, desktop) com funcionamento offline via Service Worker.
- Sistema de avaliações compartilhadas e apoio via PIX.
- Documentação de conformidade legal (LGPD, segurança, acessibilidade, inventário de dados).

---

*© 2026 MGC Dev — Marlon Gomes da Costa · Projeto pessoal e independente*
