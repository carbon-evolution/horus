"""Copy every industry_dataset payload into Redis under scr:{industry}:{dataset}.

The provider (Plan 2) reads through this cache; warming avoids a cold first hit.
"""
import json
from config import pg, rds, CACHE_TTL


def run():
    with pg() as conn:
        rows = conn.execute(
            "select industry, dataset, payload from industry_dataset"
        ).fetchall()
    r = rds()
    pipe = r.pipeline()
    for industry, dataset, payload in rows:
        pipe.set(f"scr:{industry}:{dataset}", json.dumps(payload), ex=CACHE_TTL)
    pipe.execute()
    return len(rows)


if __name__ == "__main__":
    n = run()
    print(f"warmed {n} keys")
