# Phase Z — Plan 4: Scheduling + Polish Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the ingest pipeline schedulable (daily Prefect run) and operable per-source (`make ingest.<source>`), closing out Phase Z.

**Architecture:** A tiny `etl/run_source.py` CLI runs one source end-to-end (fetch → upsert → warm) for targeted refreshes. `flows.py` gains a `serve` entrypoint wrapping `ingest.serve(cron=...)` — Prefect 3's serve runner with its ephemeral local API; no extra compose service needed. Makefile grows `ingest.<source>` targets and `make serve`.

**Tech Stack:** Existing Prefect 3.1 / Python 3.14 venv. No new dependencies.

---

## Task 1: Per-source CLI + Make targets

**Files:**
- Create: `etl/run_source.py`
- Modify: `Makefile`

- [ ] **Step 1: Write `etl/run_source.py`**

```python
"""Run one source end-to-end: fetch -> upsert -> warm. Usage: run_source.py <name>."""
import sys
import real_loader
import warm
from sources import yahoo, wikidata, patentsview, comtrade, gdelt, derive

SOURCES = {m.__name__.rsplit(".", 1)[-1]: m
           for m in (yahoo, wikidata, patentsview, comtrade, gdelt, derive)}


def main() -> int:
    name = sys.argv[1] if len(sys.argv) > 1 else ""
    mod = SOURCES.get(name)
    if not mod:
        print(f"usage: run_source.py <{'|'.join(SOURCES)}>")
        return 2
    loaded = real_loader.upsert_datasets("semiconductor", mod.run("semiconductor"))
    warmed = warm.run()
    print(f"{name}: upserted {loaded}, warmed {warmed} keys")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
```

- [ ] **Step 2: Add Make targets** (append to `Makefile`; `.PHONY` updated):

```makefile
# Refresh a single source: make ingest.yahoo / .wikidata / .patentsview / .comtrade / .gdelt / .derive
ingest.%:
	cd etl && ./.venv/bin/python run_source.py $*

serve:
	cd etl && ./.venv/bin/python flows.py serve
```

- [ ] **Step 3: Verify** — `make ingest.derive` → prints `derive: upserted ['kpis'], warmed 65 keys`. `make ingest.bogus` → usage line, exit 2.

- [ ] **Step 4: Commit** — `feat(etl): per-source ingest CLI + make targets`

---

## Task 2: Daily schedule via Prefect serve

**Files:**
- Modify: `etl/flows.py`

- [ ] **Step 1:** Extend the `__main__` block:

```python
if __name__ == "__main__":
    import sys
    if len(sys.argv) > 1 and sys.argv[1] == "serve":
        # Long-running scheduler: daily ingest at 07:00 local. Ctrl-C to stop.
        ingest.serve(name="scr-ingest-daily", cron="0 7 * * *")
    else:
        ingest()
```

- [ ] **Step 2: Verify** — `make ingest` still runs once and completes. `make serve` starts the runner and logs the deployment + next scheduled run (Ctrl-C after confirming; don't leave it running).

- [ ] **Step 3: Commit** — `feat(etl): daily prefect schedule via make serve`

---

## Task 3: Docs — close out Phase Z

- [ ] **Step 1:** `etl/README.md`: add `make ingest.<source>` + `make serve` to the Run section; replace the "Plan 4" footer line.
- [ ] **Step 2:** `docs/ROADMAP.md`: mark Phase Z complete (`- [x]`), note Plan 4 done.
- [ ] **Step 3:** Commit `docs: plan 4 complete (phase z done — scheduled real-data pipeline)`.

---

## Definition of Done (Plan 4)

- `make ingest.<source>` refreshes one source + warms Redis.
- `make serve` runs the daily-scheduled Prefect deployment.
- `make ingest` unchanged (one-shot).
- Docs updated; Phase Z marked complete.
