# Phase Z — Plan 1: Data Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stand up Postgres + Redis and a Prefect-run ETL that loads today's fixtures into the database, so the app has a real data backend to read from later — with zero change to the running app in this plan.

**Architecture:** Docker Compose runs Postgres and Redis. A Node script dumps the existing provider fixtures to JSON. A Python (Prefect) flow loads those JSON payloads into a `industry_dataset` JSONB table (plus a normalized `company` table for later entity resolution) and warms Redis. The Next app is untouched in this plan.

**Tech Stack:** Docker Compose, Postgres 17, Redis 7, Python 3.14 + Prefect + psycopg + PyYAML, Node `tsx` for the fixture dump.

**Refinements from the spec (flagged for review):**
- Domain data is stored as **JSONB** keyed by `(industry, dataset)`, not 15 normalized tables. A normalized `company` table is kept for entity resolution used by later fetchers.
- **Prefect** runs flows locally here; the Prefect server + scheduling is deferred to Plan 4.
- **DuckDB staging** is deferred to Plan 3 (the real-fetcher plan), where raw API responses actually need staging.

---

## File Structure

- `docker-compose.yml` — postgres + redis services (create)
- `.env.example`, `.env` — connection config (create; `.env` gitignored)
- `Makefile` — `up`, `down`, `ingest`, `psql` targets (create)
- `etl/migrations/001_init.sql` — schema (create)
- `etl/requirements.txt` — Python deps (create)
- `etl/config.py` — env loading + connection helpers (create)
- `etl/migrate.py` — applies migrations idempotently (create)
- `etl/seed_loader.py` — fixtures JSON → Postgres (create)
- `etl/warm.py` — Postgres → Redis cache warm (create)
- `etl/flows.py` — Prefect flow wiring dump→load→warm (create)
- `etl/tests/conftest.py` — pytest DB fixtures (create)
- `etl/tests/test_seed_loader.py` — loader tests (create)
- `etl/tests/test_warm.py` — redis warm test (create)
- `scripts/dump-fixtures.ts` — Node fixture dump (create)
- `etl/seeds/fixtures/*.json` — generated dump output (gitignored)
- `package.json` — add `tsx` dev dep + `dump:fixtures` script (modify)
- `.gitignore` — ignore `.env`, `etl/seeds/fixtures/`, `etl/.venv/`, `__pycache__` (modify)

---

## Task 1: Docker Compose for Postgres + Redis

**Files:**
- Create: `docker-compose.yml`
- Create: `.env.example`
- Create: `.env`
- Modify: `.gitignore`
- Create: `Makefile`

- [ ] **Step 1: Write `docker-compose.yml`**

```yaml
services:
  postgres:
    image: postgres:17
    container_name: scr_postgres
    environment:
      POSTGRES_USER: scr
      POSTGRES_PASSWORD: scr
      POSTGRES_DB: scr_radar
    ports:
      - "5433:5432"
    volumes:
      - scr_pgdata:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U scr -d scr_radar"]
      interval: 3s
      timeout: 3s
      retries: 20

  redis:
    image: redis:7
    container_name: scr_redis
    ports:
      - "6380:6379"
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 3s
      timeout: 3s
      retries: 20

volumes:
  scr_pgdata:
```

- [ ] **Step 2: Write `.env.example`**

```bash
# Postgres (host port 5433 -> container 5432)
DATABASE_URL=postgresql://scr:scr@localhost:5433/scr_radar
# Redis (host port 6380 -> container 6379)
REDIS_URL=redis://localhost:6380
# Cache TTL in seconds for warmed dataset keys
CACHE_TTL=86400
```

- [ ] **Step 3: Create `.env` from the example**

Run: `cp .env.example .env`
Expected: `.env` exists with the same contents.

- [ ] **Step 4: Add ignores to `.gitignore`**

Append these lines to `.gitignore`:

```
.env
etl/.venv/
etl/seeds/fixtures/
__pycache__/
.pytest_cache/
```

