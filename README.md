# ⬡ HORUS — Supply-Chain Risk Intelligence

A **supply-chain risk intelligence platform** that fuses 20+ free and open data sources — SEC filings, UN trade flows, threat intelligence, patent data, geopolitical risk, and financial markets — into a single risk-scored dashboard for the semiconductor, AI, and battery industries.

![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6.svg)
![Next.js](https://img.shields.io/badge/Next.js-16-000000.svg)
![React](https://img.shields.io/badge/React-19-61DAFB.svg)
![Postgres](https://img.shields.io/badge/Postgres-17-336791.svg)
![Redis](https://img.shields.io/badge/Redis-7-DC382D.svg)
![License](https://img.shields.io/badge/license-MIT-green.svg)

---

## 📖 Overview

HORUS transforms supply-chain risk analysis from static spreadsheets into an **interactive intelligence command center**. It ingests data from 20+ free/public APIs — SEC EDGAR, UN Comtrade, Yahoo Finance, GDELT, NIST NVD, Wikidata, and more — into a unified Postgres store, serves it through a Redis cache layer, and renders it on a multi-industry Next.js dashboard.

Built on **Next.js 16 (App Router)**, **React 19**, **Postgres 17**, and **Redis**, Horus covers three industries (semiconductor, AI, battery) with 20 tracked companies each, 1,000+ facilities, real-time news enrichment, and derived risk scores.

### What makes Horus different?

- **🔓 Zero API key dependency** — Every data source either works without a key or gracefully degrades when absent
- **🏭 Multi-industry focus** — Semiconductor, AI, and Battery industries with per-industry data models, KPIs, and risk profiles
- **🧩 ETL-first architecture** — 20 isolated Python source modules, each independently executable, feeding a single read-model table
- **⚡ Redis read-through** — All frontend data goes through a Redis cache layer with 24h TTL — sub-millisecond reads, zero DB pressure
- **🛡️ Fail-soft pipeline** — Every ETL source has independent error handling; a failing fetcher leaves the last-known-good data in place
- **🔍 Cross-panel focus** — Click any company to filter every dashboard panel simultaneously
- **🏗️ Seed-first design** — Curated fixture data loads before real fetchers run; UI is never blank

---

## 📸 Screenshots

### Command Dashboard

| Risk & Market Overview | Raw-Material Flow (Sankey) |
|---|---|
| ![Semiconductor dashboard: KPI tiles, 8-axis composite risk radar, Top-10 market snapshot, news feed, and global facility map](docs/screenshots/dashboard-overview.png) | ![Sankey of semiconductor raw-material flows from origin countries to Taiwan and China, with a photoresist dependency panel](docs/screenshots/supply-chain-map.png) |

*Left — the semiconductor dashboard: seven KPI tiles (companies, suppliers, facilities, materials, countries, policy updates, market-moving news), an 8-axis **composite risk radar** (Medium · 61/100), a **Top-10 market snapshot** (market cap, price, 24h/YTD %), a **market-impact news feed**, and the **global manufacturing footprint** map at the bottom. Right — the dashboard's **"Raw Materials Movement" Sankey**: origin countries → materials (photoresist, gallium, rare earths, neon gas…) → destinations, with a per-material dependency call-out (e.g. Japan controls 89% of tracked photoresist).*

### Multi-Industry Modelling

| AI Industry — Supply Flows | Battery Industry — Material Trade |
|---|---|
| ![AI-industry dashboard Sankey of HBM memory, CoWoS packaging, GPUs, ABF substrate and grid power, plus deals and R&D tables](docs/screenshots/company-profile.png) | ![Battery-industry material Sankey of lithium, cobalt, nickel, graphite and manganese to consuming countries](docs/screenshots/raw-materials.png) |

*The same models re-instantiated per industry. **AI** (left): HBM memory, CoWoS packaging, GPUs, ABF substrate, grid power — with recent deals, top suppliers by spend, and R&D/patent tables. **Battery** (right): lithium, cobalt, nickel, graphite, manganese flows with sourcing-concentration warnings (e.g. Indonesia controls 88% of tracked nickel).*

### Supply-Chain Analysis

| Raw-Materials Supply-Risk Matrix | 3D Dependency Graph |
|---|---|
| ![Raw Materials page: supply-risk scatter plot (sourcing concentration vs strategic importance) and compare-materials table](docs/screenshots/supply-chain-suppliers.png) | ![Interactive 3D force graph of supplier-to-buyer dependencies with TSMC focused and edges coloured by risk](docs/screenshots/data-analytics-market.png) |

| Supplier → Input → Buyer Sourcing Flow |
|---|
| ![Trade & Shipments page: supplier-to-input-to-buyer Sankey with a freight-lane tariff and risk table](docs/screenshots/trade-shipments.png) |

*The **Raw Materials** page (top-left) plots each material on a supply-risk matrix (sourcing concentration × strategic importance × supply risk) beside a sortable compare table. The **Supply Chain Map** (top-right) is an interactive **3D dependency force-graph** — click a node (TSMC shown) to focus it and trace supplier→buyer edges coloured by risk. **Trade & Shipments** (bottom) renders the supplier→input→buyer sourcing flow with a freight-lane tariff/risk table.*

### Risk & Compliance

| Comparative Risk Radar | Geopolitical — Political Instability |
|---|---|
| ![Risk Radar page: 8-axis comparative risk profile for TSMC vs the sector benchmark, plus a per-company risk register](docs/screenshots/monitoring-alerts.png) | ![Geopolitical Risk map: producing countries scored by political-instability tension with cascade arcs to dependent materials](docs/screenshots/company-financials.png) |

| Maritime Chokepoints | Financial-Risk Ranking |
|---|---|
| ![Maritime chokepoints map with animated sea lanes through Hormuz, Malacca and the Taiwan Strait and exposure bars](docs/screenshots/sidebar-companies.png) | ![Financials page ranking companies by financial-risk score with a key-ratios table](docs/screenshots/risk-radar.png) |

*The **Risk Radar** (top-left) overlays any company's 8-axis profile on the sector benchmark, with a per-company **risk register** below. **Geopolitical Risk** offers two lenses: **political instability** (top-right) — producing countries scored by tension with cascade arcs to the materials and companies exposed — and **maritime chokepoints** (bottom-left) — animated sea lanes through Hormuz, Malacca, the Taiwan Strait and more, with per-chokepoint trade-exposure bars. The **Financials** page (bottom-right) ranks every tracked company by financial-risk score alongside a revenue/margin/R&D/capex key-ratios table.*

---

## ✨ Features

### 🏢 Multi-Industry Dashboard

Three independently-modeled industries under `/semiconductor`, `/ai`, and `/battery`:
- **20 tracked companies each** — curated entity lists with CIK/QID identifiers
- **8-axis risk radar** — geopolitical, supplier concentration, financial, operational, regulatory, ESG, raw material, logistics
- **Industry-specific KPIs** and GDELT-derived alerting
- **Financial snapshots** — revenue, profit, R&D, and capex for all tracked companies

### 🗺️ Interactive Risk Map

Custom **inline-SVG world maps** (simplified Natural Earth landmasses on an equirectangular projection — no map-tile dependency) with:
- **1,000+ facilities** — fab/R&D/HQ/supplier locations with status and type markers
- **Supply-chain visualization** — an interactive 3D dependency graph (`react-force-graph-3d` / three.js) and custom SVG **Sankey** flow diagrams
- **Geospatial risk** — country-level tension scores and animated maritime chokepoints

### 📡 ETL Data Pipeline (20+ Sources)

| Source | Data Provided | Auth |
|--------|--------------|------|
| **Yahoo Finance** | Quotes, market caps, TTM financials, R&D | ❌ |
| **SEC EDGAR** | 8-K/10-K/10-Q filings → alerts | ❌ |
| **UN Comtrade (WITS)** | Bilateral trade flows → sourcing shares | ❌ |
| **GDELT 2.0** | Global news events, tone, conflict signals | ❌ |
| **NIST NVD** | CVEs for sector vendors (CVSS ≥7) | ❌ |
| **US Federal Register** | Export-control / Entity-List / CHIPS rules | ❌ |
| **Wikidata** | Company metadata (CEO, HQ, founded) | ❌ |
| **PatentsView** | US patent filings + assignments | optional free key |
| **Korea DART** | Korean regulatory filings (Samsung, SK hynix) | optional free key |

Plus derived/enrichment modules (risk register, composite scores, KPI derivation, supplier/material/facility intelligence) that run on top of the fetched data. Some material and trade figures are **curated industry estimates** (USGS / Statista references), not live feeds.

### 🧠 Derived Intelligence Layers

- **Company risk register** — severity, probability, financial impact, recommended actions
- **Composite scoring** — weighted scores across cyber, exposure, financial health, ESG
- **Executive summaries** — per-company briefs deterministically composed from the structured scores/risks (single `generate()` seam, ready to swap for an LLM call)
- **Derived KPIs** — real counts patched into seeded KPI cards
- **Compare radar** — per-axis risk profile for every tracked company

### 🔍 Supply Chain Analysis

- **Supplier network** — tier-1/2 edges with spend and risk
- **Raw materials** — 18 tracked materials with country concentration, price, supply risk
- **Trade lanes** — origin/destination tracking with tariff and risk assessment
- **Facility intelligence** — per-site operational risk with logistics and disaster exposure
- **Sankey diagrams** — material flow visualization

### 🎛️ Interactive Controls

- **Multi-industry selector** — switch industries preserving sub-path
- **Global search** — across companies, materials, trade lanes, chokepoints
- **Cross-panel focus** — click any company to filter all panels simultaneously
- **Watchlist** — pin companies (persisted to localStorage)
- **Data source health** — live per-source status in sidebar

---

## 🗄️ Architecture

### Data Flow

```
External APIs → etl/sources/*.py → real_loader.upsert_datasets()
                                      │
                                   industry_dataset (Postgres, JSONB)
                                      │
                                   warm.py → Redis cache
                                      │
                                   provider.ts → db.ts (readDataset<T>)
                                      │
                                   Next.js Server Components
                                      │
                                   React Client Components
```

### Backend (ETL)

```
etl/
├── config.py              # DB connections, env vars
├── migrate.py             # Idempotent SQL migrations
├── entities.py            # Seed YAML → company table sync
├── seed_loader.py         # Fixture JSON loader
├── real_loader.py         # upsert_datasets() — single write gate
├── warm.py                # Postgres → Redis cache copy
├── flows.py               # Prefect orchestration
├── run_source.py          # Single-source CLI runner
├── ai/summary.py          # Gemini-powered summaries
├── migrations/001_init.sql
├── seeds/                 # semiconductor.yaml, ai.yaml, battery.yaml
├── sources/               # 20+ data source modules
│   ├── yahoo.py · yahoo_facts.py  # Market data + financials
│   ├── sec.py · sec_facts.py      # EDGAR filings
│   ├── comtrade.py        # UN trade flows
│   ├── gdelt.py           # Global news
│   ├── nvd.py · cyber.py  # CVE + threat intel
│   ├── wikidata.py        # Company metadata
│   ├── opendart.py        # Korean disclosures
│   ├── fedreg.py          # Federal Register
│   ├── risks.py · scores.py · summary.py  # Derived layers
│   ├── derive.py          # KPI computation
│   ├── supplier_intel.py · materials_intel.py · facility_intel.py
│   └── ...                # holdings, news_enrich, etc.
└── cache/                 # API response cache (gitignored)
```

### Frontend (Next.js 16)

```
src/
├── app/
│   ├── layout.tsx              # Root layout
│   ├── [industry]/             # Dynamic industry routes
│   │   ├── layout.tsx          # Industry validation + AppShell
│   │   ├── page.tsx            # Dashboard
│   │   ├── companies/{id,financials,news,deals,patents,explorer}
│   │   ├── supply-chain/{suppliers,materials,facilities,map,trade}
│   │   ├── risk/{radar,policies,esg,geopolitical}
│   │   ├── analytics/{market,reports,sources}
│   │   └── monitoring/{alerts,watchlist}
│   └── api/search/route.ts     # Global search
├── components/
│   ├── layout/   (AppShell, Sidebar, TopBar)
│   ├── dashboard/(KpiRow, MarketSnapshot, RiskRadar, NewsFeed, …)
│   ├── companies/(CompanyProfile,CompanyExplorer,Financials, …)
│   ├── supply/   (SupplyChainMap, FacilitiesView, TradeView, …)
│   ├── risk/     (GeoRiskView, EsgView, RiskRadarCompare, …)
│   ├── analytics/(MarketIntelView, SourcesView, ReportsView)
│   ├── monitoring/(AlertsView, WatchlistView)
│   └── ui/       (Panel, DataTable, RiskBadge, StatTile)
└── lib/
    ├── db.ts             # Redis read-through (readDataset<T>)
    ├── provider.ts       # 39 typed data accessors
    ├── data*.ts          # data.ts, data-supply.ts, data-risk.ts, data-analytics.ts (domain accessors)
    ├── types.ts          # All TypeScript types
    ├── store.ts          # Zustand (focusCompany, watchlist)
    ├── focus.ts          # Cross-panel focus helper
    ├── nav.ts            # Sidebar navigation tree
    └── industry-context.tsx  # React Context
```

### Database Schema

```sql
-- Entity resolution
create table company (
  id text primary key, industry text not null,
  name text not null, ticker text,
  cik text, wikidata_qid text
);

-- Single read-model table
create table industry_dataset (
  industry text not null, dataset text not null,
  payload jsonb not null,
  updated_at timestamptz not null default now(),
  primary key (industry, dataset)
);
```

---

## 🚀 Quick Start

### Prerequisites

**Node.js ≥ 20 · Docker · Python ≥ 3.12**

```bash
# 1. Clone
git clone https://github.com/carbon-evolution/horus.git
cd horus

# 2. Install frontend deps
npm install

# 3. Configure
cp .env.example .env.local   # edit with your keys (all optional)

# 4. Start Postgres + Redis
docker compose up -d

# 5. Set up ETL
cd etl && python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt

# 6. Ingest seed data
make ingest

# 7. Launch dashboard
cd .. && npm run dev
# → http://localhost:4444 → /semiconductor
```

### Per-Source Refresh

```bash
make ingest.yahoo      # Yahoo Finance
make ingest.comtrade   # UN trade flows
make ingest.gdelt      # GDELT news
make ingest.nvd        # CVE feed
make ingest.derive     # Recompute KPIs/radar
```

---

## 💻 Configuration

| Variable | Default | Unlocks |
|----------|---------|---------|
| `DATABASE_URL` | `postgresql://scr:scr@localhost:5433/scr_radar` | Postgres connection |
| `REDIS_URL` | `redis://localhost:6380` | Redis cache |
| `CACHE_TTL` | `86400` | Cache TTL (seconds) |
| `PATENTSVIEW_API_KEY` | — | US patent filings (free) |
| `DART_API_KEY` | — | Korea DART filings (free) |

---

## 🔬 ETL Pipeline

```
fixtures → migrate → seed_loader → entity sync → sources → derive → warm
```

Each source runs independently via `run(industry) → dict`. The pipeline is sequential by design — dependency order is explicit (wikidata reads companies from yahoo, risks reads cyber/policies). Seeds load first; real data overwrites on conflict. A failing source never blocks the rest.

---

## 🎨 Visual Design

- **Dark analytical theme** — Low-luminance background with accent-colored KPI cards
- **CSS variable system** — Consistent theming through custom properties
- **Icon-driven UI** — 40+ Lucide icons for navigation and data visualization
- **Interactive charts** — Recharts, react-force-graph-3d, sankey diagrams
- **Panel grid** — Priority-ordered layout: risk first, map mid-page, financials last

---

## 🛡️ Data Sources

| Source | Type | Free | Cadence |
|--------|------|------|---------|
| Yahoo Finance | Market data | ✅ | Daily |
| SEC EDGAR | US filings | ✅ | Daily |
| UN Comtrade | Trade flows | ✅ | Monthly |
| GDELT 2.0 | Global news | ✅ | Daily |
| NIST NVD | CVEs | ✅ | Daily |
| Federal Register | Regulations | ✅ | Daily |
| Wikidata | Entity metadata | ✅ | Weekly |
| PatentsView | US patents | ✅* | Weekly |
| Korea DART | KR filings | ✅* | Daily |
| USGS / Statista | Mineral & materials estimates (curated, not a live feed) | ✅ | Reference |

*\* Requires free API key*

---

## 📄 License

MIT — see [LICENSE](LICENSE).

Built on free and open data. No proprietary APIs required.
