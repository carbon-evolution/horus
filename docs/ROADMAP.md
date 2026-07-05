# Supply Chain Risk Radar — Sub-Page Build Plan (Mock-First)

## Progress log
- [x] **Scaffold + Dashboard** (app shell, nav, industry selector, 11 dashboard widgets) — done.
- [x] **Phase A** — shared UI (`PageHeader`, `DataTable`, `StatTile`, `RiskBadge`), `provider.ts` seam, type/fixture extensions — done.
- [x] **Companies** — Top 10 Overview, Company Explorer, Financials, News & Events, Deals & Partnerships, Research & Patents, `[id]` deep-dive — done, tsc clean, all routes 200.
- [x] **Supply Chain** — Suppliers & Vendors, Raw Materials, Manufacturing Facilities, Trade & Shipments, and full 3D Supply Chain Map (react-force-graph-3d, lazy-loaded) — done, tsc clean, all routes 200, 3D renders.
- [x] **Risk & Compliance** — Risk Radar compare (multi-entity toggle), Policies & Laws tracker, ESG Scope 1–3 heatmap, Geopolitical Risk (country exposure + chokepoints) — done, tsc clean, routes 200.
- [ ] **Data & Analytics** (3) — next. [ ] **Monitoring** (2).
- [ ] Cross-filter focus pass. [ ] Phase Z: real data.


## Context