- [ ] **Step 5: Write `Makefile`**

```makefile
.PHONY: up down psql redis-cli ingest

up:
	docker compose up -d
	@echo "waiting for postgres..."
	@until docker compose exec -T postgres pg_isready -U scr -d scr_radar >/dev/null 2>&1; do sleep 1; done
	@echo "postgres + redis ready"

down:
	docker compose down

psql:
	docker compose exec postgres psql -U scr -d scr_radar

redis-cli:
	docker compose exec redis redis-cli

ingest:
	cd etl && ./.venv/bin/python flows.py
```

- [ ] **Step 6: Bring the stack up and verify**

Run: `make up`
Expected: ends with `postgres + redis ready`.

Run: `docker compose exec -T redis redis-cli ping`
Expected: `PONG`

- [ ] **Step 7: Commit**

```bash
git add docker-compose.yml .env.example .gitignore Makefile
git commit -m "feat(etl): docker compose for postgres + redis"
```

---

## Task 2: Database schema migration

**Files:**
- Create: `etl/migrations/001_init.sql`

- [ ] **Step 1: Write `etl/migrations/001_init.sql`**

```sql
-- Resolved entity table (used by later fetchers for entity resolution).
create table if not exists company (
  id           text primary key,
  industry     text not null,
  name         text not null,
  ticker       text,
  cik          text,
  wikidata_qid text
);
create index if not exists company_industry_idx on company (industry);

-- Read-model: one JSONB payload per (industry, dataset). The provider reads
-- payload and returns it typed. `industry` may be the sentinel '_global' for
-- industry-independent datasets (sources, chokepoints).
create table if not exists industry_dataset (
  industry   text not null,
  dataset    text not null,
  payload    jsonb not null,
  updated_at timestamptz not null default now(),
  primary key (industry, dataset)
);
```

- [ ] **Step 2: Apply it manually to verify the SQL is valid**

Run: `docker compose exec -T postgres psql -U scr -d scr_radar -f - < etl/migrations/001_init.sql`
Expected: `CREATE TABLE` / `CREATE INDEX` lines, no errors.

Run: `docker compose exec -T postgres psql -U scr -d scr_radar -c "\dt"`
Expected: lists `company` and `industry_dataset`.

- [ ] **Step 3: Commit**

```bash
git add etl/migrations/001_init.sql
git commit -m "feat(etl): initial postgres schema"
```

---

## Task 3: Python ETL scaffold (venv, config, migrate runner)

**Files:**
- Create: `etl/requirements.txt`
- Create: `etl/config.py`
- Create: `etl/migrate.py`

- [ ] **Step 1: Write `etl/requirements.txt`**

```
prefect==3.1.15
psycopg[binary]==3.2.3
redis==5.2.1
PyYAML==6.0.2
python-dotenv==1.0.1
pytest==8.3.4
```

- [ ] **Step 2: Create the venv and install deps**

Run:
```bash
cd etl && python3 -m venv .venv && ./.venv/bin/pip install -q -r requirements.txt && echo OK
```
Expected: ends with `OK`.

- [ ] **Step 3: Write `etl/config.py`**

```python
import os
from pathlib import Path
import psycopg
import redis
from dotenv import load_dotenv

ROOT = Path(__file__).resolve().parent.parent
load_dotenv(ROOT / ".env")

DATABASE_URL = os.environ["DATABASE_URL"]
REDIS_URL = os.environ["REDIS_URL"]
CACHE_TTL = int(os.environ.get("CACHE_TTL", "86400"))

FIXTURES_DIR = ROOT / "etl" / "seeds" / "fixtures"
MIGRATIONS_DIR = ROOT / "etl" / "migrations"


def pg():
    """Return a new autocommit Postgres connection."""
    return psycopg.connect(DATABASE_URL, autocommit=True)


def rds():
    """Return a Redis client."""
    return redis.Redis.from_url(REDIS_URL, decode_responses=True)
```

