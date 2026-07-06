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
from sources import yahoo, wikidata, patentsview, comtrade, gdelt, sec, nvd, fedreg, holdings, derive

ROOT = Path(__file__).resolve().parent.parent
INDUSTRIES = ["semiconductor", "ai", "battery"]
# Order matters: wikidata/derive read companies (yahoo), yahoo reads patents,
# nvd appends CVE alerts onto the `alerts` stream that sec.py writes first.
# Semiconductor is the fully-instrumented universe; ai/battery run the subset
# that generalises cleanly (yahoo merges real onto curated, sec/fedreg are
# US-gov, gdelt is name-based). comtrade/patentsview/wikidata stay semi-only
# (semi-specific HS codes / key-gated / would overwrite curated private meta).
def sources_for(industry: str):
    if industry == "semiconductor":
        return [patentsview, yahoo, wikidata, comtrade, gdelt, sec, nvd, fedreg, holdings, derive]
    return [yahoo, gdelt, sec, fedreg, holdings, derive]


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
def fetch_all() -> dict:
    """Run each industry's applicable sources; a failure only skips that
    source's datasets (per-source isolation)."""
    log = get_run_logger()
    status: dict = {}
    for industry in INDUSTRIES:
        entities.sync_company_table(industry)
        for mod in sources_for(industry):
            name = mod.__name__.rsplit(".", 1)[-1]
            key = f"{industry}.{name}"
            try:
                status[key] = real_loader.upsert_datasets(industry, mod.run(industry))
                log.info("source %s -> %s", key, status[key])
            except Exception as exc:  # noqa: BLE001 — isolation is the point
                status[key] = f"SKIPPED: {exc}"
                log.warning("source %s skipped: %s", key, exc)
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
    import sys
    if len(sys.argv) > 1 and sys.argv[1] == "serve":
        # Long-running scheduler: daily ingest at 07:00 local. Ctrl-C to stop.
        ingest.serve(name="scr-ingest-daily", cron="0 7 * * *")
    else:
        ingest()
