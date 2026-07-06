"""Prefect flow: dump fixtures -> migrate -> seed load -> entity sync ->
real fetchers (each isolated) -> derived KPIs -> warm redis.

Run locally with: `python flows.py`  (or `make ingest`).
Seeds always load first, so a failing fetcher leaves the fixture row in place.
"""
import subprocess
from pathlib import Path
from prefect import flow, task, get_run_logger

import migrate
import seed_loader
import warm
import entities
import real_loader
from sources import yahoo, wikidata, patentsview, comtrade, gdelt, derive

ROOT = Path(__file__).resolve().parent.parent
# Order matters: wikidata/derive read companies (yahoo), yahoo reads patents.
SOURCES = [patentsview, yahoo, wikidata, comtrade, gdelt, derive]


@task(retries=1, retry_delay_seconds=2)
def dump_fixtures():
    subprocess.run(["npm", "run", "dump:fixtures"], cwd=ROOT, check=True)


@task(retries=2, retry_delay_seconds=2)
def apply_migrations():
    return migrate.run()


@task(retries=2, retry_delay_seconds=2)
def load_seeds():
    return seed_loader.run()


@task(retries=1, retry_delay_seconds=2)
def sync_entities():
    return entities.sync_company_table()


@task
def fetch_all(industry: str = "semiconductor") -> dict:
    """Run every source; a failure only skips that source's datasets."""
    log = get_run_logger()
    status = {}
    for mod in SOURCES:
        name = mod.__name__.rsplit(".", 1)[-1]
        try:
            loaded = real_loader.upsert_datasets(industry, mod.run(industry))
            status[name] = loaded
            log.info("source %s -> %s", name, loaded)
        except Exception as exc:  # noqa: BLE001 — isolation is the point
            status[name] = f"SKIPPED: {exc}"
            log.warning("source %s skipped: %s", name, exc)
    return status


@task(retries=2, retry_delay_seconds=2)
def warm_cache():
    return warm.run()


@flow(name="scr-ingest")
def ingest():
    dump_fixtures()
    apply_migrations()
    load_seeds()
    sync_entities()
    fetch_all()
    warm_cache()


if __name__ == "__main__":
    ingest()