- [ ] **Step 4: Write `etl/migrate.py`**

```python
"""Apply every etl/migrations/*.sql file idempotently, in filename order."""
from config import pg, MIGRATIONS_DIR


def run():
    files = sorted(MIGRATIONS_DIR.glob("*.sql"))
    with pg() as conn:
        for f in files:
            conn.execute(f.read_text())
    return [f.name for f in files]


if __name__ == "__main__":
    applied = run()
    print("applied:", ", ".join(applied))
```

- [ ] **Step 5: Run the migrate runner to verify it works from Python**

Run: `cd etl && ./.venv/bin/python migrate.py`
Expected: `applied: 001_init.sql`

- [ ] **Step 6: Commit**

```bash
git add etl/requirements.txt etl/config.py etl/migrate.py
git commit -m "feat(etl): python scaffold, config, migrate runner"
```

---

## Task 4: Node fixture dump script

**Files:**
- Modify: `package.json`
- Create: `scripts/dump-fixtures.ts`

- [ ] **Step 1: Add `tsx` and a script to `package.json`**

In `devDependencies` add:

```json
"tsx": "^4.19.2"
```

In `scripts` add:

```json
"dump:fixtures": "tsx scripts/dump-fixtures.ts"
```

- [ ] **Step 2: Install the new dev dep**

Run: `npm install`
Expected: completes; `tsx` present in `node_modules/.bin/`.

> Note: `provider.ts` and `data.ts` import each other via the `@/lib` alias. `tsx` resolves tsconfig `compilerOptions.paths` natively, so this works out of the box. If Step 4 errors with `Cannot find module '@/lib/...'`, install `tsconfig-paths` (`npm i -D tsconfig-paths`) and change the script to `tsx --tsconfig tsconfig.json scripts/dump-fixtures.ts`.

- [ ] **Step 3: Write `scripts/dump-fixtures.ts`**

This calls the existing provider getters (the single seam) so the DB payloads exactly match what widgets already consume. Per-company derivations (`getCompanyMeta`, `getFinancialsTTM`, `getSupplyGraph`, patent derivation) are intentionally NOT dumped — they stay as provider-side derivations of the base datasets.

```typescript
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
// Relative imports (not the "@/lib" alias) so `tsx` resolves without tsconfig-paths.
import { INDUSTRIES, type Industry } from "../src/lib/types";
import {
  getKpis, getCompanies, getFacilities, getNews, getRadar, getSankey,
  getFinancialsSnapshot, getDeals, getSuppliers, getResearch,
  getSupplierEdges, getMaterials, getShipments,
  getPolicies, getEsgProfiles, getGeoRisks, getCompareRadar,
  getMarketIntel, getAlerts, getPatents,
  getDataSources, getChokepoints,
} from "../src/lib/provider";

const OUT = join(process.cwd(), "etl", "seeds", "fixtures");
mkdirSync(OUT, { recursive: true });

function perIndustry(industry: Industry) {
  return {
    kpis: getKpis(industry),
    companies: getCompanies(industry),
    facilities: getFacilities(industry),
    news: getNews(industry),
    radar: getRadar(industry),
    sankey: getSankey(industry),
    financials: getFinancialsSnapshot(industry),
    deals: getDeals(industry),
    suppliers: getSuppliers(industry),
    research: getResearch(industry),
    supplierEdges: getSupplierEdges(industry),
    materials: getMaterials(industry),
    shipments: getShipments(industry),
    policies: getPolicies(industry),
    esg: getEsgProfiles(industry),
    geo: getGeoRisks(industry),
    compareRadar: getCompareRadar(industry),
    marketIntel: getMarketIntel(industry),
    alerts: getAlerts(industry),
    patents: getPatents(industry),
  };
}

for (const industry of INDUSTRIES) {
  const data = perIndustry(industry);
  writeFileSync(join(OUT, `${industry}.json`), JSON.stringify(data, null, 2));
  console.log(`wrote ${industry}.json (${Object.keys(data).length} datasets)`);
}

// Global (industry-independent) datasets.
const globalData = { sources: getDataSources(), chokepoints: getChokepoints() };
writeFileSync(join(OUT, `_global.json`), JSON.stringify(globalData, null, 2));
console.log(`wrote _global.json (${Object.keys(globalData).length} datasets)`);
```

