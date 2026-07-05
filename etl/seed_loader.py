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
