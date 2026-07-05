"""Apply every etl/migrations/*.sql file idempotently, in filename order."""
from config import pg, MIGRATIONS_DIR


def run():
    files = sorted(MIGRATIONS_DIR.glob("*.sql"))
    with pg() as conn:
        for f in files:
            conn.execute(f.read_text())
    return [f.name for f in files]


if __name__ == "__main__":
    applied = run()
    print("applied:", ", ".join(applied))