- [ ] **Step 4: Run the dump and verify output**

Run: `npm run dump:fixtures`
Expected: four lines — `wrote semiconductor.json (20 datasets)`, `ai`, `battery`, and `wrote _global.json (2 datasets)`.

Run: `cat etl/seeds/fixtures/semiconductor.json | python3 -c "import sys,json; d=json.load(sys.stdin); print(sorted(d.keys()))"`
Expected: a sorted list including `companies`, `financials`, `patents`, `supplierEdges`, `marketIntel`, etc.

- [ ] **Step 5: Commit**

```bash
git add package.json package-lock.json scripts/dump-fixtures.ts
git commit -m "feat(etl): node fixture dump via provider seam"
```

---

## Task 5: Seed loader (fixtures JSON → Postgres)

**Files:**
- Create: `etl/seed_loader.py`
- Create: `etl/tests/conftest.py`
- Create: `etl/tests/test_seed_loader.py`

- [ ] **Step 1: Write the failing test `etl/tests/test_seed_loader.py`**

```python
import json
import seed_loader
from config import pg, FIXTURES_DIR


def _count(dataset, industry):
    with pg() as conn:
        row = conn.execute(
            "select count(*) from industry_dataset where industry=%s and dataset=%s",
            (industry, dataset),
        ).fetchone()
    return row[0]


def test_load_is_idempotent_and_present(fresh_db):
    seed_loader.run()
    seed_loader.run()  # second run must not duplicate rows

    # exactly one row per (industry, dataset)
    assert _count("companies", "semiconductor") == 1
    assert _count("sources", "_global") == 1

    # payload round-trips as the same JSON the fixture holds
    with pg() as conn:
        payload = conn.execute(
            "select payload from industry_dataset where industry=%s and dataset=%s",
            ("semiconductor", "companies"),
        ).fetchone()[0]
    fixture = json.loads((FIXTURES_DIR / "semiconductor.json").read_text())["companies"]
    assert payload == fixture


def test_company_table_populated(fresh_db):
    seed_loader.run()
    with pg() as conn:
        n = conn.execute(
            "select count(*) from company where industry='semiconductor'"
        ).fetchone()[0]
    assert n > 0
```

- [ ] **Step 2: Write `etl/tests/conftest.py`**

```python
import sys
from pathlib import Path

# Make etl modules importable as top-level (config, seed_loader, ...).
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

import pytest
import migrate
from config import pg


@pytest.fixture
def fresh_db():
    """Ensure schema exists and both tables are empty before each test."""
    migrate.run()
    with pg() as conn:
        conn.execute("truncate industry_dataset")
        conn.execute("truncate company")
    yield
```

- [ ] **Step 3: Run the test to verify it fails**

Run: `cd etl && ./.venv/bin/python -m pytest tests/test_seed_loader.py -v`
Expected: FAIL — `ModuleNotFoundError: No module named 'seed_loader'`.

- [ ] **Step 4: Write `etl/seed_loader.py`**

