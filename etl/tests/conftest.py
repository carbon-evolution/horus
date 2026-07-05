import sys
from pathlib import Path

# Make etl modules importable as top-level (config, seed_loader, ...).
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

import pytest
import migrate
from config import pg


@pytest.fixture
def fresh_db():
    """Ensure schema exists and both tables are empty before each test."""
    migrate.run()
    with pg() as conn:
        conn.execute("truncate industry_dataset")
        conn.execute("truncate company")
    yield
