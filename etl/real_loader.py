"""Write fetched dataset payloads into industry_dataset (same upsert as seeds)."""
from psycopg.types.json import Jsonb
from config import pg

UPSERT = """
insert into industry_dataset (industry, dataset, payload)
values (%s, %s, %s)
on conflict (industry, dataset)
do update set payload = excluded.payload, updated_at = now()
"""


def upsert_datasets(industry: str, datasets: dict) -> list[str]:
    with pg() as conn:
        for name, payload in datasets.items():
            conn.execute(UPSERT, (industry, name, Jsonb(payload)))
    return sorted(datasets.keys())


def read_dataset(industry: str, dataset: str):
    """Current payload (seeded or previously fetched) — for read-modify-write patches."""
    with pg() as conn:
        row = conn.execute(
            "select payload from industry_dataset where industry=%s and dataset=%s",
            (industry, dataset),
        ).fetchone()
    return row[0] if row else None
