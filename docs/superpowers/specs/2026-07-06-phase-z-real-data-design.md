# Phase Z — Real Data Pipeline (Design)

**Date:** 2026-07-06
**Status:** Approved for planning
**Scope:** Replace the mock data seam with a real free-tier data pipeline, semiconductor industry first, using a full production-shaped stack (Prefect ETL → DuckDB staging → Postgres + Redis → server-component reads).

---

## 1. Goal

Flip the app from in-memory fixtures to real data without changing what the pages *look like*. The provider seam (`src/lib/provider.ts`) stays the single swap point, but its getters change from reading TypeScript fixtures to reading Postgres (with a Redis read-through cache), populated by a Prefect-orchestrated ETL over free public sources.

Semiconductor is the only industry made "live" in this build. AI and battery keep their current data but are served through the same database path, so the app never branches on industry.

## 2. Key decisions (locked)

| Decision | Choice | Why |
|---|---|---|
| Ambition | Full production pipeline | User wants the real, robust stack, not a shim. |
| Client data access | **Server components + props** | Idiomatic Next 16; pages fetch on the server, pass data to client widgets. |
| Where `industry` lives | **Route segment `app/[industry]/…`** | Server-readable, shareable URLs, cleanest fit for server rendering. |
| Read path | **Direct Postgres from server components (Option A)** | No `/api` layer needed for reads — server components sit next to the DB. One hop saved, less code. A thin `/api` can be added later only if a live/browser-side or external consumer appears. |
| Industry coverage | **Semiconductor first**, generalized | Prove the pipeline on one universe; add others by dropping in a seed file. |
| ETL orchestration | **Prefect flows** | Retries, logging, local UI, scheduling. |
| Infra | **Docker Compose** (postgres, redis, prefect) | User already runs Docker; matches full-pipeline choice. |

## 3. Data provenance (honest split)

Not every getter has a free structured source. Both kinds land in the same Postgres tables so the app can't tell them apart — they're all real rows.

**Fetchable from free sources**
- Companies / profiles — Wikidata (CEO, HQ, founded, employees, coords) + Yahoo/`yfinance` (market cap, ticker, YTD change)
- Financials snapshot & TTM — SEC EDGAR `companyfacts` + Yahoo
- Patents — USPTO PatentsView API
- Materials & trade shipments — UN Comtrade + World Bank
- News — GDELT + RSS
- Geo-risk indicators — World Bank + GDELT
- KPIs / market intel — derived/aggregated from the above during load

**Curated seed (no free structured API — human-maintained, still real rows in Postgres)**
- Supplier edges (supply relationships)
- ESG Scope 1–3 emissions
- M&A deals
- Policies (RSS ingestion possible later)
- Any fab facilities not present in Wikidata

## 4. Target architecture

```
Prefect flows (etl/)                 Docker Compose
  fetch   → sources/*.py     ┌──────────────────────────────┐
  stage   → DuckDB/Parquet   │   postgres      redis         │
  resolve → entity map       └──────────────────────────────┘
  load    → Postgres                  ▲             ▲
  warm    → Redis                     │ SQL reads   │ read-through cache
                                      │             │
        Next 16  app/[industry]/…   (server components)
          page.tsx: await provider.getX(industry)  ──► props
             └► <ClientWidget data={...}>   (focus / filters stay client)
```

### 4.1 Provider becomes an async, server-only data layer
- `src/lib/provider.ts` gains `import 'server-only'`. Getters become `async` and query Postgres via a pooled `pg` client, wrapped in a Redis read-through cache (`industry:getter` keys, TTL + explicit bust on ETL load).
- Signatures change from `getX(industry): T` to `getX(industry): Promise<T>`. The seam holds; only the bodies change.
- No `/api` routes for reads.

### 4.2 Routing
- All 22 routes relocate under `app/[industry]/…` (e.g. `app/[industry]/companies/page.tsx`, `app/[industry]/supply-chain/map/page.tsx`).
- Pages become `async` server components reading `params.industry`, calling providers, passing data as props.
- A root redirect sends `/` → `/semiconductor` (default industry).
- `generateStaticParams` / validation rejects unknown industry segments (404).

