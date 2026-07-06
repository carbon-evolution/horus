import os
import sys
from pathlib import Path

# Make etl modules importable as top-level (config, seed_loader, ...).
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

# Redirect the whole test session to an ISOLATED database before config is
# imported, so `fresh_db`'s truncate can never wipe the dev data the app reads.
# Derives `<db>_test` from DATABASE_URL and creates it once if missing.
import psycopg  # noqa: E402

_base = os.environ.get("DATABASE_URL", "postgresql://scr:scr@localhost:5433/scr_radar")
if not _base.endswith("_test"):
    _admin = _base.rsplit("/", 1)[0] + "/postgres"
    _test_db = _base.rsplit("/", 1)[-1] + "_test"
    try:
        with psycopg.connect(_admin, autocommit=True) as _c:
            if not _c.execute("select 1 from pg_database where datname=%s", (_test_db,)).fetchone():
                _c.execute(f'create database "{_test_db}"')
    except Exception:
        pass  # if creation fails, fall back to the base URL (tests may collide)
    else:
        os.environ["DATABASE_URL"] = _base.rsplit("/", 1)[0] + "/" + _test_db

import pytest  # noqa: E402
import migrate  # noqa: E402
from config import pg  # noqa: E402


@pytest.fixture
def fresh_db():
    """Ensure schema exists and both tables are empty before each test."""
    migrate.run()
    with pg() as conn:
        conn.execute("truncate industry_dataset")
        conn.execute("truncate company")
    yield