```python
"""Load etl/seeds/fixtures/*.json into Postgres.

- Every top-level key of each fixture file becomes one industry_dataset row.
- The `companies` dataset also populates the normalized `company` table.
"""
import json
from psycopg.types.json import Jsonb
from config import pg, FIXTURES_DIR

UPSERT_DATASET = """
insert into industry_dataset (industry, dataset, payload)
values (%s, %s, %s)
on conflict (industry, dataset)
do update set payload = excluded.payload, updated_at = now()
"""

UPSERT_COMPANY = """
insert into company (id, industry, name, ticker)
values (%s, %s, %s, %s)
on conflict (id) do update set
  industry = excluded.industry, name = excluded.name, ticker = excluded.ticker
"""


def _industry_of(filename: str) -> str:
    return filename[:-len(".json")]  # "semiconductor.json" -> "semiconductor"


def run():
    files = sorted(FIXTURES_DIR.glob("*.json"))
    if not files:
        raise SystemExit(f"no fixtures in {FIXTURES_DIR}; run `npm run dump:fixtures`")
    with pg() as conn:
        for f in files:
            industry = _industry_of(f.name)  # "_global" for _global.json
            data = json.loads(f.read_text())
            for dataset, payload in data.items():
                conn.execute(UPSERT_DATASET, (industry, dataset, Jsonb(payload)))
            if "companies" in data:
                for c in data["companies"]:
                    conn.execute(
                        UPSERT_COMPANY,
                        (c["id"], industry, c["name"], c.get("ticker")),
                    )
    return [f.name for f in files]


if __name__ == "__main__":
    loaded = run()
    print("loaded:", ", ".join(loaded))
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `cd etl && ./.venv/bin/python -m pytest tests/test_seed_loader.py -v`
Expected: both tests PASS.

- [ ] **Step 6: Commit**

```bash
git add etl/seed_loader.py etl/tests/conftest.py etl/tests/test_seed_loader.py
git commit -m "feat(etl): seed loader fixtures->postgres with tests"
```

---

## Task 6: Redis warm step

**Files:**
- Create: `etl/warm.py`
- Create: `etl/tests/test_warm.py`

- [ ] **Step 1: Write the failing test `etl/tests/test_warm.py`**

```python
import json
import seed_loader
import warm
from config import rds


def test_warm_sets_namespaced_keys(fresh_db):
    seed_loader.run()
    warm.run()
    r = rds()
    raw = r.get("scr:semiconductor:companies")
    assert raw is not None
    # value is the JSON payload of that dataset
    assert isinstance(json.loads(raw), list)
    assert r.get("scr:_global:sources") is not None
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd etl && ./.venv/bin/python -m pytest tests/test_warm.py -v`
Expected: FAIL — `ModuleNotFoundError: No module named 'warm'`.

- [ ] **Step 3: Write `etl/warm.py`**

```python
"""Copy every industry_dataset payload into Redis under scr:{industry}:{dataset}.

The provider (Plan 2) reads through this cache; warming avoids a cold first hit.
"""
import json
from config import pg, rds, CACHE_TTL


def run():
    with pg() as conn:
        rows = conn.execute(
            "select industry, dataset, payload from industry_dataset"
        ).fetchall()
    r = rds()
    pipe = r.pipeline()
    for industry, dataset, payload in rows:
        pipe.set(f"scr:{industry}:{dataset}", json.dumps(payload), ex=CACHE_TTL)
    pipe.execute()
    return len(rows)


if __name__ == "__main__":
    n = run()
    print(f"warmed {n} keys")
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `cd etl && ./.venv/bin/python -m pytest tests/test_warm.py -v`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add etl/warm.py etl/tests/test_warm.py
git commit -m "feat(etl): redis warm step with test"
```

---

## Task 7: Prefect flow + `make ingest`

**Files:**
- Create: `etl/flows.py`

- [ ] **Step 1: Write `etl/flows.py`**

The dump step shells out to the Node script (the fixture source of truth); the rest are Python tasks. Each task has retries so a transient DB/Redis blip re-runs just that step.

```python
"""Prefect flow: dump fixtures (node) -> migrate -> seed load -> warm redis.

Run locally with: `python flows.py`  (or `make ingest`).
"""
import subprocess
from pathlib import Path
from prefect import flow, task

import migrate
import seed_loader
import warm

ROOT = Path(__file__).resolve().parent.parent


