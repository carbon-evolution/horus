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