### 4.3 Client widgets
- Refactored to receive their data via props instead of calling `getX(industry)` and reading `industry` from the store.
- Interactivity stays client-side over the passed-in props: Alerts severity filter, Suppliers buyer select, and the entire focus/cross-filter dimming (unchanged — it's pure presentation).
- The TopBar industry toggle switches from a Zustand setter to navigation (`router.push('/'+industry+restOfPath)`).
- Focus state stays in client Zustand exactly as today.

### 4.4 Uniform DB path for all three industries
- A **seed loader** loads the existing `ai` / `battery` fixtures (and curated semiconductor tables) into Postgres as-is.
- Fetchers overwrite semiconductor's *fetchable* tables with real data.
- The provider reads Postgres uniformly for every industry — no `if (industry === 'semiconductor')` branching anywhere.

## 5. Database schema

- **`company`** — resolved entity table: `id` (internal), `name`, `ticker`, `cik`, `wikidata_qid`, `industry`. Seeded from `etl/seeds/semiconductor.yaml`.
- **Per-domain tables** keyed by `company_id` and/or `industry`: `financials`, `patents`, `facilities`, `supplier_edges`, `materials`, `trade_shipments`, `news`, `esg`, `policies`, `geo_risk`, `deals`, `kpis`, `market_intel`.
- Column shapes mirror the existing `src/lib/types.ts` interfaces so the provider maps rows → the same TypeScript types the widgets already expect.
- Migrations live in `etl/migrations/` (plain SQL, applied idempotently on stack up).

### Entity resolution
- `etl/seeds/semiconductor.yaml` is the source of truth mapping each company to its identifiers, e.g. `TSMC ↔ 2330.TW ↔ CIK 0001046179 ↔ Q211037`.
- Fetchers key off these identifiers; the resolve step guarantees every fetched row attaches to a known `company.id`.
- Adding an industry later = adding `etl/seeds/<industry>.yaml` and rerunning ingest.

## 6. ETL layout

```
etl/
  seeds/semiconductor.yaml      # entity map + curated-table seed data
  sources/
    edgar.py                    # SEC companyfacts
    yahoo.py                    # yfinance quotes/financials
    patentsview.py              # USPTO patents
    comtrade.py                 # UN Comtrade trade flows
    worldbank.py                # macro / geo indicators
    gdelt.py                    # news + geo events
    wikidata.py                 # company profile facts
  stage.py                      # raw → DuckDB/Parquet
  resolve.py                    # attach rows to company.id
  load.py                       # DuckDB → Postgres (upsert)
  warm.py                       # rebuild Redis caches, bust stale keys
  seed_loader.py                # existing fixtures → Postgres (ai/battery + curated)
  flows.py                      # Prefect flow wiring fetch→stage→resolve→load→warm
  migrations/*.sql
Makefile                        # make ingest, make ingest.financials, make up, make down
```

- Prefect flow: `fetch → stage → resolve → load → warm`, per-task retries, schedulable (daily) but also runnable on demand via `make ingest`.
- Each source is an isolated module with one job; a source failing degrades only its tables (the rest of the flow still loads).

## 7. Build order (implementation milestones)

1. **Infra + schema** — Docker Compose (postgres, redis, prefect), SQL migrations, `make up/down`.
2. **ETL skeleton + seed loader** — Prefect flow scaffold, DuckDB staging, seed loader pushing *all current fixtures* into Postgres. Exit criteria: Postgres holds every industry's data; app still runs on fixtures (no app change yet).
3. **Provider + routing rewrite** — provider → async server-only Postgres+Redis; routes move under `app/[industry]/`; widgets refactored to props; TopBar toggle navigates. Exit criteria: app renders identically, now server-rendered off Postgres, all routes 200, tsc clean.
4. **Real fetchers, one source at a time** — financials → patents → trade/materials → news → geo, each overwriting semiconductor tables. Additive and low-risk per source.
5. **Prefect scheduling + polish** — retries, daily schedule, `make ingest.<source>` targets, docs.

Milestones 2–3 are the risky refactor (do carefully, verify at each step). Milestone 4 is additive.

## 8. Risks & mitigations

- **Async provider ripples into every page.** Mitigated by the route-segment move happening in the same milestone as the provider rewrite, and by widgets taking props (pure, easy to verify).
- **Free-source rate limits / outages.** Prefect retries + per-source isolation; DuckDB staging means a failed fetch reuses the last good stage.
- **Entity-resolution gaps** (foreign listings, ADRs). Seed file is explicit and hand-verified for the semiconductor universe; unresolved rows are dropped with a logged warning, never silently mis-attached.
- **Curated tables drifting stale.** They live in `seeds/semiconductor.yaml` under version control; treated as real data, refreshed by editing the seed.

## 9. Out of scope

- Making AI / battery industries "live" (they stay seeded from current fixtures).
- Any `/api` REST layer (add later only if a browser-live or external consumer appears).
- PDF/report export changes.
- Auth / multi-user concerns.

## 10. Definition of done

- `docker compose up` brings up postgres, redis, prefect.
- `make ingest` runs the Prefect flow end-to-end; semiconductor tables hold real fetched data, ai/battery hold seeded data.
- App runs under `app/[industry]/…`, server-rendered from Postgres via the provider, Redis-cached.
- Semiconductor pages show real financials, patents, trade, news, and geo indicators.
- All routes 200, `tsc --noEmit` clean, focus/cross-filter behavior preserved.
