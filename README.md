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

### Dashboard Overview

| Risk Radar + Market Pulse | Global Manufacturing Footprint |
|---|---|
| ![Risk radar, market snapshot, and news feed on the semiconductor dashboard](docs/screenshots/dashboard-overview.png) | ![Map view of global fab and R&D facility locations](docs/screenshots/supply-chain-map.png) |

*The dashboard (left) shows interactive risk radar, market snapshot with price/change data, and latest news. The manufacturing map (right) plots 1,000+ fab/R&D facilities worldwide.*

### Company Intelligence

| Company Profile & Scorecard | Financial Performance |
|---|---|
| ![Company profile with scorecard, news, and related data](docs/screenshots/company-profile.png) | ![TTM financial performance across tracked companies](docs/screenshots/company-financials.png) |

*Per-company intelligence pages with risk scorecards, news events, supplier networks, and financial time-series.*

### Supply Chain

| Suppliers & Vendor Risk | Raw Materials Tracking |
|---|---|
| ![Supplier network with tier-1 and tier-2 vendor risk](docs/screenshots/supply-chain-suppliers.png) | ![Raw material price, concentration, and supply risk data](docs/screenshots/raw-materials.png) |

| Trade & Shipment Lanes | Full Navigation Tree |
|---|---|
| ![Trade routes with tariff and risk assessments](docs/screenshots/trade-shipments.png) | ![Sidebar showing full industry-aware navigation](docs/screenshots/sidebar-companies.png) |

*Supply-chain views: tier-1/2 supplier networks, raw material sourcing concentration, trade lane risk, and the full industry-aware sidebar.*

### Risk & Analytics

| Risk Radar (8-Axis Profile) | Market Intelligence |
|---|---|
| ![Risk radar showing geopolitical, supply, financial, and other risk axes](docs/screenshots/risk-radar.png) | ![Market intelligence with inventory ratios, lead times, and utilization](docs/screenshots/data-analytics-market.png) |

### Monitoring

| Monitoring & Alerts |
|---|
| ![Alert feed with severity-coded notifications](docs/screenshots/monitoring-alerts.png) |

---

## ✨ Features

### 🏢 Multi-Industry Dashboard

Three independently-modeled industries under `/semiconductor`, `/ai`, and `/battery`:
- **20 tracked companies each** — curated entity lists with CIK/QID identifiers
- **8-axis risk radar** — geopolitical, supplier concentration, financial, operational, regulatory, ESG, raw material, logistics
- **Industry-specific KPIs** and GDELT-derived alerting
- **Financial snapshots** — revenue, profit, R&D, and capex for all tracked companies

### 🗺️ Interactive Risk Map

MapLibre-based global manufacturing footprint with:
- **1,000+ facilities** — fab/R&D/HQ/supplier locations with status and type markers
- **Supply chain visualization** — deck.gl force graphs and sankey diagrams
- **Geospatial risk** — country-level tension scores, maritime chokepoints

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
| **USGS** | Mineral production estimates | ❌ |
| **NASA FIRMS** | Active fire / hotspot data | ❌ |

### 🧠 Derived Intelligence Layers

- **Company risk register** — severity, probability, financial impact, recommended actions
- **Composite scoring** — weighted scores across cyber, exposure, financial health, ESG
- **AI-generated summaries** — Gemini-powered per-company briefs (opt-in API key)
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
    ├── provider.ts       # 41 typed data accessors
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
# → http://localhost:3000 → /semiconductor
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
| `DATABASE_URL` | `[REDACTED] | Postgres connection |
| `REDIS_URL` | `[REDACTED] | Redis cache |
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
| USGS | Mineral data | ✅ | Annual |

*\* Requires free API key*

---

## 📄 License

MIT — see [LICENSE](LICENSE).

Built on free and open data. No proprietary APIs required.
