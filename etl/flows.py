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
