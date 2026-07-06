# ETL — Data Foundation (Phase Z, Plan 1)

Loads the app's fixtures into Postgres + Redis. As of Plan 2 the app **reads from
Postgres** (through the `server-only` provider + Redis read-through); `src/lib/fixtures.ts`
is now the dump source only, feeding this ETL rather than the running app.

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
