# ETL — Data Pipeline (Phase Z, Plans 1 + 3 + 4)

Loads data into Postgres + Redis for the app to read (the app reads Postgres through
the `server-only` provider + Redis read-through since Plan 2; `src/lib/fixtures.ts`
is the dump source only). Since Plan 3, the **semiconductor** industry's fetchable
datasets are overwritten with real data from free public sources after seeding.

## Prereqs
- Docker, Node, Python 3.14
- `cp .env.example .env` (optionally set `PATENTSVIEW_API_KEY` for real patents)
- `cd etl && python3 -m venv .venv && ./.venv/bin/pip install -r requirements.txt`

## Run
```bash
make up             # start postgres + redis
make ingest         # dump fixtures -> migrate -> seed -> entity sync -> real fetchers -> warm
make ingest.yahoo   # refresh ONE source (+warm): .wikidata .patentsview .comtrade .gdelt .derive
make psql           # inspect the database
make down           # stop services
```

## Scheduling (daily 07:00)
Prefect's ephemeral server cannot schedule, so the cron deployment needs two processes:
```bash
make prefect-server   # terminal 1: dedicated server (scheduler + UI at :4200)
make serve            # terminal 2: serves scr-ingest/scr-ingest-daily (cron 0 7 * * *)
```
Zero-daemon alternative — plain cron: `0 7 * * * cd <repo> && make ingest`.

## Ingest order (source isolation)
Seeds load **first**, so every dataset always exists; each fetcher then overwrites
its semiconductor datasets inside a try/except — a dead API only leaves the seeded
fixture in place, never a blank page. AI/battery stay fully seeded through the same path.

## Sources (`sources/`, each `run() -> {dataset: payload}` in types.ts shapes)
- `yahoo.py` — yfinance → `companies` (quotes/caps), `financials` (TTM $B), `research`
- `wikidata.py` — SPARQL → `companyMeta` (CEO, HQ, founded, employees; derived fills)
- `patentsview.py` — USPTO → `patents` (**requires `PATENTSVIEW_API_KEY`**, else skipped)
- `comtrade.py` — UN Comtrade preview (keyless) → `shipments` (top HS 8542/8486 lanes)
- `gdelt.py` — GDELT DOC 2.0 → `news` (one combined query; GDELT 429s on bursts)
- `derive.py` — patches computable `kpis` values (company/news counts)

Raw API responses cache in `etl/cache/` (gitignored) — stale beats broken on refetch.

**Stays curated (seeded):** materials prices, marketIntel, geo (World Bank WGI
stability scores were tried and dropped — they measure domestic stability, not
geopolitical tension), esg, deals, policies, supplierEdges, facilities, radar,
sankey, suppliers, alerts, compareRadar.

## Layout
- `migrations/` — SQL schema (applied idempotently by `migrate.py`)
- `seeds/semiconductor.yaml` — entity map: id ↔ ticker ↔ CIK ↔ Wikidata QID
- `entities.py` — entity map -> `company` table
- `seed_loader.py` — fixtures JSON -> `industry_dataset` + `company`
- `real_loader.py` — fetched payloads -> `industry_dataset` (same upsert)
- `warm.py` — payloads -> Redis `scr:{industry}:{dataset}`
- `flows.py` — Prefect flow tying it together
- `tests/` — pytest (normalizers are pure; DB tests need `make up`)

- `run_source.py` — one-source CLI behind `make ingest.<source>`

Phase Z complete: seeded foundation (Plan 1) → server-rendered reads (Plan 2) →
real fetchers (Plan 3) → per-source ops + daily scheduling (Plan 4).
