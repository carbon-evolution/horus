import os
from pathlib import Path
import psycopg
import redis
from dotenv import load_dotenv

ROOT = Path(__file__).resolve().parent.parent
load_dotenv(ROOT / ".env")

DATABASE_URL = os.environ["DATABASE_URL"]
REDIS_URL = os.environ["REDIS_URL"]
CACHE_TTL = int(os.environ.get("CACHE_TTL", "86400"))

FIXTURES_DIR = ROOT / "etl" / "seeds" / "fixtures"
MIGRATIONS_DIR = ROOT / "etl" / "migrations"
CACHE_DIR = ROOT / "etl" / "cache"
SEEDS_DIR = ROOT / "etl" / "seeds"
PATENTSVIEW_API_KEY = os.environ.get("PATENTSVIEW_API_KEY")  # optional


def pg():
    """Return a new autocommit Postgres connection."""
    return psycopg.connect(DATABASE_URL, autocommit=True)


def rds():
    """Return a Redis client."""
    return redis.Redis.from_url(REDIS_URL, decode_responses=True)