We rebuilt the platform from scratch this session. The **app shell + Dashboard** are done and live
(`~/Downloads/Opencode/scr-radar`, Next.js 16 + Tailwind v4 + Recharts + Zustand, http://localhost:3000).
Only `/` (Dashboard) exists; every sidebar sub-page currently 404s.

This plan covers **all 21 sub-pages**. Approach: **build every page with mock data first** (shaped exactly
like the eventual live provider), then in a final phase swap the mock layer for real free-tier data via a
cache-and-inject pipeline. The real-data phase is intentionally deferred — we resolve ingestion/rate-limit/
entity-resolution issues when we get there.

**Session recovery:** Implementation Step 0 copies this file to `scr-radar/docs/ROADMAP.md` and checks off
progress there, so work survives a lost session. A memory pointer will also be added.

## Current codebase (what to reuse — do NOT rebuild)

- `src/lib/types.ts` — `Industry`, `IndustryData`, `Company`, `Facility`, `NewsItem`, `RadarAxis`, `SankeyData`,
  `FinancialSeriesPoint`, `Deal`, `Supplier`, `ResearchRow`, `Kpi`, `RiskLevel`.
- `src/lib/data.ts` — `DATA: Record<Industry, IndustryData>`, `getIndustryData(industry)`. Extend this per section.
- `src/lib/store.ts` — `useApp` Zustand store (`industry`, `focusCompany`). Cross-filtering hangs off `focusCompany`.
- `src/lib/nav.ts` — `NAV` tree + `DATA_SOURCES`. Routes here already point at the pages below.
- `src/components/ui/Panel.tsx` — card wrapper (title/action). Use everywhere.
- `src/components/Icon.tsx` — lucide-by-name.
- `src/components/dashboard/*` — reuse `MarketSnapshot`, `NewsFeed`, `RawMaterialsSankey`, `RiskRadar`,
  `FinancialPerformance`, `DealsTable`, `TopSuppliers`, `ResearchInnovation`, `ManufacturingFootprint` on sub-pages.
- `src/app/layout.tsx` wraps everything in `AppShell`; pages are Server Components rendering a client widget.

## Shared building blocks to add first (Phase A)

These unlock every page; build once, reuse everywhere. Add under `src/components/ui/`:

- `PageHeader.tsx` — title + subtitle + optional right-side actions/filters.
- `DataTable.tsx` — generic sortable/filterable table (column defs, client sort, text filter, risk-color cells).
- `FilterBar.tsx` — chips/selects (region, risk tier, valuation, category) driving a table.
- `StatTile.tsx` — small KPI tile (reuse pattern from `KpiRow`).
- `RiskBadge.tsx` — Low/Med/High pill (extract from `TopSuppliers`).
- `MiniBar.tsx` / `MiniLine.tsx` — inline sparkline cells for tables.
- Provider seam: introduce `src/lib/provider.ts` exposing typed getters (`getCompanies`, `getFacilities`,
  `getMaterials`, `getPolicies`, …) that today wrap `getIndustryData`. **Components import from `provider.ts`, not
  `data.ts`.** This is the single swap point for the real-data phase.

## Data-model extensions (add to `types.ts` + fixtures to `data.ts`)

New interfaces (per-industry arrays inside `IndustryData` unless noted):
`CompanyProfile` (segments, products, suppliers, customers, ceo/hq/employees, financialsTTM series),
`SupplierEdge` (buyer→supplier tier + material + spend + risk), `RawMaterial` (name, category, price, top
producers[], concentration, supplyRisk), `Patent` (company, category, count, trend), `Policy` (title,
authority, date, region, severity, targets[]), `EsgProfile` (scope1-3, water risk, targets), `GeoRisk`
(country, tension, chokepoints[]), `TradeShipment` (lane, mode, volume, tariff), `Alert` (severity, entity,
message, deep-link), `ReportTemplate`, `MarketIntel` (lead times, utilization, inventory ratios),
`GraphData` (nodes/edges for 3D map).

## Sub-pages (21) — grouped by nav section

Format per page: **route** · purpose · key components · mock data to add · (later) real source.

### Companies
- **`/companies`** Top 10 Overview · grid of company cards w/ health indicators, capacity, exposure · reuse
  `Company` + add `healthScore/exposure` · SEC EDGAR + Yahoo.
- **`/companies/explorer`** · filterable/paginated `DataTable` across full universe · `FilterBar`(valuation,
  region, risk) · add more companies to fixtures · SEC + AkShare (CN) + registries.
- **`/companies/financials`** · comparative charts: Revenue/GrossMargin/CapEx/R&D-ratio over time · Recharts
  Line/Bar + `DataTable` · add `financialsTTM` multi-year series · SEC EDGAR / Yahoo.
- **`/companies/news`** · chronological feed + sentiment (pos/neu/neg) + entity tags · reuse `NewsFeed` +
  sentiment strip · extend `NewsItem` w/ sentiment · GDELT + NewsAPI RSS.
- **`/companies/deals`** · deals/JV/supply-agreement matrix · reuse `DealsTable` (fuller) · extend `Deal` fixtures.
- **`/companies/patents`** Research & Patents · patents filed/pending, domain distribution bars · `MiniBar` +
  `DataTable` · add `Patent` fixtures · Lens.org / USPTO/EPO bulk.
- **`/companies/[id]`** (deep-dive, referenced by cross-links) · profile: financials + facilities + suppliers +
  patents + news · composed from the above widgets filtered by id · `CompanyProfile`.

### Supply Chain
- **`/supply-chain/suppliers`** · dual-list buyer↔multi-tier supplier dependency view · `SupplierEdge` fixtures ·
  scraped/registry links.
- **`/supply-chain/materials`** · commodity dashboards (Lithium, Cobalt, Polysilicon, Rare Earths): price +
  concentration matrix · `RawMaterial` fixtures + Recharts · UN Comtrade + World Bank.
- **`/supply-chain/facilities`** · geographic table + reuse `ManufacturingFootprint` map + capacity/risk profiles ·
  extend `Facility` (capacity, hazards).
- **`/supply-chain/map`** 3D force-directed graph (**DECIDED: full 3D now**) · nodes=companies (3D spheres),
  animated light-stream edges=vendor→client, left-click clusters dependencies + shifts camera + populates
  telemetry panel · **dep `react-force-graph-3d` + `three` — lazy-loaded (`next/dynamic`, `ssr:false`) to this
  route only** · `GraphData` fixtures. Build last within the Supply Chain section.
- **`/supply-chain/trade`** · freight/export volumes, tariff schedules, lanes · reuse Sankey + `DataTable` ·
  `TradeShipment` · UN Comtrade.

### Risk & Compliance
- **`/risk/radar`** · full-screen multi-entity radar compare (side-by-side firms/sectors) · reuse/extend `RiskRadar`.
- **`/risk/policies`** · regulatory tracking grid (CHIPS Act, EU CRMA, China export controls) · `DataTable` ·
  `Policy` fixtures · GDELT/gov RSS (later).
- **`/risk/esg`** · Scope 1–3 heatmap, water scarcity at fabs, ethical sourcing · `EsgProfile` + heatmap grid.
- **`/risk/geopolitical`** · chokepoints (Malacca/Taiwan Strait), tension corridors, localization % · map overlays ·
  `GeoRisk` · GDELT + World Bank.

### Data & Analytics
- **`/analytics/market`** Market Intelligence · inventory ratios, lead times, capacity utilization · charts +
  `StatTile` row · `MarketIntel`.
- **`/analytics/reports`** · parameter picker → generate exec summary/PDF/CSV · form + preview · `ReportTemplate` ·
  export via client (later).
- **`/analytics/sources`** Data Sources · lineage + last-sync timeline of each feed · reuse `DATA_SOURCES` + timeline.

### Monitoring
- **`/monitoring/alerts`** · severity-sorted feed (High/Med/Low) with deep-links to affected clusters · `Alert`
  fixtures + filter.
- **`/monitoring/watchlist`** · user-defined pinned companies/materials/nodes · reads `focusCompany`/localStorage
  watchlist store.

### Cross-cutting (applies to all pages)
- **Industry switching** already global via the sidebar selector — every page reads `useApp().industry`. Reconcile
  the mockup's "Industries" nav group by adding it as a group that sets the same state (optional).
- **Cross-filter focus**: clicking a company anywhere sets `focusCompany`; map/financials/news filter to it; a
  clearable "Focused: X" chip in the header. Wire via existing `useApp` store.
- Each new page: Server Component `page.tsx` → client section component in `src/components/sections/<Section>.tsx`.

## Execution order (DECIDED: Companies first)

1. **Phase A** — shared building blocks + `provider.ts` seam + data-model type stubs.
2. **Companies** section (highest value, most reuse of existing widgets).
3. **Supply Chain** (build `/supply-chain/map` full 3D last within this section).
4. **Risk & Compliance**.
5. **Data & Analytics** + **Monitoring**.
6. **Cross-filter focus** wiring pass across pages.
7. **Phase Z — Real data** (deferred): Python ETL (yfinance, UN Comtrade, GDELT, SEC EDGAR, World Bank) →
   local staging (DuckDB/Parquet) → entity resolution (TSMC/2330.TW/… → unified id) → Postgres + Redis →
   Next API routes serve from cache → flip `provider.ts` from mock to `fetch('/api/…')`. Web server never hits
   external APIs on request. Resolve rate-limit/normalization issues as they arise.

## Verification

- After each page: `npx tsc --noEmit` clean; `npm run dev`; open the route → HTTP 200, renders, no console errors.
- Visual check vs mockup via Playwright MCP screenshot at 1536px.
- Industry toggle re-renders each page from fixtures; cross-filter focus updates peripheral widgets.
- Keep a checklist in `scr-radar/docs/ROADMAP.md` (Step 0), ticking pages as done.

## Notes / decisions

- **3D map: DECIDED full 3D now** — add `react-force-graph-3d` + `three`, lazy-loaded (`next/dynamic`,
  `ssr:false`) so the heavy bundle loads only on `/supply-chain/map`.
- **Build order: DECIDED Companies first** (then Supply Chain, Risk, Analytics, Monitoring, cross-filter pass).
- Report export (PDF) — client-side (print-to-PDF) in mock phase; server generation in the real-data phase.
