---
name: developing-horus
description: Use when working in the scr-radar repo (branded "Horus") — running the Next.js app, editing industry sub-pages, the Postgres-backed ETL, or ingesting data sources.
---

# Developing Horus (SCR Radar)

## Overview
Horus is a Supply Chain Risk Radar built on **Next.js 16**. The repo directory is still named `scr-radar` (`~/Downloads/Opencode/scr-radar`) but the app is branded **Horus** (gold Eye-of-Horus logo, accent color `#e0b83a`, company logos via a favicon service). This repo already has `CLAUDE.md`, `AGENTS.md`, and a `Makefile` — read those first; this skill is the fast orientation.

## Run it
- Dev server runs on **localhost:4444** (not 3000).
- Pages **server-render from Postgres** under `app/[industry]/`.

## Architecture
- **Per-source ETL isolation** under `etl/sources/` — each data source is self-contained.
- Ops commands:
  ```bash
  make ingest.<source>     # run one source's ingest (e.g. make ingest.yfinance)
  make prefect-server      # start Prefect for scheduling
  make serve               # register the daily cron flow
  ```
- Specs and implementation plans live in `docs/superpowers/`.

## Data sources (real vs. gated)
- **Real & wired:** yfinance (financials), Wikidata, UN Comtrade (trade); gov sources **SEC EDGAR** → alerts, **NIST NVD** → CVE alerts, **Federal Register** → policies (all keyless, verified rendering).
- **Pending / gated:** GDELT news (was in 429 cooldown), patents (API key-gated). Geo/materials are curated. Note: **World Bank WGI was dropped** — wrong semantic for the risk model, don't re-add it.

## Gotchas
- lucide-react icon is **`TriangleAlert`**, not `AlertTriangle` — using the old name breaks the build.
- The Companies section (6 pages incl. supplier-network deep dive, ops/event/innovation maps, financial-risk gauge) is complete.
- Feature work has been landing on branch **`feat/sub-pages`** (unmerged).

## Quick reference
| Need | Command / location |
|------|--------------------|
| Dev server | localhost:4444 |
| Ingest a source | `make ingest.<source>` |
| Scheduler | `make prefect-server` + `make serve` |
| Industry pages | `app/[industry]/` |
| ETL per source | `etl/sources/` |
| Specs & plans | `docs/superpowers/` |
| Accent color | `#e0b83a` |
