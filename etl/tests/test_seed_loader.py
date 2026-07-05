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