@task(retries=1, retry_delay_seconds=2)
def dump_fixtures():
    subprocess.run(["npm", "run", "dump:fixtures"], cwd=ROOT, check=True)


@task(retries=2, retry_delay_seconds=2)
def apply_migrations():
    return migrate.run()


@task(retries=2, retry_delay_seconds=2)
def load_seeds():
    return seed_loader.run()


@task(retries=2, retry_delay_seconds=2)
def warm_cache():
    return warm.run()


@flow(name="scr-ingest")
def ingest():
    dump_fixtures()
    apply_migrations()
    load_seeds()
    warm_cache()


if __name__ == "__main__":
    ingest()
```

- [ ] **Step 2: Run the full flow end-to-end**

Run: `make ingest`
Expected: Prefect logs each task (`dump_fixtures`, `apply_migrations`, `load_seeds`, `warm_cache`) completing, flow state `Completed`.

- [ ] **Step 3: Verify the database is populated**

Run: `docker compose exec -T postgres psql -U scr -d scr_radar -c "select industry, count(*) from industry_dataset group by industry order by industry;"`
Expected: rows for `_global`, `ai`, `battery`, `semiconductor` with non-zero counts.

Run: `docker compose exec -T redis redis-cli keys "scr:semiconductor:*" | head`
Expected: keys like `scr:semiconductor:companies`.

- [ ] **Step 4: Verify the app is still unchanged and green**

Run: `npx tsc --noEmit`
Expected: exit 0 (no app files were modified in this plan).

- [ ] **Step 5: Commit**

```bash
git add etl/flows.py
git commit -m "feat(etl): prefect ingest flow + make ingest"
```

---

## Task 8: Documentation

**Files:**
- Modify: `docs/ROADMAP.md`
- Create: `etl/README.md`

- [ ] **Step 1: Write `etl/README.md`**

```markdown
# ETL — Data Foundation (Phase Z, Plan 1)

Loads the app's fixtures into Postgres + Redis. The app does not read from this
yet (that is Plan 2); this plan only builds and fills the backend.

## Prereqs
- Docker, Node, Python 3.14
- `cp .env.example .env`
- `cd etl && python3 -m venv .venv && ./.venv/bin/pip install -r requirements.txt`

## Run
```bash
make up        # start postgres + redis
make ingest    # dump fixtures -> migrate -> load -> warm redis
make psql      # inspect the database
make down      # stop services
```

## Layout
- `migrations/` — SQL schema (applied idempotently by `migrate.py`)
- `seed_loader.py` — fixtures JSON -> `industry_dataset` + `company`
- `warm.py` — payloads -> Redis `scr:{industry}:{dataset}`
- `flows.py` — Prefect flow tying it together
- `tests/` — pytest (needs `make up` running)

Real external-source fetchers (SEC EDGAR, Yahoo, etc.) arrive in Plan 3.
```

- [ ] **Step 2: Update the Phase Z line in `docs/ROADMAP.md`**

Replace the line:

```
- [ ] Phase Z: real data (ETL → DuckDB → Postgres/Redis → flip provider.ts).
```

with:

```
- [ ] **Phase Z: real data** — Plan 1 (data foundation: compose postgres+redis, Prefect ingest, fixtures→DB) DONE; Plan 2 (server-render off Postgres) next; Plan 3 (real fetchers); Plan 4 (scheduling). Specs/plans in `docs/superpowers/`.
```

- [ ] **Step 3: Commit**

```bash
git add etl/README.md docs/ROADMAP.md
git commit -m "docs(etl): plan 1 readme + roadmap update"
```

---

## Definition of Done (Plan 1)

- `make up` brings up Postgres (5433) + Redis (6380).
- `make ingest` runs the Prefect flow green; `industry_dataset` holds all four industry keys and `company` is populated.
- Redis holds `scr:{industry}:{dataset}` keys.
- `cd etl && ./.venv/bin/python -m pytest -q` passes.
- `npx tsc --noEmit` still clean; the running app is unchanged.
