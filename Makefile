.PHONY: up down psql redis-cli ingest serve prefect-server

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

# Refresh a single source: make ingest.yahoo / .wikidata / .patentsview / .comtrade / .gdelt / .derive
ingest.%:
	cd etl && ./.venv/bin/python run_source.py $*

# Daily schedule needs BOTH: `make prefect-server` (terminal 1, runs the scheduler)
# and `make serve` (terminal 2, polls for the scheduled runs). Prefect's ephemeral
# server cannot schedule. Zero-daemon alternative — plain cron:
#   0 7 * * * cd <repo> && make ingest
prefect-server:
	cd etl && ./.venv/bin/prefect server start

serve:
	cd etl && PREFECT_API_URL=$${PREFECT_API_URL:-http://127.0.0.1:4200/api} ./.venv/bin/python flows.py serve
